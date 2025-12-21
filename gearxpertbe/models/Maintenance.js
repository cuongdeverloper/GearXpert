const maintenanceSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
    index: true
  },

  technicianId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  rentalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rental',
    default: null
  },

  type: {
    type: String,
    enum: ['SCHEDULED', 'DAMAGE', 'INSPECTION'],
    required: true
  },

  issues: [{
    description: String,
    severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] }
  }],

  repairAction: String,

  cost: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['PENDING', 'IN_PROGRESS', 'COMPLETED'],
    default: 'PENDING'
  },

  scheduledDate: Date,
  completedDate: Date

}, { timestamps: true });

module.exports = mongoose.model('Maintenance', maintenanceSchema);