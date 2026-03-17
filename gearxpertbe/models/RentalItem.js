const mongoose = require("mongoose");

const rentalItemSchema = new mongoose.Schema(
  {
    rentalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Rental",
      required: true,
      index: true,
    },
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
      index: true,
    },
    deviceItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DeviceItem",
      required: true,
      index: true,
    },

    // Snapshot tại thời điểm tạo
    deviceSnapshot: {
      name: String,
      serialNumber: String,
      images: [String],
    },

    quantity: { type: Number, default: 1, min: 1 },

    rentalStartDate: { type: Date, required: true },
    rentalEndDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },

    isAddon: { type: Boolean, default: false },

    rentPrice: { type: Number, required: true },
    depositAmount: { type: Number, required: true },

    status: {
      type: String,
      enum: [
        "PENDING",
        "DELIVERING",
        "DELIVERED",
        "DELIVERY_ISSUE",
        "RENTING",
        "RETURNING",
        "INSPECTING",
        "DAMAGED",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "PENDING",
      index: true,
    },

    conditionBeforeRent: {
      type: String,
      enum: ["NEW", "GOOD", "FAIR", "USED"],
      default: "GOOD",
    },

    conditionAfterReturn: {
      type: String,
      enum: ["GOOD", "DAMAGED", "NEEDS_REPAIR"],
      default: "GOOD",
    },

    penaltyAmount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

rentalItemSchema.virtual("deliveryIssues", {
  ref: "DeliveryIssueReport",
  localField: "_id",
  foreignField: "rentalItemId",
  justOne: false,
});

rentalItemSchema.virtual("damageReports", {
  ref: "DamageReport",
  localField: "_id",
  foreignField: "rentalItemId",
  justOne: false,
});

// Ngăn duplicate item trong cùng rental
rentalItemSchema.index({ rentalId: 1, deviceItemId: 1 }, { unique: true });

module.exports = mongoose.model("RentalItem", rentalItemSchema);
