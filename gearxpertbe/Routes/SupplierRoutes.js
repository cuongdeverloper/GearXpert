const express = require('express');
const supplierRouter = express.Router();

const supplierProfileController = require('../controllers/Supplier/SupplierController');
const { checkAccessToken } = require('../middleware/JWTAction');
const uploadCloud = require('../configs/cloudinaryConfig');

// Customer: followed stores (phải đặt trước /:supplierId)
supplierRouter.get('/me/followed-stores', checkAccessToken, supplierProfileController.getMyFollowedStores);
supplierRouter.patch('/me/follow-prefs/:followId', checkAccessToken, supplierProfileController.updateFollowPrefs);

// Protected routes (chỉ Supplier)
supplierRouter.get('/profile', checkAccessToken, supplierProfileController.getSupplierProfile);
supplierRouter.put('/profile', checkAccessToken, uploadCloud.fields([{ name: 'businessAvatar', maxCount: 1 }]), supplierProfileController.updateSupplierProfile);

// Public storefront routes
supplierRouter.get('/:supplierId/storefront', supplierProfileController.getSupplierStorefront);
supplierRouter.get('/:supplierId/storefront/devices', supplierProfileController.getSupplierStorefrontDevices);
supplierRouter.get('/:supplierId/storefront/vouchers', supplierProfileController.getSupplierStorefrontVouchers);

// Follow store routes
supplierRouter.post('/:supplierId/follow', checkAccessToken, supplierProfileController.toggleFollowStore);
supplierRouter.get('/:supplierId/follow-status', supplierProfileController.getFollowStatus);

// Public search & list routes
supplierRouter.get('/public', supplierProfileController.getPublicSuppliers);

// Existing public routes — DO NOT MODIFY
supplierRouter.get('/:supplierId', supplierProfileController.getSupplierProfile);
supplierRouter.get('/:supplierId/devices', supplierProfileController.getSupplierDevices);

module.exports = supplierRouter;