const {
    apiLogin, apiRegister,
    requestPasswordReset, resetPassword, changePassword, verifyAccountByLink,
    getCurrentUser, updateProfile, sendOTPForPasswordChange
} = require('../controllers/Auth/AuthController');

const User = require('../models/User');
const Wallet = require('../models/Wallet');
const { ensureUserWallet } = require('../services/WalletService');
const { createJWT, createRefreshToken, verifyAccessToken, createJWTResetPassword, createJWTVerifyEmail, createJWTOtp } = require('../middleware/JWTAction');
const bcrypt = require('bcryptjs');
const uploadCloud = require('../configs/cloudinaryConfig');
const { sendMail } = require('../configs/sendMail');
const { registrationTemplate, passwordResetTemplate, otpPasswordChangeTemplate } = require('../utils/EmailTemplates');

jest.mock('../models/User');
jest.mock('../models/Wallet');
jest.mock('../services/WalletService');
jest.mock('../middleware/JWTAction');
jest.mock('bcryptjs');
jest.mock('../configs/cloudinaryConfig', () => ({
    single: jest.fn(() => async (req, res, callback) => {
        await callback();
    })
}));
jest.mock('../configs/sendMail');
jest.mock('../utils/EmailTemplates');

describe('AuthController Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            query: {},
            params: {},
            user: { id: 'user123' },
            file: null
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
        // Default mock for sendMail to avoid unhandled promises
        sendMail.mockResolvedValue({ messageId: '123' });
    });

    describe('apiLogin', () => {
        it('should login successfully', async () => {
            const mockUser = {
                _id: 'user123',
                email: 'test@example.com',
                password: 'hashedPassword',
                role: 'CUSTOMER',
                fullName: 'Test User',
                status: 'ACTIVE',
                comparePassword: jest.fn().mockResolvedValue(true)
            };
            User.findOne.mockResolvedValue(mockUser);
            Wallet.findOne.mockResolvedValue({ balance: 100 });
            createJWT.mockReturnValue('access_token');
            createRefreshToken.mockReturnValue('refresh_token');

            req.body = { email: 'test@example.com', password: 'password123' };
            await apiLogin(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: 0,
                message: 'Login successful'
            }));
        });

        it('should return error if user not found', async () => {
            User.findOne.mockResolvedValue(null);
            req.body = { email: 'wrong@example.com', password: 'password' };
            await apiLogin(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 2 }));
        });

        it('should return error if user is blocked', async () => {
            User.findOne.mockResolvedValue({ status: 'BLOCKED' });
            req.body = { email: 'blocked@example.com', password: 'password' };
            await apiLogin(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 4 }));
        });

        it('should return error if password invalid', async () => {
            User.findOne.mockResolvedValue({
                status: 'ACTIVE',
                comparePassword: jest.fn().mockResolvedValue(false)
            });
            req.body = { email: 'test@example.com', password: 'wrong' };
            await apiLogin(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 3 }));
        });

        it('should handle wallet not found gracefully', async () => {
            User.findOne.mockResolvedValue({
                _id: 'user123',
                status: 'ACTIVE',
                comparePassword: jest.fn().mockResolvedValue(true)
            });
            Wallet.findOne.mockResolvedValue(null);
            req.body = { email: 'test@example.com', password: 'password' };
            await apiLogin(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 0 }));
        });

        it('should handle internal server error', async () => {
            User.findOne.mockRejectedValue(new Error('DB Error'));
            await apiLogin(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('apiRegister', () => {
        it('should register successfully', async () => {
            req.body = {
                fullName: 'New User',
                email: 'new@example.com',
                password: 'Password123!',
                phone: '0123456789'
            };
            User.findOne.mockResolvedValue(null);
            User.prototype.save = jest.fn().mockResolvedValue({ _id: 'newuser123', email: 'new@example.com' });
            verifyAccessToken.mockReturnValue({ id: 'newuser123' }); // Not actually used in register but good to have
            createJWTVerifyEmail.mockReturnValue('verify_token');
            registrationTemplate.mockReturnValue('email content');

            await apiRegister(req, res);

            expect(res.status).toHaveBeenCalledWith(201);
            expect(ensureUserWallet).toHaveBeenCalled();
            expect(sendMail).toHaveBeenCalled();
        });

        it('should return error if required fields missing', async () => {
            req.body = { email: 'test@example.com' };
            await apiRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(203);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 1 }));
        });

        it('should return error if phone format invalid', async () => {
            req.body = { fullName: 'A', email: 'b', password: 'C', phone: '123' };
            await apiRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 6 }));
        });

        it('should return error if password format invalid', async () => {
            req.body = { fullName: 'A', email: 'b', password: 'short', phone: '0123456789' };
            await apiRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 7 }));
        });

        it('should return error if email already exists', async () => {
            req.body = { fullName: 'A', email: 'exists@example.com', password: 'Password123!', phone: '0123456789' };
            User.findOne.mockResolvedValue({ _id: '1' });
            await apiRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 2 }));
        });

        it('should handle upload error', async () => {
            uploadCloud.single.mockImplementationOnce(() => (req, res, callback) => callback(new Error('Upload failed')));
            await apiRegister(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 4 }));
        });

        it('should handle database error during save', async () => {
            req.body = { fullName: 'A', email: 'db@err.com', password: 'Password123!', phone: '0123456789' };
            User.findOne.mockResolvedValue(null);
            User.prototype.save = jest.fn().mockRejectedValue(new Error('Save failed'));
            
            await apiRegister(req, res);
            
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 5 }));
        });

        it('should handle wallet creation failure', async () => {
            req.body = { fullName: 'A', email: 'wallet@err.com', password: 'Password123!', phone: '0123456789' };
            User.findOne.mockResolvedValue(null);
            User.prototype.save = jest.fn().mockResolvedValue({ _id: 'u1' });
            ensureUserWallet.mockRejectedValue(new Error('Wallet failed'));

            await apiRegister(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });

        it('should handle interval cleanup (timeout usage)', async () => {
            jest.useFakeTimers();
            req.body = { fullName: 'A', email: 'clean@example.com', password: 'Password123!', phone: '0123456789' };
            User.findOne.mockResolvedValue(null);
            User.prototype.save = jest.fn().mockImplementation(function() {
                this._id = 'temp_user';
                return Promise.resolve(this);
            });
            User.findById.mockResolvedValue({ _id: 'temp_user', isVerified: false });
            
            await apiRegister(req, res);
            
            // Advance timers to trigger setTimeout
            jest.advanceTimersByTime(15 * 60 * 1000);
            
            // Flush all promises in the microtask queue
            for (let i = 0; i < 10; i++) {
                await Promise.resolve();
            }
            
            expect(User.findById).toHaveBeenCalledWith('temp_user');
            expect(User.findByIdAndDelete).toHaveBeenCalledWith('temp_user');
            jest.useRealTimers();
        });
    });

    describe('requestPasswordReset', () => {
        it('should send reset email successfully', async () => {
            req.body = { email: 'reset@example.com' };
            User.findOne.mockResolvedValue({ _id: 'u1', fullName: 'User', email: 'reset@example.com' });
            createJWTResetPassword.mockReturnValue('reset_token');
            passwordResetTemplate.mockReturnValue('content');

            await requestPasswordReset(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(sendMail).toHaveBeenCalled();
        });

        it('should return error if email not found', async () => {
            req.body = { email: 'notfound@example.com' };
            User.findOne.mockResolvedValue(null);
            await requestPasswordReset(req, res);
            expect(res.status).toHaveBeenCalledWith(203);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 2 }));
        });

        it('should handle errors', async () => {
            User.findOne.mockRejectedValue(new Error('Err'));
            await requestPasswordReset(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('sendOTPForPasswordChange', () => {
        it('should send OTP successfully', async () => {
            req.user = { id: 'u1' };
            req.body = { oldPassword: 'old' };
            const mockUser = { _id: 'u1', fullName: 'U', email: 'u@e.com', comparePassword: jest.fn().mockResolvedValue(true) };
            User.findById.mockResolvedValue(mockUser);
            bcrypt.hash.mockResolvedValue('hashed_otp');
            createJWTOtp.mockReturnValue('temp_token');

            await sendOTPForPasswordChange(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(sendMail).toHaveBeenCalled();
        });

        it('should return error if old password is missing', async () => {
            req.body = {};
            await sendOTPForPasswordChange(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 1 }));
        });

        it('should return error if user not found', async () => {
            req.body = { oldPassword: 'p' };
            User.findById.mockResolvedValue(null);
            await sendOTPForPasswordChange(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 2 }));
        });

        it('should return error if old password incorrect', async () => {
            req.body = { oldPassword: 'p' };
            User.findById.mockResolvedValue({ comparePassword: jest.fn().mockResolvedValue(false) });
            await sendOTPForPasswordChange(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 3 }));
        });
    });

    describe('resetPassword', () => {
        it('should reset password successfully', async () => {
            req.body = { token: 'tok', newPassword: 'Password123!' };
            verifyAccessToken.mockReturnValue({ id: 'u1' });
            const mockUser = { _id: 'u1', save: jest.fn().mockResolvedValue({}) };
            User.findById.mockResolvedValue(mockUser);

            await resetPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(mockUser.password).toBe('Password123!');
        });

        it('should return error if token invalid', async () => {
            verifyAccessToken.mockReturnValue(null);
            await resetPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should return error if user not found', async () => {
            verifyAccessToken.mockReturnValue({ id: 'u1' });
            User.findById.mockResolvedValue(null);
            await resetPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should return error if password format invalid', async () => {
            req.body = { token: 'tok', newPassword: 'low' };
            verifyAccessToken.mockReturnValue({ id: 'u1' });
            User.findById.mockResolvedValue({});
            await resetPassword(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 7 }));
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            req.user = { id: 'u1' };
            req.body = { otp: '123456', tempToken: 'tok', newPassword: 'Password123!', confirmPassword: 'Password123!' };
            verifyAccessToken.mockReturnValue({ purpose: 'CHANGE_PASSWORD', userId: 'u1', otpHash: 'hash' });
            bcrypt.compare.mockResolvedValue(true);
            const mockUser = { save: jest.fn() };
            User.findById.mockResolvedValue(mockUser);

            await changePassword(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return error if passwords do not match', async () => {
            req.body = { otp: '1', tempToken: 't', newPassword: 'a', confirmPassword: 'b' };
            await changePassword(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 2 }));
        });

        it('should return error if OTP/token missing', async () => {
            req.body = {};
            await changePassword(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 1 }));
        });

        it('should return error if session invalid', async () => {
            req.user = { id: 'u1' };
            req.body = { otp: '1', tempToken: 't', newPassword: 'a', confirmPassword: 'a' };
            verifyAccessToken.mockReturnValue(null);
            await changePassword(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should return error if OTP incorrect', async () => {
            req.user = { id: 'u1' };
            req.body = { otp: '1', tempToken: 't', newPassword: 'a', confirmPassword: 'a' };
            verifyAccessToken.mockReturnValue({ purpose: 'CHANGE_PASSWORD', userId: 'u1' });
            bcrypt.compare.mockResolvedValue(false);
            await changePassword(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 6 }));
        });
    });

    describe('verifyAccountByLink', () => {
        it('should verify successfully', async () => {
            req.query = { token: 'tok' };
            verifyAccessToken.mockReturnValue({ id: 'u1' });
            await verifyAccountByLink(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(User.findByIdAndUpdate).toHaveBeenCalled();
        });

        it('should return error if token invalid', async () => {
            verifyAccessToken.mockReturnValue(null);
            await verifyAccountByLink(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });

    describe('getCurrentUser', () => {
        it('should return current user successfully', async () => {
            req.user = { id: 'u1' };
            User.findById.mockResolvedValue({ _id: 'u1', fullName: 'U' });
            Wallet.findOne.mockResolvedValue({ balance: 50 });
            await getCurrentUser(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 0 }));
        });

        it('should return error if user not found', async () => {
            User.findById.mockResolvedValue(null);
            await getCurrentUser(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });

    describe('updateProfile', () => {
        it('should update profile successfully', async () => {
            req.user = { id: 'u1' };
            req.body = { fullName: 'Updated', street: 'Street 1' };
            const mockUser = { _id: 'u1', save: jest.fn() };
            User.findById.mockResolvedValue(mockUser);
            Wallet.findOne.mockResolvedValue({ balance: 20 });

            await updateProfile(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(mockUser.fullName).toBe('Updated');
            expect(mockUser.address.street).toBe('Street 1');
        });

        it('should handle upload error', async () => {
            uploadCloud.single.mockImplementationOnce(() => (req, res, callback) => callback(new Error('Upload failed')));
            await updateProfile(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return error if user not found', async () => {
            User.findById.mockResolvedValue(null);
            await updateProfile(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should handle internal errors', async () => {
            User.findById.mockRejectedValue(new Error('E'));
            await updateProfile(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ errorCode: 5 }));
        });
    });
});
