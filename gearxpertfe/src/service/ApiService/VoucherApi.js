import axios from "../AxiosCustomize";

export const validateVoucher = (data) => {
  return axios.post("/api/vouchers/apply", data);
};

export const getBestVoucherForCart = (cartType = 'RENT') => {
  return axios.get(`/api/vouchers/best-for-cart?cartType=${cartType}`);
};

export const getAvailableVouchersForCart = (cartType = "RENTAL") => {
  return axios.get(`/api/vouchers/available-for-cart?cartType=${cartType}`);
};

export const autoApplyBestVoucher = (cartType = "RENTAL") => {
  return axios.post("/api/vouchers/auto-apply", { cartType });
};

export const getAllVouchers = () => {
  return axios.get("/api/vouchers");
};

export const getUsedVouchers = () => {
  return axios.get("/api/vouchers/used");
};

// Admin APIs
export const getVouchersForAdmin = () => {
  return axios.get("/api/vouchers/admin");
};

export const createVoucherByAdmin = (data) => {
  return axios.post("/api/vouchers", data);
};

export const updateVoucherByAdmin = (id, data) => {
  return axios.put(`/api/vouchers/${id}`, data);
};

export const deleteVoucher = (id) => {
  return axios.delete(`/api/vouchers/${id}`);
};

// Supplier APIs
export const getVouchersBySupplier = () => {
  return axios.get("/api/vouchers/supplier");
};

export const createVoucherBySupplier = (data) => {
  return axios.post("/api/vouchers/supplier", data);
};

export const updateVoucherStatusBySupplier = (id, status) => {
  return axios.patch(`/api/vouchers/supplier/${id}/status`, { status });
};

export const deleteVoucherBySupplier = (id) => {
  return axios.delete(`/api/vouchers/supplier/${id}`);
};
