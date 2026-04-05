import axios from "../AxiosCustomize";

export const rejectRental = (rentalId, payload = {}) => {
  return axios.patch(`/api/rentals/${rentalId}/reject`, payload);
};

export const startDelivery = async (rentalId) => {
  const res = await axios.post(`/api/rentals/${rentalId}/start-delivery`);
  return res.data;
};

export const confirmReturn = (rentalId) => {
  return axios.post(`/api/rentals/${rentalId}/confirm-return`);
};