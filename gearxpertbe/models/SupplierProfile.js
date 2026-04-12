const mongoose = require('mongoose');

const supplierProfileSchema = new mongoose.Schema({
  // Liên kết 1-1 với User (Supplier)
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // Mỗi Supplier chỉ có 1 profile
  },

  // Thông tin kinh doanh
  businessName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },

  businessDescription: {
    type: String,
    maxlength: 2000,
  },

  // Ảnh đại diện cửa hàng (khác với avatar cá nhân)
  businessAvatar: {
    type: String,
  },

  // Địa chỉ kho / cửa hàng
  warehouseAddress: {
    street: String,
    district: String,
    city: String,
    fullAddress: String,
    lat: Number,
    lng: Number,
  },

  // Thông tin liên hệ công khai
  contactZalo: String,
  contactFacebook: String,
  contactPhone: String, // SĐT công khai (có thể khác SĐT cá nhân)

  // Thời gian hoạt động
  operatingHours: {
    type: String,
    default: '08:00 - 22:00 hàng ngày',
  },

  // Stats (tính từ reviews của các device)
  supplierRating: {
    type: Number,
    default: 0,
  },
  supplierReviewCount: {
    type: Number,
    default: 0,
  },

  // Optional: Giấy phép kinh doanh (ảnh hoặc text)
  businessLicense: {
    number: String,
    image: String,
    verified: { type: Boolean, default: false },
  },

  // Trạng thái profile
  status: {
    type: String,
    enum: ['ACTIVE', 'PENDING', 'SUSPENDED'],
    default: 'PENDING',
  },

  // Hệ thống xử phạt theo số lượng report (RESOLVED)
  penaltyStage: {
    type: Number,
    default: 0, // 0: Bình thường, 1: Stage 1 (3 ngày), 2: Stage 2 (1 tháng), 3: Vĩnh viễn
  },
  resolvedReportCount: {
    type: Number,
    default: 0, // Đếm số report "RESOLVED" trong window 30 ngày
  },
  lastResolvedReportAt: {
    type: Date,
  },
  suspendedUntil: {
    type: Date, // Thời điểm hết hạn tạm ẩn
  },
  isPermanentlyHidden: {
    type: Boolean,
    default: false,
  },

  // Thời gian xác minh (nếu cần admin duyệt)
  verifiedAt: Date,
}, { timestamps: true });

// Tự động tạo SupplierProfile khi User đăng ký role SUPPLIER (optional hook)
supplierProfileSchema.statics.createForUser = async function (userId) {
  const existing = await this.findOne({ userId });
  if (existing) return existing;

  return this.create({
    userId,
    businessName: 'Cửa hàng mới',
    status: 'PENDING',
  });
};

module.exports = mongoose.model('SupplierProfile', supplierProfileSchema);