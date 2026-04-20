const mongoose = require('mongoose');

const walletTransactionSchema = new mongoose.Schema({
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true
    },
  
    type: {
      type: String,
      enum: [
        'TOP_UP',
        'PAYMENT',
        'REFUND',
        'WITHDRAW',
        'ADJUSTMENT',
        'PLATFORM_FEE',
        'PLATFORM_FEE_REFUND',
        'SHIPPING_FEE',
        'SHIPPING_FEE_REFUND',
        'ESCROW_HOLD',
        'ESCROW_RELEASE',
        'DEPOSIT_HOLD',
        'DEPOSIT_RELEASE',
        'PAYOUT',
        'DEPOSIT_REFUND'
      ],
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
  
    description: String,
    metadata: Object, // For additional data like admin info, adjustment type, etc.
    
    // Platform fee tracking fields
    isEarned: {
      type: Boolean,
      default: false
    }, // true = platform fee earned (order completed), false = pending
    isRefunded: {
      type: Boolean,
      default: false
    }, // true = platform fee refunded (order cancelled)
    rentalStatus: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'CANCELLED'],
      default: null
    } // Track rental status for platform fee transactions
  }, { timestamps: true });
  
  module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);