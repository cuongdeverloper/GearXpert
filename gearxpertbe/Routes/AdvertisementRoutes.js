const express = require("express");
const router = express.Router();
const advertisementController = require("../controllers/Advertisement/AdvertisementController");
const { checkAccessToken, checkAdmin, checkSupplier } = require("../middleware/JWTAction");
const uploadCloud = require("../configs/cloudinaryConfig");

router.get(
    "/public/banners",
    advertisementController.getApprovedBanners
);

router.get(
    "/public/popups",
    advertisementController.getApprovedPopups
);

router.post(
    "/",
    checkAccessToken,
    checkSupplier,
    uploadCloud.single("image"),
    advertisementController.createAdvertisement
);

router.get(
    "/my-ads",
    checkAccessToken,
    checkSupplier,
    advertisementController.getMyAdvertisements
);

router.delete(
    "/:id",
    checkAccessToken,
    checkSupplier,
    advertisementController.deleteAdvertisement
);

// Admin routes
router.get(
    "/",
    checkAccessToken,
    checkAdmin,
    advertisementController.getAllAdvertisementsForAdmin
);

router.patch(
    "/:id/status",
    checkAccessToken,
    checkAdmin,
    advertisementController.updateAdvertisementStatus
);

module.exports = router;
