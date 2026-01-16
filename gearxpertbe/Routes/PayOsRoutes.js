const express = require('express');
const payosRouter = express.Router();
const payosCtrl = require('../controllers/Wallet/PayOsController');

payosRouter.post('/webhook', payosCtrl.handleWebhook);

module.exports = payosRouter;
