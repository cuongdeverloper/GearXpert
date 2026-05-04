const mongoose = require("mongoose");
const Voucher = require("../../models/Voucher");
const Cart = require("../../models/Cart");
const Rental = require("../../models/Rental"); // Import Rental model
const SupplierProfile = require("../../models/SupplierProfile");
const User = require("../../models/User");
const { notifyFollowers } = require("../Supplier/SupplierController");

exports.validateVoucher = async (req, res) => {
  const { code, cartType } = req.body;
  const customerId = req.user._id;

  console.log(`[validateVoucher] Starting validation for code: "${code}", cartType: "${cartType}", customerId: ${customerId}`);

  // 1. Tìm voucher (case-insensitive)
  let voucher = await Voucher.findOne({
    code: { $regex: new RegExp(`^${code}$`, 'i') },
    status: "ACTIVE"
  });

  if (!voucher) {
    return res.status(400).json({ message: "Voucher không hợp lệ hoặc không tồn tại" });
  }

  // LOGIC VOUCHER THEO RANK (Đã chuyển sang động từ DB)
  if (voucher.applicableRank) {
    const User = require('../../models/User');
    const user = await User.findById(customerId).select("rank");
    const userRank = (user?.rank || 'BRONZE').trim().toUpperCase();
    const dbRank = voucher.applicableRank.trim().toUpperCase();
    
    // 1. Kiểm tra độc quyền: Phải đạt hạng từ yêu cầu trở lên (Kế thừa)
    const rankWeights = { BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4, DIAMOND: 5 };
    const userWeight = rankWeights[userRank] || 1;
    const voucherWeight = rankWeights[dbRank] || 1;

    if (userWeight < voucherWeight) {
      return res.status(400).json({ 
        message: `Mã này dành cho hạng ${dbRank} trở lên. Hạng hiện tại của bạn là ${userRank}. Cố gắng thăng hạng nhé!` 
      });
    }

    // 2. Kiểm tra giới hạn tần suất cho Voucher Rank
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Kiểm tra xem mã NÀY đã được dùng trong tháng này chưa (Case-insensitive)
    const usedThisVoucher = await Rental.findOne({
      customerId: new mongoose.Types.ObjectId(customerId),
      voucherCode: { $regex: new RegExp(`^${voucher.code}$`, "i") },
      status: { $nin: ['CANCELLED', 'REJECTED'] },
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    if (usedThisVoucher) {
      return res.status(400).json({ 
        message: `Bạn đã sử dụng ưu đãi hạng ${dbRank} của tháng này rồi. Vui lòng quay lại vào tháng sau!` 
      });
    }
  }

  // 2. Kiểm tra xem người dùng đã sử dụng Voucher này chưa 
  // (Trừ Voucher có gán RANK vì loại này được reset hàng tháng ở bước trên)
  if (!voucher.applicableRank) {
    const usageCheck = await Rental.findOne({
      customerId: new mongoose.Types.ObjectId(customerId),
      voucherCode: { $regex: new RegExp(`^${voucher.code}$`, "i") },
      status: { $nin: ["CANCELLED", "REJECTED"] },
    });

    if (usageCheck) {
      return res.status(400).json({
        message: "Bạn đã sử dụng mã giảm giá này cho một đơn hàng trước đó",
      });
    }
  }

  // 3. Kiểm tra hết hạn
  if (voucher.expiredAt < new Date()) {
    return res.status(400).json({ message: "Voucher đã hết hạn" });
  }

  // 3.1 Kiểm tra ngày bắt đầu (Scheduling)
  if (voucher.scheduledStartDate && voucher.scheduledStartDate > new Date()) {
    return res.status(400).json({ message: "Voucher chưa đến thời gian áp dụng" });
  }

  // 3. Kiểm tra giới hạn sử dụng (Bỏ qua nếu là voucher Rank)
  if (!voucher.applicableRank && voucher.usageLimit !== undefined && voucher.usageLimit !== null) {
    if (voucher.usageLimit <= 0 || voucher.usedCount >= voucher.usageLimit) {
      return res.status(400).json({ message: "Voucher đã hết lượt sử dụng" });
    }
  }

  // 4. Lấy giỏ hàng
  const cart = await Cart.findOne({
    customerId,
    cartType
  }).populate({
    path: "items",
    populate: {
      path: "deviceId",
      select: "rentPrice supplierId"
    }
  });

  if (!cart || !cart.items.length) {
    return res.status(400).json({ message: "Giỏ hàng trống" });
  }

  // 5. Tính tổng giá trị áp dụng voucher
  let applicableTotal = 0;
  let applicableSupplierId = null; // Chỉ dùng khi voucher là SUPPLIER

  cart.items.forEach(item => {
    const device = item.deviceId;
    if (!device) return;

    const itemTotal = device.rentPrice.perDay * item.totalDays * item.quantity;

    // GLOBAL: áp dụng cho tất cả
    if (voucher.type === "GLOBAL") {
      applicableTotal += itemTotal;
    }
    // SUPPLIER: chỉ áp dụng cho supplier của voucher
    else if (voucher.type === "SUPPLIER") {
      if (device.supplierId.equals(voucher.supplierId)) {
        applicableTotal += itemTotal;
        applicableSupplierId = voucher.supplierId.toString();
      }
    }
  });

  // 6. Kiểm tra minOrderValue
  if (applicableTotal < voucher.minOrderValue) {
    return res.status(400).json({
      message: `Đơn hàng chưa đạt giá trị tối thiểu ${voucher.minOrderValue.toLocaleString()}đ để áp dụng voucher`
    });
  }

  // 7. Tính discount
  let discount = 0;

  if (voucher.discountType === "PERCENT") {
    discount = Math.round((applicableTotal * voucher.discountValue) / 100);
    if (voucher.maxDiscount) {
      discount = Math.min(discount, voucher.maxDiscount);
    }
  } else if (voucher.discountType === "FIXED") {
    discount = voucher.discountValue;
  }

  // 8. Trả về thông tin chi tiết
  res.json({
    success: true,
    code: voucher.code,
    type: voucher.type,
    supplierId: voucher.supplierId ? voucher.supplierId.toString() : null,
    discount,
    applicableTotal, // Tổng giá trị áp dụng (dùng để debug hoặc hiển thị)
    message: `Áp dụng thành công! Giảm ${discount.toLocaleString()}đ`
  });
};

exports.getAllVouchers = async (req, res) => {
  try {
    const { supplierId } = req.query;
    const currentDate = new Date();
    let userRank = null;

    // Nếu đã đăng nhập, lấy hạng của User từ DB
    const userId = req.user?._id || req.user?._id;
    
    if (userId) {
      try {
        const user = await User.findById(userId).select("rank rewardPoints");
        if (user) {
          userRank = user.rank || "BRONZE";
          console.log(`[getAllVouchers] Found User: ${userId}, Rank: ${userRank}`);
        }
      } catch (err) {
        console.error(`[getAllVouchers] Error fetching user:`, err);
      }
    }

    // Lọc theo điều kiện: Active, chưa hết hạn và đã đến ngày bắt đầu (nếu có)
    let query = {
      status: "ACTIVE",
      expiredAt: { $gt: currentDate },
      $or: [
        { scheduledStartDate: null },
        { scheduledStartDate: { $lte: currentDate } }
      ]
    };

    if (userRank) {
      // Logic kế thừa: Người dùng Hạng Vàng được thấy/lấy mã Của Vàng, Bạc, Đồng.
      const rankWeights = { BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4, DIAMOND: 5 };
      const currentWeight = rankWeights[userRank.trim().toUpperCase()] || 1;
      
      const allowedRanks = Object.keys(rankWeights).filter(rank => rankWeights[rank] <= currentWeight);
      const rankRegexes = allowedRanks.map(rank => new RegExp(`^\\s*${rank}\\s*$`, "i"));

      query.$or = [
        { applicableRank: { $in: rankRegexes } },
        { 
          applicableRank: null, 
          $expr: { $lt: ["$usedCount", "$usageLimit"] } 
        }
      ];
      console.log(`[getAllVouchers] Hierarchical Rank Match for: ${userRank}. Allowed Ranks: ${allowedRanks.join(', ')}`);
    } else {
      // Nếu chưa đăng nhập: Chỉ hiện voucher thường còn lượt dùng
      query.applicableRank = null;
      query.$expr = { $lt: ["$usedCount", "$usageLimit"] };
    }

    // Nếu truyền supplierId (khách xem tại trang shop), lọc thêm theo shop đó
    if (supplierId) {
      query.supplierId = supplierId;
    }

    const vouchersRaw = await Voucher.find(query).sort({ createdAt: -1 }).lean();
    console.log(`[getAllVouchers] Result: Found ${vouchersRaw.length} vouchers for rank ${userRank}`);
    console.log(`[getAllVouchers] Found ${vouchersRaw.length} vouchers for customer.`);

    // Lấy thông tin shop cho các voucher SUPPLIER
    let vouchers = await Promise.all(
      vouchersRaw.map(async (v) => {
        if (v.type === "SUPPLIER" && v.supplierId) {
          const profile = await SupplierProfile.findOne({ userId: v.supplierId })
            .select("businessName businessAvatar")
            .lean();
          if (profile) {
            return {
              ...v,
              shopInfo: {
                name: profile.businessName,
                avatar: profile.businessAvatar
              }
            };
          }
        }
        return v;
      })
    );

    // MỚI: Nếu người dùng đã đăng nhập, lọc bỏ các voucher đã sử dụng
    if (req.user && req.user._id) {
      const customerId = req.user._id;
      const usedVoucherCodes = await Rental.find({
        customerId: new mongoose.Types.ObjectId(customerId),
        voucherCode: { $exists: true, $ne: null },
        status: { $nin: ["CANCELLED", "REJECTED"] },
      }).distinct("voucherCode");

      vouchers = vouchers.filter((v) => !usedVoucherCodes.includes(v.code));
    }

    res.status(200).json({
      success: true,
      message: "Lấy danh sách voucher thành công",
      vouchers
    });
  } catch (error) {
    console.error("Get all vouchers error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách voucher"
    });
  }
};
exports.createVoucherByAdmin = async (req, res) => {
  try {
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      usageLimit,
      expiredAt,
      applicableRank, // Thêm trường này vào body
      scheduledStartDate
    } = req.body;

    if (discountValue < 0 || minOrderValue < 0 || (maxDiscount !== undefined && maxDiscount < 0)) {
      return res.status(400).json({
        success: false,
        message: "Các giá trị giảm giá, đơn tối thiểu không được là số âm"
      });
    }

    if (usageLimit < 1) {
      return res.status(400).json({
        success: false,
        message: "Lượt dùng tối đa phải ít nhất là 1"
      });
    }

    const newVoucher = new Voucher({
      code,
      type: "GLOBAL",
      supplierId: null,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      usageLimit,
      expiredAt,
      status: "ACTIVE",
      applicableRank, // Lưu hạng áp dụng vào DB
      scheduledStartDate: scheduledStartDate ? new Date(scheduledStartDate) : null
    });

    await newVoucher.save();

    res.status(201).json({
      success: true,
      message: "Voucher GLOBAL đã được tạo thành công",
      voucher: newVoucher
    });
  } catch (error) {
    console.error("Create voucher error:", error);
    res.status(500).json({
      success: false,
      message: error.code === 11000 ? "Mã voucher đã tồn tại" : "Lỗi server khi tạo voucher"
    });
  }
};

exports.getVouchersForAdmin = async (req, res) => {
  try {
    const vouchersRaw = await Voucher.find({}).sort({ createdAt: -1 }).lean();
    
    // Lấy thông tin shop cho các voucher SUPPLIER
    const vouchers = await Promise.all(
      vouchersRaw.map(async (v) => {
        if (v.type === "SUPPLIER" && v.supplierId) {
          const profile = await SupplierProfile.findOne({ userId: v.supplierId })
            .select("businessName businessAvatar")
            .lean();
          if (profile) {
            return {
              ...v,
              shopInfo: {
                name: profile.businessName,
                avatar: profile.businessAvatar
              }
            };
          }
        }
        return v;
      })
    );

    res.status(200).json({
      success: true,
      vouchers
    });
  } catch (error) {
    console.error("Get admin vouchers error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách voucher cho admin"
    });
  }
};

exports.deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedVoucher = await Voucher.findByIdAndDelete(id);

    if (!deletedVoucher) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy voucher"
      });
    }

    res.status(200).json({
      success: true,
      message: "Xóa voucher thành công"
    });
  } catch (error) {
    console.error("Delete voucher error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa voucher"
    });
  }
};

exports.deleteVoucherBySupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplierId = req.user._id;

    // Tìm voucher và kiểm tra quyền sở hữu + đảm bảo không phải voucher rank
    const voucher = await Voucher.findOne({ _id: id, supplierId, applicableRank: null });

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy voucher hoặc bạn không có quyền xóa"
      });
    }

    await Voucher.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Xóa voucher thành công"
    });
  } catch (error) {
    console.error("Delete voucher by supplier error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi xóa voucher"
    });
  }
};

exports.updateVoucherByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    if (
      (updateData.discountValue !== undefined && updateData.discountValue < 0) ||
      (updateData.minOrderValue !== undefined && updateData.minOrderValue < 0) ||
      (updateData.maxDiscount !== undefined && updateData.maxDiscount < 0)
    ) {
      return res.status(400).json({
        success: false,
        message: "Các giá trị giảm giá, đơn tối thiểu không được là số âm"
      });
    }

    if (updateData.usageLimit !== undefined && updateData.usageLimit < 1) {
      return res.status(400).json({
        success: false,
        message: "Lượt dùng tối đa phải ít nhất là 1"
      });
    }

    const voucher = await Voucher.findById(id);
    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy voucher"
      });
    }

    // IF GLOBAL: Allow full update
    // IF SUPPLIER: Only allow status update (to hide/show)
    if (voucher.type === "SUPPLIER") {
      const allowedKeys = ["status"];
      const filteredUpdate = {};
      allowedKeys.forEach(key => {
        if (updateData[key] !== undefined) filteredUpdate[key] = updateData[key];
      });

      const updatedVoucher = await Voucher.findByIdAndUpdate(id, filteredUpdate, { new: true });
      return res.status(200).json({
        success: true,
        message: "Cập nhật trạng thái voucher thành công",
        voucher: updatedVoucher
      });
    }

    // For GLOBAL: Allow update all fields except 'type' and 'supplierId'
    delete updateData.type;
    delete updateData.supplierId;

    const updatedVoucher = await Voucher.findByIdAndUpdate(id, updateData, { new: true });

    res.status(200).json({
      success: true,
      message: "Cập nhật voucher thành công",
      voucher: updatedVoucher
    });
  } catch (error) {
    console.error("Update voucher error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật voucher"
    });
  }
};

// --- SUPPLIER METHODS ---

exports.getVouchersBySupplier = async (req, res) => {
  try {
    const supplierId = req.user._id;
    // Chủ shop xem tất cả mã của mình (kể cả hết hạn/hết lượt)
    // Ẩn đi các mã có rank (mã Rank do Admin quản lý)
    const vouchersRaw = await Voucher.find({ 
      supplierId, 
      applicableRank: null 
    }).sort({ createdAt: -1 }).lean();

    const profile = await SupplierProfile.findOne({ userId: supplierId })
      .select("businessName businessAvatar")
      .lean();

    let vouchers = vouchersRaw.map(v => ({
      ...v,
      shopInfo: profile ? {
        name: profile.businessName,
        avatar: profile.businessAvatar
      } : null
    }));

    // MỚI: Nếu người dùng đã đăng nhập (đây là API public lấy list của shop), lọc bỏ voucher đã dùng
    // (Lưu ý: req.user ở đây có thể là bất kỳ ai đang xem shop đó)
    if (req.user && req.user._id) {
      const viewerId = req.user._id;
      const usedVoucherCodes = await Rental.find({
        customerId: new mongoose.Types.ObjectId(viewerId),
        voucherCode: { $exists: true, $ne: null },
        status: { $nin: ["CANCELLED", "REJECTED"] },
      }).distinct("voucherCode");

      vouchers = vouchers.filter((v) => !usedVoucherCodes.includes(v.code));
    }

    res.status(200).json({
      success: true,
      vouchers
    });
  } catch (error) {
    console.error("Get supplier vouchers error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách voucher"
    });
  }
};

exports.createVoucherBySupplier = async (req, res) => {
  try {
    const supplierId = req.user._id;
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      usageLimit,
      expiredAt,
      scheduledStartDate
    } = req.body;

    if (discountValue < 0 || minOrderValue < 0 || (maxDiscount !== undefined && maxDiscount < 0)) {
      return res.status(400).json({
        success: false,
        message: "Các giá trị giảm giá, đơn tối thiểu không được là số âm"
      });
    }

    if (usageLimit < 1) {
      return res.status(400).json({
        success: false,
        message: "Lượt dùng tối đa phải ít nhất là 1"
      });
    }

    const newVoucher = new Voucher({
      code: code.toUpperCase(),
      type: "SUPPLIER",
      supplierId,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      usageLimit,
      expiredAt,
      status: "ACTIVE",
      scheduledStartDate: scheduledStartDate ? new Date(scheduledStartDate) : null
    });

    await newVoucher.save();

    // Notify followers about new voucher
    notifyFollowers(
      supplierId,
      "notifyVoucher",
      "STORE_VOUCHER",
      "Voucher mới",
      `Mã ${newVoucher.code} – Giảm ${discountValue}${discountType === 'PERCENT' ? '%' : 'đ'}`,
      `/vouchers`,
      req
    ).catch(() => {});

    res.status(201).json({
      success: true,
      message: "Voucher đã được tạo thành công",
      voucher: newVoucher
    });
  } catch (error) {
    console.error("Create supplier voucher error:", error);
    res.status(500).json({
      success: false,
      message: error.code === 11000 ? "Mã voucher đã tồn tại" : "Lỗi server khi tạo voucher"
    });
  }
};

exports.updateVoucherStatusBySupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const supplierId = req.user._id;

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ"
      });
    }

    const voucher = await Voucher.findOneAndUpdate(
      { _id: id, supplierId, applicableRank: null },
      { status },
      { new: true }
    );

    if (!voucher) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy voucher hoặc bạn không có quyền"
      });
    }

    res.status(200).json({
      success: true,
      message: `Đã ${status === "ACTIVE" ? "kích hoạt" : "tạm ngưng"} voucher thành công`,
      voucher
    });
  } catch (error) {
    console.error("Update voucher status error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật trạng thái voucher"
    });
  }
};

// API để tìm voucher phù hợp nhất cho cart (auto-apply)
exports.getBestVoucherForCart = async (req, res) => {
  try {
    const { cartType } = req.query;
    const customerId = req.user._id;

    // 1. Lấy giỏ hàng
    const cart = await Cart.findOne({
      customerId: new mongoose.Types.ObjectId(customerId),
      cartType: cartType || 'NORMAL'
    }).populate({
      path: "items",
      populate: {
        path: "deviceId",
        select: "rentPrice supplierId"
      }
    });

    if (!cart || !cart.items.length) {
      return res.status(200).json({
        success: true,
        bestVoucher: null,
        message: "Giỏ hàng trống"
      });
    }

    // 2. Lấy tất cả voucher đang active và chưa hết hạn
    const currentDate = new Date();
    const vouchers = await Voucher.find({
      status: "ACTIVE",
      expiredAt: { $gt: currentDate },
      $or: [
        { scheduledStartDate: null },
        { scheduledStartDate: { $lte: currentDate } }
      ]
    });

    // Lấy hạng của user để kiểm tra điều kiện mã Rank
    const User = require('../../models/User');
    const user = await User.findById(customerId).select("rank");
    const userRank = (user?.rank || 'BRONZE').trim().toUpperCase();

    // Kiểm tra xem tháng này đã dùng voucher hạng chưa
    const Rental = require('../../models/Rental');
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    // Lấy danh sách mã Rank trong hệ thống để đối chiếu
    const rankVouchersInDB = await Voucher.find({ applicableRank: { $ne: null } }).select('code').lean();
    const rankCodes = rankVouchersInDB.map(rv => rv.code);

    const usedRankCodesThisMonth = await Rental.find({
      customerId: new mongoose.Types.ObjectId(customerId),
      voucherCode: { $in: rankCodes },
      status: { $nin: ['CANCELLED', 'REJECTED'] },
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    }).distinct('voucherCode');

    // 3. Tính tổng giá trị cart và tìm voucher tốt nhất
    let bestVoucher = null;
    let maxDiscount = 0;

    for (const voucher of vouchers) {
      // KIỂM TRA ĐIỀU KIỆN RANK (QUAN TRỌNG)
      if (voucher.applicableRank) {
        // 1. Kiểm tra có đúng hạng không (Kế Thừa Logic)
        const rankWeights = { BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4, DIAMOND: 5 };
        const userWeight = rankWeights[userRank] || 1;
        const voucherWeight = rankWeights[voucher.applicableRank.trim().toUpperCase()] || 1;

        if (userWeight < voucherWeight) {
          continue;
        }
        // 2. Kiểm tra tháng này đã dùng mã hạng này chưa (theo logic thăng hạng mới)
        if (usedRankCodesThisMonth.includes(voucher.code)) {
          continue;
        }
      } else {
        // Đối với voucher thường: Kiểm tra usageLimit của voucher
        if (voucher.usageLimit !== undefined && voucher.usageLimit !== null) {
          if (voucher.usageLimit <= 0 || voucher.usedCount >= voucher.usageLimit) {
            continue;
          }
        }
      }

      // Tính tổng giá trị áp dụng voucher
      let applicableTotal = 0;

      cart.items.forEach(item => {
        const device = item.deviceId;
        if (!device) return;

        const itemTotal = device.rentPrice.perDay * item.totalDays * item.quantity;

        // GLOBAL: áp dụng cho tất cả
        if (voucher.type === "GLOBAL") {
          applicableTotal += itemTotal;
        }
        // SUPPLIER: chỉ áp dụng cho supplier của voucher
        else if (voucher.type === "SUPPLIER") {
          if (device.supplierId.equals(voucher.supplierId)) {
            applicableTotal += itemTotal;
          }
        }
      });

      // Kiểm tra xem người dùng đã dùng voucher này chưa (Case-insensitive)
      const usageCheck = await Rental.findOne({
        customerId: new mongoose.Types.ObjectId(customerId),
        voucherCode: { $regex: new RegExp(`^${voucher.code}$`, 'i') },
        status: { $nin: ['CANCELLED', 'REJECTED'] }
      });

      if (usageCheck) continue;

      // Kiểm tra minOrderValue
      if (applicableTotal < voucher.minOrderValue) {
        continue;
      }

      // Tính discount
      let discount = 0;
      if (voucher.discountType === "PERCENT") {
        discount = Math.round((applicableTotal * voucher.discountValue) / 100);
        if (voucher.maxDiscount) {
          discount = Math.min(discount, voucher.maxDiscount);
        }
      } else if (voucher.discountType === "FIXED") {
        discount = Math.min(voucher.discountValue, applicableTotal);
      }

      // Cập nhật voucher tốt nhất nếu discount cao hơn
      if (discount > maxDiscount) {
        maxDiscount = discount;
        bestVoucher = {
          code: voucher.code,
          type: voucher.type,
          supplierId: voucher.supplierId ? voucher.supplierId.toString() : null,
          discount,
          discountType: voucher.discountType,
          discountValue: voucher.discountValue,
          applicableTotal,
          description: voucher.description
        };
      }
    }

    res.status(200).json({
      success: true,
      bestVoucher,
      maxDiscount,
      message: bestVoucher 
        ? `Tìm thấy voucher tốt nhất: Giảm ${maxDiscount.toLocaleString()}đ`
        : "Không tìm thấy voucher phù hợp"
    });
  } catch (error) {
    console.error("Get best voucher error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tìm voucher phù hợp nhất"
    });
  }
};

// Get available vouchers for a specific cart
exports.getAvailableVouchersForCart = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { cartType } = req.query;

    const User = require('../../models/User');
    const user = await User.findById(customerId);
    const userRank = (user?.rank || 'BRONZE').trim().toUpperCase();

    console.log(`[getAvailableVouchersForCart] customerId: ${customerId}, cartType: ${cartType}`);

    const cart = await Cart.findOne({
      customerId: new mongoose.Types.ObjectId(customerId),
      cartType: cartType || "NORMAL"
    }).populate({
      path: "items",
      populate: {
        path: "deviceId",
        select: "rentPrice supplierId name images"
      }
    });

    console.log(`[getAvailableVouchersForCart] Cart found:`, cart ? {
      cartId: cart._id,
      itemCount: cart.items?.length,
      items: cart.items?.map(i => ({ deviceId: i.deviceId?._id, name: i.deviceId?.name }))
    } : "NOT FOUND");

    if (!cart || !cart.items.length) {
      return res.status(200).json({
        success: true,
        message: "Giỏ hàng trống",
        totalValue: 0,
        vouchers: []
      });
    }

    let totalValue = 0;
    const supplierIds = new Set();
    
    cart.items.forEach(item => {
      const device = item.deviceId;
      if (device) {
        const itemTotal = device.rentPrice.perDay * item.totalDays * item.quantity;
        totalValue += itemTotal;
        supplierIds.add(device.supplierId.toString());
      }
    });

    const currentDate = new Date();

    const vouchers = await Voucher.find({
      status: "ACTIVE",
      expiredAt: { $gt: currentDate },
      $or: [
        { scheduledStartDate: null },
        { scheduledStartDate: { $lte: currentDate } }
      ],
      $or: [
        { applicableRank: { $ne: null } },
        { $expr: { $lt: ["$usedCount", "$usageLimit"] } }
      ],
      $or: [
        { type: "GLOBAL" },
        { 
          type: "SUPPLIER",
          supplierId: { $in: Array.from(supplierIds).map(id => new mongoose.Types.ObjectId(id)) }
        }
      ]
    }).lean();

    // 1. Lấy danh sách các mã voucher RANK đang có trong hệ thống
    const rankVouchersInDB = await Voucher.find({ applicableRank: { $ne: null } }).select('code').lean();
    const rankCodes = rankVouchersInDB.map(rv => rv.code);

    // 2. Lấy voucher thường đã dùng (loại trừ voucher Rank)
    const usedVoucherCodesEver = await Rental.find({
      customerId: new mongoose.Types.ObjectId(customerId),
      voucherCode: { $exists: true, $ne: null, $nin: rankCodes },
      status: { $nin: ['CANCELLED', 'REJECTED'] }
    }).distinct('voucherCode');

    // 3. Lấy voucher Rank đã dùng TRONG THÁNG NÀY
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    
    const usedRankThisMonth = await Rental.find({
      customerId: new mongoose.Types.ObjectId(customerId),
      voucherCode: { $in: rankCodes },
      status: { $nin: ['CANCELLED', 'REJECTED'] },
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    }).distinct('voucherCode');

    // 4. Lọc danh sách cuối cùng
    const filteredVouchers = vouchers.filter(v => {
      const vCodeUpper = v.code.toUpperCase();
      
      // Nếu là voucher Rank
      if (v.applicableRank) {
        // Kiểm tra xem CHÍNH MÃ NÀY đã được dùng trong tháng này chưa
        const isAlreadyUsedThisMonth = usedRankThisMonth.some(code => code.toUpperCase() === vCodeUpper);
        if (isAlreadyUsedThisMonth) return false;
        
        // Chuẩn hóa rank từ DB để so sánh
        const dbRank = v.applicableRank.trim().toUpperCase();
        
        // Tính điểm trọng số kế thừa: hạng User >= hạng Voucher
        const rankWeights = { BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4, DIAMOND: 5 };
        const userWeight = rankWeights[userRank] || 1;
        const voucherWeight = rankWeights[dbRank] || 1;
        
        if (userWeight < voucherWeight) return false;
        
        return true;
      }
      
      // Nếu là voucher thường: Ẩn nếu đã dùng bao giờ rồi (Case-insensitive)
      return !usedVoucherCodesEver.some(code => code.toUpperCase() === vCodeUpper);
    });

    const availableVouchers = filteredVouchers.map(v => {
      let applicableTotal = 0;
      
      if (v.type === "GLOBAL") {
        applicableTotal = totalValue;
      } else if (v.type === "SUPPLIER") {
        cart.items.forEach(item => {
          const device = item.deviceId;
          if (device && device.supplierId.equals(v.supplierId)) {
            applicableTotal += device.rentPrice.perDay * item.totalDays * item.quantity;
          }
        });
      }

      const isApplicable = applicableTotal >= v.minOrderValue;
      
      let discount = 0;
      if (isApplicable) {
        if (v.discountType === "PERCENT") {
          discount = Math.round((applicableTotal * v.discountValue) / 100);
          if (v.maxDiscount) {
            discount = Math.min(discount, v.maxDiscount);
          }
        } else if (v.discountType === "FIXED") {
          discount = Math.min(v.discountValue, applicableTotal);
        }
      }

      return {
        ...v,
        applicableTotal,
        isApplicable,
        potentialDiscount: discount
      };
    }).filter(v => v.isApplicable).sort((a, b) => b.potentialDiscount - a.potentialDiscount);

    const vouchersWithShopInfo = await Promise.all(
      availableVouchers.map(async (v) => {
        if (v.type === "SUPPLIER" && v.supplierId) {
          const profile = await SupplierProfile.findOne({ userId: v.supplierId })
            .select("businessName businessAvatar")
            .lean();
          return {
            ...v,
            shopInfo: profile || null
          };
        }
        return v;
      })
    );

    res.status(200).json({
      success: true,
      message: "Lấy danh sách voucher khả dụng thành công",
      totalValue,
      vouchers: vouchersWithShopInfo
    });
  } catch (error) {
    console.error("Get available vouchers error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi lấy danh sách voucher khả dụng"
    });
  }
};

// Auto-apply best voucher for cart
exports.autoApplyBestVoucher = async (req, res) => {
  try {
    const customerId = req.user._id;
    const { cartType } = req.body;

    const cart = await Cart.findOne({
      customerId: new mongoose.Types.ObjectId(customerId),
      cartType: cartType || "NORMAL"
    }).populate({
      path: "items",
      populate: {
        path: "deviceId",
        select: "rentPrice supplierId"
      }
    });

    if (!cart || !cart.items.length) {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống"
      });
    }

    let totalValue = 0;
    const supplierIds = new Set();
    
    cart.items.forEach(item => {
      const device = item.deviceId;
      if (device) {
        const itemTotal = device.rentPrice.perDay * item.totalDays * item.quantity;
        totalValue += itemTotal;
        supplierIds.add(device.supplierId.toString());
      }
    });

    const currentDate = new Date();

    const vouchers = await Voucher.find({
      status: "ACTIVE",
      expiredAt: { $gt: currentDate },
      $or: [
        { scheduledStartDate: null },
        { scheduledStartDate: { $lte: currentDate } }
      ],
      $or: [
        { applicableRank: { $ne: null } },
        { $expr: { $lt: ["$usedCount", "$usageLimit"] } }
      ],
      $or: [
        { type: "GLOBAL" },
        { 
          type: "SUPPLIER",
          supplierId: { $in: Array.from(supplierIds).map(id => new mongoose.Types.ObjectId(id)) }
        }
      ]
    }).lean();

    // Lấy hạng của user để kiểm tra
    const userProfile = await User.findById(customerId).select("rank");
    const userRank = (userProfile?.rank || 'BRONZE').trim().toUpperCase();

    // Kiểm tra xem tháng này đã dùng voucher hạng chưa
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    // Lấy danh sách mã Rank trong hệ thống để đối chiếu
    const rankVouchersInDB = await Voucher.find({ applicableRank: { $ne: null } }).select('code').lean();
    const rankCodes = rankVouchersInDB.map(rv => rv.code);

    // Lọc bỏ những voucher người dùng đã sử dụng
    const usedVoucherCodes = await Rental.find({
      customerId: new mongoose.Types.ObjectId(customerId),
      voucherCode: { $exists: true, $ne: null },
      status: { $nin: ["CANCELLED", "REJECTED"] },
    }).distinct("voucherCode");

    const usedRankCodesThisMonth = await Rental.find({
      customerId: new mongoose.Types.ObjectId(customerId),
      voucherCode: { $in: rankCodes },
      status: { $nin: ['CANCELLED', 'REJECTED'] },
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    }).distinct('voucherCode');

    // Lọc bỏ những voucher không hợp lệ (hạng không khớp hoặc đã dùng)
    const filteredVouchers = vouchers.filter((v) => {
      const vCodeUpper = v.code.toUpperCase();

      // Nếu là Voucher Rank
      if (v.applicableRank) {
        const dbRank = v.applicableRank.trim().toUpperCase();
        
        // 1. Phải khớp hạng hoặc cao hơn (Hierarchical)
        const rankWeights = { BRONZE: 1, SILVER: 2, GOLD: 3, PLATINUM: 4, DIAMOND: 5 };
        const userWeight = rankWeights[userRank] || 1;
        const voucherWeight = rankWeights[dbRank] || 1;
        if (userWeight < voucherWeight) return false;

        // 2. Chưa dùng mã này trong tháng (hỗ trợ thăng hạng)
        if (usedRankCodesThisMonth.some(code => code.toUpperCase() === vCodeUpper)) return false;
        return true;
      }

      // Nếu là Voucher thường
      // Check đã dùng chưa (Case-insensitive)
      if (usedVoucherCodes.some(code => code.toUpperCase() === vCodeUpper)) return false;

      // Check còn lượt sử dụng không
      if (v.usageLimit !== undefined && v.usageLimit !== null) {
        if (v.usageLimit <= 0 || v.usedCount >= v.usageLimit) return false;
      }
      return true;
    });

    let bestVoucher = null;
    let bestDiscount = 0;

    filteredVouchers.forEach((v) => {
      let applicableTotal = 0;
      
      if (v.type === "GLOBAL") {
        applicableTotal = totalValue;
      } else if (v.type === "SUPPLIER") {
        cart.items.forEach(item => {
          const device = item.deviceId;
          if (device && device.supplierId.equals(v.supplierId)) {
            applicableTotal += device.rentPrice.perDay * item.totalDays * item.quantity;
          }
        });
      }

      if (applicableTotal >= v.minOrderValue) {
        let discount = 0;
        if (v.discountType === "PERCENT") {
          discount = Math.round((applicableTotal * v.discountValue) / 100);
          if (v.maxDiscount) {
            discount = Math.min(discount, v.maxDiscount);
          }
        } else if (v.discountType === "FIXED") {
          discount = Math.min(v.discountValue, applicableTotal);
        }

        if (discount > bestDiscount) {
          bestDiscount = discount;
          bestVoucher = {
            ...v,
            applicableTotal,
            discount
          };
        }
      }
    });

    if (!bestVoucher) {
      return res.status(200).json({
        success: true,
        message: "Không có voucher phù hợp",
        voucher: null,
        discount: 0
      });
    }

    res.status(200).json({
      success: true,
      message: `Đã tự động áp dụng voucher ${bestVoucher.code}`,
      voucher: {
        code: bestVoucher.code,
        type: bestVoucher.type,
        discountType: bestVoucher.discountType,
        discountValue: bestVoucher.discountValue,
        discount: bestVoucher.discount,
        applicableTotal: bestVoucher.applicableTotal
      }
    });
  } catch (error) {
    console.error("Auto apply voucher error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi server khi tự động áp dụng voucher"
    });
  }
};

