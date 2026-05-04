const express = require('express');
const voucherRouter = express.Router();
const voucherController = require('../controllers/Voucher/VoucherController');
const { checkAccessToken, checkAdmin, checkSupplier, checkUserOptional } = require('../middleware/JWTAction');

voucherRouter.post('/apply', checkAccessToken, voucherController.validateVoucher);
voucherRouter.get('/best-for-cart', checkAccessToken, voucherController.getBestVoucherForCart);
voucherRouter.get('/available-for-cart', checkAccessToken, voucherController.getAvailableVouchersForCart);
voucherRouter.post('/auto-apply', checkAccessToken, voucherController.autoApplyBestVoucher);
voucherRouter.get('/', checkUserOptional, voucherController.getAllVouchers);
voucherRouter.get('/used', checkAccessToken, voucherController.getUsedVouchers);

// Supplier Routes
voucherRouter.get('/supplier', checkAccessToken, voucherController.getVouchersBySupplier);
voucherRouter.post('/supplier', checkAccessToken, voucherController.createVoucherBySupplier);
voucherRouter.patch('/supplier/:id/status', checkAccessToken, voucherController.updateVoucherStatusBySupplier);
voucherRouter.delete('/supplier/:id', checkAccessToken, voucherController.deleteVoucherBySupplier);

// Admin Routes
voucherRouter.get('/admin', checkAccessToken, checkAdmin, voucherController.getVouchersForAdmin);
voucherRouter.post('/', checkAccessToken, checkAdmin, voucherController.createVoucherByAdmin);
voucherRouter.put('/:id', checkAccessToken, checkAdmin, voucherController.updateVoucherByAdmin);
voucherRouter.delete('/:id', checkAccessToken, checkAdmin, voucherController.deleteVoucher);

module.exports = voucherRouter;
