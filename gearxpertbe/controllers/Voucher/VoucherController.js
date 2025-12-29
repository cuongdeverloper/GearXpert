const Voucher = require("../../models/Voucher");
const Cart = require("../../models/Cart");

exports.validateVoucher = async (req, res) => {
  const { code, cartType } = req.body;
  const customerId = req.user._id;

  const voucher = await Voucher.findOne({
    code: code.toUpperCase(),
    status: "ACTIVE"
  });

  if (!voucher) {
    return res.status(400).json({ message: "Voucher không hợp lệ" });
  }

  if (voucher.expiredAt < new Date()) {
    return res.status(400).json({ message: "Voucher đã hết hạn" });
  }

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
    return res.status(400).json({ message: "Cart trống" });
  }

  let applicableTotal = 0;
  let supplierId = null;

  cart.items.forEach(item => {
    const device = item.deviceId;

    const itemTotal =
      device.rentPrice.perDay *
      item.totalDays *
      item.quantity;

    if (!supplierId) supplierId = device.supplierId.toString();

    if (
      voucher.type === "GLOBAL" ||
      (voucher.type === "SUPPLIER" &&
        device.supplierId.equals(voucher.supplierId))
    ) {
      applicableTotal += itemTotal;
    }
  });

  if (applicableTotal < voucher.minOrderValue) {
    return res.status(400).json({
      message: "Không đạt giá trị tối thiểu"
    });
  }

  let discount = 0;

  if (voucher.discountType === "PERCENT") {
    discount = Math.round(
      applicableTotal * voucher.discountValue / 100
    );
    if (voucher.maxDiscount) {
      discount = Math.min(discount, voucher.maxDiscount);
    }
  } else {
    discount = voucher.discountValue;
  }

  res.json({
    code: voucher.code,
    type: voucher.type,
    supplierId: voucher.supplierId,
    discount
  });
};
