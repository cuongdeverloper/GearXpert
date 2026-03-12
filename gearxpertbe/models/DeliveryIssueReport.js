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
    },

    // Khi staff báo cáo sự cố lúc giao hàng
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // CUSTOMER | STAFF
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

    // DELIVERY = sự cố lúc giao hàng | RETURN = sự cố lúc thu hồi
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
