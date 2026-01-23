import axios from "../AxiosCustomize";

/**
 * Checkout
 * Backend tự biết checkout NORMAL hay INSTANT
 */
const checkout = (data) => {
  return axios.post("/api/rentals/checkout", data);
};
const hasRentedDevice = (deviceId) =>
  axios.get(`/api/rentals/has-rented/${deviceId}`);
  const verifyPayment = (rentalId) => {
    return axios.post("/api/rentals/verify-payment", { rentalId });
  };
  
  // Lấy danh sách rental requests của supplier (pending, approved)
export const getSupplierRentalRequests = (supplierId, params = {}) => {
  // params: { status: 'PENDING,APPROVED', ... }
  return axios.get(`/api/rentals/supplier/${supplierId}`, { params });
};
export { checkout,hasRentedDevice ,verifyPayment};
