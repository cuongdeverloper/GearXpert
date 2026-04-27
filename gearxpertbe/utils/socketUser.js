let users = [];

// Add a user (or update socketId if they reconnect)
const addUser = (userId, socketId) => {
  const id = String(userId);
  const existing = users.find((user) => String(user.userId) === id);
  if (existing) {
    existing.socketId = socketId;
    existing.userId = id;
  } else {
    users.push({ userId: id, socketId });
  }
};

// Remove a user when they disconnect
const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

// Get a user by userId (so sánh theo chuỗi — tránh lệch string vs ObjectId)
const getUser = (userId) => {
  if (userId == null) return undefined;
  const id = String(userId);
  return users.find((user) => String(user.userId) === id);
};

// Get all users (optional)
const getUsers = () => users;

module.exports = {
  addUser,
  removeUser,
  getUser,
  getUsers,
};
