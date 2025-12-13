let users = [];

const { addUser, removeUser, getUser, getUsers } = require("../utils/socketUser");

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    socket.on("addUser", (userId) => {
      addUser(userId, socket.id);
      io.emit("getUsers", getUsers());
    });

    socket.on("sendMessage", ({ senderId, receiverId, text, conversationId }) => {
      const user = getUser(receiverId);
      if (user) {
        io.to(user.socketId).emit("getMessage", {
          senderId,
          text,
          conversationId,
        });
      }
    });

    socket.on("disconnect", () => {
      removeUser(socket.id);
      io.emit("getUsers", getUsers());
    });

    socket.on("seenMessage", ({ senderId, conversationId }) => {
      const user = getUser(senderId);
      if (user) {
        io.to(user.socketId).emit("messageSeen", { conversationId });
      }
    });
  });
};

module.exports = socketHandler;
