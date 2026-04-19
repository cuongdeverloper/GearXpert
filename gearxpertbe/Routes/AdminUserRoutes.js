const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/Admin/AdminUserController');
const adminDashboardController = require('../controllers/Admin/AdminDashboardController');
const adminWalletController = require('../controllers/Admin/AdminWalletController');
const adminSupplierOnboardingController = require('../controllers/Admin/AdminSupplierOnboardingController');
const { checkAccessToken, checkAdmin } = require('../middleware/JWTAction');

router.get('/users', checkAccessToken, checkAdmin, adminUserController.getAllUsers);
router.patch('/users/:id/status', checkAccessToken, checkAdmin, adminUserController.toggleUserStatus);
router.get('/admins', checkAccessToken, checkAdmin, adminUserController.getAdmins);
router.get('/dashboard', checkAccessToken, checkAdmin, adminDashboardController.getAdminDashboard);
router.get('/dashboard/charts', checkAccessToken, checkAdmin, adminDashboardController.getAdminDashboardCharts);
router.get('/rentals', checkAccessToken, checkAdmin, adminDashboardController.getAdminRentals);
router.get('/reports', checkAccessToken, checkAdmin, adminDashboardController.getAdminReports);
router.get('/suppliers', checkAccessToken, checkAdmin, adminDashboardController.getAdminSuppliers);
router.get('/devices', checkAccessToken, checkAdmin, adminDashboardController.getAdminDevices);

// Supplier onboarding (become supplier contract approval)
router.get(
  '/supplier-onboarding',
  checkAccessToken,
  checkAdmin,
  adminSupplierOnboardingController.listSupplierOnboardingRequests
);
router.post(
  '/supplier-onboarding/:id/approve',
  checkAccessToken,
  checkAdmin,
  adminSupplierOnboardingController.approveSupplierOnboarding
);
router.post(
  '/supplier-onboarding/:id/reject',
  checkAccessToken,
  checkAdmin,
  adminSupplierOnboardingController.rejectSupplierOnboarding
);

// Wallet routes
router.get('/wallet', checkAccessToken, checkAdmin, adminWalletController.getAdminWallet);
router.get('/wallet/transactions', checkAccessToken, checkAdmin, adminWalletController.getAdminWalletTransactions);
router.post('/wallet/adjust-balance', checkAccessToken, checkAdmin, adminWalletController.adjustWalletBalance);
router.post('/wallet/manual-transaction', checkAccessToken, checkAdmin, adminWalletController.createManualTransaction);
router.get('/wallet/export-transactions', checkAccessToken, checkAdmin, adminWalletController.exportTransactions);
router.post('/wallet/topup', checkAccessToken, checkAdmin, adminWalletController.topUpAdminWallet);
router.post('/wallet/withdraw', checkAccessToken, checkAdmin, adminWalletController.withdrawAdminWallet);
router.post('/wallet/transfer', checkAccessToken, checkAdmin, adminWalletController.transferToWallet);
router.get('/wallet/lookup-user', checkAccessToken, checkAdmin, adminWalletController.lookupUserByWallet);

// Withdrawal routes
router.get('/withdrawals', checkAccessToken, checkAdmin, adminWalletController.getWithdrawalRequests);
router.post('/withdrawals/:id/approve', checkAccessToken, checkAdmin, adminWalletController.approveWithdrawal);
router.post('/withdrawals/:id/reject', checkAccessToken, checkAdmin, adminWalletController.rejectWithdrawal);

module.exports = router;
