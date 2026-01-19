const Cart = require('../../models/Cart');
const CartItem = require('../../models/CartItem');
const Device = require('../../models/Device');

const DAY = 1000 * 60 * 60 * 24;

/**
 * GET /cart?type=NORMAL|INSTANT
 */
exports.getCart = async (req, res) => {
  const customerId = req.user.id;
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
  console.log('USER:', req.user);
  const customerId = req.user.id;
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
  try {
    const customerId = req.user.id;
    const { deviceId, quantity, rentalStartDate, rentalEndDate } = req.body;

    // 1. Dọn dẹp giỏ hàng INSTANT cũ của user này
    const oldCart = await Cart.findOne({ customerId, cartType: 'INSTANT' });
    if (oldCart) {
      await CartItem.deleteMany({ cartId: oldCart._id });
      await Cart.deleteOne({ _id: oldCart._id });
    }

    const device = await Device.findById(deviceId);
    if (!device || device.status !== 'AVAILABLE') {
      return res.status(400).json({ message: 'Thiết bị không sẵn sàng' });
    }

    const start = new Date(rentalStartDate);
    const end = new Date(rentalEndDate);
    const totalDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

    // 2. Tạo giỏ hàng mới
    const cart = await Cart.create({ customerId, cartType: 'INSTANT' });

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

    res.status(201).json({ message: 'Instant cart created', cartType: 'INSTANT' });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi server' });
  }
};
/**
 * DELETE /cart/items/:cartItemId
 */
exports.removeCartItem = async (req, res) => {
  const customerId = req.user.id;
  const { cartItemId } = req.params;

  const item = await CartItem.findById(cartItemId);
  if (!item) return res.status(404).json({ message: 'Item not found' });

  const cart = await Cart.findOne({
    _id: item.cartId,
    customerId
  });

  if (!cart) return res.status(403).json({ message: 'Access denied' });

  await CartItem.deleteOne({ _id: cartItemId });
  cart.items.pull(cartItemId);
  await cart.save();

  res.json({ message: 'Item removed' });
};

/**
 * DELETE /cart/clear?type=NORMAL|INSTANT
 */
exports.clearCart = async (req, res) => {
  const customerId = req.user._id;
  const cartType = req.query.type || 'NORMAL';

  const cart = await Cart.findOne({ customerId, cartType });
  if (!cart) return res.json({ message: 'Cart already empty' });

  await CartItem.deleteMany({ cartId: cart._id });
  await Cart.deleteOne({ _id: cart._id });

  res.json({ message: 'Cart cleared' });
};
