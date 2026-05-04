import axios from "../AxiosCustomize";

export const getAdminMaintenanceWorkOrders = (params = {}) => {
  return axios.get("/api/admin/maintenance/work-orders", { params });
};

export const getAdminMaintenanceWorkOrderDetail = (id) => {
  return axios.get(`/api/admin/maintenance/work-orders/${id}`);
};

export const reviewAdminMaintenanceWorkOrder = (id, decision, note) => {
  return axios.post(`/api/admin/maintenance/work-orders/${id}/review`, { decision, note });
};
