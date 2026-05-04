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
        ioInstance.to(receiverSocket.socketId).emit("newNotification", plain);
      }

      return newNotif;
    } catch (error) {
      console.error("Lỗi gửi thông báo:", error);
    }
  },

  sendNotificationToRole: async ({ senderId, role, title, message, link, type = "SYSTEM" }) => {
    try {
      const User = require("../models/User");
      const targetUsers = await User.find({ role, status: "ACTIVE" }).select("_id");
      
      if (!targetUsers.length) return;

      const notifData = targetUsers.map(user => ({
        senderId,
        receiverId: user._id,
        title,
        message,
        link,
        type
      }));

      const createdNotifs = await Notification.insertMany(notifData);

      // Broadcast to role room if using one, or to individual sockets
      // For now, let's emit to the individual sockets if they are online
      if (ioInstance) {
        createdNotifs.forEach(notif => {
          const receiverSocket = getUser(notif.receiverId.toString());
          if (receiverSocket) {
            const plain = notif.toObject ? notif.toObject() : notif;
            ioInstance.to(receiverSocket.socketId).emit("newNotification", plain);
          }
        });
      }

      return createdNotifs;
    } catch (error) {
      console.error("Lỗi gửi thông báo theo role:", error);
    }
  },
  
  getNotifications: async (userId) => {
    return await Notification.find({ receiverId: userId }).sort({ createdAt: -1 });
  }
};

module.exports = NotificationConfig;