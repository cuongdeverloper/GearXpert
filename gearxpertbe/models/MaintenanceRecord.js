const mongoose = require("mongoose");

const maintenanceRecordSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
      index: true,
    },

    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MaintenanceTask", // Liên kết với task bảo trì (nếu có)
      required: false,
    },

    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // OPERATION_STAFF thực hiện
      required: true,
    },

    type: {
      type: String,
      enum: ["ROUTINE", "REPAIR", "INSPECTION", "CLEANING", "UPGRADE", "OTHER"],
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    status: {
      type: String,
      enum: ["COMPLETED", "PARTIAL", "FAILED"],
      default: "COMPLETED",
    },

    performedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    cost: {
      type: Number,
      default: 0,
    },

    notes: String,

    // Trạng thái thiết bị trước & sau bảo trì
    conditionBefore: {
      type: String,
      enum: ["GOOD", "NEEDS_REPAIR", "BROKEN", "UNKNOWN"],
      default: "UNKNOWN",
    },

    conditionAfter: {
      type: String,
      enum: ["GOOD", "NEEDS_REPAIR", "BROKEN", "UNKNOWN"],
      default: "UNKNOWN",
    },

    // Hình ảnh minh chứng (trước / sau)
    imagesBefore: [String],
    imagesAfter: [String],

    // Các linh kiện thay thế (nếu có)
    replacedParts: [{
      partName: String,
      partCode: String,
      quantity: Number,
      cost: Number,
    }],

    // Thời gian tiếp theo nên bảo trì (tự động tính nếu cần)
    nextMaintenanceDue: Date,
  },
  { timestamps: true }
);

// Index để tìm nhanh theo thiết bị và thời gian
maintenanceRecordSchema.index({ deviceId: 1, performedAt: -1 });

module.exports = mongoose.model("MaintenanceRecord", maintenanceRecordSchema);