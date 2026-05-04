const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const MaintenanceWorkOrder = require("../../models/MaintenanceWorkOrder");
const MaintenanceReminder = require("../../models/MaintenanceReminder");
const DeviceItem = require("../../models/DeviceItem");
const Device = require("../../models/Device");
const NotificationConfig = require("../../configs/NotificationConfig");

// ─── Helpers ────────────────────────────────────────────────────────────────

const extractUploadedUrls = (filesInput) => {
  const files = Array.isArray(filesInput)
    ? filesInput
    : Object.values(filesInput || {}).flat();
  return files.map((f) => f?.path).filter(Boolean);
};

// ─── DEVICE ITEM LOOKUP (for dropdown) ────────────────────────────────────────

/**
 * GET /api/maintenance/device-items
 * Lấy toàn bộ DeviceItems của Supplier (cho dropdown tạo WO thủ công)
 * Logic: Lấy tất cả Device thuộc supplier, sau đó lấy hết DeviceItem của từng Device
 */
exports.getSupplierDeviceItems = async (req, res) => {
  try {
    const supplierId = req.user.id;

    // Bước 1: Tìm tất cả Device thuộc supplier
    const devices = await Device.find({ supplierId }).select("_id name images").lean();
    if (devices.length === 0) {
      return res.json({ success: true, data: [] });
    }
    const deviceIds = devices.map((d) => d._id);
    const deviceMap = Object.fromEntries(devices.map((d) => [d._id.toString(), d]));

    // Bước 2: Lấy tất cả DeviceItem thuộc các device đó (mặc định limit cao)
    const items = await DeviceItem.find(
      { deviceId: { $in: deviceIds } },
      { _id: 1, serialNumber: 1, internalCode: 1, status: 1, condition: 1, deviceId: 1, activeIssueId: 1 }
    ).sort({ createdAt: -1 }).lean();

    const result = items.map((item) => ({
      _id: item._id,
      serialNumber: item.serialNumber || null,
      internalCode: item.internalCode || null,
      status: item.status,
      condition: item.condition,
      deviceId: item.deviceId,
      activeIssueId: item.activeIssueId || null,
      device: deviceMap[item.deviceId?.toString()] || null,
    }));

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("[MaintenanceController] getSupplierDeviceItems:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/**
 * GET /api/maintenance/device-items/by-devices?deviceIds=id1,id2,...
 * Lấy DeviceItems từ danh sách deviceId (cho dropdown tạo WO từ issue)
 * deviceIds là Device-level IDs (có từ issue.deviceIds đã populate trên FE)
 */
exports.getDeviceItemsByDeviceIds = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const deviceIdsRaw = req.query.deviceIds || "";
    const deviceIds = deviceIdsRaw
      .split(",")
      .map((id) => id.trim())
      .filter((id) => mongoose.Types.ObjectId.isValid(id));

    if (deviceIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    // Verify tất cả device đều thuộc supplier
    const devices = await Device.find({
      _id: { $in: deviceIds },
      supplierId,
    }).select("_id name images").lean();

    if (devices.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const verifiedIds = devices.map((d) => d._id);
    const deviceMap = Object.fromEntries(devices.map((d) => [d._id.toString(), d]));

    const items = await DeviceItem.find(
      { deviceId: { $in: verifiedIds } },
      { _id: 1, serialNumber: 1, internalCode: 1, status: 1, condition: 1, deviceId: 1, activeIssueId: 1 }
    ).sort({ createdAt: -1 }).lean();

    const result = items.map((item) => ({
      _id: item._id,
      serialNumber: item.serialNumber || null,
      internalCode: item.internalCode || null,
      status: item.status,
      condition: item.condition,
      deviceId: item.deviceId,
      activeIssueId: item.activeIssueId || null,
      device: deviceMap[item.deviceId?.toString()] || null,
    }));

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("[MaintenanceController] getDeviceItemsByDeviceIds:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ─── REMINDER APIs ───────────────────────────────────────────────────────────

/**
 * GET /api/maintenance/reminders
 * Lấy danh sách reminder của Supplier (mặc định: PENDING)
 */
exports.getReminders = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { status = "PENDING" } = req.query;

    const filter = { supplierId };
    if (status !== "ALL") filter.status = status;

    const reminders = await MaintenanceReminder.find(filter)
      .sort({ createdAt: -1 })
      .populate({
        path: "deviceItemId",
        select: "serialNumber internalCode status condition lastMaintenance nextMaintenanceDue rentalCountSinceLastMaintenance maintenanceInterval",
      })
      .populate({
        path: "deviceId",
        select: "name images category",
      })
      .lean();

    return res.json({ success: true, data: reminders });
  } catch (err) {
    console.error("[MaintenanceController] getReminders:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/**
 * POST /api/maintenance/reminders/:id/approve
 * Supplier duyệt reminder → tạo WorkOrder + set DeviceItem → MAINTENANCE
 */
exports.approveReminder = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { id } = req.params;
    const { scheduledDate, notes } = req.body;

    if (!scheduledDate) {
      return res.status(400).json({ success: false, message: "Vui lòng chọn ngày thực hiện" });
    }

    const reminder = await MaintenanceReminder.findOne({ _id: id, supplierId });
    if (!reminder) {
      return res.status(404).json({ success: false, message: "Không tìm thấy nhắc nhở" });
    }
    if (reminder.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Nhắc nhở này đã được xử lý" });
    }

    const deviceItem = await DeviceItem.findById(reminder.deviceItemId);
    if (!deviceItem) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thiết bị" });
    }

    // Tạo WorkOrder
    const workOrder = await MaintenanceWorkOrder.create({
      deviceItemId: reminder.deviceItemId,
      deviceId: reminder.deviceId,
      supplierId,
      reminderId: reminder._id,
      maintenanceType: "PREVENTIVE",
      status: "PENDING",
      scheduledDate: new Date(scheduledDate),
      notes: notes?.trim() || "",
      createdBy: supplierId,
    });

    // Cập nhật DeviceItem → MAINTENANCE
    deviceItem.status = "MAINTENANCE";
    await deviceItem.save();

    // Cập nhật Reminder → APPROVED
    reminder.status = "APPROVED";
    reminder.workOrderId = workOrder._id;
    await reminder.save();

    return res.status(201).json({
      success: true,
      message: "Đã tạo lệnh bảo trì. Thiết bị chuyển sang trạng thái Đang bảo trì.",
      data: workOrder,
    });
  } catch (err) {
    console.error("[MaintenanceController] approveReminder:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/**
 * PATCH /api/maintenance/reminders/:id/ignore
 * Supplier bỏ qua reminder
 */
exports.ignoreReminder = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { id } = req.params;

    const reminder = await MaintenanceReminder.findOne({ _id: id, supplierId });
    if (!reminder) {
      return res.status(404).json({ success: false, message: "Không tìm thấy nhắc nhở" });
    }
    if (reminder.status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Nhắc nhở này đã được xử lý" });
    }

    reminder.status = "IGNORED";
    await reminder.save();

    return res.json({ success: true, message: "Đã bỏ qua nhắc nhở" });
  } catch (err) {
    console.error("[MaintenanceController] ignoreReminder:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// ─── WORK ORDER APIs ─────────────────────────────────────────────────────────

/**
 * GET /api/maintenance/work-orders
 * Lấy danh sách WorkOrder của Supplier
 */
exports.getWorkOrders = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { status, maintenanceType, page = 1, limit = 20 } = req.query;

    const filter = { supplierId };
    if (status && status !== "ALL") filter.status = status;
    if (maintenanceType && maintenanceType !== "ALL") filter.maintenanceType = maintenanceType;

    const skip = (Number(page) - 1) * Number(limit);
    const [workOrders, total, stats] = await Promise.all([
      MaintenanceWorkOrder.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate({
          path: "deviceItemId",
          select: "serialNumber internalCode status condition",
        })
        .populate({
          path: "deviceId",
          select: "name images category",
        })
        .lean(),
      MaintenanceWorkOrder.countDocuments(filter),
      MaintenanceWorkOrder.aggregate([
        { $match: { supplierId: new mongoose.Types.ObjectId(supplierId) } },
        {
          $group: {
            _id: null,
            pending: { $sum: { $cond: [{ $eq: ["$status", "PENDING"] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ["$status", "IN_PROGRESS"] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ["$status", "COMPLETED"] }, 1, 0] } },
            totalCost: { $sum: "$cost" },
          }
        }
      ])
    ]);

    return res.json({
      success: true,
      data: workOrders,
      total,
      page: Number(page),
      stats: stats[0] || { pending: 0, inProgress: 0, completed: 0, totalCost: 0 }
    });
  } catch (err) {
    console.error("[MaintenanceController] getWorkOrders:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/**
 * POST /api/maintenance/work-orders
 * Supplier tạo WorkOrder thủ công
 */
exports.createWorkOrder = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { 
      deviceItemId, 
      maintenanceType, 
      scheduledDate, 
      notes, 
      priority = "LOW", 
      estimatedCost = 0, 
      providerName = "",
      issueId = null,
      issueModel = null
    } = req.body;

    if (!deviceItemId || !maintenanceType || !scheduledDate) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }
    if (!["PREVENTIVE", "CORRECTIVE"].includes(maintenanceType)) {
      return res.status(400).json({ success: false, message: "Loại bảo trì không hợp lệ" });
    }

    // Kiểm tra DeviceItem thuộc supplier này
    const deviceItem = await DeviceItem.findById(deviceItemId).populate("deviceId", "supplierId");
    if (!deviceItem) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thiết bị" });
    }
    if (deviceItem.deviceId?.supplierId?.toString() !== supplierId) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền thao tác thiết bị này" });
    }

    // Kiểm tra không có WorkOrder đang active
    const activeWO = await MaintenanceWorkOrder.findOne({
      deviceItemId,
      status: { $in: ["PENDING", "IN_PROGRESS"] },
    });
    if (activeWO) {
      return res.status(400).json({
        success: false,
        message: "Thiết bị đã có lệnh bảo trì đang xử lý",
      });
    }

    // Ảnh trước bảo trì từ upload
    const imagesBefore = extractUploadedUrls(req.files?.imagesBefore || []);

    const workOrder = await MaintenanceWorkOrder.create({
      deviceItemId,
      deviceId: deviceItem.deviceId._id,
      supplierId,
      issueId,
      issueModel,
      maintenanceType,
      priority,
      estimatedCost: Number(estimatedCost) || 0,
      providerName: providerName?.trim() || "",
      imagesBefore,
      status: "PENDING",
      scheduledDate: new Date(scheduledDate),
      notes: notes?.trim() || "",
      createdBy: supplierId,
    });

    // Chuyển DeviceItem → MAINTENANCE
    deviceItem.status = "MAINTENANCE";
    await deviceItem.save();

    return res.status(201).json({
      success: true,
      message: "Đã tạo lệnh bảo trì",
      data: workOrder,
    });
  } catch (err) {
    console.error("[MaintenanceController] createWorkOrder:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/**
 * POST /api/maintenance/work-orders/from-issue
 * Tạo WorkOrder corrective từ 1 issue cụ thể
 */
exports.createWorkOrderFromIssue = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { deviceItemId, issueId, issueModel, scheduledDate, notes } = req.body;

    if (!deviceItemId || !issueId || !issueModel || !scheduledDate) {
      return res.status(400).json({ success: false, message: "Thiếu thông tin bắt buộc" });
    }
    if (!["DeliveryIssueReport", "DamageReport"].includes(issueModel)) {
      return res.status(400).json({ success: false, message: "issueModel không hợp lệ" });
    }

    // Kiểm tra DeviceItem
    const deviceItem = await DeviceItem.findById(deviceItemId).populate("deviceId", "supplierId name");
    if (!deviceItem) {
      return res.status(404).json({ success: false, message: "Không tìm thấy thiết bị" });
    }
    if (deviceItem.deviceId?.supplierId?.toString() !== supplierId) {
      return res.status(403).json({ success: false, message: "Bạn không có quyền thao tác thiết bị này" });
    }

    // Kiểm tra WorkOrder đang active
    const activeWO = await MaintenanceWorkOrder.findOne({
      deviceItemId,
      status: { $in: ["PENDING", "IN_PROGRESS"] },
    });
    if (activeWO) {
      return res.status(400).json({
        success: false,
        message: "Thiết bị đã có lệnh bảo trì đang xử lý",
      });
    }

    const workOrder = await MaintenanceWorkOrder.create({
      deviceItemId,
      deviceId: deviceItem.deviceId._id,
      supplierId,
      issueId,
      issueModel,
      maintenanceType: "CORRECTIVE",
      status: "PENDING",
      scheduledDate: new Date(scheduledDate),
      notes: notes?.trim() || "",
      createdBy: supplierId,
    });

    // Chuyển DeviceItem → REPAIR (sự cố → sửa chữa trước khi bảo trì)
    deviceItem.status = "REPAIR";
    await deviceItem.save();

    // Cập nhật trạng thái issue thành PROCESSING
    const mongoose = require("mongoose");
    if (mongoose.models[issueModel]) {
      const ModelObj = mongoose.model(issueModel);
      await ModelObj.findByIdAndUpdate(issueId, {
        status: "PROCESSING",
        $push: {
          statusHistory: {
            status: "PROCESSING",
            changedBy: supplierId,
            note: "Hệ thống tự động cập nhật do tạo lệnh sửa chữa",
            createdAt: new Date(),
          }
        }
      });
    }

    return res.status(201).json({
      success: true,
      message: "Đã tạo lệnh sửa chữa. Thiết bị chuyển sang trạng thái Đang sửa chữa.",
      data: workOrder,
    });
  } catch (err) {
    console.error("[MaintenanceController] createWorkOrderFromIssue:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/**
 * PATCH /api/maintenance/work-orders/:id/status
 * Cập nhật trạng thái WorkOrder (→ IN_PROGRESS hoặc CANCELLED)
 */
exports.updateWorkOrderStatus = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!["IN_PROGRESS", "CANCELLED"].includes(status)) {
      return res.status(400).json({ success: false, message: "Trạng thái không hợp lệ. Chỉ chấp nhận IN_PROGRESS hoặc CANCELLED" });
    }

    const wo = await MaintenanceWorkOrder.findOne({ _id: id, supplierId });
    if (!wo) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lệnh bảo trì" });
    }
    if (wo.status === "COMPLETED") {
      return res.status(400).json({ success: false, message: "Lệnh bảo trì đã hoàn tất, không thể thay đổi" });
    }

    wo.status = status;
    await wo.save();

    // Nếu hủy → trả DeviceItem về AVAILABLE
    if (status === "CANCELLED") {
      await DeviceItem.findByIdAndUpdate(wo.deviceItemId, { status: "AVAILABLE" });
    }

    return res.json({ success: true, message: `Đã cập nhật trạng thái: ${status}`, data: wo });
  } catch (err) {
    console.error("[MaintenanceController] updateWorkOrderStatus:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

/**
 * PATCH /api/maintenance/work-orders/:id/complete
 * Hoàn tất WorkOrder → DeviceItem về AVAILABLE, reset rentalCount
 */
exports.completeWorkOrder = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { id } = req.params;
    const { notes, cost } = req.body;

    const wo = await MaintenanceWorkOrder.findOne({ _id: id, supplierId });
    if (!wo) {
      return res.status(404).json({ success: false, message: "Không tìm thấy lệnh bảo trì" });
    }
    if (wo.status === "COMPLETED") {
      return res.status(400).json({ success: false, message: "Lệnh bảo trì đã hoàn tất" });
    }
    if (wo.status === "CANCELLED") {
      return res.status(400).json({ success: false, message: "Lệnh bảo trì đã bị hủy" });
    }

    // Ảnh trước/sau từ upload
    const uploadedBefore = extractUploadedUrls(req.files?.imagesBefore || []);
    const uploadedAfter = extractUploadedUrls(req.files?.imagesAfter || []);

    const now = new Date();
    const nextDue = new Date(now);
    nextDue.setMonth(nextDue.getMonth() + 3); // Nhắc lại sau 3 tháng mặc định

    // Cập nhật WorkOrder
    wo.status = "PENDING_REVIEW";
    // wo.completedDate = now; // Admin duyệt mới tính ngày hoàn tất
    if (notes?.trim()) wo.notes = notes.trim();
    if (cost !== undefined && !isNaN(Number(cost))) wo.cost = Number(cost);
    if (uploadedBefore.length > 0) wo.imagesBefore = [...(wo.imagesBefore || []), ...uploadedBefore];
    if (uploadedAfter.length > 0) wo.imagesAfter = [...(wo.imagesAfter || []), ...uploadedAfter];
    await wo.save();

    // Cập nhật DeviceItem → PENDING_MAINTENANCE_REVIEW
    await DeviceItem.findByIdAndUpdate(wo.deviceItemId, {
      status: "PENDING_MAINTENANCE_REVIEW",
      activeIssueId: wo.issueId || null,
    });

    // Tạm thời chưa resolve IssueModel, chờ Admin quyết định
    // Nếu có Issue thì vẫn giữ pending resolution hoặc tương đương

    return res.json({
      success: true,
      message: "Hoàn tất bảo trì. Thiết bị đã trở lại khả dụng.",
      data: wo,
    });
  } catch (err) {
    console.error("[MaintenanceController] completeWorkOrder:", err);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
