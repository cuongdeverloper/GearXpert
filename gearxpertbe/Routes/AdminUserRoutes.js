const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/Admin/AdminUserController');
const adminDashboardController = require('../controllers/Admin/AdminDashboardController');
const { checkAccessToken, checkAdmin } = require('../middleware/JWTAction');

router.get('/users', checkAccessToken, checkAdmin, adminUserController.getAllUsers);
router.patch('/users/:id/status', checkAccessToken, checkAdmin, adminUserController.toggleUserStatus);
router.get('/dashboard', checkAccessToken, checkAdmin, adminDashboardController.getAdminDashboard);
router.get('/rentals', checkAccessToken, checkAdmin, adminDashboardController.getAdminRentals);
router.get('/reports', checkAccessToken, checkAdmin, adminDashboardController.getAdminReports);
router.get('/suppliers', checkAccessToken, checkAdmin, adminDashboardController.getAdminSuppliers);

module.exports = router;
