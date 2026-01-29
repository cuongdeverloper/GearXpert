import axios from "../AxiosCustomize";

export const approveRental = (rentalId) => {
  return axios.patch(`/api/rentals/${rentalId}/approve`);
};

export const rejectRental = (rentalId) => {
  return axios.patch(`/api/rentals/${rentalId}/reject`);
};
