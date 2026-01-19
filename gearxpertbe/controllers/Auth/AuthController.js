const { createJWT, createRefreshToken, verifyAccessToken, createJWTResetPassword, createJWTVerifyEmail, createJWTOtp } = require('../../middleware/JWTAction');
const bcrypt = require('bcryptjs');
const uploadCloud = require('../../configs/cloudinaryConfig');
const { sendMail } = require('../../configs/sendMail');

const User = require('../../models/User');
const Wallet = require('../../models/Wallet');
const { ensureUserWallet } = require('../../services/WalletService');
require('dotenv').config();

const apiLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const userRecord = await User.findOne({ email });
        if (!userRecord) return res.status(200).json({ errorCode: 2, message: 'Email does not exist' });

        const isPasswordValid = await userRecord.comparePassword(password);
        if (!isPasswordValid) return res.status(200).json({ errorCode: 3, message: 'Invalid password' });

        const payload = {
            id: userRecord._id,
            email: userRecord.email,
            role: userRecord.role
        };

        const accessToken = createJWT(payload);
        const refreshToken = createRefreshToken(payload);

        // Fetch wallet balance
        const wallet = await Wallet.findOne({ user: userRecord._id });
        const walletBalance = wallet ? wallet.balance : 0;

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
                rank: userRecord.rank,
                walletBalance: walletBalance,
                rewardPoints: userRecord.rewardPoints,
                isVerified:userRecord.isVerified
            }
        });
    } catch (error) {
        console.error(error);
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

            const existingUser = await User.findOne({ email });
            if (existingUser) return res.status(200).json({ errorCode: 2, message: 'Email already exists' });

            const newUser = new User({
                fullName, email, password, phone, avatar,
                role: role || 'CUSTOMER',
                address: { street, district, city, fullAddress: `${street}, ${district}, ${city}` }
            });

            await newUser.save();

            // Tự động tạo ví cho người dùng mới
            await ensureUserWallet(newUser._id);

            // Tạo Token xác thực
            const verifyToken = createJWTVerifyEmail({ id: newUser._id, email: newUser.email });
            const verifyLink = `${process.env.FRONTEND_URL}/verify-account?token=${verifyToken}`;

            const emailContent = `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
                    <div style="background: #1a1a1a; color: #fff; padding: 20px; text-align: center;"><h2>GearXpert</h2></div>
                    <div style="padding: 30px;">
                        <p>Xin chào <strong>${fullName}</strong>,</p>
                        <p>Vui lòng nhấn vào nút bên dưới để xác thực tài khoản của bạn:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verifyLink}" style="background: #e67e22; color: #fff; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Xác thực ngay</a>
                        </div>
                        <p style="font-size: 12px; color: #888;">Lưu ý: Liên kết hết hạn trong 5 phút.</p>
                    </div>
                </div>`;

            // Gửi mail
            await sendMail(email, 'Xác thực tài khoản GearXpert', emailContent);

            // Tự động xóa nếu không verify sau 5p
            setTimeout(async () => {
                const userCheck = await User.findById(newUser._id);
                if (userCheck && !userCheck.isVerified) {
                    await User.findByIdAndDelete(newUser._id);
                    console.log(`🧹 Deleted unverified user: ${email}`);
                }
            }, 5 * 60 * 1000);

            return res.status(201).json({
                errorCode: 0,
                message: 'Register success. Check email to verify.',
                data: { id: newUser._id, email: newUser.email }
            });
        });
    } catch (error) {
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

        const html = `<p>Bạn nhận được email này vì đã yêu cầu đặt lại mật khẩu.</p>
                      <p>Nhấn vào đây để tiếp tục: <a href="${resetLink}">Đặt lại mật khẩu</a></p>`;

        await sendMail(email, 'Đặt lại mật khẩu GearXpert', html);

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
        const emailContent = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
                <div style="background: #1a1a1a; color: #fff; padding: 20px; text-align: center;"><h2>GearXpert</h2></div>
                <div style="padding: 30px;">
                    <p>Xin chào <strong>${userRecord.fullName}</strong>,</p>
                    <p>Bạn đã yêu cầu đổi mật khẩu. Mã OTP xác thực của bạn là:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="background: #f0f0f0; color: #333; padding: 15px 30px; font-size: 32px; font-weight: bold; letter-spacing: 8px; border-radius: 8px; display: inline-block;">${otp}</div>
                    </div>
                    <p style="color: #e74c3c; font-weight: bold;">⚠️ Mã OTP này sẽ hết hạn sau 5 phút.</p>
                    <p style="font-size: 12px; color: #888;">Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.</p>
                </div>
            </div>
        `;

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
                role: userRecord.role,
                address: userRecord.address || {},
                rank: userRecord.rank,
                walletBalance: walletBalance,
                rewardPoints: userRecord.rewardPoints
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
                    role: userRecord.role,
                    address: userRecord.address || {},
                    rank: userRecord.rank,
                    walletBalance: walletBalance,
                    rewardPoints: userRecord.rewardPoints
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