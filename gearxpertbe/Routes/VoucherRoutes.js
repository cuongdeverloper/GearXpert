const express = require('express');
const voucherRouter = express.Router();
const voucherController = require('../controllers/Voucher/VoucherController');
const { checkAccessToken } = require('../middleware/JWTAction');

voucherRouter.post('/apply', checkAccessToken, voucherController.validateVoucher);
voucherRouter.get('/', voucherController.getAllVouchers);

module.exports = voucherRouter;
