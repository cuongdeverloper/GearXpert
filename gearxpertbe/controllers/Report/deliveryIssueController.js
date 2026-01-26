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
