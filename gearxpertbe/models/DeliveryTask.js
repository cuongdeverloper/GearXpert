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
    enum: ['PENDING', 'IN_TRANSIT', 'COMPLETED', 'FAILED'],
    default: 'PENDING'
  },

  scheduledAt: Date,
  completedAt: Date

}, { timestamps: true });

module.exports = mongoose.model('DeliveryTask', deliveryTaskSchema);
