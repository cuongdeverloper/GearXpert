const mongoose = require("mongoose");

const maintenanceWorkOrderSchema = new mongoose.Schema(
  {
    // Unit vật lý cần bảo trì
    deviceItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeviceItem",
      required: true,
      index: true,
    },

    // Cache thiết bị cha để query nhanh
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

    // Liên kết sự cố nếu là corrective (polymorphic)
    issueId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    issueModel: {
      type: String,
      enum: ["DeliveryIssueReport", "DamageReport", null],
      default: null,
    },

    // Liên kết reminder nếu tạo từ approve reminder
    reminderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MaintenanceReminder",
      default: null,
    },

    maintenanceType: {
      type: String,
      enum: ["PREVENTIVE", "CORRECTIVE"],
      required: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "PENDING_REVIEW", "COMPLETED", "CANCELLED", "INFO_REQUIRED"],
      default: "PENDING",
      index: true,
    },

    priority: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW",
    },

    scheduledDate: {
      type: Date,
      required: true,
    },

    completedDate: Date,

    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    estimatedCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    cost: {
      type: Number,
      default: 0,
      min: 0,
    },

    providerName: {
      type: String,
      trim: true,
    },

    imagesBefore: [{ type: String }],
    imagesAfter: [{ type: String }],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

maintenanceWorkOrderSchema.index({ supplierId: 1, status: 1 });
maintenanceWorkOrderSchema.index({ deviceItemId: 1, status: 1 });

module.exports = mongoose.model("MaintenanceWorkOrder", maintenanceWorkOrderSchema);
