const express = require('express');
const walletRouter = express.Router();
const walletCtrl = require('../controllers/Wallet/WalletController');
const { checkAccessToken } = require('../middleware/JWTAction');

walletRouter.post('/topup', walletCtrl.topUpWallet);
walletRouter.get('/me', checkAccessToken, walletCtrl.getMyWallet);
walletRouter.get('/transactions', checkAccessToken, walletCtrl.getWalletTransactions);

module.exports = walletRouter;
