const express = require('express');
const voucherRouter = express.Router();
const voucherController = require('../controllers/Voucher/VoucherController');
const { checkAccessToken, checkAdmin } = require('../middleware/JWTAction');

voucherRouter.post('/apply', checkAccessToken, voucherController.validateVoucher);
voucherRouter.get('/', voucherController.getAllVouchers);

// Admin Routes
voucherRouter.get('/admin', checkAccessToken, checkAdmin, voucherController.getVouchersForAdmin);
voucherRouter.post('/', checkAccessToken, checkAdmin, voucherController.createVoucherByAdmin);
voucherRouter.put('/:id', checkAccessToken, checkAdmin, voucherController.updateVoucherByAdmin);
voucherRouter.delete('/:id', checkAccessToken, checkAdmin, voucherController.deleteVoucher);

module.exports = voucherRouter;
