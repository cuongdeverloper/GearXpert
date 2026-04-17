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

// Shop Report
export const createShopReport = (formData) =>
  axios.post("/api/reports/shop-report", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// Admin: Get all shop reports
export const adminGetAllShopReports = () =>
  axios.get("/api/reports/admin/shop-reports");

// Admin: Update shop report status
export const adminUpdateShopReportStatus = (reportId, data) =>
  axios.patch(`/api/reports/admin/shop-reports/${reportId}`, data);
  
// Supplier: lấy tất cả sự cố liên quan đến đơn hàng của supplier
export const getSupplierIssues = () =>
  axios.get("/api/reports/supplier-issues");

/** Supplier: cập nhật trạng thái báo cáo — PROCESSING (đang xử lý) hoặc RESOLVED (xác nhận khi đơn REJECTED) */
export const patchSupplierIssueStatus = (issueId, data) =>
  axios.patch(`/api/reports/supplier-issues/${issueId}`, data);

/** Supplier: Xử lý giao thiếu - Hủy đơn (Hoàn tiền) */
export const supplierIssueCancelRefund = (issueId) =>
  axios.post(`/api/reports/supplier-issues/${issueId}/cancel-refund`);

/** Supplier: Xử lý giao thiếu - Xác nhận giao bổ sung */
export const supplierIssueAdditionalDelivery = (issueId, formData) =>
  axios.post(`/api/reports/supplier-issues/${issueId}/additional-delivery`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

