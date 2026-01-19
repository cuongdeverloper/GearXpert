const routerDevice = require('express').Router();
const deviceController = require('../controllers/Device/DeviceController');
const { checkAccessToken } = require('../middleware/JWTAction');

routerDevice.get('/', deviceController.getDevices);
routerDevice.get('/:id', deviceController.getDeviceDetail);
routerDevice.get('/:id/addons', deviceController.getDeviceAddons);
routerDevice.get('/:id/related', deviceController.getRelatedDevices);
module.exports = routerDevice;
