const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
  deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', required: true },
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  rentalId: { type: mongoose.Schema.Types.ObjectId, ref: 'Rental', default: null },

  issueDescription: { type: String, required: true },
  repairAction: { type: String },
  cost: { type: Number, default: 0 }, 
  
  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
    default: 'PENDING'
  },
  
  scheduledDate: { type: Date }, 
  completedDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Maintenance', maintenanceSchema);