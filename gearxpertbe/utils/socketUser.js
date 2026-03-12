let users = [];

// Add a user (or update socketId if they reconnect)
const addUser = (userId, socketId) => {
  const existing = users.find((user) => user.userId === userId);
  if (existing) {
    existing.socketId = socketId;
  } else {
    users.push({ userId, socketId });
  }
};

// Remove a user when they disconnect
const removeUser = (socketId) => {
  users = users.filter((user) => user.socketId !== socketId);
};

// Get a user by userId
const getUser = (userId) => {
  return users.find((user) => user.userId === userId);
};

// Get all users (optional)
const getUsers = () => users;

module.exports = {
  addUser,
  removeUser,
  getUser,
  getUsers,
};
