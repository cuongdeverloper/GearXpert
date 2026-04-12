import axiosInstance from "../AxiosCustomize";

const BASE = "/api/maintenance";

// ── Device Item Lookup (dropdown) ─────────────────────────────────────────────

/** Lấy toàn bộ DeviceItems của Supplier (manual WO dropdown) */
export const getSupplierDeviceItems = () =>
  axiosInstance.get(`${BASE}/device-items`);

/** Lấy DeviceItems theo danh sách Device IDs (from-issue WO dropdown) */
export const getDeviceItemsByDeviceIds = (deviceIds = []) =>
  axiosInstance.get(`${BASE}/device-items/by-devices`, {
    params: { deviceIds: deviceIds.join(",") },
  });

// ── Reminders ────────────────────────────────────────────────────────────────

/** Lấy danh sách nhắc nhở bảo trì của Supplier */
export const getMaintenanceReminders = (status = "PENDING") =>
  axiosInstance.get(`${BASE}/reminders`, { params: { status } });

/** Duyệt reminder → tạo WorkOrder, DeviceItem → MAINTENANCE */
export const approveReminder = (id, payload) =>
  axiosInstance.post(`${BASE}/reminders/${id}/approve`, payload);

/** Bỏ qua reminder */
export const ignoreReminder = (id) =>
  axiosInstance.patch(`${BASE}/reminders/${id}/ignore`);

// ── WorkOrders ────────────────────────────────────────────────────────────────

/** Lấy danh sách WorkOrder */
export const getWorkOrders = (params = {}) =>
  axiosInstance.get(`${BASE}/work-orders`, { params });

/** Tạo WorkOrder thủ công */
export const createWorkOrder = (payload) =>
  axiosInstance.post(`${BASE}/work-orders`, payload);

/** Tạo WorkOrder corrective từ issue */
export const createWorkOrderFromIssue = (payload) =>
  axiosInstance.post(`${BASE}/work-orders/from-issue`, payload);

/** Cập nhật trạng thái WorkOrder (IN_PROGRESS | CANCELLED) */
export const updateWorkOrderStatus = (id, status) =>
  axiosInstance.patch(`${BASE}/work-orders/${id}/status`, { status });

/** Hoàn tất WorkOrder + upload ảnh trước/sau */
export const completeWorkOrder = (id, formData) =>
  axiosInstance.patch(`${BASE}/work-orders/${id}/complete`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
