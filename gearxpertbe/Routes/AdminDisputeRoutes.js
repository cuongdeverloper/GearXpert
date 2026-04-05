const express = require("express");
const router = express.Router();
const { checkAccessToken, checkAdmin } = require("../middleware/JWTAction");
const {
  getDisputes,
  getDisputeDetail,
  updateDispute,
} = require("../controllers/Admin/AdminDisputeController");

router.use(checkAccessToken, checkAdmin);

router.get("/", getDisputes);
router.get("/:caseType/:id", getDisputeDetail);
router.patch("/:caseType/:id", updateDispute);

module.exports = router;
