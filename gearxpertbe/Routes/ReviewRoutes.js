const routerReview = require('express').Router();
const { checkAccessToken } = require('../middleware/JWTAction');
const { getMyReview, updateReview, deleteReview, uploadReviewImages } = require('../controllers/Review/ReviewController');
const uploadCloud = require('../configs/cloudinaryConfig');
routerReview.get('/devices/:deviceId/my-review', checkAccessToken, getMyReview);
routerReview.put('/:reviewId', checkAccessToken, uploadReviewImages, updateReview);
routerReview.delete('/:reviewId', checkAccessToken, deleteReview);

module.exports = routerReview;
