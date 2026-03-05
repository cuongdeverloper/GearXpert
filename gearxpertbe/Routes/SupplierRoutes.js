const express = require('express');
const supplierRouter = express.Router();

const supplierProfileController = require('../controllers/Supplier/SupplierController');
const { checkAccessToken } = require('../middleware/JWTAction');

// Public routes
supplierRouter.get('/:supplierId', supplierProfileController.getSupplierProfile);
supplierRouter.get('/:supplierId/devices', supplierProfileController.getSupplierDevices);

// Protected routes (chỉ Supplier)
supplierRouter.get('/profile', checkAccessToken, supplierProfileController.getSupplierProfile);
supplierRouter.put('/profile', checkAccessToken, supplierProfileController.updateSupplierProfile);

module.exports = supplierRouter;