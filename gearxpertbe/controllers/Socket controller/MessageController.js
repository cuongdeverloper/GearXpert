const Message = require("../modal/Socket IO/Message");
const Conversation = require("../modal/Socket IO/Conversation");
const User = require("../modal/User");
const SendMessage = async (req, res) => {
  try {
    const { receiverId, text, conversationId } = req.body;
    const senderId = req.user.id;

    if (!receiverId || !text) {
      return res.status(400).json({ error: "receiverId and text are required" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: "Receiver not found" });
    }

    let conversation;

    if (conversationId) {
      // ✅ Nếu đã có conversationId (frontend gửi)
      conversation = await Conversation.findById(conversationId);
    } else {
      // ✅ Nếu chưa có, tìm giữa sender và receiver
      conversation = await Conversation.findOne({
        members: { $all: [senderId, receiverId] },
      });

      if (!conversation) {
        // ✅ Nếu chưa có thật, thì tạo mới
        conversation = new Conversation({ members: [senderId, receiverId] });
        await conversation.save();
      }
    }

    // ✅ Tạo và lưu tin nhắn
    const newMessage = new Message({
      conversationId: conversation._id,
      sender: senderId,
      text,
      seen: false,
    });

    const savedMessage = await newMessage.save();

    // ✅ Populate thêm thông tin sender để frontend render ngay
    const populatedMessage = await savedMessage.populate("sender", "username image");

    res.status(200).json(populatedMessage);
  } catch (err) {
    console.error("SendMessage Error:", err);
    res.status(500).json({ error: err.message });
  }
};


const GetMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;

        if (!conversationId) {
            return res.status(400).json({ error: "conversationId is required" });
        }
        const messages = await Message.find({ conversationId })
            .sort({ createdAt: 1 })
            .populate("sender", "username image"); 

        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
const MarkMessagesAsSeen = async (req, res) => {
    try {
      const { conversationId } = req.params;
      const userId = req.user.id;
  
      await Message.updateMany(
        { conversationId, sender: { $ne: userId }, seen: false },
        { $set: { seen: true } }
      );
  
      res.status(200).json({ message: "Messages marked as seen" });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };
module.exports = { SendMessage,GetMessages,MarkMessagesAsSeen };
