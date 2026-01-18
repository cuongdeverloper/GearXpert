const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/Admin/AdminUserController');
const { checkAccessToken, checkAdmin } = require('../middleware/JWTAction');

router.get('/users', checkAccessToken, checkAdmin, adminUserController.getAllUsers);
router.patch('/users/:id/status', checkAccessToken, checkAdmin, adminUserController.toggleUserStatus);

module.exports = router;
