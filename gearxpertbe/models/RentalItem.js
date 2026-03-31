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

    // Mảng các DeviceItem được allocate cho item này (thay vì chỉ 1 deviceItemId)
    deviceItemIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "DeviceItem",
        required: true,
      },
    ],

    // Snapshot chung cho loại thiết bị (không cần serial vì có mảng deviceItemIds)
    deviceSnapshot: {
      name: String,
      images: [String],
    },

    quantity: { type: Number, required: true, min: 1 }, // số lượng thực tế từ giỏ hàng

    rentalStartDate: { type: Date, required: true },
    rentalEndDate: { type: Date, required: true },
    totalDays: { type: Number, required: true },

    isAddon: { type: Boolean, default: false },

    rentPrice: { type: Number, required: true }, // giá thuê cho 1 chiếc
    depositAmount: { type: Number, required: true }, // cọc cho 1 chiếc

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

// Virtuals báo cáo vẫn dùng _id của RentalItem (1 RentalItem đại diện cho cả lô)
// NOTE: DeliveryIssueReport sử dụng rentalItemIds (array), không phải rentalItemId
rentalItemSchema.virtual("deliveryIssues", {
  ref: "DeliveryIssueReport",
  localField: "_id",
  foreignField: "rentalItemIds", // Sửa từ rentalItemId thành rentalItemIds
  justOne: false,
});

rentalItemSchema.virtual("damageReports", {
  ref: "DamageReport",
  localField: "_id",
  foreignField: "rentalItemId",
  justOne: false,
});

// Index chống duplicate cùng rental + deviceId (vì gộp theo deviceId)
rentalItemSchema.index({ rentalId: 1, deviceId: 1 }, { unique: true });

module.exports = mongoose.model("RentalItem", rentalItemSchema);
