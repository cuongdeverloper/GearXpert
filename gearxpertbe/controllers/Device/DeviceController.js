const Device = require("../../models/Device");
const RentalItem = require("../../models/RentalItem"); // Kiểm tra lại đường dẫn model của bạn
const Review = require("../../models/Review");
/**
 * GET /devices
 * Get list of available devices with optional filters
 */
exports.getDevices = async (req, res) => {
  try {
    const { category, limit = 12, page = 1 } = req.query;

    const query = {
      status: "AVAILABLE",
      isAddon: false,
    };

    if (category) {
      query.category = category;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const devices = await Device.find(query)
      .select("name rentPrice ratingAvg reviewCount location images category")
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
