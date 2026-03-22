const DeliveryIssueReport = require("../../models/DeliveryIssueReport");
const DamageReport = require("../../models/DamageReport");
const Rental = require("../../models/Rental");
const RentalItem = require("../../models/RentalItem");
exports.createDeliveryIssue = async (req, res) => {
  try {
    const { rentalId, issueType, description } = req.body;

    // Lấy array từ multipart/form-data (có thể là string "id1,id2" hoặc nhiều field rentalItemIds[])
    let rentalItemIds = req.body.rentalItemIds;
console.log(rentalItemIds)
    // Trường hợp frontend gửi rentalItemIds[] (array trong FormData)
    if (Array.isArray(rentalItemIds)) {
      // giữ nguyên
    }
    // Trường hợp gửi 1 field string phân cách dấu phẩy
    else if (typeof rentalItemIds === "string") {
      rentalItemIds = rentalItemIds.split(",").map((id) => id.trim());
    } else {
      rentalItemIds = [];
    }

    if (!rentalItemIds.length) {
      return res
        .status(400)
        .json({ message: "Vui lòng chọn ít nhất một sản phẩm" });
    }

    const rental = await Rental.findById(rentalId);
    if (!rental) return res.status(404).json({ message: "Rental not found" });

    if (rental.customerId.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "Bạn không phải chủ đơn hàng này" });
    }

    // Kiểm tra trạng thái từng item
    const items = await RentalItem.find({
      _id: { $in: rentalItemIds },
      rentalId: rentalId,
      status: "DELIVERING", // chỉ cho phép báo cáo khi item đang DELIVERING
    });

    if (items.length !== rentalItemIds.length) {
      return res.status(400).json({
        message: "Một số sản phẩm không ở trạng thái cho phép báo cáo",
      });
    }

    const images = req.files?.map((file) => file.path) || [];

    const report = await DeliveryIssueReport.create({
      rentalId,
      rentalItemIds, // array
      deviceIds: items.map((i) => i.deviceId), // nếu muốn lưu luôn
      customerId: req.user.id,
      issueType,
      description,
      images,
    });

    res.status(201).json({
      message: "Báo cáo vấn đề giao hàng thành công",
      data: report,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

exports.getDeliveryIssueByRental = async (req, res) => {
  const reports = await DeliveryIssueReport.find({
    rentalId: req.params.rentalId,
  }).populate("deviceId");
  res.json(reports);
};

// ── Staff báo cáo sự cố lúc giao hàng ──────────────────────────────────────
exports.createStaffDeliveryIssue = async (req, res) => {
  try {
    const { rentalId, issueType, description } = req.body;
    const staffId = req.user.id;

    const rental = await Rental.findById(rentalId);
    if (!rental) return res.status(404).json({ message: "Rental not found" });

    // Lấy tất cả rental items của đơn
    const items = await RentalItem.find({ rentalId });
    const rentalItemIds = items.map((i) => i._id);
    const deviceIds = items.map((i) => i.deviceId);

    const images = req.files?.map((file) => file.path) || [];

    const report = await DeliveryIssueReport.create({
      rentalId,
      rentalItemIds,
      deviceIds,
      staffId,
      reportedBy: "STAFF",
      issueType,
      description,
      images,
    });

    // Chuyển trạng thái đơn sang INSPECTING để dừng luồng giao hàng
    rental.status = "INSPECTING";
    rental.inspectedContext = "DELIVERY";
    await rental.save();

    res.status(201).json({
      message: "Biên bản sự cố đã được lưu. Đơn hàng chuyển sang trạng thái Kiểm tra.",
      data: report,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Lấy tất cả sự cố do staff báo cáo (cho ReportsTab - Giao hàng)
exports.getStaffDeliveryIssues = async (req, res) => {
  try {
    const staffId = req.user.id;
    const reports = await DeliveryIssueReport.find({
      staffId,
      reportedBy: "STAFF",
      $or: [{ reportContext: "DELIVERY" }, { reportContext: { $exists: false } }],
    })
      .populate({ path: "rentalId", select: "customerId phoneNumber", populate: { path: "customerId", select: "fullName" } })
      .populate({ path: "deviceIds", select: "name images" })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ── Staff báo cáo sự cố lúc THU HỒI ────────────────────────────────────────
exports.createStaffReturnIssue = async (req, res) => {
  try {
    const { rentalId, issueType, description } = req.body;
    const staffId = req.user.id;

    const rental = await Rental.findById(rentalId);
    if (!rental) return res.status(404).json({ message: "Rental not found" });

    if (rental.status !== "RETURNING") {
      return res.status(400).json({
        message: "Chỉ có thể báo cáo sự cố khi đơn đang ở trạng thái Thu hồi (RETURNING)",
      });
    }

    const items = await RentalItem.find({ rentalId });
    const rentalItemIds = items.map((i) => i._id);
    const deviceIds = items.map((i) => i.deviceId);

    // Normalize req.files: any() gives flat array, array() gives flat array too
    const files = Array.isArray(req.files) ? req.files : Object.values(req.files || {}).flat();
    const images = files.map((file) => file.path);

    const report = await DeliveryIssueReport.create({
      rentalId,
      rentalItemIds,
      deviceIds,
      staffId,
      reportedBy: "STAFF",
      reportContext: "RETURN",
      issueType,
      description,
      images,
    });

    // Chuyển trạng thái về INSPECTING để dừng luồng hoàn thành
    rental.status = "INSPECTING";
    rental.inspectedContext = "RETURN";
    await rental.save();

    res.status(201).json({
      message: "Biên bản sự cố thu hồi đã được lưu. Đơn hàng chuyển sang trạng thái Kiểm tra.",
      data: report,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// Lấy tất cả sự cố thu hồi do staff báo cáo (cho ReportsTab - Thu hồi)
exports.getStaffReturnIssues = async (req, res) => {
  try {
    const staffId = req.user.id;
    const reports = await DeliveryIssueReport.find({
      staffId,
      reportedBy: "STAFF",
      reportContext: "RETURN",
    })
      .populate({ path: "rentalId", select: "customerId phoneNumber", populate: { path: "customerId", select: "fullName" } })
      .populate({ path: "deviceIds", select: "name images" })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ reports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

// ── Supplier xem tất cả sự cố liên quan đến đơn hàng của mình ──────────────
exports.getSupplierIssues = async (req, res) => {
  try {
    const supplierId = req.user.id;

    // Lấy tất cả rental IDs thuộc supplier
    const rentals = await Rental.find({ supplierId }).select("_id").lean();
    const rentalIds = rentals.map((r) => r._id);

    // Lấy delivery/return issues
    const deliveryIssues = await DeliveryIssueReport.find({
      rentalId: { $in: rentalIds },
    })
      .populate({
        path: "rentalId",
        select: "customerId phoneNumber status inspectedContext",
        populate: { path: "customerId", select: "fullName email phone image" },
      })
      .populate({ path: "staffId", select: "fullName" })
      .populate({ path: "deviceIds", select: "name images" })
      .sort({ createdAt: -1 })
      .lean();

    // Lấy damage reports (customer báo hư hỏng khi đang thuê)
    const damageReports = await DamageReport.find({
      rentalId: { $in: rentalIds },
    })
      .populate({
        path: "rentalId",
        select: "customerId phoneNumber status",
        populate: { path: "customerId", select: "fullName email phone image" },
      })
      .populate({ path: "deviceId", select: "name images" })
      .sort({ createdAt: -1 })
      .lean();

    res.json({ deliveryIssues, damageReports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};
