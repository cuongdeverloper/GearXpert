const mongoose = require("mongoose");

const maintenanceTaskSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
      index: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // OPERATION_STAFF
      required: true,
    },

    type: {
      type: String,
      enum: ["ROUTINE", "REPAIR", "INSPECTION", "CLEANING"],
      required: true,
    },

    description: String,

    status: {
      type: String,
      enum: ["PENDING", "IN_PROGRESS", "COMPLETED", "CANCELLED"],
      default: "PENDING",
    },

    scheduledDate: {
      type: Date,
      required: true,
    },

    completedDate: Date,

    cost: Number,

    notes: String,

    imagesBefore: [String],
    imagesAfter: [String],
  },
  { timestamps: true }
);

module.exports = mongoose.model("MaintenanceTask", maintenanceTaskSchema);