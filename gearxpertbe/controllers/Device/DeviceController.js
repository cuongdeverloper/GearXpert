const Device = require("../../models/Device");
const RentalItem = require("../../models/RentalItem"); // Kiểm tra lại đường dẫn model của bạn
const Review = require("../../models/Review");

/**
 * POST /devices
 * Create new device (Supplier only)
 */
exports.createDevice = async (req, res) => {
  try {
    // Get supplierId from token (JWT)
    const supplierId = req.user.id;
    
    let { name, description, category, rentPrice, depositAmount, location, stockQuantity } = req.body;

    // Parse rentPrice if string
    if (typeof rentPrice === 'string') {
      try {
        rentPrice = JSON.parse(rentPrice);
      } catch (e) {
        return res.status(400).json({ message: "Invalid rentPrice format" });
      }
    }
    // Parse location if string
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (e) {
        location = { warehouse: '', city: '' };
      }
    }
    // Parse stockQuantity
    if (typeof stockQuantity === 'string') {
      stockQuantity = parseInt(stockQuantity) || 1;
    }

    // Validate required fields
    if (!name || !description || !category || !rentPrice || !depositAmount) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!rentPrice.perDay || rentPrice.perDay <= 0) {
      return res.status(400).json({ message: "Invalid rentPrice - perDay is required and must be > 0" });
    }
    if (depositAmount <= 0) {
      return res.status(400).json({ message: "depositAmount must be > 0" });
    }

    // Xử lý images upload từ req.files (Cloudinary)
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => file.path);
    }

    // Create new device
    const newDevice = new Device({
      name,
      description,
      category,
      rentPrice,
      depositAmount,
      location,
      stockQuantity,
      supplierId,
      images,
      status: "AVAILABLE",
      isAddon: false,
      ratingAvg: 0,
      reviewCount: 0,
    });

    await newDevice.save();

    res.status(201).json({
      message: "Device created successfully",
      device: newDevice,
    });
  } catch (error) {
    console.error("Error creating device:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /devices
 * Get list of available devices with optional filters
 */
exports.getDevices = async (req, res) => {
  try {
    const { category, status, limit = 12, page = 1 } = req.query;

    const query = {
      isAddon: false,
    };

    if (category) {
      query.category = category;
    }

    // Add status filter if provided, otherwise show all statuses
    if (status) {
      query.status = status;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const devices = await Device.find(query)
      .select("name description rentPrice ratingAvg reviewCount location images category status stockQuantity depositAmount")
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ ratingAvg: -1, reviewCount: -1 });

    const total = await Device.countDocuments(query);
    console.log(devices);

    res.json({
      devices,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /devices/:id
 */
exports.getDeviceDetail = async (req, res) => {
  try {
    // 1. Lấy thông tin thiết bị và thông tin Supplier
    const device = await Device.findById(req.params.id).populate(
      "supplierId",
      "fullName avatar email phone"
    );

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    // 2. Lấy danh sách đánh giá (Reviews) của thiết bị này
    // Giả sử Model Review có field deviceId
    const reviews = await Review.find({ deviceId: device._id })
      .populate("userId", "fullName avatar")
      .sort({ createdAt: -1 });

    // 3. Lấy các đơn thuê đang hoạt động để tính lịch bận (Occupied Dates)
    const activeBookings = await RentalItem.find({
      deviceId: device._id,
    }).populate({
      path: "rentalId",
      select: "status", // Chỉ lấy field status để tối ưu
    });

    // Lọc: Chỉ lấy những item thuộc về đơn hàng có trạng thái "Gây bận"
    // Lưu ý: Đã xóa "CANCELLED" khỏi danh sách gây bận lịch
    const busyStatuses = [
      "PENDING",
      "PAID",
      "APPROVED",
      "DELIVERING",
      "RENTING",
      "RETURNING",
      "INSPECTING",
    ];

    const occupiedDates = activeBookings
      .filter(
        (item) => item.rentalId && busyStatuses.includes(item.rentalId.status)
      )
      .map((item) => ({
        start: item.rentalStartDate,
        end: item.rentalEndDate,
        quantity: item.quantity,
      }));

    // 4. Hợp nhất dữ liệu trả về
    const deviceData = device.toObject();

    res.json({
      ...deviceData,
      reviews, // Trả về mảng review chi tiết
      occupiedDates,
      // Đảm bảo specs được convert sang object nếu nó là Map
      specs:
        device.specs instanceof Map
          ? Object.fromEntries(device.specs)
          : deviceData.specs || {},
    });
  } catch (error) {
    console.error("Error Detail Device API:", error);
    res.status(500).json({ message: error.message });
  }
};
/**
 * GET /devices/:id/addons
 */
exports.getDeviceAddons = async (req, res) => {
  const deviceId = req.params.id;

  const addons = await Device.find({
    isAddon: true,
    compatibleWith: deviceId,
    status: "AVAILABLE",
  }).select("name rentPrice images");

  res.json(addons);
};
/**
 * GET /devices/:id/related
 */
exports.getRelatedDevices = async (req, res) => {
  const device = await Device.findById(req.params.id);
  if (!device) return res.status(404).json({ message: "Device not found" });

  const related = await Device.find({
    _id: { $ne: device._id },
    category: device.category,
    status: "AVAILABLE",
  })
    .limit(4)
    .select("name rentPrice ratingAvg location images");

  res.json(related);
};

/**
 * PUT /devices/:id
 * Update device information
 */
exports.updateDevice = async (req, res) => {
    // Debug đầu vào
    console.log('[BE] updateDevice req.headers:', req.headers);
    console.log('[BE] updateDevice req.body:', req.body);
    console.log('[BE] updateDevice req.files:', req.files);

  try {
    const { id } = req.params;
    let { name, description, category, rentPrice, depositAmount, location, stockQuantity, oldImages } = req.body;

    // Debug: log raw body and files
    console.log('[BE] updateDevice req.body:', req.body);
    console.log('[BE] updateDevice req.files:', req.files);

    // Parse rentPrice if string
    if (typeof rentPrice === 'string') {
      try {
        rentPrice = JSON.parse(rentPrice);
      } catch (e) {
        return res.status(400).json({ message: "Invalid rentPrice format" });
      }
    }
    // Parse location if string
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (e) {
        location = { warehouse: '', city: '' };
      }
    }
    // Parse stockQuantity
    if (typeof stockQuantity === 'string') {
      stockQuantity = parseInt(stockQuantity) || 1;
    }

    // Handle images: combine oldImages (from body) and new uploaded images
    let images = [];
    // Xử lý oldImages: nếu là mảng (nhiều input), nếu là string (1 input hoặc JSON.stringify)
    if (oldImages) {
      if (Array.isArray(oldImages)) {
        images = oldImages;
      } else if (typeof oldImages === 'string') {
        try {
          const parsed = JSON.parse(oldImages);
          images = Array.isArray(parsed) ? parsed : [parsed];
        } catch (e) {
          images = [oldImages];
        }
      }
    }
    // Multer.fields: req.files.images hoặc req.files['images[]'] là mảng file nếu có upload
    if (req.files) {
      if (Array.isArray(req.files.images)) {
        images = images.concat(req.files.images.map(file => file.path));
      }
      if (Array.isArray(req.files['images[]'])) {
        images = images.concat(req.files['images[]'].map(file => file.path));
      }
      // fallback: trường hợp Multer.array (tương thích cũ)
      if (Array.isArray(req.files)) {
        images = images.concat(req.files.map(file => file.path));
      }
    }
    console.log('[BE] updateDevice images after merge:', images);

    // Validate required fields
    if (!name || !description || !category || !rentPrice || !depositAmount) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!rentPrice.perDay || rentPrice.perDay <= 0) {
      return res.status(400).json({ message: "Invalid rentPrice - perDay is required and must be > 0" });
    }
    if (depositAmount <= 0) {
      return res.status(400).json({ message: "depositAmount must be > 0" });
    }

    const device = await Device.findByIdAndUpdate(
      id,
      {
        name,
        description,
        category,
        rentPrice,
        depositAmount,
        location,
        stockQuantity,
        images,
      },
      { new: true, runValidators: true }
    );

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    res.json({
      message: "Device updated successfully",
      device,
    });
  } catch (error) {
    console.error("[BE] Error updating device:", error);
    if (error && error.stack) {
      console.error("[BE] Error stack:", error.stack);
    }
    try {
      console.error("[BE] Error (JSON):", JSON.stringify(error));
    } catch (e) {
      // ignore
    }
    res.status(500).json({ message: error.message, error });
  }
};

/**
 * DELETE /devices/:id
 * Delete device - only if not currently rented
 */
exports.deleteDevice = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if device is currently rented
    const activeRentals = await RentalItem.findOne({
      deviceId: id,
    }).populate({
      path: "rentalId",
      select: "status",
    });

    if (activeRentals && activeRentals.rentalId) {
      const busyStatuses = [
        "PENDING",
        "PAID",
        "APPROVED",
        "DELIVERING",
        "RENTING",
        "RETURNING",
        "INSPECTING",
      ];

      if (busyStatuses.includes(activeRentals.rentalId.status)) {
        return res.status(400).json({
          message: "Cannot delete device - it is currently rented or pending rental",
          isRented: true,
        });
      }
    }

    // Xóa thiết bị nếu không bị thuê
    const device = await Device.findByIdAndDelete(id);
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    res.json({ message: "Device deleted successfully", device });
  } catch (error) {
    console.error("Error getting supplier devices:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /devices/supplier/:supplierId
 * Lấy danh sách thiết bị của một supplier
 */
exports.getSupplierDevices = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { category, status, limit = 12, page = 1 } = req.query;

    const query = {
      supplierId,
      isAddon: false,
    };
    if (category) query.category = category;
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const devices = await Device.find(query)
      .select("name description rentPrice ratingAvg reviewCount location images category status stockQuantity depositAmount")
      .limit(parseInt(limit))
      .skip(skip)
      .sort({ ratingAvg: -1, reviewCount: -1 });

    const total = await Device.countDocuments(query);

    res.json({
      devices,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Error getSupplierDevices:", error);
    res.status(500).json({ message: error.message });
  }
};