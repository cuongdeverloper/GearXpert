const mongoose = require('mongoose');
require('dotenv').config();
//db
const dbState = [
  { value: 0, label: "disconnected" },
  { value: 1, label: "connected" },
  { value: 2, label: "connecting" },
  { value: 3, label: "disconnecting" }
];

const dbUrl = process.env.DB_HOST;

const connection = async () => {
  try {
    if (!dbUrl) {
      throw new Error("DB_HOST environment variable is not defined");
    }

    await mongoose.connect(dbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    const state = Number(mongoose.connection.readyState);
    console.log(`${dbState.find(f => f.value === state).label} to db`);
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
};

module.exports = connection;
