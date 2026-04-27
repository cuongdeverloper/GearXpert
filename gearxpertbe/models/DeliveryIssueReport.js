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
      enum: ["OPEN", "PROCESSING", "WAITING_EVIDENCE", "RESOLVED", "REJECTED"],
      default: "OPEN",
    },

    /** Mức bồi thường admin duyệt (đồng bộ hợp thức với DamageReport khi chốt đề xuất) */
    compensationAmount: {
      type: Number,
      min: 0,
      default: 0,
    },

    resolutionNote: String,

    // Admin assignment
    assignedAdminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // Ghi chú nội bộ
    internalNotes: [
      {
        adminId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        content: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

    // Lịch sử thay đổi trạng thái
    statusHistory: [
      {
        status: String,
        changedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        note: String,
        createdAt: { type: Date, default: Date.now },
      },
    ],

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
