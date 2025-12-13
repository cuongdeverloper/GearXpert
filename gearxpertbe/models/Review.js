const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  rentalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', required: true }, 
  
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true }
}, { timestamps: true });

reviewSchema.index({ rentalId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);