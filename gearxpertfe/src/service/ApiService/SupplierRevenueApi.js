import axios from "../AxiosCustomize";

export const getSupplierRevenue = (supplierId) => {
  return axios.get(`/api/rentals/supplier/${supplierId}/revenue`);
};
