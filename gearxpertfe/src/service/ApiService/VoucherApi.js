import axios from "../AxiosCustomize";

export const validateVoucher = (data) => {
  return axios.post("/api/vouchers/validate", data);
};

export const getAllVouchers = () => {
  return axios.get("/api/vouchers");
};
