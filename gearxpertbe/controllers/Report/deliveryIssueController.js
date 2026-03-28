const DeliveryIssueReport = require("../../models/DeliveryIssueReport");
const Rental = require("../../models/Rental");
const RentalItem = require("../../models/RentalItem");
const NotificationConfig = require("../../configs/NotificationConfig"); // ← THÊM DÒNG NÀY (điều chỉnh path nếu cần)

exports.createDeliveryIssue = async (req, res) => {
  try {
    const customerId = req.user?.id;
    if (!customerId) {
      return res
        .status(401)
        .json({ message: "Không tìm thấy thông tin người dùng" });
    }

    const {
      rentalId,
      rentalItemIds, // mảng RentalItem _id
      deviceItemIds = [], // mảng serial (DeviceItem _id)
      issueType,
      description,
    } = req.body;

    // Validate rentalItemIds
    if (
      !rentalItemIds ||
      !Array.isArray(rentalItemIds) ||
      rentalItemIds.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Vui lòng chọn ít nhất một sản phẩm" });
    }

    if (!description?.trim()) {
      return res
        .status(400)
        .json({ message: "Vui lòng cung cấp mô tả chi tiết" });
    }

    // Tìm Rental
    const rental = await Rental.findById(rentalId);
    if (!rental)
      return res.status(404).json({ message: "Không tìm thấy đơn thuê" });

    if (rental.customerId.toString() !== customerId) {
      return res
        .status(403)
        .json({ message: "Bạn không phải chủ đơn hàng này" });
    }

    // Tìm các RentalItem được chọn
    const selectedItems = await RentalItem.find({
      _id: { $in: rentalItemIds },
      rentalId,
    }).lean();

    if (selectedItems.length !== rentalItemIds.length) {
      return res
        .status(400)
        .json({
          message: "Một số sản phẩm không tồn tại hoặc không thuộc đơn",
        });
    }

    // Validate deviceItemIds nếu có
    if (deviceItemIds.length > 0) {
      const itemMap = {};
      selectedItems.forEach((item) => {
        itemMap[item._id.toString()] = (item.deviceItemIds || []).map((id) =>
          id.toString()
        );
      });

      for (let i = 0; i < deviceItemIds.length; i++) {
        const devId = deviceItemIds[i].toString();
        // Map theo index (giả sử frontend gửi theo thứ tự tương ứng)
        const rentalItemId = rentalItemIds[i % rentalItemIds.length].toString();
        const validIds = itemMap[rentalItemId] || [];

        if (!validIds.includes(devId)) {
          return res.status(400).json({
            message: `Serial ${devId} không thuộc RentalItem ${rentalItemId}`,
          });
        }
      }
    }

    // Xử lý ảnh
    const images = req.files?.map((file) => file.path) || [];

    // Tạo report
    const report = await DeliveryIssueReport.create({
      rentalId,
      rentalItemIds,
      deviceItemIds: deviceItemIds.length > 0 ? deviceItemIds : undefined,
      deviceIds: selectedItems.map((item) => item.deviceId),
      customerId,
      reportedBy: "CUSTOMER",
      issueType,
      description: description.trim(),
      images,
      status: "OPEN",
      reportContext: "DELIVERY",
    });

    // Notification cho supplier (SỬA Ở ĐÂY)
    try {
      let supplierId = rental.supplierId?.toString();
      if (!supplierId) {
        // Fallback: lấy từ RentalItem đầu tiên → Device → supplierId
        const firstItem = await RentalItem.findOne({
          rentalId: rental._id,
        }).populate("deviceId", "supplierId");
        supplierId = firstItem?.deviceId?.supplierId?.toString();
      }

      if (supplierId) {
        await NotificationConfig.sendNotification({
          senderId: customerId,
          receiverId: supplierId,
          title: "Khách hàng báo cáo vấn đề giao hàng",
          message: `Có khiếu nại giao hàng trên đơn #${rental._id
            .toString()
            .slice(-6)}. Vui lòng kiểm tra.`,
          link: "/delivery-issues",
          type: "DELIVERY_ISSUE",
        });
        console.log(
          `[Notification] Đã gửi thông báo giao hàng đến supplier ${supplierId}`
        );
      } else {
        console.warn(
          `[Notification] Không tìm thấy supplierId cho rental ${rental._id}`
        );
      }
    } catch (notifyErr) {
      console.error("Lỗi gửi notification khi tạo delivery issue:", notifyErr);
      // Không throw → vẫn trả success
    }

    res.status(201).json({
      message: "Báo cáo vấn đề giao hàng thành công",
      data: report,
    });
  } catch (err) {
    console.error("Create Delivery Issue Error:", err);
    res.status(500).json({ message: err.message || "Gửi báo cáo thất bại" });
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
    if (!rental)
      return res.status(404).json({ message: "Không tìm thấy đơn thuê" });

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
      description: description?.trim() || "",
      images,
    });

    // Chuyển trạng thái đơn sang INSPECTING
    rental.status = "INSPECTING";
    rental.inspectedContext = "DELIVERY";
    await rental.save();

    // Notification cho customer (nếu cần)
    try {
      if (rental.customerId) {
        await NotificationConfig.sendNotification({
          senderId: staffId,
          receiverId: rental.customerId.toString(),
          title: "Có sự cố giao hàng",
          message: `Đơn hàng của bạn đang được kiểm tra do phát hiện vấn đề trong quá trình giao.`,
          link: "/my-rentals",
          type: "DELIVERY_ISSUE",
        });
      }
    } catch (notifyErr) {
      console.error("Lỗi gửi notification staff delivery:", notifyErr);
    }

    res.status(201).json({
      message:
        "Biên bản sự cố đã được lưu. Đơn hàng chuyển sang trạng thái Kiểm tra.",
      data: report,
    });
  } catch (err) {
    console.error("Create Staff Delivery Issue Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Lấy tất cả sự cố do staff báo cáo (cho ReportsTab - Giao hàng)
exports.getStaffDeliveryIssues = async (req, res) => {
  try {
    const staffId = req.user.id;
    const HANDOVER_FAIL_REGEX = /^(Handover thất bại:|Đơn hàng không thành công vì lý do:)/i;
    const reports = await DeliveryIssueReport.find({
      staffId,
      reportedBy: "STAFF",
      $or: [
        { reportContext: "DELIVERY" },
        { reportContext: { $exists: false } },
        // Backward compatibility: old handover-failed records were mistakenly stored as RETURN.
        { description: HANDOVER_FAIL_REGEX },
      ],
    })
      .populate({
        path: "rentalId",
        select: "customerId phoneNumber",
        populate: { path: "customerId", select: "fullName" },
      })
      .populate({ path: "deviceIds", select: "name images" })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ reports });
  } catch (err) {
    console.error("Get Staff Delivery Issues Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ── Staff báo cáo sự cố lúc THU HỒI ────────────────────────────────────────
exports.createStaffReturnIssue = async (req, res) => {
  try {
    const { rentalId, issueType, description } = req.body;
    const staffId = req.user.id;

    const rental = await Rental.findById(rentalId);
    if (!rental)
      return res.status(404).json({ message: "Không tìm thấy đơn thuê" });

    if (rental.status !== "RETURNING") {
      return res.status(400).json({
        message:
          "Chỉ có thể báo cáo sự cố khi đơn đang ở trạng thái Thu hồi (RETURNING)",
      });
    }

    const items = await RentalItem.find({ rentalId });
    const rentalItemIds = items.map((i) => i._id);
    const deviceIds = items.map((i) => i.deviceId);

    const files = Array.isArray(req.files)
      ? req.files
      : Object.values(req.files || {}).flat();
    const images = files.map((file) => file.path);

    const report = await DeliveryIssueReport.create({
      rentalId,
      rentalItemIds,
      deviceIds,
      staffId,
      reportedBy: "STAFF",
      reportContext: "RETURN",
      issueType,
      description: description?.trim() || "",
      images,
    });

    // Chuyển trạng thái về INSPECTING
    rental.status = "INSPECTING";
    rental.inspectedContext = "RETURN";
    await rental.save();

    // Notification cho customer
    try {
      if (rental.customerId) {
        await NotificationConfig.sendNotification({
          senderId: staffId,
          receiverId: rental.customerId.toString(),
          title: "Có sự cố khi thu hồi thiết bị",
          message: `Đơn hàng của bạn đang được kiểm tra do phát hiện vấn đề trong quá trình thu hồi.`,
          link: "/my-rentals",
          type: "RETURN_ISSUE",
        });
      }
    } catch (notifyErr) {
      console.error("Lỗi gửi notification staff return:", notifyErr);
    }

    res.status(201).json({
      message:
        "Biên bản sự cố thu hồi đã được lưu. Đơn hàng chuyển sang trạng thái Kiểm tra.",
      data: report,
    });
  } catch (err) {
    console.error("Create Staff Return Issue Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Lấy tất cả sự cố thu hồi do staff báo cáo (cho ReportsTab - Thu hồi)
exports.getStaffReturnIssues = async (req, res) => {
  try {
    const staffId = req.user.id;
    const HANDOVER_FAIL_REGEX = /^(Handover thất bại:|Đơn hàng không thành công vì lý do:)/i;
    const reports = await DeliveryIssueReport.find({
      staffId,
      reportedBy: "STAFF",
      reportContext: "RETURN",
      // Exclude failed-handover records so they only appear in Delivery tab.
      description: { $not: HANDOVER_FAIL_REGEX },
    })
      .populate({
        path: "rentalId",
        select: "customerId phoneNumber",
        populate: { path: "customerId", select: "fullName" },
      })
      .populate({ path: "deviceIds", select: "name images" })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ reports });
  } catch (err) {
    console.error("Get Staff Return Issues Error:", err);
    res.status(500).json({ message: err.message });
  }
};
