const express = require('express');
const NotificationRouter = express.Router();
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  broadcastNotification,
} = require('../controllers/Notification/NotificationController');
const { checkAccessToken, checkAdmin } = require('../middleware/JWTAction');

NotificationRouter.get('/', checkAccessToken, getMyNotifications);
NotificationRouter.patch('/:id/read', checkAccessToken, markAsRead);
NotificationRouter.patch('/mark-all-read', checkAccessToken, markAllAsRead);
NotificationRouter.post('/broadcast', checkAccessToken, checkAdmin, broadcastNotification);

module.exports = NotificationRouter;