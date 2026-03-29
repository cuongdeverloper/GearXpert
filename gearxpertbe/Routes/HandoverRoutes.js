const express = require("express");
const router = express.Router();
const { checkAccessToken } = require("../middleware/JWTAction");
const uploadCloud = require("../configs/cloudinaryConfig");
const handoverController = require("../controllers/Rental/HandoverController");

router.post("/rentals/:rentalId/draft", checkAccessToken, handoverController.createDraftForRental);
router.get("/tasks/:deliveryTaskId/draft", checkAccessToken, handoverController.getTaskDraft);
router.get("/rentals/:rentalId", checkAccessToken, handoverController.listByRental);
router.get("/:handoverId", checkAccessToken, handoverController.getById);
router.patch("/:handoverId/start", checkAccessToken, handoverController.start);
router.patch("/:handoverId/inspection", checkAccessToken, handoverController.saveInspection);
router.post("/:handoverId/confirm-success", checkAccessToken, uploadCloud.array("images", 8), handoverController.confirmSuccess);
router.post("/:handoverId/fail", checkAccessToken, uploadCloud.array("images", 8), handoverController.fail);
router.post("/rentals/:rentalId/redelivery", checkAccessToken, handoverController.createRedeliveryAttempt);
router.post("/rentals/:rentalId/sync-cancel", checkAccessToken, handoverController.syncCancelledRental);

module.exports = router;
