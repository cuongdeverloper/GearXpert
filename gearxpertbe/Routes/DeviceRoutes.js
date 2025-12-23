const routerDevice = require('express').Router();
const deviceController = require('../controllers/Device/DeviceController');
const { checkAccessToken } = require('../middleware/JWTAction');

routerDevice.get('/:id',checkAccessToken, deviceController.getDeviceDetail);
routerDevice.get('/:id/addons',checkAccessToken, deviceController.getDeviceAddons);
routerDevice.get('/:id/related',checkAccessToken, deviceController.getRelatedDevices);
module.exports = routerDevice;
