const mongoose = require("mongoose");

const operationLogSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    action: {
      type: String,
      required: true, // "UPDATE_STATUS", "CREATE_TASK", "REJECT_RENTAL", "SIGN_CONTRACT", etc.
    },

    targetType: {
      type: String, // "RENTAL", "DEVICE", "CONTRACT", "TASK", etc.
      required: true,
    },

    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    details: mongoose.Schema.Types.Mixed, // JSON chi tiết thay đổi

    ip: String,
    userAgent: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("OperationLog", operationLogSchema);