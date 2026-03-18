const mongoose = require("mongoose");

const damageReportSchema = new mongoose.Schema(
  {
    rentalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      required: true,
      index: true,
    },

    rentalItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalItem",
      required: true,
    },

    // THÊM MẢNG NÀY: các serial cụ thể bị hỏng trong RentalItem
    deviceItemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeviceItem",
        required: true,
      },
    ],

    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
    },

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    images: [String],

    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH"],
      default: "LOW",
    },

    status: {
      type: String,
      enum: ["OPEN", "VERIFIED", "RESOLVED"],
      default: "OPEN",
    },

    compensationAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("DamageReport", damageReportSchema);
