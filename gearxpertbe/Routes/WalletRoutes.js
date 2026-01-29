const express = require('express');
const walletRouter = express.Router();
const walletCtrl = require('../controllers/Wallet/WalletController');
const { checkAccessToken,requireEkyc } = require('../middleware/JWTAction');

walletRouter.post('/topup',checkAccessToken,requireEkyc, walletCtrl.topUpWallet);
walletRouter.get('/me', checkAccessToken, walletCtrl.getMyWallet);
walletRouter.get('/transactions', checkAccessToken, walletCtrl.getWalletTransactions);
walletRouter.post('/verifytopup', checkAccessToken, walletCtrl.verifyTopUp);
walletRouter.post('/withdraw', checkAccessToken,requireEkyc, walletCtrl.requestWithdraw);

module.exports = walletRouter;
