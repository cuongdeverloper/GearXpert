const mongoose = require("mongoose");

const ContractItemSchema = new mongoose.Schema(
  {
    contractId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },

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

    quantity: Number,

    // tình trạng trước khi thuê
    conditionBefore: {
      type: String,
      default: "",
    },

    // dùng cho hợp đồng RETURN
    conditionAfter: String,
    damageNote: String,
    compensationFee: Number,
  },
  { timestamps: true }
);

module.exports = mongoose.model("ContractItem", ContractItemSchema);
