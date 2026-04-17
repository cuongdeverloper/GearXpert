const mongoose = require('mongoose');

const shopReportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  shop: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SupplierProfile',
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true,
    maxlength: 2000
  },
  evidence: [{
    type: String // Cloudinary URLs
  }],
  purchasedProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: false
  },
  status: {
    type: String,
    enum: ['PENDING', 'RECEIVED', 'RESOLVED', 'REJECTED'],
    default: 'PENDING'
  },
  adminNotes: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('ShopReport', shopReportSchema);
