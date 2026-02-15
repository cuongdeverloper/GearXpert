const express = require('express');
const voucherRouter = express.Router();
const voucherController = require('../controllers/Voucher/VoucherController');
const { checkAccessToken, checkAdmin, checkSupplier } = require('../middleware/JWTAction');

voucherRouter.post('/apply', checkAccessToken, voucherController.validateVoucher);
voucherRouter.get('/', voucherController.getAllVouchers);

// Supplier Routes
voucherRouter.get('/supplier', checkAccessToken, voucherController.getVouchersBySupplier);
voucherRouter.post('/supplier', checkAccessToken, voucherController.createVoucherBySupplier);
voucherRouter.patch('/supplier/:id/status', checkAccessToken, voucherController.updateVoucherStatusBySupplier);

// Admin Routes
voucherRouter.get('/admin', checkAccessToken, checkAdmin, voucherController.getVouchersForAdmin);
voucherRouter.post('/', checkAccessToken, checkAdmin, voucherController.createVoucherByAdmin);
voucherRouter.put('/:id', checkAccessToken, checkAdmin, voucherController.updateVoucherByAdmin);
voucherRouter.delete('/:id', checkAccessToken, checkAdmin, voucherController.deleteVoucher);

module.exports = voucherRouter;
