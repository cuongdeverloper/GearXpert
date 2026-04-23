const { sendOTPForPasswordChange, changePassword } = require('../controllers/Auth/AuthController');
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { createJWTOtp, verifyAccessToken } = require('../middleware/JWTAction');
const { sendMail } = require('../configs/sendMail');
const { otpPasswordChangeTemplate } = require('../utils/EmailTemplates');

// Mock dependencies
jest.mock('../models/User');
jest.mock('bcryptjs');
jest.mock('../middleware/JWTAction');
jest.mock('../configs/sendMail');
jest.mock('../utils/EmailTemplates');

describe('Change Password Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {},
            user: { id: 'mockUserId' },
            query: {},
            params: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    describe('[Phase 1: Request OTP]', () => {
        test('UTCID01 (Normal): Thành công', async () => {
            req.body = { oldPassword: 'validOldPassword' };
            const mockUser = {
                _id: 'mockUserId',
                fullName: 'Test User',
                email: 'test@example.com',
                comparePassword: jest.fn().mockResolvedValue(true)
            };
            User.findById.mockResolvedValue(mockUser);
            bcrypt.hash.mockResolvedValue('hashedOtp');
            createJWTOtp.mockReturnValue('mockTempToken');
            otpPasswordChangeTemplate.mockReturnValue('Email Content');
            sendMail.mockResolvedValue({ messageId: '123' });

            await sendOTPForPasswordChange(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: 0,
                message: 'OTP has been sent to your email'
            }));
            expect(sendMail).toHaveBeenCalled();
        });

        test('UTCID02 (Abnormal): Thiếu oldPassword', async () => {
            req.body = {}; // No oldPassword

            await sendOTPForPasswordChange(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: 1,
                message: 'Old password is required'
            }));
        });

        test('UTCID03 (Abnormal): User không tồn tại trong DB', async () => {
            req.body = { oldPassword: 'anyPassword' };
            User.findById.mockResolvedValue(null);

            await sendOTPForPasswordChange(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: 2,
                message: 'User not found'
            }));
        });

        test('UTCID04 (Abnormal): Sai oldPassword', async () => {
            req.body = { oldPassword: 'wrongPassword' };
            const mockUser = {
                comparePassword: jest.fn().mockResolvedValue(false)
            };
            User.findById.mockResolvedValue(mockUser);

            await sendOTPForPasswordChange(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: 3,
                message: 'Old password is incorrect'
            }));
        });

        test('UTCID05 (Abnormal): Lỗi server/email khi sinh OTP', async () => {
            req.body = { oldPassword: 'validOldPassword' };
            User.findById.mockRejectedValue(new Error('Database Error'));

            await sendOTPForPasswordChange(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: 5,
                message: 'Failed to send OTP'
            }));
        });
    });

    describe('[Phase 2: Change Password]', () => {
        test('UTCID06 (Abnormal): Thiếu OTP hoặc tempToken', async () => {
            req.body = { newPassword: 'Pass', confirmPassword: 'Pass' }; // Missing otp and tempToken

            await changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: 1,
                message: 'OTP and Token are required'
            }));
        });

        test('UTCID07 (Abnormal): newPassword và confirmPassword không khớp', async () => {
            req.body = {
                otp: '123456',
                tempToken: 'validToken',
                newPassword: 'Password123!',
                confirmPassword: 'MismatchPassword'
            };

            await changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: 2,
                message: 'Passwords do not match'
            }));
        });

        test('UTCID08 (Abnormal): tempToken không hợp lệ/hết hạn', async () => {
            req.body = {
                otp: '123456',
                tempToken: 'invalidToken',
                newPassword: 'Password123!',
                confirmPassword: 'Password123!'
            };
            verifyAccessToken.mockReturnValue(null); // Invalid token

            await changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: 5,
                message: 'Invalid or expired session'
            }));
        });

        test('UTCID09 (Abnormal): OTP không hợp lệ', async () => {
            req.body = {
                otp: 'wrongOtp',
                tempToken: 'validToken',
                newPassword: 'Password123!',
                confirmPassword: 'Password123!'
            };
            verifyAccessToken.mockReturnValue({
                purpose: 'CHANGE_PASSWORD',
                userId: 'mockUserId',
                otpHash: 'hashedOtp'
            });
            bcrypt.compare.mockResolvedValue(false); // OTP Mismatch

            await changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: 6,
                message: 'Invalid OTP'
            }));
        });

        test('UTCID10 (Abnormal): Token/OTP hợp lệ nhưng không tìm thấy User', async () => {
            req.body = {
                otp: '123456',
                tempToken: 'validToken',
                newPassword: 'Password123!',
                confirmPassword: 'Password123!'
            };
            verifyAccessToken.mockReturnValue({
                purpose: 'CHANGE_PASSWORD',
                userId: 'mockUserId',
                otpHash: 'hashedOtp'
            });
            bcrypt.compare.mockResolvedValue(true);
            User.findById.mockResolvedValue(null); // User not found

            await changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: 3,
                message: 'User not found'
            }));
        });

        test('UTCID11 (Boundary): Mật khẩu mới yếu', async () => {
            req.body = {
                otp: '123456',
                tempToken: 'validToken',
                newPassword: '123', // Weak password
                confirmPassword: '123'
            };
            verifyAccessToken.mockReturnValue({
                purpose: 'CHANGE_PASSWORD',
                userId: 'mockUserId',
                otpHash: 'hashedOtp'
            });
            bcrypt.compare.mockResolvedValue(true);
            User.findById.mockResolvedValue({ _id: 'mockUserId' });

            await changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: 7,
                message: 'Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, số và ký tự đặc biệt'
            }));
        });

        test('UTCID12 (Normal): Đổi mật khẩu thành công', async () => {
            req.body = {
                otp: '123456',
                tempToken: 'validToken',
                newPassword: 'StrongPassword123!',
                confirmPassword: 'StrongPassword123!'
            };
            verifyAccessToken.mockReturnValue({
                purpose: 'CHANGE_PASSWORD',
                userId: 'mockUserId',
                otpHash: 'hashedOtp'
            });
            bcrypt.compare.mockResolvedValue(true);
            const mockUser = {
                _id: 'mockUserId',
                save: jest.fn().mockResolvedValue(true)
            };
            User.findById.mockResolvedValue(mockUser);

            await changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: 0,
                message: 'Password changed successfully'
            }));
            expect(mockUser.password).toBe('StrongPassword123!');
            expect(mockUser.save).toHaveBeenCalled();
        });

        test('UTCID13 (Abnormal): Lỗi Server khi lưu mật khẩu mới', async () => {
            req.body = {
                otp: '123456',
                tempToken: 'validToken',
                newPassword: 'StrongPassword123!',
                confirmPassword: 'StrongPassword123!'
            };
            verifyAccessToken.mockReturnValue({
                purpose: 'CHANGE_PASSWORD',
                userId: 'mockUserId',
                otpHash: 'hashedOtp'
            });
            bcrypt.compare.mockResolvedValue(true);
            const mockUser = {
                _id: 'mockUserId',
                save: jest.fn().mockRejectedValue(new Error('Save Error'))
            };
            User.findById.mockResolvedValue(mockUser);

            await changePassword(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                errorCode: 7,
                message: 'Failed to change password'
            }));
        });
    });
});
