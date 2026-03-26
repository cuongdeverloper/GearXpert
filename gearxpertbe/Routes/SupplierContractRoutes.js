const express = require('express');
const { checkAccessToken, requireEkyc } = require('../middleware/JWTAction');
const {
  requestToBecomeSupplier,
  previewSupplierContract,
} = require('../controllers/Contract/SupplierContractController');
const router = express.Router();


router.post('/preview-contract', checkAccessToken, requireEkyc, previewSupplierContract);
router.post('/become-supplier', checkAccessToken, requireEkyc, requestToBecomeSupplier);

module.exports = router;
