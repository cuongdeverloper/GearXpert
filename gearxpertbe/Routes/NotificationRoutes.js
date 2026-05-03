const express = require('express');
const NotificationRouter = express.Router();
const {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  broadcastNotification,
  getAdminBroadcastHistory,
} = require('../controllers/Notification/NotificationController');
const { checkAccessToken, checkAdmin } = require('../middleware/JWTAction');

NotificationRouter.get('/', checkAccessToken, getMyNotifications);
NotificationRouter.get('/broadcast-history', checkAccessToken, checkAdmin, getAdminBroadcastHistory);
NotificationRouter.patch('/mark-all-read', checkAccessToken, markAllAsRead);
NotificationRouter.patch('/:id/read', checkAccessToken, markAsRead);
NotificationRouter.post('/broadcast', checkAccessToken, checkAdmin, broadcastNotification);

module.exports = NotificationRouter;