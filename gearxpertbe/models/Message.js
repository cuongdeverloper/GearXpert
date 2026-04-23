const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", 
      required: true
    },
    text: {
      type: String,
      default: ""
    },
    image: {
      type: String, 
      default: "", 
    },
    type: {
      type: String,
      default: "text", 
      enum: ["text", "image", "call", "compensation_proposal"]
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    deletedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    seen: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Message", MessageSchema);