const mongoose = require('mongoose');

const insurancePolicySchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },

  providerName: {
    type: String,
    required: true
  },

  policyNumber: {
    type: String,
    required: true
  },

  coverageAmount: {
    type: Number,
    required: true
  },

  expiredAt: {
    type: Date,
    required: true
  },

  status: {
    type: String,
    enum: ['ACTIVE', 'EXPIRED'],
    default: 'ACTIVE'
  }

}, { timestamps: true });

module.exports = mongoose.model('InsurancePolicy', insurancePolicySchema);
