const express = require("express");
const router = express.Router();
const {
  getSupplierExtensionRequests,
  approveExtension,
  rejectExtension,
  checkSupplierPermission
} = require("../controllers/Extension/ExtensionRequestController");
const { checkAccessToken } = require("../middleware/JWTAction");

// Get extension requests for supplier
router.get(
  "/supplier/:supplierId",
  checkAccessToken,
  getSupplierExtensionRequests
);

// Approve extension request
router.patch(
  "/:requestId/approve",
  checkAccessToken,
  checkSupplierPermission,
  approveExtension
);

// Reject extension request
router.patch(
  "/:requestId/reject",
  checkAccessToken,
  checkSupplierPermission,
  rejectExtension
);

module.exports = router;
