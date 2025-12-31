const mongoose = require('mongoose');

const UserOTPVerificationSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    otp: { 
        type: String, 
        required: true 
    },
    createdAt: { 
        type: Date, 
        default: Date.now, 
        expires: 300
    }
}, { timestamps: true });

module.exports = mongoose.model('UserOTPVerification', UserOTPVerificationSchema);