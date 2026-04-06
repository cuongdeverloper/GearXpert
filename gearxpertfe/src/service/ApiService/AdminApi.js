import axiosInstance from "../AxiosCustomize";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:1357/api";

// Admin Wallet APIs
export const getAdminWallet = () => {
  return axiosInstance.get(`${API_BASE}/admin/wallet`);
};

export const getAdminWalletTransactions = (params = {}) => {
  return axiosInstance.get(`${API_BASE}/admin/wallet/transactions`, { params });
};

export const adjustWalletBalance = (data) => {
  return axiosInstance.post(`${API_BASE}/admin/wallet/adjust-balance`, data);
};

export const createManualTransaction = (data) => {
  return axiosInstance.post(`${API_BASE}/admin/wallet/manual-transaction`, data);
};

export const exportWalletTransactions = (params = {}) => {
  return axiosInstance.get(`${API_BASE}/admin/wallet/export-transactions`, { 
    params,
    responseType: 'blob'
  });
};

// Admin Withdrawal APIs
export const getWithdrawalRequests = (params = {}) => {
  return axiosInstance.get(`${API_BASE}/admin/withdrawals`, { params });
};

export const approveWithdrawal = (withdrawalId) => {
  return axiosInstance.post(`${API_BASE}/admin/withdrawals/${withdrawalId}/approve`);
};

export const rejectWithdrawal = (withdrawalId, data) => {
  return axiosInstance.post(`${API_BASE}/admin/withdrawals/${withdrawalId}/reject`, data);
};

// Admin Dashboard APIs (existing ones can be moved here if needed)
export const getAdminDashboard = () => {
  return axiosInstance.get(`${API_BASE}/admin/dashboard`);
};

export const getAdminDashboardCharts = () => {
  return axiosInstance.get(`${API_BASE}/admin/dashboard/charts`);
};
