// src/api/notificationApi.js
import axios from "../AxiosCustomize";

// Lấy danh sách thông báo: không params → tối đa 30 bản ghi (array). Có page → { notifications, total, unreadCount, ... }
export const getNotifications = (params = {}) => {
  const keys = Object.keys(params || {}).filter(
    (k) => params[k] !== undefined && params[k] !== null && params[k] !== ""
  );
  if (keys.length === 0) {
    return axios.get("/api/notifications", {
      headers: { "Content-Type": "application/json" },
    });
  }
  const sp = new URLSearchParams();
  if (params.page != null) sp.set("page", String(params.page));
  if (params.limit != null) sp.set("limit", String(params.limit));
  if (params.read && params.read !== "all") sp.set("read", params.read);
  if (params.type) sp.set("type", params.type);
  return axios.get(`/api/notifications?${sp.toString()}`, {
    headers: { "Content-Type": "application/json" },
  });
};

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

// Admin: Gửi thông báo broadcast cho toàn hệ thống
export const broadcastNotification = (data) =>
  axios.post("/api/notifications/broadcast", data, {
    headers: { 'Content-Type': 'application/json' },
  });