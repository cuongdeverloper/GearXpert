const mongoose = require("mongoose");
const Device = require("../../models/Device");
const DeviceItem = require("../../models/DeviceItem");
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
    // Số lượng không nhập tay — chỉ đếm từ DeviceItem (đơn vị vật lý có serial)
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
      "SUSPICIOUS",
      "STOPPED",
      "DISCONTINUED",
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

    // Create new device (catalog cha — tồn kho = 0 cho tới khi có DeviceItem)
    const newDevice = new Device({
      name,
      description,
      category,
      rentPrice,
      depositAmount,
      location,
      stockQuantity: 0,
      rentedQuantity: 0,
      availableQuantity: 0,
      maintenanceCount: 0,
      damagedCount: 0,
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
      `/device/${newDevice.slug}`,
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

    // Nếu vẫn muốn lọc status (enum catalog: AVAILABLE | SUSPICIOUS | …)
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
        "name slug description rentPrice ratingAvg reviewCount location images category status stockQuantity rentedQuantity depositAmount supplierId createdAt discountPrice discountReason discountExpiry"
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
 * GET /devices/:deviceId/items
 * Supplier: danh sách DeviceItem (đơn vị vật lý) của một Device
 */
exports.getDeviceItemsForSupplier = async (req, res) => {
  try {
    const { deviceId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      return res.status(400).json({ message: "deviceId không hợp lệ" });
    }

    const device = await Device.findById(deviceId).select("supplierId name").lean();
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    if (device.supplierId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Không có quyền xem đơn vị của thiết bị này" });
    }

    const { status } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 200));
    const skip = (page - 1) * limit;

    const filter = { deviceId: device._id };
    if (status && typeof status === "string") {
      filter.status = status.trim().toUpperCase();
    }

    const [items, total] = await Promise.all([
      DeviceItem.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("serialNumber internalCode status condition location images createdAt updatedAt")
        .lean(),
      DeviceItem.countDocuments(filter),
    ]);

    res.json({
      deviceId: device._id,
      deviceName: device.name,
      items: items.map((it) => ({
        _id: it._id,
        serialNumber: it.serialNumber || null,
        internalCode: it.internalCode || null,
        status: it.status,
        condition: it.condition,
        location: it.location,
        createdAt: it.createdAt,
        updatedAt: it.updatedAt,
      })),
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("getDeviceItemsForSupplier:", error);
    res.status(500).json({ message: error.message || "Lỗi server" });
  }
};

const DEVICE_ITEM_CONDITIONS = ["NEW", "GOOD", "FAIR", "NEEDS_REPAIR", "DAMAGED"];

/**
 * POST /devices/:deviceId/items
 * Supplier: thêm một DeviceItem (đơn vị vật lý) cho thiết bị
 */
exports.createDeviceItemForSupplier = async (req, res) => {
  try {
    const { deviceId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(deviceId)) {
      return res.status(400).json({ message: "deviceId không hợp lệ" });
    }

    const device = await Device.findById(deviceId).select("supplierId name").lean();
    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }
    if (device.supplierId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Không có quyền thêm đơn vị cho thiết bị này" });
    }

    let { serialNumber, internalCode, condition, location } = req.body || {};

    if (typeof location === "string" && location.trim()) {
      try {
        location = JSON.parse(location);
      } catch {
        location = undefined;
      }
    }

    if (typeof serialNumber === "string") {
      serialNumber = serialNumber.trim();
      if (!serialNumber) serialNumber = undefined;
      else if (serialNumber.length > 200) {
        return res.status(400).json({ message: "Serial quá dài" });
      }
    } else {
      serialNumber = undefined;
    }

    if (typeof internalCode === "string") {
      internalCode = internalCode.trim();
      if (!internalCode) internalCode = undefined;
      else if (internalCode.length > 200) {
        return res.status(400).json({ message: "Mã nội bộ quá dài" });
      }
    } else {
      internalCode = undefined;
    }

    if (serialNumber) {
      const dup = await DeviceItem.findOne({ serialNumber }).select("_id").lean();
      if (dup) {
        return res.status(409).json({ message: "Serial đã tồn tại trong hệ thống" });
      }
    }

    const cond =
      typeof condition === "string" && DEVICE_ITEM_CONDITIONS.includes(condition.toUpperCase())
        ? condition.toUpperCase()
        : "GOOD";

    let loc = undefined;
    if (location && typeof location === "object" && !Array.isArray(location)) {
      const w = typeof location.warehouse === "string" ? location.warehouse.trim() : "";
      const c = typeof location.city === "string" ? location.city.trim() : "";
      const n = typeof location.note === "string" ? location.note.trim() : "";
      if (w || c || n) {
        loc = {
          ...(w ? { warehouse: w.slice(0, 200) } : {}),
          ...(c ? { city: c.slice(0, 200) } : {}),
          ...(n ? { note: n.slice(0, 500) } : {}),
        };
      }
    }

    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((f) => f.path).filter(Boolean);
    } else if (req.body && req.body.images != null) {
      let raw = req.body.images;
      if (typeof raw === "string") {
        try {
          raw = JSON.parse(raw);
        } catch {
          raw = [];
        }
      }
      if (Array.isArray(raw)) {
        images = raw
          .filter((u) => typeof u === "string" && u.trim())
          .map((u) => u.trim().slice(0, 2000))
          .slice(0, 5);
      }
    }
    if (images.length > 5) images = images.slice(0, 5);

    const doc = await DeviceItem.create({
      deviceId: device._id,
      serialNumber,
      internalCode,
      condition: cond,
      status: "AVAILABLE",
      ...(loc ? { location: loc } : {}),
      ...(images.length ? { images } : {}),
    });

    return res.status(201).json({
      item: {
        _id: doc._id,
        serialNumber: doc.serialNumber || null,
        internalCode: doc.internalCode || null,
        status: doc.status,
        condition: doc.condition,
        location: doc.location,
        images: Array.isArray(doc.images) ? doc.images : [],
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (error) {
    if (error && error.code === 11000) {
      return res.status(409).json({ message: "Serial hoặc mã trùng (unique)" });
    }
    console.error("createDeviceItemForSupplier:", error);
    res.status(500).json({ message: error.message || "Lỗi server" });
  }
};

/**
 * GET /devices/:slug
 * Supports both slug and ObjectId for backward compatibility
 */
exports.getDeviceDetail = async (req, res) => {
  try {
    const param = req.params.slug;
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(param);

    // 1. Lấy thông tin thiết bị và thông tin Supplier (slug hoặc _id)
    const device = await Device.findOne(
      isObjectId ? { _id: param } : { slug: param }
    ).populate("supplierId", "fullName avatar email phone");

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
 * GET /devices/:slug/addons
 * Supports both slug and ObjectId
 */
exports.getDeviceAddons = async (req, res) => {
  const param = req.params.slug;
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(param);
  const device = await Device.findOne(
    isObjectId ? { _id: param } : { slug: param }
  ).select("_id");
  if (!device) return res.status(404).json({ message: "Device not found" });

  const addons = await Device.find({
    isAddon: true,
    compatibleWith: device._id,
    status: "AVAILABLE",
  }).select("name rentPrice images discountPrice discountReason discountExpiry");

  res.json(addons);
};
/**
 * GET /devices/:slug/related
 * Supports both slug and ObjectId
 */
exports.getRelatedDevices = async (req, res) => {
  const param = req.params.slug;
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(param);
  const device = await Device.findOne(
    isObjectId ? { _id: param } : { slug: param }
  );
  if (!device) return res.status(404).json({ message: "Device not found" });

  const related = await Device.find({
    _id: { $ne: device._id },
    category: device.category,
    status: "AVAILABLE",
  })
    .limit(4)
    .select("name slug rentPrice ratingAvg location images discountPrice discountReason discountExpiry");

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

    // Use findById + save to trigger slug regeneration on name change
    const device = await Device.findById(id);

    if (!device) {
      return res.status(404).json({ message: "Device not found" });
    }

    // Verify device ownership
    if (device.supplierId.toString() !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to edit this device" });
    }

    const blockingStatuses = ["STOPPED", "SUSPICIOUS", "DISCONTINUED"];
    if (
      status &&
      status !== device.status &&
      blockingStatuses.includes(status)
    ) {
      const busyStatuses = ["PENDING", "PAID", "APPROVED", "DELIVERING", "RENTING", "RETURNING", "INSPECTING"];
      const activeRental = await RentalItem.findOne({ deviceId: id }).populate({
        path: "rentalId",
        select: "status",
      });
      if (activeRental && activeRental.rentalId && busyStatuses.includes(activeRental.rentalId.status)) {
        return res.status(400).json({
          message: "Cannot change status - device has active rentals",
        });
      }
    }

    const catalogAllowed = [
      "AVAILABLE",
      "SUSPICIOUS",
      "STOPPED",
      "DISCONTINUED",
    ];
    const legacyCatalogStatus = {
      MAINTENANCE: "SUSPICIOUS",
      BROKEN: "DISCONTINUED",
      RENTED: "AVAILABLE",
    };
    let nextCatalogStatus = status;
    if (nextCatalogStatus && legacyCatalogStatus[nextCatalogStatus]) {
      nextCatalogStatus = legacyCatalogStatus[nextCatalogStatus];
    }

    // Không cập nhật stockQuantity/rentedQuantity từ form — luôn đồng bộ từ DeviceItem
    Object.assign(device, {
      name, description, category, rentPrice, depositAmount,
      location, images,
    });
    if (
      nextCatalogStatus &&
      catalogAllowed.includes(nextCatalogStatus)
    ) {
      device.status = nextCatalogStatus;
    }
    if (specs && typeof specs === "object") device.specs = specs;

    await device.save();

    await DeviceItem.updateDeviceCounts(device._id);
    const deviceFresh = await Device.findById(id);

    res.json({
      message: "Device updated successfully",
      device: deviceFresh,
    });
  } catch (error) {
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
        "name slug description rentPrice ratingAvg reviewCount location images category status stockQuantity rentedQuantity availableQuantity maintenanceCount damagedCount depositAmount discountPrice discountReason discountExpiry"
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
