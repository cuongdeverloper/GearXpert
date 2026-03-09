const express = require('express');
const supplierRouter = express.Router();

const supplierProfileController = require('../controllers/Supplier/SupplierController');
const { checkAccessToken } = require('../middleware/JWTAction');

// Public storefront routes (new — safe, no overlap with existing)
supplierRouter.get('/:supplierId/storefront', supplierProfileController.getSupplierStorefront);
supplierRouter.get('/:supplierId/storefront/devices', supplierProfileController.getSupplierStorefrontDevices);
supplierRouter.get('/:supplierId/storefront/vouchers', supplierProfileController.getSupplierStorefrontVouchers);

// Existing public routes — DO NOT MODIFY
supplierRouter.get('/:supplierId', supplierProfileController.getSupplierProfile);
supplierRouter.get('/:supplierId/devices', supplierProfileController.getSupplierDevices);

// Protected routes (chỉ Supplier)
supplierRouter.get('/profile', checkAccessToken, supplierProfileController.getSupplierProfile);
supplierRouter.put('/profile', checkAccessToken, supplierProfileController.updateSupplierProfile);

module.exports = supplierRouter;