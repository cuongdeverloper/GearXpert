const Review = require('../../models/Review');
const Rental = require('../../models/Rental');
const RentalItem = require('../../models/RentalItem');

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
        date: r.createdAt
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
    const userId = req.user._id;
    const { rentalId, deviceId, rating, comment } = req.body;

    // 1️⃣ Kiểm tra rental có tồn tại & thuộc user
    const rental = await Rental.findOne({
      _id: rentalId,
      customerId: userId,
      status: 'COMPLETED'
    });

    if (!rental) {
      return res.status(403).json({
        message: 'You can only review after completing rental'
      });
    }

    // 2️⃣ Kiểm tra device có trong rental không
    const rentedItem = await RentalItem.findOne({
      rentalId,
      deviceId
    });

    if (!rentedItem) {
      return res.status(400).json({
        message: 'Device not found in this rental'
      });
    }

    // 3️⃣ Tạo review (unique theo rentalId)
    const review = await Review.create({
      userId,
      rentalId,
      deviceId,
      rating,
      comment
    });

    res.status(201).json({
      message: 'Review submitted successfully',
      reviewId: review._id
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: 'You already reviewed this rental'
      });
    }

    console.error(err);
    res.status(500).json({ message: 'Failed to submit review' });
  }
};

/**
 * ===============================
 * GET /reviews/has-reviewed/:rentalId
 * Check user đã review rental này chưa
 * ===============================
 */
exports.hasReviewed = async (req, res) => {
  try {
    const userId = req.user._id;
    const { rentalId } = req.params;

    const reviewed = await Review.exists({
      rentalId,
      userId
    });

    res.json({ hasReviewed: !!reviewed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Check failed' });
  }
};
