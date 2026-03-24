const mongoose = require("mongoose");

const rentalSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    rentalStartDate: Date,
    rentalEndDate: Date,

    rentPriceTotal: { type: Number, required: true },
    depositAmount: { type: Number, required: true },
    insuranceAmount: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },

    paymentMethod: { type: String, enum: ["BANK", "WALLET"], required: true },
    paymentStatus: {
      type: String,
      enum: ["UNPAID", "PAID", "REFUNDED"],
      default: "UNPAID",
      index: true,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "REJECTED",
        "DELIVERING",
        "RENTING",
        "RETURNING",
        "INSPECTING",
        "PENDING_RESOLUTION",
        "COMPLETED",
        "CANCELLED",
      ],
      default: "PENDING",
      index: true,
    },

    rejectionReason: String,
    rejectionNote: String,
    rejectionMessage: String,
    rejectedAt: Date,

    voucherCode: String,
    voucherDiscount: { type: Number, default: 0 },

    pickedUpAt: Date,
    deliveredAt: Date,

    deliveryAddress: {
      receiverName: { type: String, required: true },
      street: String,
      district: String,
      city: String,
      fullAddress: { type: String, required: true },
    },
    phoneNumber: { type: String, required: true },
    notes: String,

    orderCode: { type: Number, sparse: true },

    inspectedContext: {
      type: String,
      enum: ["DELIVERY", "RETURN"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

rentalSchema.virtual("items", {
  ref: "RentalItem",
  localField: "_id",
  foreignField: "rentalId",
  justOne: false,
});

rentalSchema.virtual("extensionRequests", {
  ref: "ExtensionRequest",
  localField: "_id",
  foreignField: "rentalId",
  justOne: false,
});

// Index phổ biến
rentalSchema.index({ customerId: 1, status: 1 });
rentalSchema.index({ supplierId: 1, status: 1 });

module.exports = mongoose.model("Rental", rentalSchema);
