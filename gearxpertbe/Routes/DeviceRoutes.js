const routerDevice = require('express').Router();
const deviceController = require('../controllers/Device/DeviceController');
const uploadCloud = require('../configs/cloudinaryConfig');
const { checkAccessToken, checkSupplier } = require('../middleware/JWTAction');

const deviceImageUpload = uploadCloud.fields([
  { name: 'images', maxCount: 5 },
  { name: 'accessoryImages', maxCount: 20 },
]);

// Create device (Supplier check is handled inside controller via DB query)
routerDevice.post('/', checkAccessToken, deviceImageUpload, deviceController.createDevice);

routerDevice.get('/', deviceController.getDevices);
routerDevice.get('/supplier/:supplierId', deviceController.getSupplierDevices);
routerDevice.get('/:deviceId/items', checkAccessToken, deviceController.getDeviceItemsForSupplier);
routerDevice.post(
  '/:deviceId/items',
  checkAccessToken,
  uploadCloud.array('images', 5),
  deviceController.createDeviceItemForSupplier
);
routerDevice.get('/:slug', deviceController.getDeviceDetail);
routerDevice.get('/:slug/addons', deviceController.getDeviceAddons);
routerDevice.get('/:slug/related', deviceController.getRelatedDevices);
routerDevice.get('/:slug/available-count', deviceController.getDeviceAvailableCount);

// Update device (Supplier only check in controller)
routerDevice.put('/:id', checkAccessToken, deviceImageUpload, deviceController.updateDevice);

// Delete device (with rental check)
routerDevice.delete('/:id', checkAccessToken, deviceController.deleteDevice);

module.exports = routerDevice;
