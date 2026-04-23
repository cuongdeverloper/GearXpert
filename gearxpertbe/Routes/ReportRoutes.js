const express = require("express");
const ReportRouter = express.Router();
const uploadCloud = require("../configs/cloudinaryConfig");
const { checkAccessToken, checkAdmin, checkSupplier } = require("../middleware/JWTAction");

const deliveryCtrl = require("../controllers/Report/deliveryIssueController");
const damageCtrl = require("../controllers/Report/damageReportController");
const shopReportCtrl = require("../controllers/Report/shopReportController");

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

// SHOP REPORT
ReportRouter.post(
  "/shop-report",
  checkAccessToken,
  uploadCloud.array("evidence", 5),
  shopReportCtrl.createShopReport
);

// ADMIN: GET ALL SHOP REPORTS
ReportRouter.get(
  "/admin/shop-reports",
  checkAccessToken,
  checkAdmin,
  shopReportCtrl.getAllReports
);

// ADMIN: UPDATE SHOP REPORT STATUS
ReportRouter.patch(
  "/admin/shop-reports/:reportId",
  checkAccessToken,
  checkAdmin,
  shopReportCtrl.updateReportStatus
);

// SUPPLIER — Xem tất cả sự cố liên quan đến đơn hàng của supplier
ReportRouter.get(
  "/supplier-issues",
  checkAccessToken,
  checkSupplier,
  deliveryCtrl.getSupplierIssues
);

// SUPPLIER — Cập nhật trạng thái báo cáo (OPEN → PROCESSING, hoặc xác nhận RESOLVED khi đơn REJECTED)
ReportRouter.patch(
  "/supplier-issues/:issueId",
  checkAccessToken,
  checkSupplier,
  deliveryCtrl.supplierUpdateIssueStatus
);

ReportRouter.post(
  "/supplier-issues/:issueId/compensation-proposal",
  checkAccessToken,
  checkSupplier,
  uploadCloud.array("images", 8),
  deliveryCtrl.supplierSubmitCompensationProposal
);

ReportRouter.post(
  "/customer-issues/:issueId/compensation-proposal/confirm",
  checkAccessToken,
  deliveryCtrl.customerConfirmCompensationProposal
);

ReportRouter.post(
  "/supplier-issues/:issueId/compensation-proposal/confirm",
  checkAccessToken,
  checkSupplier,
  deliveryCtrl.supplierConfirmCompensationProposal
);

ReportRouter.post(
  "/admin/issues/:issueId/compensation-proposal/approve",
  checkAccessToken,
  checkAdmin,
  deliveryCtrl.adminApproveCompensationProposal
);

ReportRouter.post(
  "/admin/issues/:issueId/compensation-proposal/reject",
  checkAccessToken,
  checkAdmin,
  deliveryCtrl.adminRejectCompensationProposal
);

/** Legacy: body gồm `decision` + optional `approvedAmount`, `note` */
ReportRouter.post(
  "/admin/issues/:issueId/compensation-proposal/review",
  checkAccessToken,
  checkAdmin,
  deliveryCtrl.adminReviewCompensationProposal
);

ReportRouter.get(
  "/admin/compensation-proposals",
  checkAccessToken,
  checkAdmin,
  deliveryCtrl.adminGetCompensationProposals
);

ReportRouter.post(
  "/supplier-issues/:issueId/cancel-refund",
  checkAccessToken,
  checkSupplier,
  deliveryCtrl.supplierCancelAndRefund
);

ReportRouter.post(
  "/supplier-issues/:issueId/additional-delivery",
  checkAccessToken,
  checkSupplier,
  uploadCloud.array("images", 5),
  deliveryCtrl.supplierAdditionalDelivery
);

ReportRouter.post(
  "/supplier-issues/:issueId/escalate",
  checkAccessToken,
  checkSupplier,
  deliveryCtrl.supplierEscalateIssue
);

ReportRouter.post(
  "/supplier-issues/:issueId/close-no-compensation",
  checkAccessToken,
  checkSupplier,
  deliveryCtrl.supplierCloseIssueNoCompensation
);

module.exports = ReportRouter;
