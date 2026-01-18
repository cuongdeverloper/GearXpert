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
export { checkout,hasRentedDevice ,verifyPayment};
