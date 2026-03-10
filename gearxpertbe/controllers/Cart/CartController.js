const Cart = require("../../models/Cart");
const CartItem = require("../../models/CartItem");
const Device = require("../../models/Device");

const DAY = 1000 * 60 * 60 * 24;

/**
 * GET /cart?type=NORMAL|INSTANT
 */
/**
 * GET /cart?type=NORMAL|INSTANT
 */
/**
 * GET /cart?type=NORMAL|INSTANT
 */
exports.getCart = async (req, res) => {
  const customerId = req.user.id;
  const cartType = req.query.type || "NORMAL";

  try {
    // Tìm cart và populate
    let cart = await Cart.findOne({
      customerId,
      cartType,
    }).populate({
      path: "items",
      populate: {
        path: "deviceId",
        select: "supplierId name rentPrice depositAmount stockQuantity images status",
        populate: {
          path: "supplierId",
          select: "fullName avatar",
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return res.json({ items: [], message: "Giỏ hàng trống" });
    }

    // Danh sách cartItem cần xóa
    const invalidItemIds = [];

    // Kiểm tra từng item
    for (const item of cart.items) {
      if (!item.deviceId) {
        // Thiết bị bị xóa hoặc không populate được
        invalidItemIds.push(item._id);
        continue;
      }

      const device = item.deviceId;

      // Kiểm tra hợp lệ
      const isInvalid =
        !device ||                                   // Không tồn tại
        device.status !== "AVAILABLE" ||             // Không khả dụng
        device.stockQuantity < item.quantity ||      // Hết hàng
        device.stockQuantity === 0;                  // Stock = 0

      if (isInvalid) {
        invalidItemIds.push(item._id);
      }
    }

    // Nếu có item không hợp lệ → xóa chúng
    let cleaned = false;
    if (invalidItemIds.length > 0) {
      cleaned = true;

      // Xóa CartItem
      await CartItem.deleteMany({ _id: { $in: invalidItemIds } });

      // Cập nhật mảng items trong Cart
      cart.items = cart.items.filter(
        (item) => !invalidItemIds.some((id) => id.equals(item._id))
      );

      // Lưu cart
      await cart.save();

      console.log(
        `Đã tự động xóa ${invalidItemIds.length} cartItem không hợp lệ cho user ${customerId}`
      );
    }

    // Populate lại cart để trả về data mới nhất
    cart = await Cart.findById(cart._id).populate({
      path: "items",
      populate: {
        path: "deviceId",
        select: "supplierId name rentPrice depositAmount stockQuantity images status",
        populate: {
          path: "supplierId",
          select: "fullName avatar",
        },
      },
    });

    // Trả về
    res.json({
      ...cart.toObject(),
      cleaned, 
      message: cleaned
        ? `Đã tự động xóa ${invalidItemIds.length} sản phẩm hết hàng hoặc không khả dụng`
        : "Giỏ hàng hiện tại",
    });
  } catch (err) {
    console.error("Get Cart Error:", err);
    res.status(500).json({ message: "Lỗi khi lấy giỏ hàng" });
  }
};

/**
 * POST /cart/items (NORMAL)
 */
exports.addToCart = async (req, res) => {
  console.log("USER:", req.user);
  const customerId = req.user.id;
  const { deviceId, quantity, rentalStartDate, rentalEndDate } = req.body;

  const device = await Device.findById(deviceId);

  const start = new Date(rentalStartDate);
  const end = new Date(rentalEndDate);
  const totalDays = Math.max(1, Math.ceil((end - start) / DAY));

  let cart = await Cart.findOne({
    customerId,
    cartType: "NORMAL",
  });

  if (!cart) {
    cart = await Cart.create({ customerId, cartType: "NORMAL" });
  }

  const item = await CartItem.create({
    cartId: cart._id,
    deviceId,
    quantity,
    rentalStartDate: start,
    rentalEndDate: end,
    totalDays,
  });

  cart.items.push(item._id);
  await cart.save();

  res.status(201).json({ message: "Added to cart" });
};

/**
 * POST /cart/instant (BUY NOW)
 */
exports.addInstantToCart = async (req, res) => {
  try {
    const customerId = req.user.id;
    const { deviceId, quantity, rentalStartDate, rentalEndDate } = req.body;

    // Log request để debug
    console.log("[addInstantToCart] Request body:", req.body);

    // 1. Dọn dẹp giỏ INSTANT cũ
    const oldCart = await Cart.findOne({ customerId, cartType: "INSTANT" });
    if (oldCart) {
      await CartItem.deleteMany({ cartId: oldCart._id });
      await Cart.deleteOne({ _id: oldCart._id });
      console.log("[addInstantToCart] Cleared old INSTANT cart:", oldCart._id);
    }

    // 2. Kiểm tra device (PHẢI QUERY TRƯỚC)
    const device = await Device.findById(deviceId);
    if (!device) {
      console.error("[addInstantToCart] Device not found:", deviceId);
      return res.status(400).json({ message: "Thiết bị không tồn tại" });
    }

    // Kiểm tra số lượng khả dụng (dùng virtual availableQuantity)
    if (device.availableQuantity < quantity) {
      console.warn("[addInstantToCart] Not enough available quantity", {
        deviceId,
        requested: quantity,
        available: device.availableQuantity,
      });
      return res.status(400).json({
        message: `Chỉ còn ${device.availableQuantity} thiết bị khả dụng để thuê`,
      });
    }

    // Optional: Nếu rented >= stock → set status RENTED (nếu cần nhất quán)
    if (
      device.rentedQuantity >= device.stockQuantity &&
      device.status !== "RENTED"
    ) {
      device.status = "RENTED";
      await device.save();
    }

    // 3. Tính totalDays
    const start = new Date(rentalStartDate);
    const end = new Date(rentalEndDate);
    if (end <= start) {
      return res
        .status(400)
        .json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });
    }
    const totalDays = Math.max(
      1,
      Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    );

    // 4. Tạo cart mới
    const cart = await Cart.create({ customerId, cartType: "INSTANT" });
    console.log("[addInstantToCart] Created new INSTANT cart:", cart._id);

    // 5. Tạo CartItem
    const item = await CartItem.create({
      cartId: cart._id,
      deviceId,
      quantity,
      rentalStartDate: start,
      rentalEndDate: end,
      totalDays,
    });
    console.log("[addInstantToCart] Created CartItem:", item._id);

    // 6. PUSH item vào cart
    cart.items.push(item._id);
    await cart.save();
    console.log("[addInstantToCart] Updated cart items:", cart.items);

    // 7. Trả về cart đầy đủ (populate để frontend dùng)
    const populatedCart = await Cart.findById(cart._id).populate({
      path: "items",
      populate: {
        path: "deviceId",
        select:
          "name rentPrice images stockQuantity rentedQuantity availableQuantity",
      },
    });

    res.status(201).json({
      success: true,
      message: "Đã tạo giỏ INSTANT và thêm thiết bị",
      cart: populatedCart,
    });
  } catch (err) {
    console.error("[addInstantToCart] Error:", {
      message: err.message,
      stack: err.stack,
      body: req.body,
    });
    res.status(500).json({ message: "Lỗi server khi tạo giỏ INSTANT" });
  }
};
/**
 * DELETE /cart/items/:cartItemId
 */
exports.removeCartItem = async (req, res) => {
  const customerId = req.user.id;
  const { cartItemId } = req.params;

  const item = await CartItem.findById(cartItemId);
  if (!item) return res.status(404).json({ message: "Item not found" });

  const cart = await Cart.findOne({
    _id: item.cartId,
    customerId,
  });

  if (!cart) return res.status(403).json({ message: "Access denied" });

  await CartItem.deleteOne({ _id: cartItemId });
  cart.items.pull(cartItemId);
  await cart.save();

  res.json({ message: "Item removed" });
};

/**
 * DELETE /cart/clear?type=NORMAL|INSTANT
 */
exports.clearCart = async (req, res) => {
  const customerId = req.user._id;
  const cartType = req.query.type || "NORMAL";

  const cart = await Cart.findOne({ customerId, cartType });
  if (!cart) return res.json({ message: "Cart already empty" });

  await CartItem.deleteMany({ cartId: cart._id });
  await Cart.deleteOne({ _id: cart._id });

  res.json({ message: "Cart cleared" });
};
