const Cart = require("../../models/Cart");
const CartItem = require("../../models/CartItem");
const Device = require("../../models/Device");
const DeviceItem = require("../../models/DeviceItem");

const DAY = 1000 * 60 * 60 * 24;

/**
 * GET /cart?type=NORMAL|INSTANT
 * - Load giỏ hàng và tự động xóa các item không còn khả dụng
 * - Kiểm tra thực tế từ DeviceItem (AVAILABLE count)
 * - Không tự động thay thế DeviceItem ở đây → để ở checkout/rental creation
 */
exports.getCart = async (req, res) => {
  const customerId = req.user.id;
  const cartType = req.query.type || "NORMAL";

  try {
    // Tìm cart và populate items + device + supplier
    let cart = await Cart.findOne({ customerId, cartType }).populate({
      path: "items",
      populate: {
        path: "deviceId",
        select: "supplierId name slug rentPrice depositAmount images status",
        populate: {
          path: "supplierId",
          select: "fullName avatar cccd address phone email username",
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return res.json({ items: [], message: "Giỏ hàng trống" });
    }

    const invalidItemIds = [];

    // Kiểm tra từng item trong giỏ
    for (const item of cart.items) {
      const device = item.deviceId;

      if (!device) {
        invalidItemIds.push(item._id);
        continue;
      }

      // Đếm số lượng thực tế AVAILABLE từ DeviceItem
      const availableCount = await DeviceItem.countDocuments({
        deviceId: device._id,
        status: "AVAILABLE",
      });

      // Item invalid nếu:
      // - Device bị dừng/không còn bán
      // - Hoặc không đủ số lượng khả dụng
      const isInvalid =
        device.status === "STOPPED" ||
        device.status === "DISCONTINUED" ||
        device.status === "SUSPICIOUS" ||
        availableCount < item.quantity;

      if (isInvalid) {
        invalidItemIds.push(item._id);
      }
    }

    let cleaned = false;
    if (invalidItemIds.length > 0) {
      cleaned = true;

      // Xóa các CartItem invalid
      await CartItem.deleteMany({ _id: { $in: invalidItemIds } });

      // Lọc lại mảng items trong cart object
      cart.items = cart.items.filter(
        (item) => !invalidItemIds.some((id) => id.equals(item._id))
      );

      // Lưu cart sau khi lọc
      await cart.save();

      // Populate lại cart để trả về dữ liệu mới nhất
      cart = await Cart.findById(cart._id).populate({
        path: "items",
        populate: {
          path: "deviceId",
          select: "supplierId name slug rentPrice depositAmount images status",
          populate: { path: "supplierId", select: "fullName avatar cccd address phone email username" },
        },
      });

      console.log(
        `Đã tự động xóa ${invalidItemIds.length} cartItem không hợp lệ cho user ${customerId}`
      );
    }

    // Trả về response
    res.json({
      ...cart.toObject(),
      cleaned,
      message: cleaned
        ? `Đã tự động xóa ${invalidItemIds.length} sản phẩm không còn khả dụng`
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
  const customerId = req.user.id;
  const { deviceId, quantity = 1, rentalStartDate, rentalEndDate } = req.body;

  try {
    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ message: "Thiết bị không tồn tại" });
    }

    if (
      device.status === "STOPPED" ||
      device.status === "DISCONTINUED" ||
      device.status === "SUSPICIOUS"
    ) {
      return res
        .status(400)
        .json({ message: "Thiết bị hiện không khả dụng để thêm vào giỏ" });
    }

    const availableCount = await DeviceItem.countDocuments({
      deviceId,
      status: "AVAILABLE",
    });

    if (availableCount < quantity) {
      return res.status(400).json({
        message: `Chỉ còn ${availableCount} thiết bị khả dụng để thuê`,
      });
    }

    const start = new Date(rentalStartDate);
    const end = new Date(rentalEndDate);
    if (end <= start) {
      return res
        .status(400)
        .json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });
    }

    const totalDays = Math.max(1, Math.ceil((end - start) / DAY));

    let cart = await Cart.findOne({ customerId, cartType: "NORMAL" });
    if (!cart) {
      cart = await Cart.create({ customerId, cartType: "NORMAL" });
    }

    // Kiểm tra trùng item cùng thời gian (tăng quantity nếu có)
    const existingItem = await CartItem.findOne({
      cartId: cart._id,
      deviceId,
      rentalStartDate: start,
      rentalEndDate: end,
    });

    if (existingItem) {
      existingItem.quantity += quantity;
      await existingItem.save();
      return res
        .status(200)
        .json({ message: "Đã cập nhật số lượng trong giỏ" });
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

    res
      .status(201)
      .json({ message: "Đã thêm vào giỏ hàng", cartItemId: item._id });
  } catch (err) {
    console.error("Add to Cart Error:", err);
    res.status(500).json({ message: "Lỗi khi thêm vào giỏ hàng" });
  }
};

// Các hàm còn lại giữ nguyên như bạn gửi (addInstantToCart, removeCartItem, clearCart, addComboToCart)
// Vì chúng đã ổn và không cần thay đổi lớn

/**
 * POST /cart/instant (BUY NOW / Mua ngay)
 */
exports.addInstantToCart = async (req, res) => {
  const customerId = req.user.id;
  const { deviceId, quantity = 1, rentalStartDate, rentalEndDate } = req.body;

  try {
    // Xóa giỏ INSTANT cũ
    await CartItem.deleteMany({
      cartId: {
        $in: await Cart.distinct("_id", { customerId, cartType: "INSTANT" }),
      },
    });
    await Cart.deleteMany({ customerId, cartType: "INSTANT" });

    const device = await Device.findById(deviceId);
    if (!device) {
      return res.status(404).json({ message: "Thiết bị không tồn tại" });
    }

    // Check if device is active/available for rental
    if (device.status === "INACTIVE" || device.status === "SUSPENDED") {
      return res.status(400).json({ message: "Thiết bị hiện không khả dụng cho thuê" });
    }

    const availableCount = await DeviceItem.countDocuments({
      deviceId,
      status: "AVAILABLE",
    });

    console.log(`[addInstantToCart] Device: ${deviceId}, Requested: ${quantity}, Available: ${availableCount}`);

    if (availableCount < quantity) {
      return res.status(400).json({
        message: `Chỉ còn ${availableCount} thiết bị khả dụng`,
        availableCount,
        requestedQuantity: quantity
      });
    }

    const start = new Date(rentalStartDate);
    const end = new Date(rentalEndDate);
    if (end <= start) {
      return res
        .status(400)
        .json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });
    }

    const totalDays = Math.max(1, Math.ceil((end - start) / DAY));

    const cart = await Cart.create({ customerId, cartType: "INSTANT" });

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

    const populatedCart = await Cart.findById(cart._id).populate({
      path: "items",
      populate: {
        path: "deviceId",
        select: "name slug rentPrice images status",
        populate: { path: "supplierId", select: "fullName avatar" },
      },
    });

    res.status(201).json({
      success: true,
      message: "Đã tạo giỏ INSTANT",
      cart: populatedCart,
    });
  } catch (err) {
    console.error("[addInstantToCart] Error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

/**
 * DELETE /cart/items/:cartItemId
 */
exports.removeCartItem = async (req, res) => {
  const customerId = req.user.id;
  const { cartItemId } = req.params;

  try {
    const item = await CartItem.findById(cartItemId);
    if (!item) return res.status(404).json({ message: "Item không tồn tại" });

    const cart = await Cart.findOne({ _id: item.cartId, customerId });
    if (!cart) return res.status(403).json({ message: "Không có quyền" });

    await CartItem.deleteOne({ _id: cartItemId });
    cart.items.pull(cartItemId);
    await cart.save();

    res.json({ message: "Đã xóa item khỏi giỏ hàng" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

/**
 * DELETE /cart/clear?type=NORMAL|INSTANT
 */
exports.clearCart = async (req, res) => {
  const customerId = req.user.id;
  const cartType = req.query.type || "NORMAL";

  try {
    const cart = await Cart.findOne({ customerId, cartType });
    if (!cart) return res.json({ message: "Giỏ hàng đã trống" });

    await CartItem.deleteMany({ cartId: cart._id });
    await Cart.deleteOne({ _id: cart._id });

    res.json({ message: "Đã xóa toàn bộ giỏ hàng" });
  } catch (err) {
    res.status(500).json({ message: "Lỗi server" });
  }
};

/**
 * POST /cart/combo
 */
exports.addComboToCart = async (req, res) => {
  const customerId = req.user.id;
  const { comboItems, rentalStartDate, rentalEndDate } = req.body;

  if (!Array.isArray(comboItems) || comboItems.length === 0) {
    return res.status(400).json({ message: "Combo không hợp lệ hoặc trống" });
  }

  try {
    const start = new Date(rentalStartDate);
    const end = new Date(rentalEndDate);
    if (end <= start) {
      return res
        .status(400)
        .json({ message: "Ngày kết thúc phải sau ngày bắt đầu" });
    }
    const totalDays = Math.max(1, Math.ceil((end - start) / DAY));

    let cart = await Cart.findOne({ customerId, cartType: "NORMAL" });
    if (!cart) {
      cart = await Cart.create({ customerId, cartType: "NORMAL" });
    }

    const added = [];
    const failed = [];

    for (const { deviceId, quantity = 1 } of comboItems) {
      const device = await Device.findById(deviceId);
      if (
        !device ||
        device.status === "STOPPED" ||
        device.status === "DISCONTINUED" ||
        device.status === "SUSPICIOUS"
      ) {
        failed.push({ deviceId, reason: "Không khả dụng" });
        continue;
      }

      const avail = await DeviceItem.countDocuments({
        deviceId,
        status: "AVAILABLE",
      });

      if (avail < quantity) {
        failed.push({ deviceId, reason: `Chỉ còn ${avail} khả dụng` });
        continue;
      }

      const cartItem = await CartItem.create({
        cartId: cart._id,
        deviceId,
        quantity,
        rentalStartDate: start,
        rentalEndDate: end,
        totalDays,
      });

      cart.items.push(cartItem._id);
      added.push(cartItem._id);
    }

    await cart.save();

    res.status(201).json({
      success: added.length > 0,
      message: `Thêm ${added.length} thiết bị thành công, ${failed.length} thất bại`,
      addedCount: added.length,
      failed,
      cart,
    });
  } catch (err) {
    console.error("[addComboToCart] Error:", err);
    res.status(500).json({ message: "Lỗi server" });
  }
};
/**
 * PUT /cart/items/:cartItemId
 * Cập nhật thông tin CartItem (chủ yếu là ngày thuê)
 * Hiện tại chỉ hỗ trợ update rentalStartDate + rentalEndDate
 * Có thể mở rộng sau để update quantity nếu cần
 */
exports.updateCartItem = async (req, res) => {
  const customerId = req.user.id;
  const { cartItemId } = req.params;
  const { rentalStartDate, rentalEndDate, quantity } = req.body;

  try {
    // Tìm CartItem
    const cartItem = await CartItem.findById(cartItemId);
    if (!cartItem) {
      return res.status(404).json({ message: "Không tìm thấy sản phẩm trong giỏ" });
    }

    // Kiểm tra quyền sở hữu qua Cart
    const cart = await Cart.findOne({
      _id: cartItem.cartId,
      customerId,
    });
    if (!cart) {
      return res.status(403).json({ message: "Không có quyền chỉnh sửa giỏ hàng này" });
    }

    const device = await Device.findById(cartItem.deviceId);
    if (!device || ["STOPPED", "DISCONTINUED", "SUSPICIOUS"].includes(device.status)) {
      return res.status(400).json({ message: "Thiết bị hiện không khả dụng" });
    }

    let updated = false;

    // Update ngày thuê
    if (rentalStartDate || rentalEndDate) {
      const start = rentalStartDate ? new Date(rentalStartDate) : cartItem.rentalStartDate;
      const end = rentalEndDate ? new Date(rentalEndDate) : cartItem.rentalEndDate;

      if (end <= start) {
        return res.status(400).json({
          message: "Ngày kết thúc phải sau ngày bắt đầu ít nhất 1 ngày",
        });
      }

      // Kiểm tra số lượng khả dụng (có thể cải tiến sau bằng cách check conflict booking)
      const availableCount = await DeviceItem.countDocuments({
        deviceId: cartItem.deviceId,
        status: "AVAILABLE",
      });

      if (availableCount < cartItem.quantity) {
        return res.status(400).json({
          message: `Hiện chỉ còn ${availableCount} thiết bị khả dụng, không đủ để giữ lịch này`,
        });
      }

      cartItem.rentalStartDate = start;
      cartItem.rentalEndDate = end;
      cartItem.totalDays = Math.max(
        1,
        Math.ceil((end - start) / (1000 * 60 * 60 * 24))
      );

      updated = true;
    }

    // Update số lượng (nếu gửi lên)
    if (quantity !== undefined) {
      if (quantity < 1) {
        return res.status(400).json({ message: "Số lượng phải lớn hơn 0" });
      }

      const availableCount = await DeviceItem.countDocuments({
        deviceId: cartItem.deviceId,
        status: "AVAILABLE",
      });

      if (availableCount < quantity) {
        return res.status(400).json({
          message: `Chỉ còn ${availableCount} thiết bị khả dụng`,
        });
      }

      cartItem.quantity = quantity;
      updated = true;
    }

    if (!updated) {
      return res.status(400).json({ message: "Không có thông tin nào được cập nhật" });
    }

    await cartItem.save();

    // Trả về cartItem đã update + thông tin device để frontend dễ render
    const populatedItem = await CartItem.findById(cartItem._id).populate({
      path: "deviceId",
      select: "name slug rentPrice depositAmount images status",
      populate: { path: "supplierId", select: "fullName" },
    });

    res.json({
      success: true,
      message: "Đã cập nhật lịch thuê thành công",
      cartItem: populatedItem,
    });
  } catch (err) {
    console.error("[updateCartItem] Error:", err);
    res.status(500).json({ message: "Lỗi server khi cập nhật giỏ hàng" });
  }
};