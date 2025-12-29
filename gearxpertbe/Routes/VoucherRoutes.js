const express = require('express');
const voucherRouter = express.Router();
const { validateVoucher } = require('../controllers/Voucher/VoucherController');
const { checkAccessToken } = require('../middleware/JWTAction');

voucherRouter.post('/apply', checkAccessToken, validateVoucher);

module.exports = voucherRouter;
