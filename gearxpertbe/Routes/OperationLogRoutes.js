const express = require("express");
const router = express.Router();
const { checkAccessToken } = require("../middleware/JWTAction");
const { logAction, getMyLogs } = require("../controllers/OperationLog/operationLogController");

// Ghi log một hành động của operation staff
router.post("/", checkAccessToken, logAction);

// Lấy lịch sử hoạt động của staff đang đăng nhập
router.get("/my", checkAccessToken, getMyLogs);

module.exports = router;
