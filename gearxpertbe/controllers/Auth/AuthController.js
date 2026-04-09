const { createJWT, createRefreshToken, verifyAccessToken, createJWTResetPassword, createJWTVerifyEmail, createJWTOtp } = require('../../middleware/JWTAction');
const bcrypt = require('bcryptjs');
const uploadCloud = require('../../configs/cloudinaryConfig');
const { sendMail } = require('../../configs/sendMail');
const { registrationTemplate, passwordResetTemplate, otpPasswordChangeTemplate } = require('../../utils/EmailTemplates');

const User = require('../../models/User');
const Wallet = require('../../models/Wallet');
const { ensureUserWallet } = require('../../services/WalletService');
require('dotenv').config();

const apiLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const userRecord = await User.findOne({ email });
        if (!userRecord) return res.status(200).json({ errorCode: 2, message: 'Email does not exist' });

        if (userRecord.status === 'BLOCKED') {
            return res.status(200).json({
                errorCode: 4,
                message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ hỗ trợ.'
            });
        }

        const isPasswordValid = await userRecord.comparePassword(password);
        if (!isPasswordValid) {
            console.log(`[Login] Failed: Incorrect password for ${email}`);
            return res.status(200).json({ errorCode: 3, message: 'Invalid password' });
        }

        const payload = {
            id: userRecord._id,
            email: userRecord.email,
            role: userRecord.role
        };

        const accessToken = createJWT(payload);
        const refreshToken = createRefreshToken(payload);

        // Fetch wallet balance
        const wallet = await Wallet.findOne({ user: userRecord._id });
        if (!wallet) {
            console.warn(`[Login] Warning: Wallet not found for user ${userRecord._id}`);
        }
        const walletBalance = wallet ? wallet.balance : 0;

        console.log(`[Login] Success: User ${email} logged in.`);
        return res.status(200).json({
            errorCode: 0,
            message: 'Login successful',
            data: {
                id: userRecord._id,
                access_token: accessToken,
                refresh_token: refreshToken,
                fullName: userRecord.fullName,
                role: userRecord.role,
                email: userRecord.email,
                phone: userRecord.phone,
                avatar: userRecord.avatar,
                type: userRecord.type,
                rank: userRecord.rank,
                walletBalance: walletBalance,
                rewardPoints: userRecord.rewardPoints,
                isVerified: userRecord.isVerified,
                isVerifiedEkyc: userRecord.isVerifiedEkyc
            }
        });
    } catch (error) {
        console.error('[Login] Error:', error);
        return res.status(500).json({ errorCode: 5, message: 'Login error' });
    }
};

const apiRegister = async (req, res) => {
    try {
        uploadCloud.single('avatar')(req, res, async (err) => {
            if (err) return res.status(400).json({ errorCode: 4, message: `Upload Error: ${err.message}` });

            const { fullName, email, password, phone, role, street, district, city } = req.body;
            const avatar = req.file ? req.file.path : "";

            if (!fullName || !email || !password || !phone) {
                return res.status(203).json({ errorCode: 1, message: 'Required fields are missing' });
            }

            if (!/^\d{10}$/.test(phone)) {
                return res.status(200).json({ errorCode: 6, message: 'Phone number must be exactly 10 digits' });
            }

            const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
            if (!passwordRegex.test(password)) {
                return res.status(200).json({
                    errorCode: 7,
                    message: 'Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, số và ký tự đặc biệt'
                });
            }

            const existingUser = await User.findOne({ email });
            if (existingUser) return res.status(200).json({ errorCode: 2, message: 'Email already exists' });

            console.log(`[Register] Creating user: ${email}`);
            const newUser = new User({
                fullName, email, password, phone, avatar,
                role: role || 'CUSTOMER',
                address: { street, district, city, fullAddress: `${street}, ${district}, ${city}` }
            });

            await newUser.save();
            console.log(`[Register] User saved: ${newUser._id}`);

            // Tự động tạo ví cho người dùng mới
            await ensureUserWallet(newUser._id);
            console.log(`[Register] Wallet ensured for user: ${newUser._id}`);

            // Tạo Token xác thực
            const verifyToken = createJWTVerifyEmail({ id: newUser._id, email: newUser.email });
            const verifyLink = `${process.env.FRONTEND_URL}/verify-account?token=${verifyToken}`;

            const emailContent = registrationTemplate(fullName, verifyLink);
            
            // Gửi mail bất đồng bộ để tránh làm treo response
            sendMail(email, 'Xác thực tài khoản GearXpert', emailContent)
                .then(info => {
                    if (info) console.log(`[Register] Verification email sent to ${email}`);
                    else console.error(`[Register] Failed to send verification email to ${email}`);
                })
                .catch(err => console.error(`[Register] Email service error:`, err));

            // Tự động xóa nếu không verify sau 15p (tăng lên từ 5p cho thoải mái)
            setTimeout(async () => {
                try {
                    const userCheck = await User.findById(newUser._id);
                    if (userCheck && !userCheck.isVerified) {
                        await User.findByIdAndDelete(newUser._id);
                        console.log(`🧹 [Register] Deleted unverified user: ${email} (expired 15m)`);
                    }
                } catch (err) {
                    console.error(`[Register] Cleanup error for ${email}:`, err);
                }
            }, 15 * 60 * 1000);

            return res.status(201).json({
                errorCode: 0,
                message: 'Register success. Check email to verify.',
                data: { id: newUser._id, email: newUser.email }
            });
        });
    } catch (error) {
        console.error('[Register] Error:', error);
        return res.status(500).json({ errorCode: 5, message: 'Registration error' });
    }
};

// --- Quên mật khẩu ---
const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;
        const userRecord = await User.findOne({ email });
        if (!userRecord) return res.status(203).json({ errorCode: 2, message: 'Email not found' });

        const resetToken = createJWTResetPassword({ id: userRecord._id, email: userRecord.email });
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        const emailContent = passwordResetTemplate(userRecord.fullName, resetLink);
        await sendMail(email, 'Đặt lại mật khẩu GearXpert', emailContent);

        return res.status(200).json({ errorCode: 0, message: 'Reset email sent' });
    } catch (error) {
        return res.status(500).json({ errorCode: 3, message: 'Request Reset Error' });
    }
};



const sendOTPForPasswordChange = async (req, res) => {
    try {
        const userId = req.user.id;
        const { oldPassword } = req.body;

        if (!oldPassword) {
            return res.status(400).json({ errorCode: 1, message: 'Old password is required' });
        }

        // Verify old password first
        const userRecord = await User.findById(userId);
        if (!userRecord) {
            return res.status(404).json({ errorCode: 2, message: 'User not found' });
        }

        const isMatch = await userRecord.comparePassword(oldPassword);
        if (!isMatch) {
            return res.status(400).json({ errorCode: 3, message: 'Old password is incorrect' });
        }

        // Generate 6-digit OTP
        const otp = `${Math.floor(100000 + Math.random() * 900000)}`;

        // Hash OTP
        const otpHash = await bcrypt.hash(otp, 10);

        // Create Stateless Token containing the hash
        const tempToken = createJWTOtp({
            userId,
            otpHash,
            purpose: 'CHANGE_PASSWORD'
        });

        // Send OTP via email
        const emailContent = otpPasswordChangeTemplate(userRecord.fullName, otp);
        await sendMail(userRecord.email, 'Mã OTP Đổi Mật Khẩu - GearXpert', emailContent);

        return res.status(200).json({
            errorCode: 0,
            message: 'OTP has been sent to your email',
            data: {
                email: userRecord.email,
                tempToken // Send token to client to send back with OTP
            }
        });
    } catch (error) {
        console.error('Send OTP Error:', error);
        return res.status(500).json({ errorCode: 5, message: 'Failed to send OTP' });
    }
};



const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        const decoded = verifyAccessToken(token);
        if (!decoded) return res.status(403).json({ errorCode: 2, message: 'Token expired' });

        const userRecord = await User.findById(decoded.id);
        if (!userRecord) return res.status(404).json({ errorCode: 3, message: 'User not found' });

        if (!userRecord) return res.status(404).json({ errorCode: 3, message: 'User not found' });

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(200).json({
                errorCode: 7,
                message: 'Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, số và ký tự đặc biệt'
            });
        }

        userRecord.password = newPassword;
        await userRecord.save();

        return res.status(200).json({ errorCode: 0, message: 'Password reset success' });
    } catch (error) {
        return res.status(500).json({ errorCode: 5, message: 'Reset Password Error' });
    }
};

const changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const { newPassword, confirmPassword, otp, tempToken } = req.body;

        // Validate OTP and Token are provided
        if (!otp || !tempToken) {
            return res.status(400).json({ errorCode: 1, message: 'OTP and Token are required' });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ errorCode: 2, message: 'Passwords do not match' });
        }

        // Verify The Stateless Token
        const decoded = verifyAccessToken(tempToken); // Using verifyAccessToken assuming same secret, or use specific verify if different
        if (!decoded || decoded.purpose !== 'CHANGE_PASSWORD' || decoded.userId !== userId) {
            return res.status(403).json({ errorCode: 5, message: 'Invalid or expired session' });
        }

        // Verify OTP against the hash in the token
        const isOtpValid = await bcrypt.compare(otp, decoded.otpHash);
        if (!isOtpValid) {
            return res.status(400).json({ errorCode: 6, message: 'Invalid OTP' });
        }

        // Find user
        const userRecord = await User.findById(userId);
        if (!userRecord) {
            return res.status(404).json({ errorCode: 3, message: 'User not found' });
        }

        // All validations passed, change password
        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(200).json({
                errorCode: 7,
                message: 'Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, số và ký tự đặc biệt'
            });
        }

        userRecord.password = newPassword;
        await userRecord.save();

        return res.status(200).json({ errorCode: 0, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Change Password Error:', error);
        return res.status(500).json({ errorCode: 7, message: 'Failed to change password' });
    }
};

const verifyAccountByLink = async (req, res) => {
    try {
        const { token } = req.query;
        const decoded = verifyAccessToken(token);
        if (!decoded) return res.status(403).json({ errorCode: 2, message: 'Invalid token' });

        await User.findByIdAndUpdate(decoded.id, { isVerified: true });
        return res.status(200).json({ errorCode: 0, message: 'Verified successfully' });
    } catch (error) {
        return res.status(500).json({ errorCode: 4, message: 'Link verification error' });
    }
};

const getCurrentUser = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRecord = await User.findById(userId);
        if (!userRecord) return res.status(404).json({ errorCode: 2, message: 'User not found' });

        // Fetch wallet balance
        const wallet = await Wallet.findOne({ user: userId });
        const walletBalance = wallet ? wallet.balance : 0;

        return res.status(200).json({
            errorCode: 0,
            message: 'Get user success',
            data: {
                id: userRecord._id,
                fullName: userRecord.fullName,
                email: userRecord.email,
                phone: userRecord.phone,
                avatar: userRecord.avatar,
                type: userRecord.type,
                role: userRecord.role,
                address: userRecord.address || {},
                rank: userRecord.rank,
                walletBalance: walletBalance,
                rewardPoints: userRecord.rewardPoints,
                isVerified: userRecord.isVerified,
                isVerifiedEkyc: userRecord.isVerifiedEkyc
            }
        });
    } catch (error) {
        return res.status(500).json({ errorCode: 5, message: 'Get user error' });
    }
};

const updateProfile = async (req, res) => {
    try {
        uploadCloud.single('avatar')(req, res, async (err) => {
            if (err) return res.status(400).json({ errorCode: 4, message: `Upload Error: ${err.message}` });

            const userId = req.user.id;
            const { fullName, phone, street, district, city } = req.body;
            const avatar = req.file ? req.file.path : undefined;

            const userRecord = await User.findById(userId);
            if (!userRecord) return res.status(404).json({ errorCode: 2, message: 'User not found' });

            // Update fields
            if (fullName) userRecord.fullName = fullName;
            if (phone) userRecord.phone = phone;
            if (avatar) userRecord.avatar = avatar;

            // Update address
            if (street || district || city) {
                userRecord.address = {
                    street: street || userRecord.address?.street || '',
                    district: district || userRecord.address?.district || '',
                    city: city || userRecord.address?.city || '',
                    fullAddress: `${street || userRecord.address?.street || ''}, ${district || userRecord.address?.district || ''}, ${city || userRecord.address?.city || ''}`.trim().replace(/^,\s*|,\s*$/g, '')
                };
            }

            await userRecord.save();

            // Fetch wallet balance
            const wallet = await Wallet.findOne({ user: userId });
            const walletBalance = wallet ? wallet.balance : 0;

            return res.status(200).json({
                errorCode: 0,
                message: 'Profile updated successfully',
                data: {
                    id: userRecord._id,
                    fullName: userRecord.fullName,
                    email: userRecord.email,
                    phone: userRecord.phone,
                    avatar: userRecord.avatar,
                    type: userRecord.type,
                    role: userRecord.role,
                    address: userRecord.address || {},
                    rank: userRecord.rank,
                    walletBalance: walletBalance,
                    rewardPoints: userRecord.rewardPoints,
                    isVerified: userRecord.isVerified,
                    isVerifiedEkyc: userRecord.isVerifiedEkyc
                }
            });
        });
    } catch (error) {
        return res.status(500).json({ errorCode: 5, message: 'Update profile error' });
    }
};

module.exports = {
    apiLogin, apiRegister,
    requestPasswordReset, resetPassword, changePassword, verifyAccountByLink,
    getCurrentUser, updateProfile, sendOTPForPasswordChange
};