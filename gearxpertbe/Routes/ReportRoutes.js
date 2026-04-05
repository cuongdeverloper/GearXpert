const express = require("express");
const ReportRouter = express.Router();
const uploadCloud = require("../configs/cloudinaryConfig");
const deliveryCtrl = require("../controllers/Report/deliveryIssueController");
const damageCtrl = require("../controllers/Report/damageReportController");
const { checkAccessToken, checkSupplier } = require("../middleware/JWTAction");

// LÚC GIAO HÀNG — Customer
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

//  Staff ghi nhận sự cố lúc giao hàng
ReportRouter.post(
  "/staff-delivery-issue",
  checkAccessToken,
  uploadCloud.array("images", 5),
  deliveryCtrl.createStaffDeliveryIssue
);

ReportRouter.get(
  "/staff-delivery-issues",
  checkAccessToken,
  deliveryCtrl.getStaffDeliveryIssues
);

// LÚC THU HỒI — Staff
ReportRouter.post(
  "/staff-return-issue",
  checkAccessToken,
  uploadCloud.any(),
  deliveryCtrl.createStaffReturnIssue
);

ReportRouter.get(
  "/staff-return-issues",
  checkAccessToken,
  deliveryCtrl.getStaffReturnIssues
);

// ĐANG THUÊ
ReportRouter.post(
  "/damage",
  checkAccessToken,
  uploadCloud.array("images", 5),
  damageCtrl.createDamageReport
);

ReportRouter.get("/damage/:rentalId", checkAccessToken, damageCtrl.getDamageReportsByRental);

// SUPPLIER — Xem tất cả sự cố liên quan đến đơn hàng của supplier
ReportRouter.get(
  "/supplier-issues",
  checkAccessToken,
  checkSupplier,
  deliveryCtrl.getSupplierIssues
);

module.exports = ReportRouter;
