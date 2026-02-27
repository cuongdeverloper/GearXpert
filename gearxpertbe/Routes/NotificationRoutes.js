const express = require('express');
const NotificationRouter = express.Router();
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
} = require('../controllers/Notification/NotificationController');
const { checkAccessToken } = require('../middleware/JWTAction');

NotificationRouter.get('/', checkAccessToken, getMyNotifications);
NotificationRouter.patch('/:id/read', checkAccessToken, markAsRead);
NotificationRouter.patch('/mark-all-read', checkAccessToken, markAllAsRead);

module.exports = NotificationRouter;