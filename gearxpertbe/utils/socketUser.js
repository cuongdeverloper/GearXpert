let users = [];

// Add a user to the users array
const addUser = (userId, socketId) => {
  if (!users.some((user) => user.userId === userId)) {
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
