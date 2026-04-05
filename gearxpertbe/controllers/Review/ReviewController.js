const mongoose = require('mongoose');
const Review = require('../../models/Review');
const Rental = require('../../models/Rental');
const RentalItem = require('../../models/RentalItem');
const Device = require('../../models/Device');
const uploadCloud = require('../../configs/cloudinaryConfig');  // Thêm dòng này

/**
 * GET /api/reviews/supplier/me
 * Supplier: tất cả đánh giá cho thiết bị của mình (lọc, phân trang).
 */
exports.getSupplierReviews = async (req, res) => {
  try {
    const rawSupplierId = req.user.id ?? req.user._id;
    if (!rawSupplierId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    const supplierId = mongoose.Types.ObjectId.isValid(rawSupplierId)
      ? new mongoose.Types.ObjectId(String(rawSupplierId))
      : rawSupplierId;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 15));
    const deviceIdFilter = req.query.deviceId;
    const ratingFilter = req.query.rating != null && req.query.rating !== ''
      ? parseInt(req.query.rating, 10)
      : null;
    const q = (req.query.q || '').trim();

    const allDevices = await Device.find({ supplierId })
      .select('_id name slug ratingAvg reviewCount')
      .sort({ name: 1 })
      .lean();

    const allDeviceIds = allDevices.map((d) => d._id);

    let listDeviceIds = allDeviceIds;
    if (deviceIdFilter && mongoose.Types.ObjectId.isValid(deviceIdFilter)) {
      const belongs = allDevices.some((d) => String(d._id) === String(deviceIdFilter));
      if (!belongs) {
        return res.json({
          success: true,
          reviews: [],
          total: 0,
          page,
          limit,
          stats: {
            avgRating: 0,
            totalReviews: 0,
            byStar: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          },
          devices: allDevices,
        });
      }
      listDeviceIds = [new mongoose.Types.ObjectId(deviceIdFilter)];
    }

    if (allDeviceIds.length === 0) {
      return res.json({
        success: true,
        reviews: [],
        total: 0,
        page,
        limit,
        stats: {
          avgRating: 0,
          totalReviews: 0,
          byStar: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        },
        devices: [],
      });
    }

    const match = { deviceId: { $in: listDeviceIds } };
    if (ratingFilter >= 1 && ratingFilter <= 5) {
      match.rating = ratingFilter;
    }
    if (q) {
      const esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      match.comment = new RegExp(esc, 'i');
    }

    const statsAgg = await Review.aggregate([
      { $match: { deviceId: { $in: allDeviceIds } } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]);
    const byStar = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let totalReviews = 0;
    let sumStars = 0;
    statsAgg.forEach(({ _id: star, count }) => {
      if (star >= 1 && star <= 5) {
        byStar[star] = count;
        totalReviews += count;
        sumStars += star * count;
      }
    });
    const avgRating = totalReviews ? Math.round((sumStars / totalReviews) * 10) / 10 : 0;

    const total = await Review.countDocuments(match);
    const reviews = await Review.find(match)
      .populate('userId', 'fullName avatar')
      .populate('deviceId', 'name slug')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const formatted = reviews.map((r) => ({
      _id: r._id,
      rating: r.rating,
      comment: r.comment,
      images: r.images || [],
      createdAt: r.createdAt,
      userName: r.userId?.fullName || 'Khách hàng',
      userAvatar: r.userId?.avatar || null,
      device: r.deviceId
        ? {
            _id: r.deviceId._id,
            name: r.deviceId.name,
            slug: r.deviceId.slug,
          }
        : null,
    }));

    res.json({
      success: true,
      reviews: formatted,
      total,
      page,
      limit,
      stats: { avgRating, totalReviews, byStar },
      devices: allDevices,
    });
  } catch (err) {
    console.error('getSupplierReviews:', err);
    res.status(500).json({ message: 'Không thể tải đánh giá' });
  }
};

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

    // Emit realtime update to the device room
    const io = req.app.get("io");
    if (io && items.length > 0) {
      const deviceId = items[0].deviceId;
      io.to(`device_${deviceId}`).emit("deviceReviewUpdate", { type: "REVIEW_ADD", deviceId });
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

    const reviewed = await Review.findOne({
      rentalId,
      userId
    });
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

    // Emit realtime update to the device room
    const io = req.app.get("io");
    if (io) {
      io.to(`device_${review.deviceId}`).emit("deviceReviewUpdate", { type: "REVIEW_UPDATE", deviceId: review.deviceId });
    }

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

    const deviceId = review.deviceId;
    await Review.findByIdAndDelete(reviewId);

    // Emit realtime update to the device room
    const io = req.app.get("io");
    if (io) {
      io.to(`device_${deviceId}`).emit("deviceReviewUpdate", { type: "REVIEW_DELETE", deviceId });
    }

    // Rating trung bình sẽ tự cập nhật nhờ post hook (nếu bạn xóa thì cần trigger lại hoặc để hook xử lý)

    res.json({ message: 'Đã xóa review thành công' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Xóa thất bại' });
  }
};