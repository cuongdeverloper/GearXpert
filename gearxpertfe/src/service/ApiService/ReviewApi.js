// src/service/ApiService/ReviewApi.js
import axios from "../AxiosCustomize"; // hoặc import từ file axios config của bạn

/**
 * Lấy review của chính user hiện tại cho thiết bị cụ thể
 * @param {string} deviceId 
 * @returns {Promise<{hasReview: boolean, review?: object}>}
 */
export const getMyReview = async (deviceId) => {
  try {
    const response = await axios.get(`/api/reviews/devices/${deviceId}/my-review`);
    return response;
  } catch (error) {
    console.error("Lỗi khi lấy my-review:", error);
    throw error;
  }
};

/**
 * Cập nhật review (chỉ trong 48h)
 * @param {string} reviewId 
 * @param {object} data { rating, comment }
 * @returns {Promise<object>}
 */
export const updateReview = async (reviewId, data) => {
  try {
    const response = await axios.put(`/api/reviews/${reviewId}`, data);
    return response;
  } catch (error) {
    console.error("Lỗi cập nhật review:", error);
    throw error;
  }
};

/**
 * Xóa review (chỉ trong 48h)
 * @param {string} reviewId 
 * @returns {Promise<object>}
 */
export const deleteReview = async (reviewId) => {
  try {
    const response = await axios.delete(`/api/reviews/${reviewId}`);
    return response;
  } catch (error) {
    console.error("Lỗi xóa review:", error);
    throw error;
  }
};

/**
 * Lấy danh sách review của thiết bị
 * @param {string} deviceId 
 * @returns {Promise<Array>}
 */
export const getDeviceReviews = async (deviceId) => {
  try {
    const response = await axios.get(`/api/rentals/devices/${deviceId}/reviews`);
    return response;
  } catch (error) {
    console.error("Lỗi khi lấy device reviews:", error);
    throw error;
  }
};

/**
 * Lấy danh sách review của user hiện tại (MyReviews page)
 * @param {number} page 
 * @param {number} limit 
 * @param {number|null} ratingFilter 
 * @returns {Promise<object>}
 */
export const getMyReviews = async (page = 1, limit = 10, ratingFilter = null) => {
  try {
    const params = { page, limit };
    if (ratingFilter) params.rating = ratingFilter;
    const response = await axios.get('/api/reviews/my-reviews', { params });
    return response;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách reviews:", error);
    throw error;
  }
};

// Nếu sau này cần thêm API khác liên quan đến review, cứ bổ sung vào đây