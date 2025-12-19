import axios from "../AxiosCustomize";

/**
 * Checkout
 * Backend tự biết checkout NORMAL hay INSTANT
 */
const checkout = (data) => {
    return axios.post("/api/rentals/checkout", data);
};

export { checkout };
