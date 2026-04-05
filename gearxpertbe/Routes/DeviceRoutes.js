const routerDevice = require('express').Router();
const deviceController = require('../controllers/Device/DeviceController');
const uploadCloud = require('../configs/cloudinaryConfig');
const { checkAccessToken, checkSupplier } = require('../middleware/JWTAction');

// Create device (Supplier only)
routerDevice.post('/', checkAccessToken, checkSupplier, uploadCloud.array('images', 5), deviceController.createDevice);

routerDevice.get('/', deviceController.getDevices);
routerDevice.get('/supplier/:supplierId', deviceController.getSupplierDevices);
routerDevice.get('/:deviceId/items', checkAccessToken, checkSupplier, deviceController.getDeviceItemsForSupplier);
routerDevice.post(
  '/:deviceId/items',
  checkAccessToken,
  checkSupplier,
  uploadCloud.array('images', 5),
  deviceController.createDeviceItemForSupplier
);
routerDevice.get('/:slug', deviceController.getDeviceDetail);
routerDevice.get('/:slug/addons', deviceController.getDeviceAddons);
routerDevice.get('/:slug/related', deviceController.getRelatedDevices);
routerDevice.get('/:slug/available-count', deviceController.getDeviceAvailableCount);

// Update device (Supplier only)
routerDevice.put('/:id', checkAccessToken, checkSupplier, uploadCloud.array('images', 5), deviceController.updateDevice);

// Delete device (with rental check)
routerDevice.delete('/:id', checkAccessToken, deviceController.deleteDevice);

module.exports = routerDevice;
