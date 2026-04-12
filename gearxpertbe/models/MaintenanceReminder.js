const mongoose = require("mongoose");

const maintenanceReminderSchema = new mongoose.Schema(
  {
    deviceItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeviceItem",
      required: true,
      index: true,
    },

    // Cache để query nhanh mà không cần populate DeviceItem
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
      index: true,
    },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    triggerType: {
      type: String,
      enum: ["RENTAL_COUNT", "DATE_INTERVAL", "NEXT_DUE"],
      required: true,
    },

    // Mô tả lý do nhắc, ví dụ: "Đã thuê 5 lần" hoặc "Quá hạn bảo trì 3 ngày"
    triggerValue: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "IGNORED"],
      default: "PENDING",
      index: true,
    },

    // Set khi supplier approve → tạo WorkOrder
    workOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MaintenanceWorkOrder",
      default: null,
    },
  },
  { timestamps: true }
);

// Tránh tạo trùng reminder PENDING cho cùng 1 DeviceItem
maintenanceReminderSchema.index(
  { deviceItemId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "PENDING" },
    name: "uniq_pending_reminder_per_device_item",
  }
);

maintenanceReminderSchema.index({ supplierId: 1, status: 1 });

module.exports = mongoose.model("MaintenanceReminder", maintenanceReminderSchema);
