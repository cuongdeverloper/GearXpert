const Conversation = require("../modal/Socket IO/Conversation");

const NewConversation = async (req, res) => {
    try {
        const senderId = req.user.id;
        const { receiverId } = req.body;

        if (!receiverId) {
            return res.status(400).json({ error: "Missing receiverId" });
        }

        // 1. Check nếu đã tồn tại conversation giữa 2 user
        const existingConversation = await Conversation.findOne({
            members: { $all: [senderId, receiverId] }
        });

        if (existingConversation) {
            return res.status(200).json(existingConversation); // return luôn conversation cũ
        }

        // 2. Nếu chưa có -> tạo mới
        const newConversation = new Conversation({
            members: [senderId, receiverId],
        });

        const savedConversation = await newConversation.save();
        res.status(200).json(savedConversation);

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};


const GetConversation = async(req,res) =>{
    try {
        const userId = req.user.id; 

        if (!userId) {
            return res.status(400).json({ error: "User ID is required" });
        }

        const conversations = await Conversation.find({
            members: { $in: [userId] }, 
        });

        res.status(200).json(conversations);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = {NewConversation,GetConversation};
