const {
    createAdvertisement,
    getMyAdvertisements,
    getAllAdvertisementsForAdmin,
    updateAdvertisementStatus,
    getApprovedBanners,
    getApprovedPopups,
    deleteAdvertisement
} = require('../controllers/Advertisement/AdvertisementController');
const Advertisement = require('../models/Advertisement');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const User = require('../models/User');
const mongoose = require('mongoose');

jest.mock('../models/Advertisement');
jest.mock('../models/Wallet');
jest.mock('../models/WalletTransaction');
jest.mock('../models/User');
jest.mock('../configs/NotificationConfig');
jest.mock('../configs/sendMail');

const mockSession = {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
};
mongoose.startSession = jest.fn().mockResolvedValue(mockSession);

describe('AdvertisementController Ultimate Coverage (>80% Final)', () => {
    let req, res;

    beforeEach(() => {
        req = {
            query: { page: '1', limit: '10' },
            params: { id: '64f1a2b3c4d5e6f7a8b9c0d1' },
            body: {},
            user: { id: 'u1' },
            file: { path: 'http://test.jpg' },
            app: { get: jest.fn().mockReturnValue({ to: jest.fn().mockReturnThis(), emit: jest.fn() }) }
        };
        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis()
        };
        jest.clearAllMocks();
        WalletTransaction.create = jest.fn().mockResolvedValue([{}]);
        Advertisement.mockImplementation(() => ({ save: jest.fn().mockResolvedValue({ _id: 'new_ad' }) }));
    });

    it('createAdvertisement Success All Paths', async () => {
        const start = new Date(Date.now() + 86400000);
        const end = new Date(Date.now() + 86400000 * 5);
        req.body = {
            title: 'Full Ad', link: 'http', adsType: ['BANNER', 'POPUP'],
            startDate: start.toISOString(), endDate: end.toISOString(), dailyBudget: '20000'
        };
        Wallet.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue({ _id: 'w1', balance: 1000000, save: jest.fn() }) });
        User.findById.mockReturnValue({ session: jest.fn().mockResolvedValue({ fullName: 'U' }) });
        await createAdvertisement(req, res);
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it('updateAdvertisementStatus - Complete REJECTED Refund', async () => {
        const mockAd = { status: 'PENDING', paidAmount: 50000, userId: 'u1', title: 'T', save: jest.fn(), _id: 'ad1' };
        Advertisement.findById.mockReturnValue({ session: jest.fn().mockResolvedValue(mockAd) });
        Wallet.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue({ _id: 'w1', balance: 0, save: jest.fn() }) });
        User.findById.mockReturnValue({ lean: jest.fn().mockResolvedValue({ email: 'e', fullName: 'U' }) });

        req.body = { status: 'REJECTED' };
        await updateAdvertisementStatus(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('deleteAdvertisement - Active APPROVED Complex Refund', async () => {
        const now = new Date();
        const ad = {
            status: 'APPROVED', paidAmount: 100000, dailyBudget: 10000,
            startDate: new Date(now.getTime() - 86400000), // 1 day used
            title: 'T', userId: 'u1', authorId: 'u1', save: jest.fn()
        };
        Advertisement.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(ad) });
        Wallet.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue({ _id: 'w1', balance: 0, save: jest.fn() }) });
        Advertisement.findByIdAndDelete.mockReturnValue({ session: jest.fn().mockResolvedValue({}) });

        await deleteAdvertisement(req, res);
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it('Fetchers and Boundary cases', async () => {
        const chain = { sort: jest.fn().mockReturnThis(), populate: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([]) };
        Advertisement.find.mockReturnValue(chain);
        await getMyAdvertisements(req, res);
        await getAllAdvertisementsForAdmin(req, res);
        await getApprovedBanners(req, res);
        await getApprovedPopups(req, res);

        // Targeted 404 in updateStatus
        Advertisement.findById.mockReturnValue({ session: jest.fn().mockResolvedValue(null) });
        req.body.status = 'APPROVED';
        await updateAdvertisementStatus(req, res);

        expect(res.status).toHaveBeenCalledWith(404);
    });

    it('Error cases catching 500', async () => {
        Advertisement.find.mockImplementation(() => { throw new Error('C'); });
        await getApprovedPopups(req, res);
        expect(res.status).toHaveBeenCalledWith(500);

        req.body.status = 'APPROVED';
        Advertisement.findById.mockImplementation(() => { throw new Error('C'); });
        await updateAdvertisementStatus(req, res);
        expect(res.status).toHaveBeenCalledWith(500);
    });
});
