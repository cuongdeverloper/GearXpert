const express = require("express");
const router = express.Router();
const { checkAccessToken } = require("../middleware/JWTAction");
const returnController = require("../controllers/Rental/ReturnController");

router.post("/rentals/:rentalId/draft", checkAccessToken, returnController.createDraftForRental);
router.get("/rentals/:rentalId", checkAccessToken, returnController.listByRental);
router.get("/:returnRecordId", checkAccessToken, returnController.getById);
router.patch("/:returnRecordId/start", checkAccessToken, returnController.start);
router.patch("/:returnRecordId/inspection", checkAccessToken, returnController.saveInspection);
router.post("/:returnRecordId/confirm-success", checkAccessToken, returnController.confirmSuccess);
router.post("/:returnRecordId/fail", checkAccessToken, returnController.fail);
router.post("/rentals/:rentalId/retry", checkAccessToken, returnController.createRetryAttempt);
router.post("/rentals/:rentalId/sync-closed", checkAccessToken, returnController.syncClosedRental);

module.exports = router;
