const MaintenanceWorkOrder = require("../../models/MaintenanceWorkOrder");
const DeviceItem = require("../../models/DeviceItem");
const MaintenanceRecord = require("../../models/MaintenanceRecord");
const mongoose = require("mongoose");

// GET /api/admin/maintenance/work-orders
// Xem danh sách các yêu cầu đang chờ duyệt hoặc tất cả
exports.getReviewList = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const skip = (page - 1) * limit;

    const workOrders = await MaintenanceWorkOrder.find(filter)
      .populate("deviceItemId", "serialNumber internalCode status")
      .populate("deviceId", "name category")
      .populate("supplierId", "username email phone")
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await MaintenanceWorkOrder.countDocuments(filter);

    return res.status(200).json({
      success: true,
      data: workOrders,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[AdminMaintenanceController] getReviewList error:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// GET /api/admin/maintenance/work-orders/:id
exports.getReviewDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const wo = await MaintenanceWorkOrder.findById(id)
      .populate("deviceItemId")
      .populate("deviceId")
      .populate("supplierId", "username email phone");

    if (!wo) {
      return res.status(404).json({ success: false, message: "Không tìm thấy WorkOrder" });
    }

    // Lấy thêm lịch sử bảo trì của thiết bị này
    const history = await MaintenanceWorkOrder.find({
      deviceItemId: wo.deviceItemId._id,
      _id: { $ne: wo._id },
    }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: wo, history });
  } catch (error) {
    console.error("[AdminMaintenanceController] getReviewDetail error:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};

// POST /api/admin/maintenance/work-orders/:id/review
/*
 body: {
   decision: "APPROVE" | "REJECT" | "REQUEST_INFO",
   note: "Lý do / nhận xét của admin"
 }
*/
exports.reviewWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision, note } = req.body;

    const wo = await MaintenanceWorkOrder.findById(id);
    if (!wo) {
      return res.status(404).json({ success: false, message: "Không tìm thấy WorkOrder" });
    }

    if (wo.status !== "PENDING_REVIEW") {
      return res.status(400).json({ success: false, message: "Trạng thái lệnh không hợp lệ để duyệt" });
    }

    const now = new Date();

    if (decision === "APPROVE") {
      // Đạt: => AVAILABLE
      wo.status = "COMPLETED";
      wo.completedDate = now;
      if (note) wo.notes = (wo.notes ? wo.notes + "\nAdmin: " : "Admin: ") + note;
      
      const nextDue = new Date(now);
      nextDue.setMonth(nextDue.getMonth() + 3);

      await DeviceItem.findByIdAndUpdate(wo.deviceItemId, {
        status: "AVAILABLE",
        "lastMaintenance.at": now,
        "lastMaintenance.note": wo.notes || "",
        "lastMaintenance.cost": wo.cost || 0,
        nextMaintenanceDue: nextDue,
        rentalCountSinceLastMaintenance: 0,
        activeIssueId: null,
      });

      // Tạo Record lưu lịch sử
      await MaintenanceRecord.create({
        deviceId: wo.deviceId,
        taskId: null,
        performedBy: wo.supplierId,
        type: wo.maintenanceType === "PREVENTIVE" ? "ROUTINE" : "REPAIR",
        description: wo.notes || "Hoàn tất bảo trì/sửa chữa thiết bị",
        status: "COMPLETED",
        cost: wo.cost,
        imagesBefore: wo.imagesBefore,
        imagesAfter: wo.imagesAfter,
      });

      // Nếu có issueId -> Resolve issue
      if (wo.issueId && wo.issueModel) {
        if (mongoose.models[wo.issueModel]) {
          const IssueModel = mongoose.model(wo.issueModel);
          await IssueModel.findByIdAndUpdate(wo.issueId, {
            status: "RESOLVED",
            resolutionNote: "Nghiệm thu bảo trì tự động: " + (note || "Đạt"),
            $push: {
              statusHistory: {
                status: "RESOLVED",
                changedBy: req.user.id,
                note: "Admin nghiệm thu bảo trì",
                createdAt: now,
              }
            }
          });
        }
      }

    } else if (decision === "REQUEST_INFO") {
      // Yêu cầu thông tin
      wo.status = "INFO_REQUIRED";
      if (note) wo.notes = (wo.notes ? wo.notes + "\nAdmin Yêu Cầu Bổ Sung: " : "Admin Yêu Cầu Bổ Sung: ") + note;
      
      // Device state có thể vẫn là PENDING_MAINTENANCE_REVIEW hoặc về MAINTENANCE
      await DeviceItem.findByIdAndUpdate(wo.deviceItemId, {
        status: "MAINTENANCE",
      });

    } else if (decision === "REJECT") {
      // Không đạt -> Bảo trì lại
      wo.status = "CANCELLED"; // Hoặc giữ IN_PROGRESS tùy luồng, ở đây set RE_MAINTENANCE
      if (note) wo.notes = (wo.notes ? wo.notes + "\nAdmin Từ Chối: " : "Admin Từ Chối: ") + note;
      
      await DeviceItem.findByIdAndUpdate(wo.deviceItemId, {
        status: "RE_MAINTENANCE", // Bảo trì lại
      });
      // Tạo WorkOrder mới cho RE_MAINTENANCE hoặc tái sử dụng? 
      // Sẽ tạo một WorkOrder mới để track 
      const newWo = new MaintenanceWorkOrder({
        deviceItemId: wo.deviceItemId,
        deviceId: wo.deviceId,
        supplierId: wo.supplierId,
        issueId: wo.issueId,
        issueModel: wo.issueModel,
        maintenanceType: "CORRECTIVE",
        status: "IN_PROGRESS",
        priority: "HIGH",
        scheduledDate: now,
        notes: "Lệnh bảo trì lại do: " + (note || "Không đạt nghiệm thu"),
        estimatedCost: wo.estimatedCost,
      });
      await newWo.save();

    } else {
      return res.status(400).json({ success: false, message: "Quyết định không hợp lệ" });
    }

    await wo.save();

    return res.status(200).json({
      success: true,
      message: "Đã xử lý nghiệm thu bảo trì",
      data: wo,
    });
  } catch (error) {
    console.error("[AdminMaintenanceController] reviewWorkOrder error:", error);
    return res.status(500).json({ success: false, message: "Lỗi server" });
  }
};
