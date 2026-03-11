const DeliveryIssueReport = require("../../models/DeliveryIssueReport");
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

// Lấy tất cả sự cố do staff báo cáo (cho ReportsTab)
exports.getStaffDeliveryIssues = async (req, res) => {
  try {
    const staffId = req.user.id;
    const reports = await DeliveryIssueReport.find({ staffId, reportedBy: "STAFF" })
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
