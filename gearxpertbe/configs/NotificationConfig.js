const Notification = require("../models/Notification");
const { getUser } = require("../utils/socketUser"); 
let ioInstance;

const NotificationConfig = {
  init: (io) => {
    ioInstance = io;
  },

  sendNotification: async ({ senderId, receiverId, title, message, link, type = "SYSTEM" }) => {
    try {
      const newNotif = await Notification.create({
        senderId,
        receiverId,
        title,
        message,
        link,
        type,
      });

      const receiverSocket = getUser(receiverId?.toString());

      if (receiverSocket && ioInstance) {
        const plain =
          typeof newNotif.toObject === "function"
            ? newNotif.toObject()
            : { ...newNotif };
        ioInstance.to(receiverSocket.socketId).emit("getNotification", plain);
        ioInstance.to(receiverSocket.socketId).emit("newNotification", {
          _id: plain._id,
          senderId: plain.senderId,
          type: plain.type,
          title: plain.title,
          message: plain.message,
          image: plain.image || "",
          link: plain.link || "",
          isRead: Boolean(plain.isRead),
          createdAt: plain.createdAt,
        });
      }

      return newNotif;
    } catch (error) {
      console.error("Lỗi gửi thông báo:", error);
    }
  },
  
  // 3. Hàm lấy danh sách thông báo (API gọi hàm này)
  getNotifications: async (userId) => {
      return await Notification.find({ receiverId: userId }).sort({ createdAt: -1 });
  }
};

module.exports = NotificationConfig;