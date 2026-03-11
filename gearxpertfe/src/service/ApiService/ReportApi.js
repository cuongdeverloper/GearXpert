import axios from "../AxiosCustomize";

// Staff ghi nhận sự cố lúc giao hàng (gửi multipart/form-data)
export const createStaffDeliveryIssue = (formData) =>
  axios.post("/api/reports/staff-delivery-issue", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Lấy tất cả sự cố giao hàng do staff đang đăng nhập báo cáo
export const getStaffDeliveryIssues = () =>
  axios.get("/api/reports/staff-delivery-issues");

// Staff ghi nhận sự cố lúc thu hồi (gửi multipart/form-data)
export const createStaffReturnIssue = (formData) =>
  axios.post("/api/reports/staff-return-issue", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Lấy tất cả sự cố thu hồi do staff đang đăng nhập báo cáo
export const getStaffReturnIssues = () =>
  axios.get("/api/reports/staff-return-issues");
