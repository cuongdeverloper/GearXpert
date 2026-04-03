const express = require("express");
const { getSmartGearSuggestion } = require("../controllers/SmartGear/SmartGearController");
const { getDiscountSuggestions, getActiveDiscounts, applyDiscount, removeDiscount } = require("../controllers/SmartGear/DynamicPricingController");
const { checkAccessToken } = require("../middleware/JWTAction");
const router = express.Router();


router.post("/suggest", getSmartGearSuggestion);

// Supplier Dynamic Pricing
router.get("/ai-suggestions", checkAccessToken, getDiscountSuggestions);
router.get("/active-discounts", checkAccessToken, getActiveDiscounts);
router.post("/apply-discount", checkAccessToken, applyDiscount);
router.delete("/remove-discount/:deviceId", checkAccessToken, removeDiscount);

module.exports = router;