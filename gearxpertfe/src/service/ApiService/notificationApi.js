// src/api/notificationApi.js
import axios from "../AxiosCustomize";

// Lấy danh sách thông báo của user hiện tại
export const getNotifications = () =>
  axios.get("/api/notifications", {
    headers: { 'Content-Type': 'application/json' },
  });

// Đánh dấu 1 thông báo đã đọc
export const markNotificationAsRead = (notifId) =>
  axios.patch(`/api/notifications/${notifId}/read`, {}, {
    headers: { 'Content-Type': 'application/json' },
  });

// Đánh dấu tất cả thông báo đã đọc
export const markAllNotificationsAsRead = () =>
  axios.patch("/api/notifications/mark-all-read", {}, {
    headers: { 'Content-Type': 'application/json' },
  });