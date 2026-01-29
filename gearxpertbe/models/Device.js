const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  supplierId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  name: { type: String, required: true, index: true },

  description: String,

  category: {
    type: String,
    enum: ['CAMERA', 'AUDIO', 'OFFICE', 'GAMING', 'ACCESSORY', 'LIGHTING', 'DRONE', 'OTHER'],
    required: true,
    index: true
  },

  stockQuantity: {
    type: Number,
    default: 1,
    min: 0
  },

  /* ===== ADD-ON ===== */
  isAddon: { type: Boolean, default: false },

  compatibleWith: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device'
  }],

  requiredAddons: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device'
  }],

  images: [String],

  /* ===== GIÁ THUÊ ===== */
  rentPrice: {
    perDay: { type: Number, required: true },
    perWeek: Number,
    perMonth: Number
  },

  depositAmount: { type: Number, required: true },

  status: {
    type: String,
    enum: ['AVAILABLE', 'RENTED', 'MAINTENANCE', 'BROKEN', 'STOPPED'],
    default: 'AVAILABLE',
    index: true
  },

  /* ===== VỊ TRÍ ===== */
  location: {
    warehouse: String,
    city: String
  },

  /* ===== SPECS LINH HOẠT ===== */
  specs: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },

  /* ===== MAINTENANCE SUMMARY ===== */
  maintenanceSummary: {
    lastMaintenanceAt: Date,
    nextMaintenanceAt: Date,
    totalMaintenanceCount: { type: Number, default: 0 }
  },

  /* ===== REVIEW STATS ===== */
  ratingAvg: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 }

}, { timestamps: true });
deviceSchema.index({ name: 'text', description: 'text', category: 'text' });
module.exports = mongoose.model('Device', deviceSchema);