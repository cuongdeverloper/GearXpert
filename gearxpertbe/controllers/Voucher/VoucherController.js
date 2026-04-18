const mongoose = require("mongoose");
const Voucher = require("../../models/Voucher");
const Cart = require("../../models/Cart");
const Rental = require("../../models/Rental"); // Import Rental model
const SupplierProfile = require("../../models/SupplierProfile");
const { notifyFollowers } = require("../Supplier/SupplierController");

exports.validateVoucher = async (req, res) => {
  const { code, cartType } = req.body;
  const customerId = req.user.id;

  console.log(`[validateVoucher] Starting validation for code: "${code}", cartType: "${cartType}", customerId: ${customerId}`);

  // 1. Tìm voucher (case-insensitive)
  let voucher = await Voucher.findOne({
    code: { $regex: new RegExp(`^${code}$`, 'i') },
    status: "ACTIVE"
  });

  console.log(`[validateVoucher] Voucher found:`, voucher ? {
    code: voucher.code,
    status: voucher.status,
    type: voucher.type,
    expiredAt: voucher.expiredAt,
    usedCount: voucher.usedCount,
    usageLimit: voucher.usageLimit
  } : "NOT FOUND");

  // LOGIC VOUCHER THEO RANK: Reset mỗi tháng, không cộng dồn
  if (!voucher && code.toUpperCase().startsWith('RANK_')) {
    const User = require('../../models/User');
    const user = await User.findById(customerId);
    const userRank = (user?.rank || 'BRONZE').toUpperCase();
    
    // Kiểm tra xem User đã dùng voucher Rank trong tháng này chưa
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const usedRankVoucher = await Rental.findOne({
      customerId,
      voucherCode: { $regex: /^RANK_/i },
      status: { $nin: ['CANCELLED', 'REJECTED'] },
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    });

    if (usedRankVoucher) {
      return res.status(400).json({ 
        message: `Bạn đã sử dụng ưu đãi Rank của tháng ${now.getMonth() + 1}. Vui lòng quay lại vào tháng sau!` 
      });
    }

    const rankDiscounts = {
      SILVER: 5,
      GOLD: 10,
      PLATINUM: 15,
      DIAMOND: 20
    };

    const requestedRank = code.toUpperCase().replace('RANK_', '');
    if (requestedRank === userRank && rankDiscounts[userRank]) {
      voucher = {
        code: code.toUpperCase(),
        type: "GLOBAL",
        discountType: "PERCENT",
        discountValue: rankDiscounts[userRank],
        minOrderValue: 0,
        expiredAt: new Date(2099, 11, 31),
        usageLimit: 1, // Giới hạn 1 lần dùng đối với logic ảo này
        usedCount: 0,
        status: "ACTIVE"
      };
    }
  }

  if (!voucher) {
    return res.status(400).json({ message: "Voucher không hợp lệ hoặc không tồn tại" });
  }

  // 2. Kiểm tra hết hạn
  if (voucher.expiredAt < new Date()) {
    return res.status(400).json({ message: "Voucher đã hết hạn" });
  }

  // 3. Kiểm tra giới hạn sử dụng
  if (voucher.usageLimit !== undefined && voucher.usageLimit !== null) {
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
    const currentDate = new Date();

    // DEBUG: Find ALL vouchers to check connection
    const allVouchers = await Voucher.find({});

    // Find vouchers that are ACTIVE and not expired
    const vouchersRaw = await Voucher.find({
      status: "ACTIVE",
      expiredAt: { $gt: currentDate }
    }).sort({ createdAt: -1 }).lean();

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
      expiredAt
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
      status: "ACTIVE"
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
    const supplierId = req.user.id;
    const vouchersRaw = await Voucher.find({ supplierId }).sort({ createdAt: -1 }).lean();

    const profile = await SupplierProfile.findOne({ userId: supplierId })
      .select("businessName businessAvatar")
      .lean();

    const vouchers = vouchersRaw.map(v => ({
      ...v,
      shopInfo: profile ? {
        name: profile.businessName,
        avatar: profile.businessAvatar
      } : null
    }));

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
    const supplierId = req.user.id;
    const {
      code,
      description,
      discountType,
      discountValue,
      minOrderValue,
      maxDiscount,
      usageLimit,
      expiredAt
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
      status: "ACTIVE"
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
    const supplierId = req.user.id;

    if (!["ACTIVE", "INACTIVE"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Trạng thái không hợp lệ"
      });
    }

    const voucher = await Voucher.findOneAndUpdate(
      { _id: id, supplierId },
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
    const customerId = req.user.id;

    // 1. Lấy giỏ hàng
    const cart = await Cart.findOne({
      customerId,
      cartType: cartType || 'RENT'
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
      expiredAt: { $gt: currentDate }
    });

    // 3. Tính tổng giá trị cart và tìm voucher tốt nhất
    let bestVoucher = null;
    let maxDiscount = 0;

    for (const voucher of vouchers) {
      // Kiểm tra giới hạn sử dụng
      if (voucher.usageLimit !== undefined && voucher.usageLimit !== null) {
        if (voucher.usageLimit <= 0 || voucher.usedCount >= voucher.usageLimit) {
          continue;
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
    const customerId = req.user.id;
    const { cartType } = req.query;

    console.log(`[getAvailableVouchersForCart] customerId: ${customerId}, cartType: ${cartType}`);

    const cart = await Cart.findOne({
      customerId,
      cartType: cartType || "RENTAL"
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
      $expr: { $lt: ["$usedCount", "$usageLimit"] },
      $or: [
        { type: "GLOBAL" },
        { 
          type: "SUPPLIER",
          supplierId: { $in: Array.from(supplierIds).map(id => new mongoose.Types.ObjectId(id)) }
        }
      ]
    }).lean();

    const availableVouchers = vouchers.map(v => {
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
    const customerId = req.user.id;
    const { cartType } = req.body;

    const cart = await Cart.findOne({
      customerId,
      cartType: cartType || "RENTAL"
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
      $expr: { $lt: ["$usedCount", "$usageLimit"] },
      $or: [
        { type: "GLOBAL" },
        { 
          type: "SUPPLIER",
          supplierId: { $in: Array.from(supplierIds).map(id => new mongoose.Types.ObjectId(id)) }
        }
      ]
    }).lean();

    let bestVoucher = null;
    let bestDiscount = 0;

    vouchers.forEach(v => {
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

