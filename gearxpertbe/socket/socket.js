let users = [];

const { addUser, removeUser, getUser, getUsers } = require("../utils/socketUser");

const socketHandler = (io) => {
  io.on("connection", (socket) => {
    socket.on("addUser", (userId) => {
      addUser(userId, socket.id);
      io.emit("getUsers", getUsers());
    });

    socket.on("sendMessage", ({ senderId, receiverId, text, conversationId, image }) => {
      const user = getUser(receiverId);
      if (user) {
        io.to(user.socketId).emit("getMessage", {
          senderId,
          text,
          image,
          conversationId,
        });
      }
    });
    socket.on("callUser", ({ userToCall, signalData, from, name }) => {

      const user = getUser(userToCall);

      if (user) {
        io.to(user.socketId).emit("callUser", {
          signal: signalData,
          from: from,
          name: name
        });
      } else {
      }
    });

    socket.on("answerCall", (data) => {
      io.to(data.to).emit("callAccepted", data.signal);
    });

    socket.on("endCall", ({ id }) => {
      const user = getUser(id);
      if (user) {
        io.to(user.socketId).emit("endCall");
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

    socket.on("joinRoom", (roomId) => {
      socket.join(roomId);
    });

    socket.on("leaveRoom", (roomId) => {
      socket.leave(roomId);
    });
  });
};

module.exports = socketHandler;
