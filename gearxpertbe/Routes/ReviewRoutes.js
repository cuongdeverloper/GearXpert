const routerReview = require('express').Router();
const { checkAccessToken, checkSupplier } = require('../middleware/JWTAction');
const {
  getMyReview,
  updateReview,
  deleteReview,
  uploadReviewImages,
  getSupplierReviews,
} = require('../controllers/Review/ReviewController');
const uploadCloud = require('../configs/cloudinaryConfig');
routerReview.get('/supplier/me', checkAccessToken, checkSupplier, getSupplierReviews);
routerReview.get('/devices/:deviceId/my-review', checkAccessToken, getMyReview);
routerReview.put('/:reviewId', checkAccessToken, uploadReviewImages, updateReview);
routerReview.delete('/:reviewId', checkAccessToken, deleteReview);

module.exports = routerReview;
