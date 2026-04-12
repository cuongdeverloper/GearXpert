const DamageReport = require("../../models/DamageReport");
const Rental = require("../../models/Rental");
const RentalItem = require("../../models/RentalItem");
const DeviceItem = require("../../models/DeviceItem");
const NotificationConfig = require("../../configs/NotificationConfig");

exports.createDamageReport = async (req, res) => {
  try {
    const customerId = req.user?.id;
    if (!customerId) {
      return res
        .status(401)
        .json({ message: "Không tìm thấy thông tin người dùng" });
    }

    const {
      rentalId,
      rentalItemId,
      deviceItemIds = [], // mảng _id của DeviceItem (serial bị hỏng)
      description,
      severity,
    } = req.body;

    // 1. Validate input cơ bản
    if (!rentalId || !rentalItemId) {
      return res.status(400).json({
        message: "Thiếu rentalId hoặc rentalItemId",
      });
    }

    if (!description?.trim()) {
      return res.status(400).json({
        message: "Vui lòng cung cấp mô tả chi tiết về hư hỏng",
      });
    }

    // 2. Tìm Rental
    const rental = await Rental.findById(rentalId);
    if (!rental) {
      return res.status(404).json({ message: "Không tìm thấy đơn thuê" });
    }

    if (rental.customerId.toString() !== customerId) {
      return res.status(403).json({
        message: "Bạn không phải là chủ đơn hàng này",
      });
    }

    if (rental.status !== "RENTING") {
      return res.status(400).json({
        message: `Chỉ được báo cáo hư hỏng khi đơn đang ở trạng thái RENTING (hiện tại: ${rental.status})`,
      });
    }

    // 3. Tìm RentalItem
    const rentalItem = await RentalItem.findById(rentalItemId);
    if (!rentalItem) {
      return res.status(404).json({ message: "Không tìm thấy RentalItem" });
    }

    if (rentalItem.rentalId.toString() !== rentalId) {
      return res.status(400).json({
        message: "RentalItem không thuộc đơn thuê này",
      });
    }

    // 4. Validate deviceItemIds (nếu có)
    // Đảm bảo deviceItemIds luôn là array (có thể nhận string từ FormData)
    let normalizedDeviceItemIds = deviceItemIds;
    if (typeof deviceItemIds === 'string') {
      normalizedDeviceItemIds = [deviceItemIds];
    } else if (!Array.isArray(deviceItemIds)) {
      normalizedDeviceItemIds = [];
    }

    const hasSerials =
      Array.isArray(rentalItem.deviceItemIds) &&
      rentalItem.deviceItemIds.length > 0;

    if (hasSerials) {
      if (normalizedDeviceItemIds.length === 0) {
        return res.status(400).json({
          message: "Vui lòng chọn ít nhất một serial bị hỏng",
        });
      }

      const validDeviceItemIds = rentalItem.deviceItemIds.map((id) =>
        id.toString()
      );

      const invalidIds = normalizedDeviceItemIds.filter((id) => {
        const strId = id?.toString();
        return strId && !validDeviceItemIds.includes(strId);
      });

      if (invalidIds.length > 0) {
        console.warn(
          `[DamageReport] Invalid deviceItemIds from user ${customerId}:`,
          {
            rentalItemId,
            sent: normalizedDeviceItemIds,
            valid: validDeviceItemIds,
            invalid: invalidIds,
          }
        );

        return res.status(400).json({
          message: `Một số serial không thuộc RentalItem này: ${invalidIds.join(
            ", "
          )}`,
          invalidIds,
          validDeviceItemIds,
        });
      }
    } else {
      if (normalizedDeviceItemIds.length > 0) {
        console.warn(
          `[DamageReport] Item không có serial nhưng frontend gửi deviceItemIds:`,
          {
            rentalItemId,
            sentDeviceItemIds: normalizedDeviceItemIds,
          }
        );
      }
    }

    // 5. Xử lý ảnh
    const images = req.files?.map((file) => file.path) || [];
    if (images.length > 10) {
      return res
        .status(400)
        .json({ message: "Chỉ được tải lên tối đa 10 ảnh" });
    }

    // 6. Tạo DamageReport
    const report = await DamageReport.create({
      rentalId,
      rentalItemId,
      deviceItemIds: hasSerials ? normalizedDeviceItemIds : [], // đảm bảo luôn là mảng
      deviceId: rentalItem.deviceId,
      customerId,
      description: description.trim(),
      severity:
        severity && ["LOW", "MEDIUM", "HIGH"].includes(severity)
          ? severity
          : "MEDIUM",
      images,
    });

    // 7. Gửi thông báo cho supplier (SỬA Ở ĐÂY)
    try {
      // Lấy supplierId – fallback nếu Rental không có trường supplierId
      let supplierId = rental.supplierId?.toString();
      if (!supplierId) {
        // Fallback: lấy từ RentalItem → Device → supplierId
        const firstItem = await RentalItem.findOne({
          rentalId: rental._id,
        }).populate("deviceId", "supplierId");
        supplierId = firstItem?.deviceId?.supplierId?.toString();
      }

      if (supplierId) {
        await NotificationConfig.sendNotification({
          senderId: customerId,
          receiverId: supplierId,
          title: "Khách hàng báo cáo hư hỏng",
          message: `Có báo cáo hư hỏng trên đơn #${rental._id
            .toString()
            .slice(-6)}. Vui lòng kiểm tra và xử lý.`,
          link: `/damage-reports/${report._id}`,
          type: "DAMAGE_REPORT", // hoặc "RENTAL_ISSUE" tùy bạn
        });
      } else {
        console.warn(
          `[Notification] Không tìm thấy supplierId cho rental ${rental._id}`
        );
      }
    } catch (notifyErr) {
      console.error("Lỗi gửi notification khi tạo damage report:", notifyErr);
      // Không throw lỗi → vẫn trả success cho client
    }

    // 7.5 Set DeviceItem liên quan → PENDING_RESOLUTION (không thể thuê tiếp)
    if (hasSerials && normalizedDeviceItemIds.length > 0) {
      try {
        await DeviceItem.updateMany(
          { _id: { $in: normalizedDeviceItemIds } },
          { status: "PENDING_RESOLUTION", activeIssueId: report._id }
        );
        console.log(
          `[DamageReport] Set ${normalizedDeviceItemIds.length} DeviceItem(s) → PENDING_RESOLUTION`
        );
      } catch (diErr) {
        console.error("[DamageReport] Lỗi cập nhật DeviceItem status:", diErr);
        // Không throw — vẫn trả success cho client
      }
    }

    // 8. Trả về kết quả
    return res.status(201).json({
      success: true,
      message: "Báo cáo hư hỏng đã được gửi thành công",
      data: report,
    });
  } catch (err) {
    console.error("Create Damage Report Error:", {
      message: err.message,
      stack: err.stack,
      body: req.body,
      files: req.files?.length || 0,
    });

    return res.status(500).json({
      message:
        "Lỗi hệ thống khi gửi báo cáo. Vui lòng thử lại sau hoặc liên hệ hỗ trợ.",
    });
  }
};

exports.getDamageReportsByRental = async (req, res) => {
  const reports = await DamageReport.find({
    rentalId: req.params.rentalId,
  }).populate("deviceId");
  res.json(reports);
};

module.exports = {
  createDamageReport: exports.createDamageReport,
  getDamageReportsByRental: exports.getDamageReportsByRental,
};
