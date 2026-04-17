const DeliveryIssueReport = require("../../models/DeliveryIssueReport");
const DamageReport = require("../../models/DamageReport");
const Rental = require("../../models/Rental");
const RentalItem = require("../../models/RentalItem");
const { ReturnRecord, RETURN_FAILURE_REASON } = require("../../models/ReturnRecord");
const NotificationConfig = require("../../configs/NotificationConfig"); // ← THÊM DÒNG NÀY (điều chỉnh path nếu cần)
const { ensureDraftForReturn, reportIssue } = require("../../services/ReturnService");
const { emitOperationStaffUpdate } = require("../../utils/operationStaffSocket");

const RETURN_FAILURE_LABELS = {
  [RETURN_FAILURE_REASON.CUSTOMER_UNAVAILABLE]: "Khách vắng mặt / Không liên hệ được",
  [RETURN_FAILURE_REASON.WRONG_ADDRESS]: "Sai địa chỉ / Không tìm thấy vị trí",
  [RETURN_FAILURE_REASON.MISSING_DEVICE]: "Khách báo làm mất thiết bị",
  [RETURN_FAILURE_REASON.DAMAGED_DEVICE]: "Thiết bị hỏng hóc",
  [RETURN_FAILURE_REASON.OTHER]: "Lý do khác",
  [RETURN_FAILURE_REASON.CUSTOMER_NO_SHOW]: "Khách không có mặt",
  [RETURN_FAILURE_REASON.CUSTOMER_REJECT_RETURN]: "Khách từ chối trả",
  [RETURN_FAILURE_REASON.CONTACT_FAILED]: "Không liên hệ được khách",
  [RETURN_FAILURE_REASON.LOCATION_BLOCKED]: "Không thể tiếp cận điểm thu hồi",
  [RETURN_FAILURE_REASON.ORDER_CLOSED_ELSEWHERE]: "Đơn đã đóng ở nhánh khác",
};

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
      rentalItemIds: rentalItemIdsRaw, // mảng RentalItem _id
      deviceItemIds = [], // mảng serial (DeviceItem _id)
      issueType,
      description,
    } = req.body;

    // Normalize rentalItemIds - có thể là string hoặc array từ FormData
    let rentalItemIds = rentalItemIdsRaw;
    if (typeof rentalItemIdsRaw === 'string') {
      rentalItemIds = [rentalItemIdsRaw];
    } else if (!Array.isArray(rentalItemIdsRaw)) {
      rentalItemIds = [];
    }

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

    // Kiểm tra báo cáo trùng lặp - đã có báo cáo giao hàng đang xử lý cho đơn này chưa
    const DeliveryIssueReport = require("../../models/DeliveryIssueReport");
    const existingReport = await DeliveryIssueReport.findOne({
      rentalId,
      status: { $in: ["OPEN", "PROCESSING", "WAITING_EVIDENCE"] }
    });
    if (existingReport) {
      return res.status(400).json({
        message: "Đã có báo cáo giao hàng đang được xử lý cho đơn này. Vui lòng chờ kết quả xử lý trước khi báo cáo mới.",
        existingReportId: existingReport._id
      });
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
    // Đảm bảo deviceItemIds luôn là array (có thể nhận string từ FormData)
    let normalizedDeviceItemIds = deviceItemIds;
    if (typeof deviceItemIds === 'string') {
      normalizedDeviceItemIds = [deviceItemIds];
    } else if (!Array.isArray(deviceItemIds)) {
      normalizedDeviceItemIds = [];
    }

    if (normalizedDeviceItemIds.length > 0) {
      const itemMap = {};
      selectedItems.forEach((item) => {
        itemMap[item._id.toString()] = (item.deviceItemIds || []).map((id) =>
          id.toString()
        );
      });

      for (let i = 0; i < normalizedDeviceItemIds.length; i++) {
        const devId = normalizedDeviceItemIds[i].toString();
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
      deviceItemIds: normalizedDeviceItemIds.length > 0 ? normalizedDeviceItemIds : undefined,
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
      reportContext: "DELIVERY",
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

    try {
      let sid = rental.supplierId?.toString();
      if (!sid) {
        const firstItem = await RentalItem.findOne({ rentalId: rental._id }).populate(
          "deviceId",
          "supplierId"
        );
        sid = firstItem?.deviceId?.supplierId?.toString();
      }
      if (sid) {
        await NotificationConfig.sendNotification({
          senderId: staffId,
          receiverId: sid,
          title: "Biên bản sự cố giao hàng (vận hành)",
          message: `Đơn #${rental._id.toString().slice(-6)} có ghi nhận sự cố từ nhân viên vận hành. Vui lòng xem xét xử lý.`,
          link: "/supplier/issues?tab=DELIVERY",
          type: "STAFF_DELIVERY_ISSUE_SUPPLIER",
        });
      }
    } catch (notifySupplierErr) {
      console.error("Lỗi gửi notification supplier (staff delivery issue):", notifySupplierErr);
    }

    emitOperationStaffUpdate({
      action: "STAFF_DELIVERY_ISSUE",
      message: "Có biên bản sự cố giao hàng mới.",
      rentalId: String(rental._id),
      actorId: String(staffId),
    });

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
    const RETURN_FAIL_REGEX = /^Thu hồi thất bại:/i;
    const reports = await DeliveryIssueReport.find({
      staffId,
      reportedBy: "STAFF",
      description: { $not: RETURN_FAIL_REGEX },
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

    const returnDraft = await ensureDraftForReturn({
      rentalId,
      staffId,
      actorId: staffId,
    });

    await reportIssue({
      returnRecordId: returnDraft._id,
      issue: {
        reportId: report._id,
        issueType,
        detail: description?.trim() || "",
        evidenceUrls: images,
        operatorNote: description?.trim() || "",
        requiresDeepInspection: true,
      },
      inspection: {
        ...(returnDraft?.inspection || {}),
        actualReturnedAt: new Date(),
        requiresDeepInspection: true,
      },
      staffId,
      actorId: staffId,
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

    try {
      let sid = rental.supplierId?.toString();
      if (!sid) {
        const firstItem = await RentalItem.findOne({ rentalId: rental._id }).populate(
          "deviceId",
          "supplierId"
        );
        sid = firstItem?.deviceId?.supplierId?.toString();
      }
      if (sid) {
        await NotificationConfig.sendNotification({
          senderId: staffId,
          receiverId: sid,
          title: "Biên bản sự cố thu hồi (vận hành)",
          message: `Đơn #${rental._id.toString().slice(-6)} có ghi nhận sự cố từ nhân viên vận hành. Vui lòng xem xét xử lý.`,
          link: "/supplier/issues?tab=RETURN",
          type: "STAFF_RETURN_ISSUE_SUPPLIER",
        });
      }
    } catch (notifySupplierErr) {
      console.error("Lỗi gửi notification supplier (staff return issue):", notifySupplierErr);
    }

    emitOperationStaffUpdate({
      action: "STAFF_RETURN_ISSUE",
      message: "Có biên bản sự cố thu hồi mới.",
      rentalId: String(rental._id),
      actorId: String(staffId),
    });

    res.status(201).json({
      message:
        "Biên bản sự cố thu hồi đã được lưu. Đơn hàng chuyển sang trạng thái Kiểm tra.",
      data: report,
      returnRecordId: returnDraft._id,
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
    const RETURN_FAIL_REGEX = /^Thu hồi thất bại:/i;
    const reports = await DeliveryIssueReport.find({
      staffId,
      reportedBy: "STAFF",
      $or: [
        { reportContext: "RETURN" },
        // Backward compatibility: some return-failed logs were saved without RETURN context.
        { description: RETURN_FAIL_REGEX },
      ],
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

    // Fallback: include FAILED return records even if DeliveryIssueReport was not created.
    const failedReturnRecords = await ReturnRecord.find({
      operatorStaffId: staffId,
      status: "FAILED",
    })
      .populate({
        path: "rentalId",
        select: "customerId phoneNumber",
        populate: { path: "customerId", select: "fullName" },
      })
      .sort({ updatedAt: -1 })
      .lean();

    const existingKeys = new Set(
      reports
        .filter((r) => RETURN_FAIL_REGEX.test(r?.description || ""))
        .map((r) => `${String(r?.rentalId?._id || r?.rentalId)}|${r.description}`)
    );

    const fallbackReports = failedReturnRecords
      .map((record) => {
        const reasonLabel = RETURN_FAILURE_LABELS[record?.failure?.reason] || "Khác";
        const description = [
          `Thu hồi thất bại: ${reasonLabel}`,
          record?.failure?.detail || "",
          record?.failure?.operatorNote || "",
        ]
          .filter(Boolean)
          .join(" | ");

        const dedupeKey = `${String(record?.rentalId?._id || record?.rentalId)}|${description}`;
        if (existingKeys.has(dedupeKey)) {
          return null;
        }

        const snapshotItems =
          record?.inspection?.items?.length > 0
            ? record.inspection.items
            : record?.prefetchedSnapshot?.items || [];

        const syntheticDeviceIds = snapshotItems.slice(0, 3).map((item, idx) => ({
          _id: item?.deviceId || `${record._id}-device-${idx}`,
          name: item?.deviceName || "Thiết bị",
        }));

        return {
          _id: `return-failed-${record._id}`,
          rentalId: record.rentalId,
          deviceIds: syntheticDeviceIds,
          issueType: "OTHER",
          description,
          images: Array.isArray(record?.failure?.evidenceUrls) ? record.failure.evidenceUrls : [],
          status: "OPEN",
          createdAt: record?.finishedAt || record?.updatedAt || record?.createdAt,
          reportContext: "RETURN",
          reportedBy: "STAFF",
          source: "RETURN_RECORD",
        };
      })
      .filter(Boolean);

    const merged = [...reports, ...fallbackReports].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    res.json({ reports: merged });
  } catch (err) {
    console.error("Get Staff Return Issues Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ── Supplier xem tất cả sự cố liên quan đến đơn hàng của mình ──────────────
exports.getSupplierIssues = async (req, res) => {
  try {
    const supplierId = req.user.id;

    const rentals = await Rental.find({ supplierId }).select("_id").lean();
    const rentalIds = rentals.map((r) => r._id);

    if (rentalIds.length === 0) {
      return res.json({ deliveryIssues: [], damageReports: [] });
    }

    const RETURN_FAIL_REGEX = /^Thu hồi thất bại:/i;

    let deliveryIssues = await DeliveryIssueReport.find({
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

    // Fallback: đơn thu hồi FAILED chưa có bản ghi DeliveryIssueReport (đồng bộ với tab staff)
    const failedReturnRecords = await ReturnRecord.find({
      rentalId: { $in: rentalIds },
      status: "FAILED",
    })
      .populate({
        path: "rentalId",
        select: "customerId phoneNumber status inspectedContext",
        populate: { path: "customerId", select: "fullName email phone image" },
      })
      .sort({ updatedAt: -1 })
      .lean();

    const existingKeys = new Set(
      deliveryIssues
        .filter((r) => RETURN_FAIL_REGEX.test(r?.description || ""))
        .map((r) => `${String(r?.rentalId?._id || r?.rentalId)}|${r.description}`)
    );

    const fallbackReports = failedReturnRecords
      .map((record) => {
        const reasonLabel = RETURN_FAILURE_LABELS[record?.failure?.reason] || "Khác";
        const description = [
          `Thu hồi thất bại: ${reasonLabel}`,
          record?.failure?.detail || "",
          record?.failure?.operatorNote || "",
        ]
          .filter(Boolean)
          .join(" | ");

        const dedupeKey = `${String(record?.rentalId?._id || record?.rentalId)}|${description}`;
        if (existingKeys.has(dedupeKey)) {
          return null;
        }

        const snapshotItems =
          record?.inspection?.items?.length > 0
            ? record.inspection.items
            : record?.prefetchedSnapshot?.items || [];

        const syntheticDeviceIds = snapshotItems.slice(0, 3).map((item, idx) => ({
          _id: item?.deviceId || `${record._id}-device-${idx}`,
          name: item?.deviceName || "Thiết bị",
        }));

        return {
          _id: `return-failed-${record._id}`,
          rentalId: record.rentalId,
          deviceIds: syntheticDeviceIds,
          issueType: "OTHER",
          description,
          images: Array.isArray(record?.failure?.evidenceUrls) ? record.failure.evidenceUrls : [],
          status: "OPEN",
          createdAt: record?.finishedAt || record?.updatedAt || record?.createdAt,
          reportContext: "RETURN",
          reportedBy: "STAFF",
          source: "RETURN_RECORD",
        };
      })
      .filter(Boolean);

    deliveryIssues = [...deliveryIssues, ...fallbackReports].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

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

/**
 * PATCH supplier issue status (delivery or damage report).
 * - PROCESSING: from OPEN — "Đánh dấu đang xử lý"
 * - RESOLVED: when rental is REJECTED — "Xác nhận" (supplier acknowledges; no further evidence needed)
 */
exports.supplierUpdateIssueStatus = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { issueId } = req.params;
    const { status: targetStatus } = req.body;

    if (String(issueId).startsWith("return-failed-")) {
      return res.status(400).json({
        message:
          "Không thể cập nhật bản ghi tổng hợp từ hệ thống. Liên hệ vận hành nếu cần.",
      });
    }

    if (!["PROCESSING", "RESOLVED"].includes(targetStatus)) {
      return res.status(400).json({
        message: "status phải là PROCESSING hoặc RESOLVED",
      });
    }

    let doc = await DeliveryIssueReport.findById(issueId);
    let modelName = "DeliveryIssueReport";
    if (!doc) {
      doc = await DamageReport.findById(issueId);
      modelName = "DamageReport";
    }
    if (!doc) {
      return res.status(404).json({ message: "Không tìm thấy báo cáo" });
    }

    const rental = await Rental.findById(doc.rentalId).select("supplierId status");
    if (!rental || rental.supplierId.toString() !== supplierId.toString()) {
      return res.status(403).json({ message: "Không có quyền cập nhật báo cáo này" });
    }

    const prev = doc.status;

    if (targetStatus === "PROCESSING") {
      if (doc.status !== "OPEN") {
        return res.status(400).json({
          message: "Chỉ có thể đánh dấu đang xử lý khi báo cáo đang ở trạng thái Mở (OPEN)",
        });
      }
      doc.status = "PROCESSING";
    } else if (targetStatus === "RESOLVED") {
      if (rental.status !== "REJECTED") {
        return res.status(400).json({
          message:
            "Chỉ dùng xác nhận kết thúc khi đơn thuê đã bị từ chối (REJECTED)",
        });
      }
      if (!["OPEN", "PROCESSING"].includes(doc.status)) {
        return res.status(400).json({
          message: "Không thể xác nhận với trạng thái báo cáo hiện tại",
        });
      }
      doc.status = "RESOLVED";
      if (!doc.resolutionNote && req.body.resolutionNote) {
        doc.resolutionNote = req.body.resolutionNote;
      }
      if (!doc.resolutionNote) {
        doc.resolutionNote = "NCC xác nhận đã nắm thông tin (đơn từ chối).";
      }
    }

    if (!doc.statusHistory) doc.statusHistory = [];
    doc.statusHistory.push({
      status: doc.status,
      changedBy: supplierId,
      note:
        targetStatus === "PROCESSING"
          ? "Supplier: đánh dấu đang xử lý"
          : "Supplier: xác nhận (đơn từ chối)",
      createdAt: new Date(),
    });

    await doc.save();

    const populated =
      modelName === "DeliveryIssueReport"
        ? await DeliveryIssueReport.findById(doc._id)
            .populate({
              path: "rentalId",
              select: "customerId phoneNumber status inspectedContext",
              populate: { path: "customerId", select: "fullName email phone image" },
            })
            .populate({ path: "staffId", select: "fullName" })
            .populate({ path: "deviceIds", select: "name images" })
            .lean()
        : await DamageReport.findById(doc._id)
            .populate({
              path: "rentalId",
              select: "customerId phoneNumber status",
              populate: { path: "customerId", select: "fullName email phone image" },
            })
            .populate({ path: "deviceId", select: "name images" })
            .lean();

    res.json({
      success: true,
      previousStatus: prev,
      issue: populated,
    });
  } catch (err) {
    console.error("supplierUpdateIssueStatus:", err);
    res.status(500).json({ message: err.message || "Lỗi server" });
  }
};

module.exports = {
  createDeliveryIssue: exports.createDeliveryIssue,
  getDeliveryIssueByRental: exports.getDeliveryIssueByRental,
  createStaffDeliveryIssue: exports.createStaffDeliveryIssue,
  getStaffDeliveryIssues: exports.getStaffDeliveryIssues,
  createStaffReturnIssue: exports.createStaffReturnIssue,
  getStaffReturnIssues: exports.getStaffReturnIssues,
  getSupplierIssues: exports.getSupplierIssues,
  supplierUpdateIssueStatus: exports.supplierUpdateIssueStatus,
};
