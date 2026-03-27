const mongoose = require("mongoose");

const HANDOVER_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  VOID: "VOID",
});

const HANDOVER_RESULT = Object.freeze({
  SUCCESS: "SUCCESS",
  FAILED: "FAILED",
  VOID: "VOID",
});

const HANDOVER_FAILURE_REASON = Object.freeze({
  NO_SHOW: "NO_SHOW",
  CUSTOMER_REJECT: "CUSTOMER_REJECT",
  MISSING_ACCESSORY: "MISSING_ACCESSORY",
  DEVICE_MISMATCH: "DEVICE_MISMATCH",
  DAMAGED_ITEM_AT_DELIVERY: "DAMAGED_ITEM_AT_DELIVERY",
  ORDER_CANCELED: "ORDER_CANCELED",
  DELIVERY_BLOCKED: "DELIVERY_BLOCKED",
  OTHER: "OTHER",
});

const accessorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    expectedQty: { type: Number, default: 0, min: 0 },
    actualQty: { type: Number, default: 0, min: 0 },
    isMissing: { type: Boolean, default: false },
    note: { type: String, trim: true, maxlength: 500 },
  },
  { _id: false }
);

const handoverItemSchema = new mongoose.Schema(
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
    expectedDeviceItemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeviceItem",
      },
    ],
    expectedSerialNumbers: [{ type: String }],
    deliveredDeviceItemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeviceItem",
      },
    ],
    deliveredSerialNumbers: [{ type: String }],
    accessories: [accessorySchema],
    deviceCondition: {
      type: String,
      enum: ["UNKNOWN", "GOOD", "FAIR", "DAMAGED", "MISMATCH"],
      default: "UNKNOWN",
    },
    mismatchNote: { type: String, trim: true, maxlength: 1000 },
    operatorNote: { type: String, trim: true, maxlength: 1000 },
    evidenceUrls: [{ type: String }],
  },
  { _id: false }
);

const handoverRecordSchema = new mongoose.Schema(
  {
    rentalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      required: true,
      index: true,
    },
    deliveryTaskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeliveryTask",
      index: true,
    },
    attemptNo: {
      type: Number,
      required: true,
      min: 1,
    },
    status: {
      type: String,
      enum: Object.values(HANDOVER_STATUS),
      required: true,
      default: HANDOVER_STATUS.DRAFT,
      index: true,
    },
    result: {
      type: String,
      enum: Object.values(HANDOVER_RESULT),
      default: null,
    },

    operatorStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
    },

    prefetchedSnapshot: {
      orderStatusAtDraft: { type: String },
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
      items: [handoverItemSchema],
    },

    inspection: {
      checklist: {
        customerPresent: { type: Boolean, default: false },
        customerIdentityVerified: { type: Boolean, default: false },
        deliveryAddressMatched: { type: Boolean, default: false },
      },
      items: [handoverItemSchema],
      operatorNote: { type: String, trim: true, maxlength: 2000 },
      evidenceUrls: [{ type: String }],
    },

    customerConfirmation: {
      confirmed: { type: Boolean, default: false },
      confirmedAt: Date,
      confirmerName: { type: String, trim: true, maxlength: 120 },
      confirmerPhone: { type: String, trim: true, maxlength: 30 },
      signatureUrl: String,
      otpVerified: { type: Boolean, default: false },
    },

    failure: {
      reason: {
        type: String,
        enum: Object.values(HANDOVER_FAILURE_REASON),
      },
      detail: { type: String, trim: true, maxlength: 2000 },
      noShowWaitMinutes: { type: Number, min: 0, max: 300 },
      missingAccessories: [{ type: String }],
      mismatchedSerials: [{ type: String }],
      damagedItems: [
        {
          deviceItemId: { type: mongoose.Schema.Types.ObjectId, ref: "DeviceItem" },
          serialNumber: String,
          note: String,
        },
      ],
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

handoverRecordSchema.index({ rentalId: 1, attemptNo: 1 }, { unique: true });
handoverRecordSchema.index({ rentalId: 1, createdAt: -1 });
handoverRecordSchema.index({ deliveryTaskId: 1, status: 1 });

handoverRecordSchema.index(
  { rentalId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [HANDOVER_STATUS.DRAFT, HANDOVER_STATUS.IN_PROGRESS] },
    },
    name: "uniq_active_handover_per_rental",
  }
);

module.exports = {
  HandoverRecord: mongoose.model("HandoverRecord", handoverRecordSchema),
  HANDOVER_STATUS,
  HANDOVER_RESULT,
  HANDOVER_FAILURE_REASON,
};
