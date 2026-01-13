const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true
    },
  
    type: {
      type: String,
      enum: ['TOP_UP', 'PAYMENT', 'REFUND', 'WITHDRAW', 'ADJUSTMENT'],
      required: true
    },
  
    amount: { type: Number, required: true }, // + / -
  
    balanceBefore: Number,
    balanceAfter: Number,
  
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED', 'CANCELLED'],
      default: 'SUCCESS'
    },
  
    referenceType: {
      type: String,
      enum: ['ORDER', 'RENTAL', 'MAINTENANCE', 'SYSTEM']
    },
    referenceId: mongoose.Schema.Types.ObjectId,
  
    description: String
  }, { timestamps: true });
  
  module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
  