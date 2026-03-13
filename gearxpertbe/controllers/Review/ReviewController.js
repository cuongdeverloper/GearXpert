const Review = require('../../models/Review');
const Rental = require('../../models/Rental');
const RentalItem = require('../../models/RentalItem');
const uploadCloud = require('../../configs/cloudinaryConfig');  // Thêm dòng này

/**
 * ===============================
 * GET /devices/:deviceId/reviews
 * Lấy danh sách review của thiết bị
 * ===============================
 */
exports.getDeviceReviews = async (req, res) => {
  try {
    const { deviceId } = req.params;

    const reviews = await Review.find({ deviceId })
      .populate('userId', 'fullName avatar')
      .sort({ createdAt: -1 });

    res.json(
      reviews.map(r => ({
        _id: r._id,
        userName: r.userId.fullName,
        avatar: r.userId.avatar,
        rating: r.rating,
        comment: r.comment,
        date: r.createdAt,
        images: r.images  // Thêm để trả images
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to load reviews' });
  }
};

/**
 * ===============================
 * POST /reviews
 * Tạo review mới (sau khi thuê xong)
 * ===============================
 */
exports.createReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const rentalId = req.params.rentalId;
    const { rating, comment, rentalItemIds } = req.body; // rentalItemIds là array từ formData



    // 1. Tìm rental
    const rental = await Rental.findOne({
      _id: rentalId,
      customerId: userId,
      status: 'COMPLETED'
    });

    if (!rental) {
      return res.status(403).json({ message: 'You can only review after completing rental' });
    }

    // 2. Lấy tất cả rentalItemIds hợp lệ
    const items = await RentalItem.find({ rentalId, _id: { $in: rentalItemIds || [] } });
    if (items.length === 0) {
      return res.status(400).json({ message: 'No valid items found for review' });
    }

    // 3. Upload images
    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map(file => file.path);
    }

    // 4. Tạo review cho từng item
    const createdReviews = [];
    for (const item of items) {
      const review = await Review.create({
        userId,
        rentalId,
        deviceId: item.deviceId,
        rating,
        comment,
        images
      });
      createdReviews.push(review._id);
    }

    res.status(201).json({
      message: `Review submitted successfully for ${createdReviews.length} devices`,
      reviewIds: createdReviews
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'You already reviewed one or more items in this rental' });
    }
    console.error('createReview error:', err);
    res.status(500).json({ message: 'Failed to submit review' });
  }
};
// Middleware upload for createReview (sử dụng array vì multiple files)
exports.uploadReviewImages = uploadCloud.array('images', 5);  // Max 5 files, tên field 'images'

/**
 * ===============================
 * GET /reviews/has-reviewed/:rentalId
 * Check user đã review rental này chưa
 * ===============================
 */
exports.hasReviewed = async (req, res) => {
  try {
    const userId = req.user.id;
    const { rentalId } = req.params;

    const reviewed = await Review.exists({
      rentalId,
      userId
    });
    console.log('Review exists?', !!reviewed);
    res.json({ hasReviewed: !!reviewed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Check failed' });
  }
};
// GET /api/devices/:deviceId/my-review
exports.getMyReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { deviceId } = req.params;

    const review = await Review.findOne({
      userId,
      deviceId,
    })
      .populate('userId', 'fullName avatar')
      .lean();

    if (!review) {
      return res.json({ hasReview: false });
    }

    res.json({
      hasReview: true,
      review: {
        _id: review._id,
        rating: review.rating,
        comment: review.comment,
        images: review.images || [],
        createdAt: review.createdAt,
        // có thể thêm rentalId nếu cần
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Không thể lấy review của bạn' });
  }
};

// PUT /api/reviews/:reviewId
exports.updateReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;
    const { rating, comment } = req.body;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy review' });
    }

    if (review.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Không phải review của bạn' });
    }

    const timeDiff = Date.now() - new Date(review.createdAt).getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff > 48) {
      return res.status(403).json({ message: 'Đã quá 48 giờ, không thể chỉnh sửa review' });
    }

    review.rating = rating;
    review.comment = comment;

    // Nếu có upload ảnh mới → xử lý tương tự createReview
    if (req.files && req.files.length > 0) {
      const newImages = req.files.map(file => file.path);
      review.images = [...(review.images || []), ...newImages];
    }

    await review.save();

    // Cập nhật lại rating trung bình thiết bị (đã có post save hook rồi)
    res.json({ message: 'Cập nhật review thành công', review });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Cập nhật thất bại' });
  }
};

// DELETE /api/reviews/:reviewId
exports.deleteReview = async (req, res) => {
  try {
    const userId = req.user.id;
    const { reviewId } = req.params;

    const review = await Review.findById(reviewId);

    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy review' });
    }

    if (review.userId.toString() !== userId) {
      return res.status(403).json({ message: 'Không phải review của bạn' });
    }

    const timeDiff = Date.now() - new Date(review.createdAt).getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff > 48) {
      return res.status(403).json({ message: 'Đã quá 48 giờ, không thể xóa review' });
    }

    await Review.findByIdAndDelete(reviewId);

    // Rating trung bình sẽ tự cập nhật nhờ post hook (nếu bạn xóa thì cần trigger lại hoặc để hook xử lý)

    res.json({ message: 'Đã xóa review thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Xóa thất bại' });
  }
};