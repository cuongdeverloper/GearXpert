import axios from "../AxiosCustomize";

// Staff ghi nhận sự cố lúc giao hàng (gửi multipart/form-data)
export const createStaffDeliveryIssue = (formData) =>
  axios.post("/api/reports/staff-delivery-issue", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Lấy tất cả sự cố do staff đang đăng nhập báo cáo
export const getStaffDeliveryIssues = () =>
  axios.get("/api/reports/staff-delivery-issues");
