const express = require('express');
const rentalRouter = express.Router();
const uploadCloud = require('../configs/cloudinaryConfig');
const {
  checkoutRental,
  hasRentedDevice,
  verifyRentalPayment,
  getSupplierRentals,
  getDeliveringRentals,
  getReturningRentals,
  claimDeliveryTask,
  getSupplierRevenue,
  approveRental,
  rejectRental,
  getMyRentals,
  cancelRental,
  confirmReceived,
  extendRental,
  startDelivery,
  confirmPickup,
  confirmReturn,
  cancelPayRental,
  repayRental,
  repaySingleRental,
  getRentalById
} = require('../controllers/Rental/RentalController');
const { checkAccessToken,requireEkyc } = require('../middleware/JWTAction');
const { hasReviewed, createReview, uploadReviewImages, getDeviceReviews } = require('../controllers/Review/ReviewController');


rentalRouter.post('/checkout', checkAccessToken,requireEkyc, checkoutRental);
rentalRouter.get('/has-rented/:deviceId', checkAccessToken, hasRentedDevice);
rentalRouter.post('/verify-payment', checkAccessToken, verifyRentalPayment);
rentalRouter.get('/delivering', checkAccessToken, getDeliveringRentals);
rentalRouter.get('/returning', checkAccessToken, getReturningRentals);
rentalRouter.post('/delivery-tasks/:taskId/claim', checkAccessToken, claimDeliveryTask);
rentalRouter.get('/supplier/:supplierId', checkAccessToken, getSupplierRentals);
rentalRouter.get('/supplier/:supplierId/revenue', checkAccessToken, getSupplierRevenue);
// Approve rental
rentalRouter.patch("/:rentalId/approve", checkAccessToken, approveRental);
// Reject rental
rentalRouter.patch("/:rentalId/reject", checkAccessToken, rejectRental);

rentalRouter.get('/my-rentals', checkAccessToken, getMyRentals);
rentalRouter.post('/:rentalId/cancel', checkAccessToken, cancelRental);
rentalRouter.post('/:rentalId/confirm', checkAccessToken, confirmReceived);
rentalRouter.post('/:rentalId/extend', checkAccessToken, extendRental);
// Fix route has-reviewed: Đổi từ /reviews/has-reviewed sang /rentals/:rentalId/has-reviewed để khớp API
rentalRouter.get('/:rentalId/has-reviewed', checkAccessToken, hasReviewed);

// Fix route createReview: Thêm middleware upload
rentalRouter.post('/:rentalId/review', checkAccessToken, uploadReviewImages, createReview);

// Thêm route cho getDeviceReviews (lấy list review per device)
rentalRouter.get('/devices/:deviceId/reviews', getDeviceReviews);  // Không cần auth nếu công khai, thêm checkAccessToken nếu cần
rentalRouter.post(
  "/:rentalId/start-delivery",
  checkAccessToken,startDelivery
);
rentalRouter.post('/:rentalId/confirm-pickup', checkAccessToken, confirmPickup);
rentalRouter.post('/:rentalId/confirm-return', checkAccessToken, uploadCloud.array('images', 8), confirmReturn);
rentalRouter.post('/:rentalId/cancelpay', checkAccessToken, cancelPayRental);
rentalRouter.post("/:rentalId/repay", checkAccessToken, repayRental);
rentalRouter.post("/:rentalId/singlerepay", checkAccessToken, repaySingleRental);
rentalRouter.get('/:rentalId', checkAccessToken, getRentalById);
module.exports = rentalRouter;
