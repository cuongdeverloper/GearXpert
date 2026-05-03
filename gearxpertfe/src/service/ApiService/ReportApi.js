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

/** Supplier: gửi đề xuất bồi thường cho case sự cố */
export const supplierSubmitCompensationProposal = (issueId, payload) =>
  payload instanceof FormData
    ? axios.post(`/api/reports/supplier-issues/${issueId}/compensation-proposal`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      })
    : axios.post(`/api/reports/supplier-issues/${issueId}/compensation-proposal`, payload);

/** Customer: xác nhận / từ chối đề xuất bồi thường */
export const customerConfirmCompensationProposal = (issueId, data = {}) =>
  axios.post(`/api/reports/customer-issues/${issueId}/compensation-proposal/confirm`, data);

/** Supplier: xác nhận đề xuất sau khi customer đã đồng ý để chuyển admin duyệt */
export const supplierConfirmCompensationProposal = (issueId, data = {}) =>
  axios.post(`/api/reports/supplier-issues/${issueId}/compensation-proposal/confirm`, data);

/** Admin: duyệt đề xuất (body: approvedAmount?, note?) */
export const adminApproveCompensationProposal = (issueId, data = {}) =>
  axios.post(`/api/reports/admin/issues/${issueId}/compensation-proposal/approve`, data);

/** Admin: từ chối đề xuất (body: note?) */
export const adminRejectCompensationProposal = (issueId, data = {}) =>
  axios.post(`/api/reports/admin/issues/${issueId}/compensation-proposal/reject`, data);

/** Legacy: body { decision, approvedAmount?, note? } */
export const adminReviewCompensationProposal = (issueId, data = {}) =>
  axios.post(`/api/reports/admin/issues/${issueId}/compensation-proposal/review`, data);

/** Admin: đề xuất trung gian sau khi NCC escalate (issue AWAITING_ADMIN_GX) — multipart FormData */
export const adminCreateGxMediationProposal = (issueId, formData) =>
  axios.post(`/api/reports/admin/issues/${issueId}/compensation-proposal/gx-mediation`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

/** Admin: lấy danh sách đề xuất bồi thường để duyệt */
export const adminGetCompensationProposals = (params = {}) =>
  axios.get("/api/reports/admin/compensation-proposals", { params });

/** Admin: case chờ GearXpert (sau khi NCC nhờ can thiệp), chưa có đề xuất mở */
export const adminGetIssuesAwaitingGx = () => axios.get("/api/reports/admin/issues-awaiting-gx");

/** Admin: chi tiết điều tra — query { referenceModel: 'DeliveryIssueReport' | 'DamageReport' } */
export const adminGetIssueInvestigationBundle = (issueId, params = {}) =>
  axios.get(`/api/reports/admin/issues/${issueId}/investigation`, { params });

/** Admin: tạm tính dòng tiền (xem trước khi duyệt). params: { approvedAmount? } */
export const adminGetCompensationSettlementPreview = (proposalId, params = {}) =>
  axios.get(`/api/reports/admin/compensation-proposals/${proposalId}/settlement-preview`, { params });

/** Supplier: Xử lý giao thiếu - Hủy đơn (Hoàn tiền) */
export const supplierIssueCancelRefund = (issueId) =>
  axios.post(`/api/reports/supplier-issues/${issueId}/cancel-refund`);

/** Supplier: Xử lý giao thiếu - Xác nhận giao bổ sung */
export const supplierIssueAdditionalDelivery = (issueId, formData) =>
  axios.post(`/api/reports/supplier-issues/${issueId}/additional-delivery`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

/** Supplier: Nhờ GearXpert can thiệp xử lý case */
export const supplierEscalateIssue = (issueId, data = {}) =>
  axios.post(`/api/reports/supplier-issues/${issueId}/escalate`, data);

/** Supplier: chấp nhận mức hư hỏng, không bồi thường — đóng sự cố, thông báo khách + admin */
export const supplierCloseIssueNoCompensation = (issueId, data = {}) =>
  axios.post(`/api/reports/supplier-issues/${issueId}/close-no-compensation`, data);

