const mongoose = require("mongoose");

const extensionRequestSchema = new mongoose.Schema(
  {
    rentalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    requestedEndDate: {
      type: Date,
      required: true,
    },
    requestedDays: {
      type: Number,
      required: true,
      min: 1,
    },
    proposedExtraAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    approvedExtraAmount: {
      type: Number,
      default: 0,
    },
    note: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    approvedAt: Date,
    rejectedAt: Date,
    rejectedReason: {
      type: String,
      trim: true,
    },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PAID", "WAIVED"],
      default: "UNPAID",
    },
    paymentTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WalletTransaction",
    },
  },
  { timestamps: true }
);

// Index để query nhanh các request pending của supplier
extensionRequestSchema.index({ supplierId: 1, status: 1 });
extensionRequestSchema.index({ rentalId: 1, status: 1 });

module.exports = mongoose.model("ExtensionRequest", extensionRequestSchema);