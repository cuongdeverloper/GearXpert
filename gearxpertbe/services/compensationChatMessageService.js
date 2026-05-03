const mongoose = require("mongoose");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const User = require("../models/User");
const { getUser } = require("../utils/socketUser");

/**
 * Tìm hoặc tạo hội thoại 1-1. members có thể là string hoặc ObjectId (dữ liệu cũ).
 */
async function findOrCreateConversationBetweenUsers(a, b) {
  const aStr = String(a);
  const bStr = String(b);
  if (!mongoose.Types.ObjectId.isValid(aStr) || !mongoose.Types.ObjectId.isValid(bStr)) {
    return null;
  }
  const aOid = new mongoose.Types.ObjectId(aStr);
  const bOid = new mongoose.Types.ObjectId(bStr);
  let conversation = await Conversation.findOne({
    $or: [
      { $and: [{ members: aStr }, { members: bStr }] },
      { $and: [{ members: aOid }, { members: bOid }] },
    ],
  });
  if (!conversation) {
    conversation = new Conversation({ members: [aOid, bOid] });
    await conversation.save();
  }
  return conversation;
}

/**
 * Cùng hành vi MessageController.sendMessage: lưu Message + emit "getMessage" tới người nhận.
 */
async function sendCompensationProposalChatMessage(req, { senderId, receiverId, text, image, payload }) {
  const senderStr = String(senderId);
  const receiverStr = String(receiverId);
  const receiver = await User.findById(receiverStr);
  if (!receiver) {
    const err = new Error("Receiver not found");
    err.code = "RECEIVER_NOT_FOUND";
    throw err;
  }
  const conversation = await findOrCreateConversationBetweenUsers(senderStr, receiverStr);
  if (!conversation) {
    const err = new Error("Invalid conversation members");
    throw err;
  }
  const img = image != null && String(image).trim() !== "" ? String(image) : "";
  const newMessage = new Message({
    conversationId: String(conversation._id),
    sender: new mongoose.Types.ObjectId(senderStr),
    text: text || "",
    image: img,
    type: "compensation_proposal",
    payload: payload != null ? payload : null,
    seen: false,
  });
  const saved = await newMessage.save();
  const io = req.app.get("io");
  if (io) {
    const receiverSocket = getUser(receiverStr);
    if (receiverSocket?.socketId) {
      io.to(receiverSocket.socketId).emit("getMessage", {
        _id: saved?._id,
        senderId: senderStr,
        text: text || "",
        image: img,
        type: "compensation_proposal",
        payload: payload != null ? payload : null,
        conversationId: String(conversation._id),
        createdAt: saved?.createdAt || new Date(),
        seen: false,
      });
    }
  }
  return saved;
}

const RESOLUTION_LABELS = {
  CUSTOMER_PAY: "Khách đền bù",
  SUPPLIER_BEAR: "NCC chịu trách nhiệm",
  REQUEST_GX_REVIEW: "Điều phối từ cọc (GX)",
  PLATFORM_LIABILITY: "Hệ thống đền bù thiệt hại",
};

/** Nội dung thư gửi khách (trùng copy FE SupplierIssueDetailPage). */
function buildSupplierToCustomerProposalText({
  customerName,
  issueId,
  rentalId,
  amount,
  reason,
  explanation,
  suggestedResolution,
}) {
  const amountNum = Number(amount) || 0;
  const amountText = amountNum > 0 ? `${amountNum.toLocaleString("vi-VN")} VND` : "0 VND";
  const resolutionLabel = RESOLUTION_LABELS[suggestedResolution] || suggestedResolution || "—";
  return [
    `Chào ${customerName || "bạn"},`,
    "",
    "Shop đã kiểm tra sự cố và gửi đề xuất xử lý như sau:",
    `- Mã sự cố: ${issueId != null ? String(issueId) : "—"}`,
    `- Mã đơn thuê: ${rentalId != null ? String(rentalId) : "—"}`,
    `- Phương án đề xuất: ${resolutionLabel}`,
    `- Mức bồi thường đề xuất: ${amountText}`,
    `- Lý do: ${reason || ""}`,
    `- Giải thích: ${explanation || ""}`,
    "",
    "Nếu bạn cần thêm thông tin, vui lòng phản hồi trực tiếp tại cuộc trò chuyện này. Cảm ơn bạn!",
  ].join("\n");
}

module.exports = {
  findOrCreateConversationBetweenUsers,
  sendCompensationProposalChatMessage,
  buildSupplierToCustomerProposalText,
};
