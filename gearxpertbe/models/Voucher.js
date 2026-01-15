const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    type: {
      type: String,
      enum: ["GLOBAL", "SUPPLIER"],
      required: true
    },

    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
      // null nếu GLOBAL
    },

    description: String,

    discountType: {
      type: String,
      enum: ["PERCENT", "FIXED"],
      required: true
    },

    discountValue: {
      type: Number,
      required: true
    },

    minOrderValue: {
      type: Number,
      default: 0
    },

    maxDiscount: Number,

    usageLimit: {
      type: Number,
      default: 1
    },

    usedCount: {
      type: Number,
      default: 0
    },

    expiredAt: {
      type: Date,
      required: true
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE"
    }
  },
  { timestamps: true }
);

/* Đảm bảo logic */
voucherSchema.pre("save", function (next) {
  if (this.type === "GLOBAL") {
    this.supplierId = null;
  }
  next();
});

module.exports = mongoose.model("Voucher", voucherSchema);
