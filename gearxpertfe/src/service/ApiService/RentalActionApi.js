import axios from "../AxiosCustomize";

export const approveRental = (rentalId) => {
  return axios.patch(`/api/rentals/${rentalId}/approve`);
};

export const rejectRental = (rentalId, payload = {}) => {
  return axios.patch(`/api/rentals/${rentalId}/reject`, payload);
};
