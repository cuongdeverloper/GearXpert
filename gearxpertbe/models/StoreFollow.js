const mongoose = require('mongoose');

const storeFollowSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

// Mỗi user chỉ follow 1 supplier 1 lần
storeFollowSchema.index({ userId: 1, supplierId: 1 }, { unique: true });
// Đếm follower nhanh
storeFollowSchema.index({ supplierId: 1 });

module.exports = mongoose.model('StoreFollow', storeFollowSchema);
