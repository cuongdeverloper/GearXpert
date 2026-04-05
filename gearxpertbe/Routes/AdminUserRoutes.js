const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/Admin/AdminUserController');
const adminDashboardController = require('../controllers/Admin/AdminDashboardController');
const adminWalletController = require('../controllers/Admin/AdminWalletController');
const { checkAccessToken, checkAdmin } = require('../middleware/JWTAction');

router.get('/users', checkAccessToken, checkAdmin, adminUserController.getAllUsers);
router.patch('/users/:id/status', checkAccessToken, checkAdmin, adminUserController.toggleUserStatus);
router.get('/dashboard', checkAccessToken, checkAdmin, adminDashboardController.getAdminDashboard);
router.get('/dashboard/charts', checkAccessToken, checkAdmin, adminDashboardController.getAdminDashboardCharts);
router.get('/rentals', checkAccessToken, checkAdmin, adminDashboardController.getAdminRentals);
router.get('/reports', checkAccessToken, checkAdmin, adminDashboardController.getAdminReports);
router.get('/suppliers', checkAccessToken, checkAdmin, adminDashboardController.getAdminSuppliers);

// Wallet routes
router.get('/wallet', checkAccessToken, checkAdmin, adminWalletController.getAdminWallet);

router.get('/wallet/transactions', checkAccessToken, checkAdmin, adminWalletController.getAdminWalletTransactions);

// Withdrawal routes
router.get('/withdrawals', checkAccessToken, checkAdmin, adminWalletController.getWithdrawalRequests);
router.post('/withdrawals/:id/approve', checkAccessToken, checkAdmin, adminWalletController.approveWithdrawal);
router.post('/withdrawals/:id/reject', checkAccessToken, checkAdmin, adminWalletController.rejectWithdrawal);

module.exports = router;
