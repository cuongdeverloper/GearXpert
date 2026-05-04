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
const socketHandler = require("./socket/socket");
const port = process.env.PORT || 3000;
const server = http.createServer(app);
const socketIo = require("socket.io");
const { handleAIChat } = require("./controllers/AIChatController");
const { startRentalDueReminders } = require("./jobs/rentalDueReminders");
const rentalRouter = require("./Routes/RentalRoutes");
const cartRouter = require("./Routes/CartRoutes");
const deviceRouter = require("./Routes/DeviceRoutes");
const voucherRouter = require("./Routes/VoucherRoutes");
const routerMessage = require("./Routes/MessengerRoutes");
const routerEkyce = require("./Routes/EkycRoutes");
const authRouter = require("./Routes/AuthRoutes");
const googleAuthRouter = require("./Routes/GoogleAuthRoutes");
const doLoginWGoogle = require("./controllers/social/GoogleController");
const favoriteRouter = require("./Routes/FavoriteRoutes");
const walletRouter = require("./Routes/WalletRoutes");
const payosRouter = require("./Routes/PayOsRoutes");
const adminUserRouter = require("./Routes/AdminUserRoutes");
const adminDisputeRouter = require("./Routes/AdminDisputeRoutes");
const adminMaintenanceRouter = require("./Routes/AdminMaintenanceRoutes");
const advertisementRouter = require("./Routes/AdvertisementRoutes");
const ReportRouter = require("./Routes/ReportRoutes");
const ContractRouter = require("./Routes/ContractRoutes");
const NotificationRouter = require("./Routes/NotificationRoutes");
const NotificationConfig = require("./configs/NotificationConfig");
const operationStaffSocket = require("./utils/operationStaffSocket");
const blogRouter = require("./Routes/BlogRoutes");
const smartgearRoutes = require("./Routes/SmartGearRoutes");
const supplierRouter = require("./Routes/SupplierRoutes");
const supplierContractRouter = require("./Routes/SupplierContractRoutes");
const operationLogRouter = require("./Routes/OperationLogRoutes");
const handoverRouter = require("./Routes/HandoverRoutes");
const returnRouter = require("./Routes/ReturnRoutes");
const extensionRequestRouter = require("./Routes/ExtensionRequestRoutes");
const { startAutoReturnJob } = require("./jobs/autoReturnRentals");
const routerReview = require("./Routes/ReviewRoutes");
const maintenanceRouter = require("./Routes/MaintenanceRoutes");
const { startPreventiveMaintenanceJob } = require("./jobs/preventiveMaintenanceJob");
const { startVoucherExpiryReminders } = require("./jobs/voucherExpiryReminders");
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});
app.set("io", io);
app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

app.use(passport.initialize());
app.use(passport.session());

configViewEngine(app);
app.use("/api/reports", ReportRouter);
app.use("/api/payos", payosRouter);
app.use("/api/wallets", walletRouter);
app.use("/api/rentals", rentalRouter);
app.use("/api/carts", cartRouter);
app.use("/api/devices", deviceRouter);
app.use("/api/vouchers", voucherRouter);
app.use("/api/favorites", favoriteRouter);
app.use("/api/auths", authRouter);
app.use("/api/admin", adminUserRouter);
app.use("/api/admin/maintenance", adminMaintenanceRouter);
app.use("/api/message", routerMessage);
app.use("/api/ekyc", routerEkyce);
app.use("/api/advertisements", advertisementRouter);
app.use("/api/contracts", ContractRouter);
app.use("/api/notifications", NotificationRouter);
app.use("/api/blogs", blogRouter);
app.use("/api/smartgear", smartgearRoutes);
app.use("/api/suppliers", supplierRouter);
app.use("/api/suppliers-contract", supplierContractRouter);
app.use("/api/extension-requests", extensionRequestRouter);

app.use("/api/operation-logs", operationLogRouter);
app.use("/api/handovers", handoverRouter);
app.use("/api/returns", returnRouter);
app.use("/api/reviews", routerReview);
app.use("/api/maintenance", maintenanceRouter);
app.use("/", googleAuthRouter);

app.post("/api/ai-chat", handleAIChat);

app.get("/api/check-ip", (req, res) => {
  const https = require("https");
  https.get("https://api.ipify.org?format=json", (resp) => {
    let data = "";
    resp.on("data", (chunk) => {
      data += chunk;
    });
    resp.on("end", () => {
      try {
        const parsed = JSON.parse(data);
        res.json({ deployed_server_ip: parsed.ip });
      } catch (e) {
        res.status(500).json({ error: "Parse error" });
      }
    });
  }).on("error", (err) => {
    res.status(500).json({ error: err.message });
  });
});

app.get("/", (req, res) => {
  res.json("Hello");
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something broke!");
});
require("./jobs/autoCancelUnpaidRentals");
NotificationConfig.init(io);
operationStaffSocket.init(io);
startRentalDueReminders();
socketHandler(io);
startAutoReturnJob();
startPreventiveMaintenanceJob();
startVoucherExpiryReminders();
(async () => {
  try {
    await connection();
    doLoginWGoogle();
    server.listen(port, () => {
      console.log(`Backend listening on port:${port}`);
    });
  } catch (error) {
    console.error("Error connecting to the database:", error);
  }
})();
