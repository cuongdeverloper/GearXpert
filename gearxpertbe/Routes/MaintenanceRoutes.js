const express = require("express");
const maintenanceRouter = express.Router();
const uploadCloud = require("../configs/cloudinaryConfig");
const { checkAccessToken, checkSupplier } = require("../middleware/JWTAction");
const ctrl = require("../controllers/Maintenance/MaintenanceController");

// ── Device Item Lookup (dropdown) ───────────────────────────────────────────
// GET /api/maintenance/device-items                      — toàn bộ DeviceItems của supplier
maintenanceRouter.get("/device-items", checkAccessToken, checkSupplier, ctrl.getSupplierDeviceItems);

// GET /api/maintenance/device-items/by-devices?deviceIds= — DeviceItems theo Device IDs
maintenanceRouter.get("/device-items/by-devices", checkAccessToken, checkSupplier, ctrl.getDeviceItemsByDeviceIds);

// ── Reminders ──────────────────────────────────────────────────────────────
// GET    /api/maintenance/reminders          — Danh sách reminder của Supplier
maintenanceRouter.get("/reminders", checkAccessToken, checkSupplier, ctrl.getReminders);

// POST   /api/maintenance/reminders/:id/approve — Duyệt reminder → tạo WorkOrder
maintenanceRouter.post("/reminders/:id/approve", checkAccessToken, checkSupplier, ctrl.approveReminder);

// PATCH  /api/maintenance/reminders/:id/ignore  — Bỏ qua reminder
maintenanceRouter.patch("/reminders/:id/ignore", checkAccessToken, checkSupplier, ctrl.ignoreReminder);

// ── WorkOrders ─────────────────────────────────────────────────────────────
// GET    /api/maintenance/work-orders        — Danh sách WorkOrder
maintenanceRouter.get("/work-orders", checkAccessToken, checkSupplier, ctrl.getWorkOrders);

// POST   /api/maintenance/work-orders/from-issue — Tạo WO từ issue (phải đặt trước :id)
maintenanceRouter.post(
  "/work-orders/from-issue",
  checkAccessToken,
  checkSupplier,
  ctrl.createWorkOrderFromIssue
);

// POST   /api/maintenance/work-orders        — Tạo WO thủ công
maintenanceRouter.post(
  "/work-orders",
  checkAccessToken,
  checkSupplier,
  uploadCloud.fields([{ name: "imagesBefore", maxCount: 5 }]),
  ctrl.createWorkOrder
);

// PATCH  /api/maintenance/work-orders/:id/status   — Cập nhật trạng thái (IN_PROGRESS | CANCELLED)
maintenanceRouter.patch("/work-orders/:id/status", checkAccessToken, checkSupplier, ctrl.updateWorkOrderStatus);

// PATCH  /api/maintenance/work-orders/:id/complete — Hoàn tất + upload ảnh
maintenanceRouter.patch(
  "/work-orders/:id/complete",
  checkAccessToken,
  checkSupplier,
  uploadCloud.fields([
    { name: "imagesBefore", maxCount: 5 },
    { name: "imagesAfter", maxCount: 5 },
  ]),
  ctrl.completeWorkOrder
);

module.exports = maintenanceRouter;
