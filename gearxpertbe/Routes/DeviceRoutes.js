const routerDevice = require('express').Router();
const deviceController = require('../controllers/Device/DeviceController');
const uploadCloud = require('../configs/cloudinaryConfig');
const { checkAccessToken, checkSupplier } = require('../middleware/JWTAction');

// Create device (Supplier only)
routerDevice.post('/', checkAccessToken, checkSupplier, uploadCloud.array('images', 5), deviceController.createDevice);

routerDevice.get('/', deviceController.getDevices);
routerDevice.get('/supplier/:supplierId', deviceController.getSupplierDevices);
routerDevice.get('/:id', deviceController.getDeviceDetail);
routerDevice.get('/:id/addons', deviceController.getDeviceAddons);
routerDevice.get('/:id/related', deviceController.getRelatedDevices);

// Update device
routerDevice.put('/:id', checkAccessToken, uploadCloud.array('images', 10), deviceController.updateDevice);

// Delete device (with rental check)
routerDevice.delete('/:id', checkAccessToken, deviceController.deleteDevice);

module.exports = routerDevice;
