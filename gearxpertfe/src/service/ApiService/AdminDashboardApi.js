import axios from "../AxiosCustomize";

export const getAdminDashboard = () => {
  return axios.get("/api/admin/dashboard");
};

export const getAdminDashboardCharts = () => {
  return axios.get("/api/admin/dashboard/charts");
};

export const getAdminRentals = () => {
  return axios.get("/api/admin/rentals");
};

export const getAdminReports = () => {
  return axios.get("/api/admin/reports");
};

export const getAdminSuppliers = () => {
  return axios.get("/api/admin/suppliers");
};
