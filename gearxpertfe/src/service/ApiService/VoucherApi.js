import axios from "../AxiosCustomize";

export const validateVoucher = (data) => {
  return axios.post("/api/vouchers/validate", data);
};
