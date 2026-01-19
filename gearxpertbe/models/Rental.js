// models/Rental.js
const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  rentalStartDate: Date,
  rentalEndDate: Date,

  rentPriceTotal: { type: Number, required: true },
  depositAmount: { type: Number, required: true },
  insuranceAmount: { type: Number, default: 0 },
  deliveryFee: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },

  paymentMethod: {
    type: String,
    enum: ['BANK','WALLET'],
    required: true
  },

  paymentStatus: {
    type: String,
    enum: ['UNPAID', 'PAID', 'REFUNDED'],
    default: 'UNPAID'
  },

  status: {
    type: String,
    enum: [
      'PENDING',
      'APPROVED',
      'DELIVERING',
      'RENTING',
      'RETURNING',
      'INSPECTING',
      'COMPLETED',
      'CANCELLED'
    ],
    default: 'PENDING'
  },
  voucherCode: String,
  voucherDiscount: {
    type: Number,
    default: 0
  },
  deliveryAddress: {
    street: { type: String },
    district: { type: String },
    city: { type: String },
    fullAddress: { type: String, required: true }
  },
  phoneNumber: { type: String, required: true },
  notes: String,


  orderCode: { 
    type: Number, 
    unique: true, 
    sparse: true // Cho phép các đơn cũ không có mã này không bị lỗi
  },
}, { timestamps: true });

module.exports = mongoose.model('Rental', rentalSchema);
