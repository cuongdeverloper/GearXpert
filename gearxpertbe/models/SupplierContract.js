const mongoose = require('mongoose');

const supplierContractSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  agreedToTerms: { 
    type: Boolean, 
    required: true 
  },
  contractSignature: {
    type: String, 
  },
  signatureDataUrl: {
    type: String,
  },
  signerName: {
    type: String,
  },
  signedPdfUrl: {
    type: String,
  },
  signedPdfPublicId: {
    type: String,
  },
  ipAddress: { type: String },
  userAgent: { type: String },
  contractVersion: { type: String },
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  reviewedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  rejectionReason: { 
    type: String, 
    default: "" 
  },
  
}, { timestamps: true });

module.exports = mongoose.model('SupplierContract', supplierContractSchema);
