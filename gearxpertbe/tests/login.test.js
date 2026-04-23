const { apiLogin } = require('../controllers/Auth/AuthController');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const { createJWT, createRefreshToken } = require('../middleware/JWTAction');

// Mock dependencies
jest.mock('../models/User');
jest.mock('../models/Wallet');
jest.mock('../middleware/JWTAction');

describe('Login Unit Tests', () => {
    let req, res;

    beforeEach(() => {
        req = {
            body: {}
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
    });

    test('UTCID01 (Abnormal): Email does not exist', async () => {
        req.body = { email: 'notfound@gmail.com', password: 'Password123!' };
        User.findOne.mockResolvedValue(null);

        await apiLogin(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            errorCode: 2,
            message: 'Email does not exist'
        }));
    });

    test('UTCID02 (Abnormal): User account is blocked', async () => {
        req.body = { email: 'blocked@gmail.com', password: 'Password123!' };
        User.findOne.mockResolvedValue({
            email: 'blocked@gmail.com',
            status: 'BLOCKED'
        });

        await apiLogin(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            errorCode: 4,
            message: expect.stringContaining('Tài khoản của bạn đã bị khóa')
        }));
    });

    test('UTCID03 (Abnormal): Invalid password', async () => {
        req.body = { email: 'valid@gmail.com', password: 'wrongPassword' };
        User.findOne.mockResolvedValue({
            email: 'valid@gmail.com',
            status: 'ACTIVE',
            comparePassword: jest.fn().mockResolvedValue(false)
        });

        await apiLogin(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            errorCode: 3,
            message: 'Invalid password'
        }));
    });

    test('UTCID04 (Normal): Login successful, User has NO wallet', async () => {
        req.body = { email: 'success@gmail.com', password: 'Password123!' };
        const mockUser = {
            _id: 'mockUserId',
            email: 'success@gmail.com',
            role: 'CUSTOMER',
            status: 'ACTIVE',
            comparePassword: jest.fn().mockResolvedValue(true)
        };
        User.findOne.mockResolvedValue(mockUser);
        Wallet.findOne.mockResolvedValue(null);
        createJWT.mockReturnValue('mockAccessToken');
        createRefreshToken.mockReturnValue('mockRefreshToken');

        await apiLogin(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            errorCode: 0,
            message: 'Login successful',
            data: expect.objectContaining({
                walletBalance: 0
            })
        }));
        expect(createJWT).toHaveBeenCalled();
        expect(createRefreshToken).toHaveBeenCalled();
    });

    test('UTCID05 (Normal): Login successful, User HAS a wallet', async () => {
        req.body = { email: 'wallet@gmail.com', password: 'Password123!' };
        const mockUser = {
            _id: 'mockUserId',
            email: 'wallet@gmail.com',
            role: 'CUSTOMER',
            status: 'ACTIVE',
            comparePassword: jest.fn().mockResolvedValue(true)
        };
        User.findOne.mockResolvedValue(mockUser);
        Wallet.findOne.mockResolvedValue({ balance: 500000 });
        createJWT.mockReturnValue('mockAccessToken');
        createRefreshToken.mockReturnValue('mockRefreshToken');

        await apiLogin(req, res);

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            errorCode: 0,
            data: expect.objectContaining({
                walletBalance: 500000
            })
        }));
    });

    test('UTCID06 (Abnormal): Server error during database query', async () => {
        req.body = { email: 'error@gmail.com', password: 'Password123!' };
        User.findOne.mockRejectedValue(new Error('DB connection lost'));

        await apiLogin(req, res);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            errorCode: 5,
            message: 'Login error'
        }));
    });
});
