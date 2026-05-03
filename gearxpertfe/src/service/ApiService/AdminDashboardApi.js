import axios from "../AxiosCustomize";

export const getAdminDashboard = () => {
  return axios.get("/api/admin/dashboard");
};

export const getAdminDashboardCharts = () => {
  return axios.get("/api/admin/dashboard/charts");
};

export const getAdminRentals = (params = {}) => {
  return axios.get("/api/admin/rentals", { params });
};

export const getAdminReports = () => {
  return axios.get("/api/admin/reports");
};

export const getAdminSuppliers = () => {
  return axios.get("/api/admin/suppliers");
};

export const getAdminDevices = (params = {}) => {
  return axios.get("/api/admin/devices", { params });
};

/** Supplier onboarding (contract PENDING → approve / reject) */
export const getSupplierOnboardingRequests = (params = {}) => {
  return axios.get("/api/admin/supplier-onboarding", { params });
};

export const approveSupplierOnboardingRequest = (contractId) => {
  return axios.post(`/api/admin/supplier-onboarding/${contractId}/approve`);
};

export const rejectSupplierOnboardingRequest = (contractId, data) => {
  return axios.post(`/api/admin/supplier-onboarding/${contractId}/reject`, data);
};
