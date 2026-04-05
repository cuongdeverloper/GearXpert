import axios from "../AxiosCustomize";

/**
 * @param {object} params — page, limit, deviceId?, rating?, q? (tìm trong nội dung)
 */
export const getSupplierReviews = (params = {}) =>
  axios.get("/api/reviews/supplier/me", { params });
