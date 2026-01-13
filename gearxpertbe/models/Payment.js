const mongoose = require('mongoose');


const paymentSchema = new mongoose.Schema({
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
  
    provider: {
      type: String,
      enum: ['PAYOS'],
      default: 'PAYOS'
    },
  
    amount: {
      type: Number,
      required: true
    },
  
    orderCode: {
      type: String,
      unique: true, // 🔥 quan trọng
      required: true
    },
  
    status: {
      type: String,
      enum: ['INIT', 'PAID', 'FAILED', 'CANCELLED'],
      default: 'INIT'
    },
  
    rawResponse: Object // log webhook PayOS
  }, { timestamps: true });
  
  module.exports = mongoose.model('Payment', paymentSchema);
  