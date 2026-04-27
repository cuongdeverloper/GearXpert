const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  rentalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true }, 
  
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
  images: [{ type: String }]  // Array of Cloudinary URLs
}, { timestamps: true });

reviewSchema.index({ rentalId: 1 }, { unique: true });
reviewSchema.statics.updateDeviceAndSupplierRatings = async function (deviceId) {
  const Device = mongoose.model('Device');
  const Review = mongoose.model('Review');
  const SupplierProfile = mongoose.model('SupplierProfile');

  // 1. Update Device Stats
  const reviews = await Review.find({ deviceId });
  const avg = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  const device = await Device.findByIdAndUpdate(deviceId, {
    ratingAvg: avg,
    reviewCount: reviews.length
  }, { new: true });

  // 2. Update Supplier Stats
  if (device && device.supplierId) {
    const ratingAgg = await Device.aggregate([
      { $match: { supplierId: device.supplierId, reviewCount: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$ratingAvg" },
          totalReviews: { $sum: "$reviewCount" },
        },
      },
    ]);

    if (ratingAgg.length > 0) {
      await SupplierProfile.findOneAndUpdate(
        { userId: device.supplierId },
        {
          supplierRating: ratingAgg[0].avgRating,
          supplierReviewCount: ratingAgg[0].totalReviews
        }
      );
    } else {
      // No reviewed devices left for this supplier
      await SupplierProfile.findOneAndUpdate(
        { userId: device.supplierId },
        {
          supplierRating: 0,
          supplierReviewCount: 0
        }
      );
    }
  }
};

reviewSchema.index({ rentalId: 1 }, { unique: true });

reviewSchema.post('save', async function () {
  await this.constructor.updateDeviceAndSupplierRatings(this.deviceId);
});
module.exports = mongoose.model('Review', reviewSchema);