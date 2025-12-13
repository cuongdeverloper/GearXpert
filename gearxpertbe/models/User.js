const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true 
  },
  password: { type: String, required: function () { return !this.socialLogin; } },
  phone: { type: String, required: true },
  avatar: { type: String, default: "" }, 
  
  role: {
    type: String,
    enum: ['CUSTOMER', 'SUPPLIER', 'ADMIN', 'TECHNICIAN', 'DELIVERY_STAFF'],
    default: 'CUSTOMER'
  },

  address: {
    street: String,
    district: String,
    city: String,
    fullAddress: String
  },

  walletBalance: { type: Number, default: 0 },
  
  isVerified: { type: Boolean, default: false }, 
}, { timestamps: true }); 

module.exports = mongoose.model('User', userSchema);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);