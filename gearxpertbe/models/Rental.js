const mongoose = require('mongoose');

const rentalSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },

  rentalStartDate: { type: Date, required: true },
  rentalEndDate: { type: Date, required: true },
  totalDays: { type: Number, required: true },

  rentPriceTotal: { type: Number, required: true },
  depositAmount: { type: Number, required: true }, 
  totalAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['UNPAID', 'PAID', 'REFUNDED'], default: 'UNPAID' },
  isDepositReturned: { type: Boolean, default: false }, 

  status: {
    type: String,
    enum: [
      'PENDING',      
      'APPROVED',   
      'PAID',         
      'DELIVERING', 
      'RENTING',    
      'RETURNING',  
      'INSPECTING',
      'COMPLETED',    
      'CANCELLED'  
    ],
    default: 'PENDING'
  },

  deliveryStaffId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  deliveryAddress: { type: String, required: true },
  
  incidentReport: {
    hasIssue: { type: Boolean, default: false },
    description: String,
    compensationAmount: { type: Number, default: 0 }, 
    technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }
}, { timestamps: true });

module.exports = mongoose.model('Rental', rentalSchema);