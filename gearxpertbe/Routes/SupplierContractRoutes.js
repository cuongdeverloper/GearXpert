const express = require('express');
const { checkAccessToken } = require('../middleware/JWTAction');
const { requestToBecomeSupplier } = require('../controllers/Contract/SupplierContractController');
const router = express.Router();


router.post('/become-supplier', checkAccessToken, requestToBecomeSupplier);

module.exports = router;