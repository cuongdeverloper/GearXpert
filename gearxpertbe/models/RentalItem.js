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
    },

    quantity: { type: Number, required: true },

    rentalStartDate: { type: Date, required: true },
    rentalEndDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },

    isAddon: {
      type: Boolean,
      default: false,
    },

    rentPrice: { type: Number, required: true },
    depositAmount: { type: Number, required: true },

    /** 👉 TRẠNG THÁI ITEM */
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
      ],
      default: "PENDING",
      index: true,
    },

    conditionBeforeRent: {
      type: String,
      enum: ["NEW", "GOOD", "USED", "DAMAGED"],
      default: "GOOD",
    },

    conditionAfterReturn: {
      type: String,
      enum: ["GOOD", "DAMAGED"],
      default: "GOOD",
    },
  },
  { timestamps: true }
);

rentalItemSchema.virtual('deliveryIssues', {
  ref: 'DeliveryIssueReport',
  localField: '_id',
  foreignField: 'rentalItemIds',  // vì là array, sẽ match nếu _id nằm trong array
  justOne: false,                 // có thể có nhiều report theo thời gian
});

rentalItemSchema.set('toObject', { virtuals: true });
rentalItemSchema.set('toJSON', { virtuals: true });
rentalItemSchema.virtual('damageReports', {
  ref: 'DamageReport',
  localField: '_id',
  foreignField: 'rentalItemId',
  justOne: false, // có thể có nhiều report theo thời gian
});

rentalItemSchema.set('toObject', { virtuals: true });
rentalItemSchema.set('toJSON', { virtuals: true });
module.exports = mongoose.model("RentalItem", rentalItemSchema);
