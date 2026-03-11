import axios from "../AxiosCustomize";

// 1. Giao dịch & Thanh toán
const checkout = (data) => {
  return axios.post("/api/rentals/checkout", data);
};

const verifyPayment = (rentalId) => {
  return axios.post("/api/rentals/verify-payment", { rentalId });
};

// 2. Quản lý đơn thuê cá nhân
const getMyRentals = () => {
  return axios.get("/api/rentals/my-rentals");
};

const hasRentedDevice = (deviceId) =>
  axios.get(`/api/rentals/has-rented/${deviceId}`);

// Lấy danh sách rental requests của supplier (pending, approved)
const getSupplierRentalRequests = (supplierId, params = {}) => {
  // params: { status: 'PENDING,APPROVED', ... }
  return axios.get(`/api/rentals/supplier/${supplierId}`, { params });
};

// 3. Thao tác trạng thái đơn hàng
const cancelRental = (rentalId) => {
  return axios.post(`/api/rentals/${rentalId}/cancel`);
};

const confirmReceived = (rentalId) => {
  return axios.post(`/api/rentals/${rentalId}/confirm`);
};

// RentalApi.js
const reportDeliveryIssue = (formData) => {
  return axios.post("/api/reports/delivery-issue", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
const reportDamage = (formData) => {
  return axios.post("/api/reports/damage", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};
// Lấy thông tin chi tiết một báo cáo đã gửi (Để user xem tiến độ xử lý)
const getReportDetail = (rentalId) => {
  return axios.get(`/api/rentals/report-status/${rentalId}`);
};


// 6. Vận chuyển (Mới)
const getShippingInfo = (rentalId) => {
  return axios.get(`/api/rentals/${rentalId}/shipping`);
};
const extendRental = (rentalId, data) => {
  return axios.post(`/api/rentals/${rentalId}/extend`, data);
};

const submitReview = (rentalId, reviewData) => {
  return axios.post(`/api/rentals/${rentalId}/review`, reviewData, {
    headers: { "Content-Type": "multipart/form-data" }  // Nếu gửi file, dùng multipart
  });
};

// Fix hasReviewedRental: Đổi URL sang đúng backend /rentals/:rentalId/has-reviewed
const hasReviewedRental = async (rentalId) => {
  try {
    const res = await axios.get(`/api/rentals/${rentalId}/has-reviewed`);
    return res.data;
  } catch (err) {
    console.error("Check hasReviewed error:", err);
    throw err;
  }
};

// Thêm API lấy list review per device (nếu bạn cần hiển thị ở trang device detail)
const getDeviceReviews = (deviceId) => {
  return axios.get(`/api/rentals/devices/${deviceId}/reviews`);
};
const repayRental = async (rentalId) => {
  try {
    const res = await axios.post(`/api/rentals/${rentalId}/repay`);
    return res;
  } catch (err) {
    throw err;
  }
};
const repaySingleRental = async (rentalId) => {
  try {
    const res = await axios.post(`/api/rentals/${rentalId}/singlerepay`);
    return res;
  } catch (err) {
    throw err;
  }
};
const cancelPayRental = async (rentalId) => {
  const res = await axios.post(`/api/rentals/${rentalId}/cancelpay`); // Hoặc PATCH nếu bạn dùng PATCH
  return res.data;
};

// Lấy danh sách đơn đang giao (DELIVERING) cho Staff
const getDeliveringRentals = () => {
  return axios.get("/api/rentals/delivering");
};

// Lấy danh sách đơn đang thu hồi (RETURNING) cho Staff
const getReturningRentals = () => {
  return axios.get("/api/rentals/returning");
};

// Staff xác nhận đã lấy hàng từ kho supplier
const confirmPickup = (rentalId) => {
  return axios.post(`/api/rentals/${rentalId}/confirm-pickup`);
};

// Staff xác nhận đã giao hàng đến tay customer
const confirmDelivery = (rentalId) => {
  return axios.post(`/api/rentals/${rentalId}/confirm-delivery`);
};

// Staff xác nhận đã thu hồi thiết bị từ customer
const confirmReturn = (rentalId) => {
  return axios.post(`/api/rentals/${rentalId}/confirm-return`);
};

export { 
  checkout, 
  hasRentedDevice, 
  verifyPayment, 
  getSupplierRentalRequests,
  getMyRentals, 
  cancelRental, 
  confirmReceived,
  reportDeliveryIssue,
  getReportDetail,
  submitReview,
  getShippingInfo,
  reportDamage,
  extendRental,
  hasReviewedRental,
  getDeviceReviews,
  repayRental,
  cancelPayRental,
  repaySingleRental,
  getDeliveringRentals,
  getReturningRentals,
  confirmPickup,
  confirmDelivery,
  confirmReturn
};
