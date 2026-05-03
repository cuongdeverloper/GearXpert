const mongoose = require('mongoose');

const withdrawRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  wallet: { type: mongoose.Schema.Types.ObjectId, ref: 'Wallet', required: true },
  amount: { type: Number, required: true },
  
  // Thông tin ngân hàng nhận tiền
  bankInfo: {
    bankName: { type: String, required: true },
    bankCode: { type: String }, // BIN của ngân hàng (VD: 970422)
    accountNumber: { type: String, required: true },
    accountName: { type: String, required: true }
  },
  
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'],
    default: 'PENDING'
  },
  
  adminNote: String, // Lý do từ chối hoặc ghi chú của Admin
  evidenceImage: String, // Ảnh chụp màn hình chuyển khoản thành công (Bill)
  
}, { timestamps: true });

module.exports = mongoose.model('WithdrawRequest', withdrawRequestSchema);