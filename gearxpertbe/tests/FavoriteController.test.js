const { 
    toggleFavorite, getUserFavorites, checkIsFavorite, getFavoriteDeviceIds 
} = require('../controllers/Favorite/FavoriteController');
const Favorite = require('../models/Favorite');
const Device = require('../models/Device');
const mongoose = require('mongoose');

jest.mock('../models/Favorite');
jest.mock('../models/Device');

describe('Favorite Controller - Full Coverage Victory', () => {
    const mockRes = () => ({
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
    });

    beforeEach(() => { jest.clearAllMocks(); });

    describe('toggleFavorite', () => {
        it('should return 401 if unauthorized', async () => {
            const res = mockRes();
            await toggleFavorite({ user: null }, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('should return 400 if deviceId is missing', async () => {
            const res = mockRes();
            await toggleFavorite({ user: { id: 'u1' }, body: {} }, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if deviceId is invalid format', async () => {
            const res = mockRes();
            await toggleFavorite({ user: { id: 'u1' }, body: { deviceId: '123' } }, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });

        it('should return 404 if device not found', async () => {
            const res = mockRes();
            Device.findById.mockResolvedValue(null);
            await toggleFavorite({ user: { id: 'u1' }, body: { deviceId: new mongoose.Types.ObjectId() } }, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });

        it('should remove favorite if already exists', async () => {
            const res = mockRes();
            const deviceId = new mongoose.Types.ObjectId();
            Device.findById.mockResolvedValue({ _id: deviceId });
            Favorite.findOne.mockResolvedValue({ _id: 'f1' });
            await toggleFavorite({ user: { id: 'u1' }, body: { deviceId } }, res);
            expect(Favorite.deleteOne).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith({ isFavorited: false });
        });

        it('should add favorite if not exists', async () => {
            const res = mockRes();
            const deviceId = new mongoose.Types.ObjectId();
            Device.findById.mockResolvedValue({ _id: deviceId });
            Favorite.findOne.mockResolvedValue(null);
            Favorite.create.mockResolvedValue({ userId: 'u1', deviceId });
            await toggleFavorite({ user: { id: 'u1' }, body: { deviceId } }, res);
            expect(Favorite.create).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ isFavorited: true }));
        });

        it('should catch 500 errors', async () => {
            const res = mockRes();
            Device.findById.mockRejectedValue(new Error('FAIL'));
            await toggleFavorite({ user: { id: 'u1' }, body: { deviceId: new mongoose.Types.ObjectId() } }, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getUserFavorites', () => {
        it('should list and filter out null devices (Branch 81)', async () => {
            const res = mockRes();
            const favorites = [
                { deviceId: { name: 'D1' } }, // valid
                { deviceId: null }           // invalid/deleted (Line 81)
            ];
            const chain = { populate: jest.fn().mockReturnThis(), skip: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), sort: jest.fn().mockResolvedValue(favorites) };
            Favorite.find.mockReturnValue(chain);
            Favorite.countDocuments.mockResolvedValue(1);

            await getUserFavorites({ user: { id: 'u1' }, query: { page: '1', limit: '10' } }, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ total: 1 }));
            // Check that only 1 valid favorite is returned
            const callArgs = res.json.mock.calls[0][0];
            expect(callArgs.favorites).toHaveLength(1);
        });

        it('should catch 500 errors', async () => {
             const res = mockRes();
             Favorite.find.mockImplementation(() => { throw new Error('ERR'); });
             await getUserFavorites({ user: { id: 'u1' }, query: {} }, res);
             expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('checkIsFavorite', () => {
        it('should return false for invalid ID format (Line 117)', async () => {
            const res = mockRes();
            await checkIsFavorite({ user: { id: 'u1' }, params: { deviceId: 'invalid' } }, res);
            expect(res.json).toHaveBeenCalledWith({ isFavorited: false });
        });

        it('should return isFavorited status', async () => {
            const res = mockRes();
            Favorite.findOne.mockResolvedValue({ _id: 'f1' });
            await checkIsFavorite({ user: { id: 'u1' }, params: { deviceId: new mongoose.Types.ObjectId() } }, res);
            expect(res.json).toHaveBeenCalledWith({ isFavorited: true });
        });
    });

    describe('getFavoriteDeviceIds', () => {
        it('should return list of IDs', async () => {
            const res = mockRes();
            Favorite.find.mockReturnValue({ select: jest.fn().mockResolvedValue([{ deviceId: 'd1' }]) });
            await getFavoriteDeviceIds({ user: { id: 'u1' } }, res);
            expect(res.json).toHaveBeenCalledWith({ deviceIds: ['d1'] });
        });
        
        it('should catch 500', async () => {
            const res = mockRes();
            Favorite.find.mockImplementation(() => { throw new Error('E'); });
            await getFavoriteDeviceIds({ user: { id: 'u1' } }, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
