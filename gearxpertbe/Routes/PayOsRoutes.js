const express = require('express');
const payosRouter = express.Router();
const payosCtrl = require('../controllers/Wallet/PayOsController');
const { checkAccessToken } = require('../middleware/JWTAction');

payosRouter.post('/webhook', payosCtrl.handleWebhook);
payosRouter.post('/createpaymentlink', payosCtrl.createRentalPaymentLink);

module.exports = payosRouter;
