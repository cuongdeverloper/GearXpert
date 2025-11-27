const express = require("express");
const configViewEngine = require("./configs/ViewEngine");
const cors = require("cors");
require("dotenv").config();
const connection = require("./configs/database");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const passport = require("passport");
const http = require("http");
const app = express();
// const doLoginWGoogle = require("./controllers/social/GoogleController");

const port = process.env.PORT || 1357;
const server = http.createServer(app);

// Configure request body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configure session middleware
app.use(
  session({
    secret: "your-secret-key", // Replace with your secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }, // Set to true if using HTTPS
  })
);

// Initialize passport
app.use(passport.initialize());
app.use(passport.session()); // Enable passport session support

// Configure CORS
app.use(
  cors({
    origin: "http://localhost:2468",
    credentials: true,
  })
);

configViewEngine(app);
app.get("/", (req, res) => {
  res.json("Hello");
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

(async () => {
  try {
    await connection();
    // doLoginWGoogle();
    server.listen(port, () => {
      console.log(`Backend + Socket listening on port ${port}`);
    });
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
})();