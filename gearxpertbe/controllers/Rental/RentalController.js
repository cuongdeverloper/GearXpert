const Cart = require('../../models/Cart');
const CartItem = require('../../models/CartItem');
const Rental = require('../../models/Rental');
const RentalItem = require('../../models/RentalItem');
const Device = require('../../models/Device');

exports.checkoutRental = async (req, res) => {
  try {
    const customerId = req.user._id;
    const {
      cartType = 'NORMAL',
      deliveryAddress,
      phoneNumber,
      paymentMethod,
      useInsurance,
      notes
    } = req.body;

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

    let rentPriceTotal = 0;
    let depositAmount = 0;
    let supplierId = null;
    const rentalItems = [];

    for (const item of cart.items) {
      const device = item.deviceId;

      if (device.status !== 'AVAILABLE') {
        return res.status(400).json({ message: 'Device not available' });
      }

      supplierId = device.supplierId;

      const rent =
        device.rentPrice.perDay * item.totalDays * item.quantity;
      const deposit = device.depositAmount * item.quantity;

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
    const totalAmount =
      rentPriceTotal + depositAmount + insuranceAmount + deliveryFee;

    const rental = await Rental.create({
      customerId,
      supplierId,
      rentPriceTotal,
      depositAmount,
      insuranceAmount,
      deliveryFee,
      totalAmount,
      paymentMethod,
      deliveryAddress,
      phoneNumber,
      notes
    });

    await RentalItem.insertMany(
      rentalItems.map(i => ({
        ...i,
        rentalId: rental._id
      }))
    );

    await Device.updateMany(
      { _id: { $in: rentalItems.map(i => i.deviceId) } },
      { status: 'RENTED' }
    );

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
