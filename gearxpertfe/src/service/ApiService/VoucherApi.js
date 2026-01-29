import axios from "../AxiosCustomize";

export const validateVoucher = (data) => {
  return axios.post("/api/vouchers/apply", data);
};

export const getAllVouchers = () => {
  return axios.get("/api/vouchers");
};

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
