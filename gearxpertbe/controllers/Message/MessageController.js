const Conversation = require("../../models/Conversation");
const Message = require("../../models/Message");
const User = require("../../models/User");
const SupplierProfile = require("../../models/SupplierProfile");
const { getUser } = require("../../utils/socketUser");

const NewConversation = async (req, res) => {
    try {
        const senderId = req.user.id;
        const { receiverId } = req.body;

        if (!receiverId) {
            return res.status(400).json({ error: "Missing receiverId" });
        }

        const existingConversation = await Conversation.findOne({
            members: { $all: [senderId, receiverId] }
        });

        if (existingConversation) {
            return res.status(200).json(existingConversation);
        }

        const newConversation = new Conversation({
            members: [senderId, receiverId],
        });

        const savedConversation = await newConversation.save();
        res.status(200).json(savedConversation);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const GetConversation = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const conversations = await Conversation.find({
            members: { $in: [userId] },
        }).sort({ updatedAt: -1 });

        res.status(200).json(conversations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

const SendMessage = async (req, res) => {
    try {
        const { receiverId, text, conversationId, image, type, payload } = req.body;
        const senderId = req.user.id;

        if (!receiverId || (!text && !image && !payload)) {
            return res.status(400).json({ error: "ReceiverId and content (text, image, or payload) are required" });
        }

        const receiver = await User.findById(receiverId);
        if (!receiver) {
            return res.status(404).json({ error: "Receiver not found" });
        }

        let conversation;

        if (conversationId) {
            conversation = await Conversation.findByIdAndUpdate(
                conversationId, 
                { $set: { updatedAt: new Date() } },
                { new: true }
            );
        } else {
            conversation = await Conversation.findOneAndUpdate(
                { members: { $all: [senderId, receiverId] } },
                { $set: { updatedAt: new Date() } },
                { new: true }
            );

            if (!conversation) {
                conversation = new Conversation({ members: [senderId, receiverId] });
                await conversation.save();
            }
        }

        const newMessage = new Message({
            conversationId: conversation._id,
            sender: senderId,
            text: text || "",
            image: image || "",
            type: type || "text",
            payload: payload || null,
            seen: false,
        });

        const savedMessage = await newMessage.save();
        const populatedMessage = await savedMessage.populate("sender", "username image avatar");

        try {
            const io = req.app.get("io");
            if (io) {
                const receiverSocket = getUser(String(receiverId));
                if (receiverSocket?.socketId) {
                    io.to(receiverSocket.socketId).emit("getMessage", {
                        _id: savedMessage?._id,
                        senderId: String(senderId),
                        text: text || "",
                        image: image || "",
                        type: type || "text",
                        payload: payload || null,
                        conversationId: String(conversation._id),
                        createdAt: savedMessage?.createdAt || new Date(),
                        seen: false,
                    });
                }
            }
        } catch (emitErr) {
            console.error("SendMessage socket emit:", emitErr);
        }

        res.status(200).json(populatedMessage);
    } catch (err) {
        console.error("SendMessage Error:", err);
        res.status(500).json({ error: err.message });
    }
};


const GetMessages = async (req, res) => {
    try {
        const { conversationId } = req.params;
        const userId = req.user.id;

        if (!conversationId) {
            return res.status(400).json({ error: "conversationId is required" });
        }
        const messages = await Message.find({ 
            conversationId,
            deletedBy: { $ne: userId } })
            .sort({ createdAt: 1 })
            .populate("sender", "username image");

        res.status(200).json(messages);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

const DeleteMessageForUser = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    await Message.findByIdAndUpdate(
      messageId,
      { $addToSet: { deletedBy: userId } } 
    );

    res.status(200).json({ message: "Deleted successfully for user" });
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
const getUserByUserId = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ message: 'User ID is required.' });
        }

        const user = await User.findById(userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const userObject = user.toObject();
        let supplierProfile = null;
        if (userObject?.role === "SUPPLIER") {
            supplierProfile = await SupplierProfile.findOne({ userId: user._id })
                .select("businessName businessAvatar")
                .lean();
        }

        const chatDisplayName =
            supplierProfile?.businessName || userObject?.fullName || userObject?.username || "User";
        const chatDisplayAvatar =
            supplierProfile?.businessAvatar || userObject?.avatar || userObject?.image || "";

        res.status(200).json({
            ...userObject,
            supplierProfile: supplierProfile
                ? {
                    businessName: supplierProfile.businessName || "",
                    businessAvatar: supplierProfile.businessAvatar || "",
                }
                : null,
            chatDisplayName,
            chatDisplayAvatar,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching user', error });
    }
};
module.exports = { NewConversation, GetConversation, SendMessage, GetMessages, MarkMessagesAsSeen, getUserByUserId,DeleteMessageForUser };

