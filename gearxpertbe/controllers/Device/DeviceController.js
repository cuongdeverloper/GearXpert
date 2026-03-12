const Device = require("../../models/Device");
const RentalItem = require("../../models/RentalItem"); // Kiểm tra lại đường dẫn model của bạn
const Review = require("../../models/Review");
const SupplierProfile = require("../../models/SupplierProfile");
const { notifyFollowers } = require("../Supplier/SupplierController");

/**
 * POST /devices
 * Create new device (Supplier only)
 */
exports.createDevice = async (req, res) => {
  try {
    // Get supplierId from token (JWT)
    const supplierId = req.user.id;

    let {
      name,
      description,
      category,
      rentPrice,
      depositAmount,
      location,
      stockQuantity,
      specs,
      status,
    } = req.body;

    // Parse rentPrice if string
    if (typeof rentPrice === "string") {
      try {
        rentPrice = JSON.parse(rentPrice);
      } catch (e) {
        return res.status(400).json({ message: "Invalid rentPrice format" });
      }
    }
    // Parse location if string
    if (typeof location === "string") {
      try {
        location = JSON.parse(location);
      } catch (e) {
        location = { warehouse: "", city: "" };
      }
    }
    // Parse stockQuantity
    if (typeof stockQuantity === "string") {
      stockQuantity = parseInt(stockQuantity) || 1;
    }
    // Parse specs if provided
    if (typeof specs === "string") {
      try {
        specs = JSON.parse(specs);
      } catch (e) {
        specs = {};
      }
    }

    const allowedStatuses = [
      "AVAILABLE",
      "RENTED",
      "MAINTENANCE",
      "BROKEN",
      "STOPPED",
    ];
    const normalizedStatus = allowedStatuses.includes(status)
      ? status
      : "AVAILABLE";

    // Validate required fields
    if (!name || !description || !category || !rentPrice || !depositAmount) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!rentPrice.perDay || rentPrice.perDay <= 0) {
      return res
        .status(400)
        .json({
          message: "Invalid rentPrice - perDay is required and must be > 0",
        });
    }
    if (depositAmount <= 0) {
      return res.status(400).json({ message: "depositAmount must be > 0" });
    }

    // Xử lý images upload từ req.files (Cloudinary)
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => file.path);
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
      status: normalizedStatus,
      specs,
      isAddon: false,
      ratingAvg: 0,
      reviewCount: 0,
    });

    await newDevice.save();

    // Notify followers about new device
    notifyFollowers(
      supplierId,
      "notifyNewDevice",
      "STORE_DEVICE",
      "Thiết bị mới",
      `${name} vừa được thêm vào cửa hàng`,
      `/device/${newDevice._id}`,
      req
    ).catch(() => {});

    res.status(201).json({
      message: "Device created successfully",
      device: newDevice,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /devices
 * Get list of available devices with optional filters
 */
exports.getDevices = async (req, res) => {
  try {
    const {
      category,
      status,
      includeAll,
      limit = 12,
      page = 1,
      sort = "popular",
    } = req.query;

    const query = {
      isAddon: false,
    };

    if (category) {
      query.category = category;
    }

    // Chỉ lấy thiết bị còn hàng (available >= 1)
    // Không dùng status = AVAILABLE nữa, mà dùng rentedQuantity < stockQuantity
    query.$expr = { $gt: ["$stockQuantity", "$rentedQuantity"] };

    // Nếu người dùng muốn xem cả thiết bị hết hàng (admin/debug)
    if (includeAll === "true") {
      delete query.$expr;
    }

    // Nếu vẫn muốn lọc status (ví dụ chỉ AVAILABLE hoặc MAINTENANCE)
    if (status) {
      query.status = status;
    }

    let sortQuery = { ratingAvg: -1, reviewCount: -1 };
    if (sort === "newest") {
      sortQuery = { createdAt: -1 };
    } else if (sort === "priceAsc") {
      sortQuery = { "rentPrice.perDay": 1 };
    } else if (sort === "priceDesc") {
      sortQuery = { "rentPrice.perDay": -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const devicesRaw = await Device.find(query)
      .select(
        "name description rentPrice ratingAvg reviewCount location images category status stockQuantity rentedQuantity depositAmount supplierId createdAt"
      )
      .populate("supplierId", "fullName")
      .limit(parseInt(limit))
      .skip(skip)
      .sort(sortQuery)
      .lean(); // nhanh hơn, trả plain object

    // Thêm availableQuantity & supplierName
    const devices = devicesRaw.map((device) => ({
      ...device,
      supplierName: device.supplierId?.fullName || "Unknown",
      availableQuantity: device.stockQuantity - (device.rentedQuantity || 0),
    }));

    const total = await Device.countDocuments(query);

    res.json({
      devices,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("GET DEVICES ERROR:", error);
    res.status(500).json({ message: error.message || "Lỗi server" });
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

    // 2.1 Tổng số lần thuê và tổng số lượng thuê
    const rentalCount = await RentalItem.countDocuments({
      deviceId: device._id,
    });
    const rentalQtyAgg = await RentalItem.aggregate([
      { $match: { deviceId: device._id } },
      { $group: { _id: null, totalQuantity: { $sum: "$quantity" } } },
    ]);
    const totalRentedUnits = rentalQtyAgg[0]?.totalQuantity || 0;

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

    // 4. Lấy thông tin SupplierProfile (store name, store avatar)
    let supplierProfile = null;
    if (device.supplierId?._id) {
      supplierProfile = await SupplierProfile.findOne({ userId: device.supplierId._id })
        .select('businessName businessAvatar')
        .lean();
    }

    // 5. Hợp nhất dữ liệu trả về
    const deviceData = device.toObject();

    // Merge store info vào supplierId
    if (supplierProfile) {
      deviceData.supplierId = {
        ...deviceData.supplierId,
        businessName: supplierProfile.businessName,
        businessAvatar: supplierProfile.businessAvatar,
      };
    }

    res.json({
      ...deviceData,
      reviews, // Trả về mảng review chi tiết
      rentalCount,
      totalRentedUnits,
      occupiedDates,
      // Đảm bảo specs được convert sang object nếu nó là Map
      specs:
        device.specs instanceof Map
          ? Object.fromEntries(device.specs)
          : deviceData.specs || {},
    });
  } catch (error) {
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
  try {
    const { id } = req.params;
    let {
      name,
      description,
      category,
      rentPrice,
      depositAmount,
      location,
      stockQuantity,
      oldImages,
      status,
      specs,
    } = req.body;

    // Parse rentPrice if string
    if (typeof rentPrice === "string") {
      try {
        rentPrice = JSON.parse(rentPrice);
      } catch (e) {
        return res.status(400).json({ message: "Invalid rentPrice format" });
      }
    }
    // Parse location if string
    if (typeof location === "string") {
      try {
        location = JSON.parse(location);
      } catch (e) {
        location = { warehouse: "", city: "" };
      }
    }
    // Parse stockQuantity
    if (typeof stockQuantity === "string") {
      stockQuantity = parseInt(stockQuantity) || 1;
    }

    // Parse specs if string
    if (typeof specs === "string") {
      try {
        specs = JSON.parse(specs);
      } catch (e) {
        specs = undefined;
      }
    }

    // Handle images: combine oldImages (from body) and new uploaded images
    let images = [];
    // Xử lý oldImages: nếu là mảng (nhiều input), nếu là string (1 input hoặc JSON.stringify)
    if (oldImages) {
      if (Array.isArray(oldImages)) {
        images = oldImages;
      } else if (typeof oldImages === "string") {
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
        images = images.concat(req.files.images.map((file) => file.path));
      }
      if (Array.isArray(req.files["images[]"])) {
        images = images.concat(req.files["images[]"].map((file) => file.path));
      }
      // fallback: trường hợp Multer.array (tương thích cũ)
      if (Array.isArray(req.files)) {
        images = images.concat(req.files.map((file) => file.path));
      }
    }

    // Validate required fields
    if (!name || !description || !category || !rentPrice || !depositAmount) {
      return res.status(400).json({ message: "Missing required fields" });
    }
    if (!rentPrice.perDay || rentPrice.perDay <= 0) {
      return res
        .status(400)
        .json({
          message: "Invalid rentPrice - perDay is required and must be > 0",
        });
    }
    if (depositAmount <= 0) {
      return res.status(400).json({ message: "depositAmount must be > 0" });
    }

    const updatePayload = {
      name,
      description,
      category,
      rentPrice,
      depositAmount,
      location,
      stockQuantity,
      images,
    };

    if (status) {
      updatePayload.status = status;
    }

    if (specs && typeof specs === "object") {
      updatePayload.specs = specs;
    }

    const device = await Device.findByIdAndUpdate(id, updatePayload, {
      new: true,
      runValidators: true,
    });

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
          message:
            "Cannot delete device - it is currently rented or pending rental",
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
      .select(
        "name description rentPrice ratingAvg reviewCount location images category status stockQuantity depositAmount"
      )
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
    res.status(500).json({ message: error.message });
  }
};
