const mongoose = require('mongoose');

const deliveryTaskSchema = new mongoose.Schema({
  rentalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rental',
    required: true,
    index: true
  },

  deviceIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device'
  }],

  deliveryStaffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  type: {
    type: String,
    enum: ['DELIVERY', 'PICKUP'],
    required: true
  },

  status: {
    type: String,
    enum: ['PENDING', 'ASSIGNED', 'IN_TRANSIT', 'COMPLETED', 'FAILED'],
    default: 'PENDING'
  },

  claimedAt: Date,
  scheduledAt: Date,
  completedAt: Date,

  // Add notes and image fields to handle 'Additional Delivery' concept or regular delivery logs
  isAdditional: { type: Boolean, default: false },
  issueNotes: { type: String },
  issueImages: [{ type: String }]

}, { timestamps: true });

module.exports = mongoose.model('DeliveryTask', deliveryTaskSchema);
