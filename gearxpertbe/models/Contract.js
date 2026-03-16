  const mongoose = require("mongoose");

  const ContractSchema = new mongoose.Schema(
    {
      rentalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Rental",
        required: true,
        unique: true, // 1 rental = 1 contract
      },

      contractType: {
        type: String,
        enum: ["DELIVERY", "RETURN", "LIQUIDATION"],
        required: true,
      },

      status: {
        type: String,
        enum: ["DRAFT", "SIGNED", "COMPLETED"],
        default: "DRAFT",
      },

      deliveryMethod: {
        type: String,
        enum: ["SHIP", "HANDOVER"],
      },

      location: String,

      // ký ngoài đời
      signedByCustomer: {
        type: Boolean,
        default: false,
      },
      signedByStaff: {
        type: Boolean,
        default: false,
      },
      signedAt: Date,
    },
    { timestamps: true }
  );

  module.exports = mongoose.model("Contract", ContractSchema);
