const express = require("express");
const adminMaintenanceRouter = express.Router();
const ctrl = require("../controllers/Admin/AdminMaintenanceController");
// Admin middleware: (giả sử có checkAccessToken và role check)
const { checkAccessToken, checkAdmin } = require("../middleware/JWTAction");

adminMaintenanceRouter.get("/work-orders", checkAccessToken, checkAdmin, ctrl.getReviewList);
adminMaintenanceRouter.get("/work-orders/:id", checkAccessToken, checkAdmin, ctrl.getReviewDetail);
adminMaintenanceRouter.post("/work-orders/:id/review", checkAccessToken, checkAdmin, ctrl.reviewWorkOrder);

module.exports = adminMaintenanceRouter;
