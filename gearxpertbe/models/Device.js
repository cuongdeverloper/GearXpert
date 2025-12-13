const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  supplierId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  name: { type: String, required: true, index: true },
  description: { type: String },
  category: { type: String, required: true }, 
  
  images: [{ type: String }], 
  
  rentPrice: { type: Number, required: true }, 
  depositAmount: { type: Number, required: true },
  
  status: {
    type: String,
    enum: ['AVAILABLE', 'RENTED', 'MAINTENANCE', 'STOPPED'],
    default: 'AVAILABLE'
  },
  
  location: { type: String, required: true }, 
  
  
  specs: {
    type: Map,
    of: String 
  },
  
  ratingAvg: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('Device', deviceSchema);