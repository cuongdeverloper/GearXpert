const mongoose = require("mongoose");

const deliveryIssueReportSchema = new mongoose.Schema(
  {
    rentalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      required: true,
      index: true,
    },

    rentalItemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "RentalItem",
        required: true,
      },
    ],

    // THÊM MẢNG NÀY: map theo thứ tự với rentalItemIds
    // Ví dụ: deviceItemIds[0] thuộc rentalItemIds[0]
    deviceItemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeviceItem",
      },
    ],

    deviceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Device",
      },
    ],

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    reportedBy: {
      type: String,
      enum: ["CUSTOMER", "STAFF"],
      default: "CUSTOMER",
    },

    issueType: {
      type: String,
      enum: ["MISSING", "WRONG_ITEM", "DAMAGED", "OTHER"],
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    images: [String],

    status: {
      type: String,
      enum: ["OPEN", "PROCESSING", "RESOLVED", "REJECTED"],
      default: "OPEN",
    },

    resolvedNote: String,

    reportContext: {
      type: String,
      enum: ["DELIVERY", "RETURN"],
      default: "DELIVERY",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "DeliveryIssueReport",
  deliveryIssueReportSchema
);
