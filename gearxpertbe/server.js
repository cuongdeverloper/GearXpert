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
const socketHandler = require("./socket/socket");
const port = process.env.PORT || 1357;
const server = http.createServer(app);
const socketIo = require("socket.io");
const { handleAIChat } = require("./controllers/AIChatController")



const  rentalRouter   = require('./Routes/RentalRoutes');
const  cartRouter   = require('./Routes/CartRoutes');
const  deviceRouter   = require('./Routes/DeviceRoutes');
const  authRouter   = require('./Routes/AuthRoutes');
const  googleAuthRouter   = require('./Routes/GoogleAuthRoutes');
const doLoginWGoogle = require("./controllers/social/GoogleController");

const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});
app.set("io", io);




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

app.use('/api/rentals',rentalRouter);
app.use('/api/carts',cartRouter);
app.use('/api/devices',deviceRouter);
app.use('/api/auths',authRouter);
app.use('/',googleAuthRouter);
app.post("/api/ai-chat", handleAIChat);
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});

socketHandler(io);

(async () => {
  try {
    await connection();
    doLoginWGoogle();
    server.listen(port, () => {
      console.log(`Backend + Socket listening on port ${port}`);
    });
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
})();