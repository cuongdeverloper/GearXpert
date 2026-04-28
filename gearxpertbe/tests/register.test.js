const { apiRegister } = require('../controllers/Auth/AuthController');
const User = require('../models/User');
const { ensureUserWallet } = require('../services/WalletService');
const { createJWTVerifyEmail } = require('../middleware/JWTAction');
const { sendMail } = require('../configs/sendMail');
const { registrationTemplate } = require('../utils/EmailTemplates');
const uploadCloud = require('../configs/cloudinaryConfig');

// Mocking uploadCloud
jest.mock('../configs/cloudinaryConfig', () => ({
    single: jest.fn().mockReturnValue((req, res, cb) => {
        if (req.simulateUploadError) return cb(new Error('Cloudinary error'));
        cb(); // success
    })
}));

// Mocking dependencies
jest.mock('../models/User');
jest.mock('../services/WalletService');
jest.mock('../middleware/JWTAction');
jest.mock('../configs/sendMail');
jest.mock('../utils/EmailTemplates');

describe('Register Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        jest.useFakeTimers();
        req = {
            body: {},
            file: null,
            simulateUploadError: false
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.runOnlyPendingTimers();
        jest.useRealTimers();
    });

    test('UTCID01 (Abnormal): Avatar upload fails', async () => {
        req.simulateUploadError = true;

        await apiRegister(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            errorCode: 4,
            message: expect.stringContaining('Upload Error')
        }));
    });

    test('UTCID02 (Abnormal): Missing required fields (no password)', async () => {
        req.body = { 
            fullName: 'Test User', 
            email: 'test@gmail.com',
            phone: '0123456789'
            // password missing
        };

        await apiRegister(req, res);

        expect(res.status).toHaveBeenCalledWith(203);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            errorCode: 1,
            message: 'Required fields are missing'
        }));
    });

    test('UTCID03 (Boundary): Invalid phone format (not 10 digits)', async () => {
        req.body = {
            fullName: 'Test User',
            email: 'test@gmail.com',
            password: 'StrongPass123!',
            phone: '123' // Invalid
        };

        await apiRegister(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            errorCode: 6,
            message: 'Phone number must be exactly 10 digits'
        }));
    });

    test('UTCID04 (Boundary): Weak password', async () => {
        req.body = {
            fullName: 'Test User',
            email: 'test@gmail.com',
            password: 'weak', // Weak
            phone: '0123456789'
        };

        await apiRegister(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            errorCode: 7,
            message: expect.stringContaining('Mật khẩu phải có ít nhất 6 ký tự')
        }));
    });

    test('UTCID05 (Abnormal): Email already exists', async () => {
        req.body = {
            fullName: 'Test User',
            email: 'exists@gmail.com',
            password: 'StrongPass123!',
            phone: '0123456789'
        };
        User.findOne.mockResolvedValue({ email: 'exists@gmail.com' });

        await apiRegister(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            errorCode: 2,
            message: 'Email already exists'
        }));
    });

    test('UTCID06 (Normal): Successful registration', async () => {
        req.body = {
            fullName: 'New User',
            email: 'new@gmail.com',
            password: 'StrongPass123!',
            phone: '0987654321'
        };
        User.findOne.mockResolvedValue(null);
        
        // Mock save success
        const mockUser = {
            _id: 'mockUserId',
            email: 'new@gmail.com',
            fullName: 'New User'
        };
        User.prototype.save = jest.fn().mockImplementation(function() {
            this._id = 'mockUserId';
            return Promise.resolve(this);
        });
        
        createJWTVerifyEmail.mockReturnValue('mockVerifyToken');
        registrationTemplate.mockReturnValue('Email Content');
        sendMail.mockResolvedValue({ messageId: '123' });

        await apiRegister(req, res);

        expect(res.status).toHaveBeenCalledWith(201);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            errorCode: 0,
            message: expect.stringContaining('Register success')
        }));
        
        expect(ensureUserWallet).toHaveBeenCalledWith('mockUserId');
        expect(sendMail).toHaveBeenCalled();
    });

    test('UTCID07 (Abnormal): Server error during save', async () => {
        req.body = {
            fullName: 'Error User',
            email: 'error@gmail.com',
            password: 'StrongPass123!',
            phone: '0987654321'
        };
        User.findOne.mockResolvedValue(null);
        User.prototype.save = jest.fn().mockRejectedValue(new Error('Save Error'));

        await apiRegister(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            errorCode: 5,
            message: 'Registration error'
        }));
    });
});
