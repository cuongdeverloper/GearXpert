const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, 
    type: { type: String, enum: ["ORDER", "SYSTEM", "CHAT", "PAYMENT"], default: "SYSTEM" },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String, default: "" }, 
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", notificationSchema);