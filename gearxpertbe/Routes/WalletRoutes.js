const express = require('express');
const walletRouter = express.Router();
const walletCtrl = require('../controllers/Wallet/WalletController');
const { checkAccessToken } = require('../middleware/JWTAction');

walletRouter.post('/topup',checkAccessToken, walletCtrl.topUpWallet);
walletRouter.get('/me', checkAccessToken, walletCtrl.getMyWallet);
walletRouter.get('/transactions', checkAccessToken, walletCtrl.getWalletTransactions);
walletRouter.post('/verifytopup', checkAccessToken, walletCtrl.verifyTopUp);
walletRouter.post('/withdraw', checkAccessToken, walletCtrl.requestWithdraw);

module.exports = walletRouter;
