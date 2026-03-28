const mongoose = require("mongoose");

const RETURN_RECORD_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  ISSUE_REPORTED: "ISSUE_REPORTED",
  FAILED: "FAILED",
  VOID: "VOID",
});

const RETURN_RECORD_RESULT = Object.freeze({
  SUCCESS: "SUCCESS",
  ISSUE: "ISSUE",
  FAILED: "FAILED",
  VOID: "VOID",
});

const RETURN_FAILURE_REASON = Object.freeze({
  CUSTOMER_NO_SHOW: "CUSTOMER_NO_SHOW",
  CUSTOMER_REJECT_RETURN: "CUSTOMER_REJECT_RETURN",
  CONTACT_FAILED: "CONTACT_FAILED",
  LOCATION_BLOCKED: "LOCATION_BLOCKED",
  ORDER_CLOSED_ELSEWHERE: "ORDER_CLOSED_ELSEWHERE",
  OTHER: "OTHER",
});

const accessorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    expectedQty: { type: Number, min: 0, default: 0 },
    actualQty: { type: Number, min: 0, default: 0 },
    isMissing: { type: Boolean, default: false },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const returnItemSchema = new mongoose.Schema(
  {
    rentalItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "RentalItem",
      required: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
    },
    deviceName: { type: String, required: true },
    expectedQuantity: { type: Number, required: true, min: 1 },
    expectedDeviceItemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "DeviceItem" }],
    expectedSerialNumbers: [{ type: String }],
    baselineCondition: {
      type: String,
      enum: ["UNKNOWN", "GOOD", "FAIR", "DAMAGED", "MISMATCH"],
      default: "UNKNOWN",
    },
    returnedDeviceItemIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "DeviceItem" }],
    returnedSerialNumbers: [{ type: String }],
    accessories: [accessorySchema],
    returnCondition: {
      type: String,
      enum: ["UNKNOWN", "GOOD", "FAIR", "DAMAGED", "MISMATCH", "NOT_RETURNED"],
      default: "UNKNOWN",
    },
    mismatchNote: { type: String, trim: true, maxlength: 1000 },
    operatorNote: { type: String, trim: true, maxlength: 1000 },
    evidenceUrls: [{ type: String }],
  },
  { _id: false }
);

const returnRecordSchema = new mongoose.Schema(
  {
    rentalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      required: true,
      index: true,
    },
    attemptNo: {
      type: Number,
      min: 1,
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(RETURN_RECORD_STATUS),
      default: RETURN_RECORD_STATUS.DRAFT,
      required: true,
      index: true,
    },
    result: {
      type: String,
      enum: Object.values(RETURN_RECORD_RESULT),
      default: null,
    },
    operatorStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },
    prefetchedSnapshot: {
      orderStatusAtDraft: String,
      customerId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      supplierId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      deliveryAddress: {
        receiverName: String,
        fullAddress: String,
        city: String,
        district: String,
        street: String,
      },
      phoneNumber: String,
      rentalStartDate: Date,
      rentalEndDate: Date,
      items: [returnItemSchema],
    },
    inspection: {
      checklist: {
        customerPresent: { type: Boolean, default: false },
        receivedAtAddress: { type: Boolean, default: false },
        accessoriesChecked: { type: Boolean, default: false },
      },
      actualReturnedAt: Date,
      isLateReturn: { type: Boolean, default: false },
      delayMinutes: { type: Number, min: 0, default: 0 },
      items: [returnItemSchema],
      operatorNote: { type: String, trim: true, maxlength: 2000 },
      evidenceUrls: [{ type: String }],
      requiresDeepInspection: { type: Boolean, default: false },
    },
    settlement: {
      depositOutcome: {
        type: String,
        enum: ["REFUND_FULL", "REFUND_PARTIAL", "FORFEIT", "DISPUTE"],
      },
      deductedAmount: { type: Number, min: 0, default: 0 },
      disputeReason: { type: String, trim: true, maxlength: 2000 },
      operatorNote: { type: String, trim: true, maxlength: 2000 },
    },
    issue: {
      reportId: { type: mongoose.Schema.Types.ObjectId, ref: "DeliveryIssueReport" },
      issueType: { type: String, enum: ["MISSING", "WRONG_ITEM", "DAMAGED", "OTHER"] },
      detail: { type: String, trim: true, maxlength: 2000 },
      evidenceUrls: [{ type: String }],
      operatorNote: { type: String, trim: true, maxlength: 2000 },
      requiresDeepInspection: { type: Boolean, default: true },
    },
    failure: {
      reason: {
        type: String,
        enum: Object.values(RETURN_FAILURE_REASON),
      },
      detail: { type: String, trim: true, maxlength: 2000 },
      evidenceUrls: [{ type: String }],
      operatorNote: { type: String, trim: true, maxlength: 2000 },
    },
    voidReason: { type: String, trim: true, maxlength: 500 },
    startedAt: Date,
    finishedAt: Date,
    voidedAt: Date,
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,
  }
);

returnRecordSchema.index({ rentalId: 1, attemptNo: 1 }, { unique: true });
returnRecordSchema.index({ rentalId: 1, createdAt: -1 });
returnRecordSchema.index(
  { rentalId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [RETURN_RECORD_STATUS.DRAFT, RETURN_RECORD_STATUS.IN_PROGRESS] },
    },
    name: "uniq_active_return_record_per_rental",
  }
);

module.exports = {
  ReturnRecord: mongoose.model("ReturnRecord", returnRecordSchema),
  RETURN_RECORD_STATUS,
  RETURN_RECORD_RESULT,
  RETURN_FAILURE_REASON,
};
