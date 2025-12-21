const Cart = require('../../models/Cart');
const CartItem = require('../../models/CartItem');
const Device = require('../../models/Device');

const DAY = 1000 * 60 * 60 * 24;

/**
 * GET /cart?type=NORMAL|INSTANT
 */
exports.getCart = async (req, res) => {
  const customerId = req.user._id;
  const cartType = req.query.type || 'NORMAL';

  const cart = await Cart.findOne({
    customerId,
    cartType
  }).populate({
    path: 'items',
    populate: { path: 'deviceId' }
  });

  res.json(cart || { items: [] });
};

/**
 * POST /cart/items (NORMAL)
 */
exports.addToCart = async (req, res) => {
  const customerId = req.user._id;
  const { deviceId, quantity, rentalStartDate, rentalEndDate } = req.body;

  const device = await Device.findById(deviceId);
  if (!device || device.status !== 'AVAILABLE') {
    return res.status(400).json({ message: 'Device not available' });
  }

  const start = new Date(rentalStartDate);
  const end = new Date(rentalEndDate);
  const totalDays = Math.max(1, Math.ceil((end - start) / DAY));

  let cart = await Cart.findOne({
    customerId,
    cartType: 'NORMAL'
  });

  if (!cart) {
    cart = await Cart.create({ customerId, cartType: 'NORMAL' });
  }

  const item = await CartItem.create({
    cartId: cart._id,
    deviceId,
    quantity,
    rentalStartDate: start,
    rentalEndDate: end,
    totalDays
  });

  cart.items.push(item._id);
  await cart.save();

  res.status(201).json({ message: 'Added to cart' });
};

/**
 * POST /cart/instant (BUY NOW)
 */
exports.instantBuy = async (req, res) => {
  const customerId = req.user._id;
  const { deviceId, quantity, rentalStartDate, rentalEndDate } = req.body;

  await Cart.deleteOne({ customerId, cartType: 'INSTANT' });

  const device = await Device.findById(deviceId);
  if (!device || device.status !== 'AVAILABLE') {
    return res.status(400).json({ message: 'Device not available' });
  }

  const start = new Date(rentalStartDate);
  const end = new Date(rentalEndDate);
  const totalDays = Math.max(1, Math.ceil((end - start) / DAY));

  const cart = await Cart.create({
    customerId,
    cartType: 'INSTANT'
  });

  const item = await CartItem.create({
    cartId: cart._id,
    deviceId,
    quantity,
    rentalStartDate: start,
    rentalEndDate: end,
    totalDays
  });

  cart.items.push(item._id);
  await cart.save();

  res.status(201).json({ message: 'Instant cart created' });
};
