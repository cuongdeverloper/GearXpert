const express = require("express");
const ReportRouter = express.Router();
const uploadCloud = require("../configs/cloudinaryConfig");
const deliveryCtrl = require("../controllers/Report/deliveryIssueController");
const damageCtrl = require("../controllers/Report/damageReportController");
const { checkAccessToken } = require("../middleware/JWTAction");

// 📦 LÚC GIAO HÀNG
ReportRouter.post(
  "/delivery-issue",
  checkAccessToken,
  uploadCloud.array("images", 5),
  deliveryCtrl.createDeliveryIssue
);

ReportRouter.get(
  "/delivery-issue/:rentalId",
  checkAccessToken,
  deliveryCtrl.getDeliveryIssueByRental
);

// 🔧 ĐANG THUÊ
ReportRouter.post(
  "/damage",
  checkAccessToken,
  uploadCloud.array("images", 5),
  damageCtrl.createDamageReport
);

ReportRouter.get("/damage/:rentalId", checkAccessToken, damageCtrl.getDamageReportsByRental);

module.exports = ReportRouter;
