const mongoose = require("mongoose");

const deliveryIssueReportSchema = new mongoose.Schema(
  {
    rentalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      required: true,
      index: true,
    },

    // Thay rentalItemId thành array
    rentalItemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "RentalItem",
        required: true,
      },
    ],

    // Có thể giữ deviceIds nếu cần (hoặc populate từ rentalItemIds)
    deviceIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Device",
      },
    ],

    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "DeliveryIssueReport",
  deliveryIssueReportSchema
);
