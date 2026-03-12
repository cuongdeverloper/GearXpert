import axios from "../AxiosCustomize";

// Ghi log một hành động của operation staff
// action: 'CONFIRM_PICKUP' | 'CONFIRM_DELIVERY' | 'CONFIRM_RETURN' | 'LOG_DELIVERY_ISSUE' | 'LOG_RETURN_ISSUE'
// targetType: 'RENTAL'
// targetId: rentalId
// details: object chứa thông tin bổ sung (tên thiết bị, khách hàng, ...)
export const logOperationAction = (action, targetType, targetId, details = {}) =>
  axios.post("/api/operation-logs", { action, targetType, targetId, details });

// Lấy lịch sử hoạt động của staff hiện tại
export const getMyOperationLogs = (page = 1, limit = 50) =>
  axios.get("/api/operation-logs/my", { params: { page, limit } });
