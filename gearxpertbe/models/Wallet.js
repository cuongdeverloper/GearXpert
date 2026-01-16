const mongoose = require('mongoose');

const walletSchema = new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      required: true
    },
  
    balance: { type: Number, default: 0 },
    currency: { type: String, default: 'VND' },
  
    status: {
      type: String,
      enum: ['ACTIVE', 'SUSPENDED'],
      default: 'ACTIVE'
    }
  }, { timestamps: true });
  
  module.exports = mongoose.model('Wallet', walletSchema);
  