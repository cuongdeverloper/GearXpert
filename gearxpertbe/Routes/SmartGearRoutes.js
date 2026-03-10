const express = require("express");
const { getSmartGearSuggestion } = require("../controllers/SmartGear/SmartGearController");
const router = express.Router();


router.post("/suggest", getSmartGearSuggestion);

module.exports = router;