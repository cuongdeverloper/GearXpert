const Voucher = require("../../models/Voucher");
const Cart = require("../../models/Cart");

exports.validateVoucher = async (req, res) => {
  const { code, cartType } = req.body;
  const customerId = req.user.id;

  // 1. Tìm voucher
  const voucher = await Voucher.findOne({
    code: code.toUpperCase(),
    status: "ACTIVE"
  });

  if (!voucher) {
    return res.status(400).json({ message: "Voucher không hợp lệ hoặc không tồn tại" });
  }

  // 2. Kiểm tra hết hạn
  if (voucher.expiredAt < new Date()) {
    return res.status(400).json({ message: "Voucher đã hết hạn" });
  }

  // 3. Kiểm tra giới hạn sử dụng (nếu có)
  if (voucher.usageLimit && voucher.usedCount >= voucher.usageLimit) {
    return res.status(400).json({ message: "Voucher đã hết lượt sử dụng" });
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
    const vouchers = await Voucher.find({
      status: "ACTIVE",
      expiredAt: { $gt: currentDate }
    }).sort({ createdAt: -1 });

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
    const vouchers = await Voucher.find({}).sort({ createdAt: -1 });
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
    const vouchers = await Voucher.find({ supplierId }).sort({ createdAt: -1 });

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

