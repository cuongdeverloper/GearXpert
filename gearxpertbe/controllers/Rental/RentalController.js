const Cart = require('../../models/Cart');
const CartItem = require('../../models/CartItem');
const Rental = require('../../models/Rental');
const RentalItem = require('../../models/RentalItem');
const Device = require('../../models/Device');
const Voucher = require('../../models/Voucher');

exports.checkoutRental = async (req, res) => {
  try {
    const customerId = req.user.id;

    const {
      cartType = 'NORMAL',
      deliveryAddress,
      phoneNumber,
      paymentMethod,
      useInsurance,
      notes,
      voucherCode
    } = req.body;

    /* ================= LOAD CART ================= */
    const cart = await Cart.findOne({
      customerId,
      cartType
    }).populate({
      path: 'items',
      populate: { path: 'deviceId' }
    });

    if (!cart || !cart.items.length) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    /* ================= CHECK 1 SUPPLIER ================= */
    let supplierId = null;

    for (const item of cart.items) {
      const deviceSupplierId = item.deviceId.supplierId.toString();
      if (!supplierId) supplierId = deviceSupplierId;
      else if (supplierId !== deviceSupplierId) {
        return res.status(400).json({
          message: 'Chỉ được checkout thiết bị từ 1 supplier'
        });
      }
    }

    /* ================= CALC PRICE ================= */
    let rentPriceTotal = 0;
    let depositAmount = 0;
    const rentalItems = [];

    for (const item of cart.items) {
      const device = item.deviceId;

      if (device.status !== 'AVAILABLE') {
        return res.status(400).json({
          message: `Thiết bị ${device.name} không khả dụng`
        });
      }

      const rent =
        device.rentPrice.perDay * item.totalDays * item.quantity;

      const deposit =
        device.depositAmount * item.quantity;

      rentPriceTotal += rent;
      depositAmount += deposit;

      rentalItems.push({
        deviceId: device._id,
        quantity: item.quantity,
        rentalStartDate: item.rentalStartDate,
        rentalEndDate: item.rentalEndDate,
        totalDays: item.totalDays,
        rentPrice: rent,
        depositAmount: deposit
      });
    }

    const insuranceAmount = useInsurance
      ? Math.round(rentPriceTotal * 0.05)
      : 0;

    const deliveryFee = 50000;

    /* ================= VOUCHER ================= */
    let appliedVoucher = null;
    let voucherDiscount = 0;

    if (voucherCode) {
      appliedVoucher = await Voucher.findOne({
        code: voucherCode.toUpperCase(),
        status: 'ACTIVE'
      });

      if (!appliedVoucher) {
        return res.status(400).json({ message: 'Voucher không hợp lệ' });
      }

      if (appliedVoucher.expiredAt < new Date()) {
        return res.status(400).json({ message: 'Voucher đã hết hạn' });
      }

      if (
        appliedVoucher.type === 'SUPPLIER' &&
        appliedVoucher.supplierId.toString() !== supplierId
      ) {
        return res.status(400).json({
          message: 'Voucher không áp dụng cho supplier này'
        });
      }

      if (rentPriceTotal < appliedVoucher.minOrderValue) {
        return res.status(400).json({
          message: 'Không đạt giá trị tối thiểu'
        });
      }

      if (appliedVoucher.discountType === 'PERCENT') {
        voucherDiscount = Math.round(
          rentPriceTotal * appliedVoucher.discountValue / 100
        );

        if (appliedVoucher.maxDiscount) {
          voucherDiscount = Math.min(
            voucherDiscount,
            appliedVoucher.maxDiscount
          );
        }
      } else {
        voucherDiscount = appliedVoucher.discountValue;
      }
    }

    /* ================= TOTAL ================= */
    const totalAmount =
      rentPriceTotal +
      depositAmount +
      insuranceAmount +
      deliveryFee -
      voucherDiscount;

    if (totalAmount < 0) {
      return res.status(400).json({ message: 'Tổng tiền không hợp lệ' });
    }

    /* ================= CREATE RENTAL ================= */
    const rental = await Rental.create({
      customerId,
      supplierId,
      rentPriceTotal,
      depositAmount,
      insuranceAmount,
      deliveryFee,
      totalAmount,
      paymentMethod,
      voucherCode: appliedVoucher?.code,
      voucherDiscount,
      deliveryAddress,
      phoneNumber,
      notes
    });

    /* ================= CREATE RENTAL ITEMS ================= */
    await RentalItem.insertMany(
      rentalItems.map(i => ({
        ...i,
        rentalId: rental._id
      }))
    );

    /* ================= UPDATE DEVICE ================= */
    await Device.updateMany(
      { _id: { $in: rentalItems.map(i => i.deviceId) } },
      { status: 'RENTED' }
    );

    /* ================= UPDATE VOUCHER ================= */
    if (appliedVoucher) {
      await Voucher.updateOne(
        { _id: appliedVoucher._id },
        { $inc: { usedCount: 1 } }
      );
    }

    /* ================= CLEAR CART ================= */
    await CartItem.deleteMany({ cartId: cart._id });
    await Cart.deleteOne({ _id: cart._id });

    res.status(201).json({
      message: 'Checkout successful',
      rentalId: rental._id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Checkout failed' });
  }
};

/**
 * GET /rentals/has-rented/:deviceId
 */
exports.hasRentedDevice = async (req, res) => {
  const customerId = req.user._id;
  const deviceId = req.params.deviceId;

  const rented = await RentalItem.findOne({ deviceId })
    .populate({
      path: 'rentalId',
      match: { customerId }
    });

  res.json({ hasRented: !!rented?.rentalId });
};
