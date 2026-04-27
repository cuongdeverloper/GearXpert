const mongoose = require("mongoose");

const compensationProposalSchema = new mongoose.Schema(
  {
    referenceModel: {
      type: String,
      enum: ["DeliveryIssueReport", "DamageReport"],
      required: true,
      index: true,
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    rentalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      required: true,
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, min: 0, default: 0 },
    currency: { type: String, default: "VND" },
    reason: { type: String, trim: true, maxlength: 1000, required: true },
    explanation: { type: String, trim: true, maxlength: 4000, required: true },
    suggestedResolution: {
      type: String,
      enum: ["CUSTOMER_PAY", "SUPPLIER_BEAR", "REQUEST_GX_REVIEW"],
      required: true,
    },
    images: [String],
    submittedAt: { type: Date, default: Date.now, index: true },
    forwardedToCustomerAt: Date,
    forwardedMessagePreview: { type: String, trim: true, maxlength: 4000 },
    customerDecision: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    customerDecidedAt: Date,
    customerDecidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    customerDecisionNote: { type: String, trim: true, maxlength: 1000 },
    supplierDecision: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    supplierDecidedAt: Date,
    supplierDecidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    supplierDecisionNote: { type: String, trim: true, maxlength: 1000 },
    adminDecision: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    adminDecidedAt: Date,
    adminDecidedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    adminDecisionNote: { type: String, trim: true, maxlength: 1000 },
    approvedCompensationAmount: { type: Number, min: 0, default: 0 },
    flowStatus: {
      type: String,
      enum: [
        "PROPOSED",
        "CUSTOMER_ACCEPTED",
        "CUSTOMER_REJECTED",
        "SUPPLIER_ACCEPTED",
        "SUPPLIER_REJECTED",
        "PENDING_ADMIN_REVIEW",
        "PENDING_WALLET", // khóa tạm khi admin duyệt, tránh ghi ví 2 lần (double-click / song song)
        "ADMIN_APPROVED",
        "ADMIN_REJECTED",
      ],
      default: "PROPOSED",
      index: true,
    },
    appliedToDeposit: { type: Boolean, default: false, index: true },
    appliedToDepositAt: Date,
    deductedFromDepositAmount: { type: Number, min: 0, default: 0 },
  },
  { timestamps: true }
);

compensationProposalSchema.index({ referenceModel: 1, referenceId: 1, submittedAt: -1 });

module.exports = mongoose.model("CompensationProposal", compensationProposalSchema);
