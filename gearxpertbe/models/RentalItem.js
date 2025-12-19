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

    rentPrice: {
      type: Number,
      required: true,
    },

    depositAmount: {
      type: Number,
      required: true,
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

module.exports = mongoose.model("RentalItem", rentalItemSchema);
