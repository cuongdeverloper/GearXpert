const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: function () { return !this.socialLogin; } },
  phone: { type: String, required: false },
  avatar: { type: String, default: "" },
  type: {
    type: String,
    default: 'Local'
  },
  socialLogin: { type: Boolean, default: false },
  googleId: { type: String },
  role: {
    type: String,
    enum: ['CUSTOMER', 'SUPPLIER', 'ADMIN', 'OPERATION_STAFF'],
    default: 'CUSTOMER'
  },

  address: {
    street: String,
    district: String,
    city: String,
    fullAddress: String
  },

  /** 🔥 RANKING SYSTEM */
  rewardPoints: { type: Number, default: 0 },   // tổng điểm
  rank: {
    type: String,
    enum: ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'DIAMOND'],
    default: 'BRONZE'
  },

  isVerified: { type: Boolean, default: false },
  
  status: {
    type: String,
    enum: ['ACTIVE', 'BLOCKED'],
    default: 'ACTIVE'
  },

  isVerifiedEkyc : { type: Boolean, default: false },
  identityInfo: {
    cccdNumber: { 
        type: String, 
        unique: true, 
        sparse: true 
    },
    cccdFrontImage: { type: String },
    cccdBackImage: { type: String },  
    faceMatchScore: { type: Number },
    verifiedAt: { type: Date }       
  },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);