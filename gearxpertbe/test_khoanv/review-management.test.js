/**
 * REVIEW MANAGEMENT FULL TEST SUITE
 * 24 Test Cases covering:
 * - REV-VIEW-01 to 05: View My Reviews
 * - REV-DEV-01 to 03: View Device Reviews
 * - REV-SUB-01 to 07: Submit Review
 * - REV-UPD-01 to 05: Update Review
 * - REV-DEL-01 to 04: Delete Review
 */

// ─── Mock Mongoose models with full jest.fn() stubs ──────────────────────────
const makeMockModel = () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findOneAndUpdate: jest.fn(),
  create: jest.fn(),
  insertMany: jest.fn(),
  updateOne: jest.fn(),
  updateMany: jest.fn(),
  deleteOne: jest.fn(),
  findByIdAndDelete: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  save: jest.fn(),
  populate: jest.fn(),
});

const mockReviewModel = makeMockModel();
const mockRentalModel = makeMockModel();
const mockRentalItemModel = makeMockModel();
const mockDeviceModel = makeMockModel();

jest.mock('../models/Review', () => mockReviewModel);
jest.mock('../models/Rental', () => mockRentalModel);
jest.mock('../models/RentalItem', () => mockRentalItemModel);
jest.mock('../models/Device', () => mockDeviceModel);

// ─── Mock cloudinary ─────────────────────────────────────────────────────────
jest.mock('../configs/cloudinaryConfig', () => ({
  array: jest.fn().mockReturnValue((req, res, next) => next()),
}));

// ─── Controller under test ───────────────────────────────────────────────────
const reviewCtrl = require('../controllers/Review/ReviewController');

// ─── Convenience aliases ──────────────────────────────────────────────────────
const Review = mockReviewModel;
const Rental = mockRentalModel;
const RentalItem = mockRentalItemModel;
const Device = mockDeviceModel;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const makeQueryChain = (resolveWith) => {
  const chainable = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolveWith),
    then: (resolve, reject) => Promise.resolve(resolveWith).then(resolve, reject),
  };
  return chainable;
};

// =============================================================================
describe('Review Management Full Tests (24 Cases)', () => {
  let req, res, mockIo;

  beforeEach(() => {
    // Reset all mocks
    Object.values(mockReviewModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockRentalModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockRentalItemModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockDeviceModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());

    mockIo = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    req = {
      user: { id: 'user123' },
      params: {},
      body: {},
      query: {},
      files: [],
      app: {
        get: jest.fn().mockReturnValue(mockIo),
      },
      originalUrl: '/api/reviews', // just an example
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  // ===========================================================================
  // VIEW MY REVIEWS (REV-VIEW-01 to 05)
  // ===========================================================================
  describe('View My Reviews (REV-VIEW-01 to 05)', () => {

    test('REV-VIEW-01: View my reviews - success', async () => {
      req.query = { page: '1', limit: '10' };
      
      const mockReviewsData = [
        { _id: 'rev1', rating: 5, comment: 'Great', createdAt: new Date().toISOString() },
        { _id: 'rev2', rating: 4, comment: 'Good', createdAt: new Date(Date.now() - 100 * 3600 * 1000).toISOString() } // > 48h
      ];
      
      Review.countDocuments.mockResolvedValue(2);
      Review.find.mockReturnValueOnce(makeQueryChain(mockReviewsData)); // For paginated reviews
      Review.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(mockReviewsData) }); // For allUserReviews stats

      await reviewCtrl.getMyAllReviews(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        reviews: expect.any(Array),
        total: 2,
        page: 1,
        limit: 10,
        stats: expect.objectContaining({
          totalReviews: 2,
          averageRating: 4.5,
          canEditCount: 1,
        }),
      }));
      
      const responseReviews = res.json.mock.calls[0][0].reviews;
      expect(responseReviews[0].canEdit).toBe(true);
      expect(responseReviews[1].canEdit).toBe(false);
    });

    test('REV-VIEW-02: View my reviews - empty', async () => {
      req.query = {};
      
      Review.countDocuments.mockResolvedValue(0);
      Review.find.mockReturnValueOnce(makeQueryChain([]));
      Review.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([]) });

      await reviewCtrl.getMyAllReviews(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        reviews: [],
        total: 0,
        stats: expect.objectContaining({
          totalReviews: 0,
          averageRating: 0,
        })
      }));
    });

    test('REV-VIEW-03: View my reviews with rating filter', async () => {
      req.query = { rating: '5' };
      
      const mockReviewsData = [{ _id: 'rev1', rating: 5, comment: 'Great', createdAt: new Date().toISOString() }];
      Review.countDocuments.mockResolvedValue(1);
      Review.find.mockReturnValueOnce(makeQueryChain(mockReviewsData));
      Review.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(mockReviewsData) });

      await reviewCtrl.getMyAllReviews(req, res);

      expect(Review.countDocuments).toHaveBeenCalledWith(expect.objectContaining({ rating: 5, userId: 'user123' }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        total: 1
      }));
    });

    test('REV-VIEW-04: View my reviews - pagination', async () => {
      req.query = { page: '2', limit: '10' };
      
      Review.countDocuments.mockResolvedValue(15);
      const mockChain = makeQueryChain([]);
      Review.find.mockReturnValueOnce(mockChain);
      Review.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([]) });

      await reviewCtrl.getMyAllReviews(req, res);

      expect(mockChain.skip).toHaveBeenCalledWith(10); // (page 2 - 1) * 10
      expect(mockChain.limit).toHaveBeenCalledWith(10);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        page: 2,
        limit: 10,
        totalPages: 2
      }));
    });

    test('REV-VIEW-05: View my reviews - unauthorized (handled by middleware but test internal error catch)', async () => {
      // Simulate an internal error to test catch block
      Review.countDocuments.mockRejectedValue(new Error('DB Error'));

      await reviewCtrl.getMyAllReviews(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Không thể tải danh sách đánh giá' });
    });
  });

  // ===========================================================================
  // VIEW DEVICE REVIEWS (REV-DEV-01 to 03)
  // ===========================================================================
  describe('View Device Reviews (REV-DEV-01 to 03)', () => {

    test('REV-DEV-01: View reviews for a device', async () => {
      req.params = { deviceId: 'dev1' };
      const mockReviews = [
        { _id: 'rev1', userId: { fullName: 'Test', avatar: 'ava.jpg' }, rating: 5, comment: 'Nice', createdAt: new Date() }
      ];
      
      Review.find.mockReturnValue(makeQueryChain(mockReviews));

      await reviewCtrl.getDeviceReviews(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({
          _id: 'rev1',
          userName: 'Test',
          rating: 5
        })
      ]));
    });

    test('REV-DEV-02: View reviews - device has no reviews', async () => {
      req.params = { deviceId: 'dev2' };
      Review.find.mockReturnValue(makeQueryChain([]));

      await reviewCtrl.getDeviceReviews(req, res);

      expect(res.json).toHaveBeenCalledWith([]);
    });

    test('REV-DEV-03: Check if reviewed rental', async () => {
      req.params = { rentalId: 'rental1' };
      
      Review.findOne.mockResolvedValue({ _id: 'rev1' }); // exists

      await reviewCtrl.hasReviewed(req, res);

      expect(res.json).toHaveBeenCalledWith({ hasReviewed: true });
      
      Review.findOne.mockResolvedValue(null); // not exists
      await reviewCtrl.hasReviewed(req, res);
      expect(res.json).toHaveBeenCalledWith({ hasReviewed: false });
    });
  });

  // ===========================================================================
  // SUBMIT REVIEW (REV-SUB-01 to 07)
  // ===========================================================================
  describe('Submit Review (REV-SUB-01 to 07)', () => {

    test('REV-SUB-01: Submit review - success', async () => {
      req.params = { rentalId: 'rental1' };
      req.body = { rating: 5, comment: 'Great', rentalItemIds: ['ri1'] };
      req.files = [{ path: 'img1.jpg' }];

      Rental.findOne.mockResolvedValue({ _id: 'rental1', status: 'COMPLETED' });
      RentalItem.find.mockResolvedValue([{ _id: 'ri1', deviceId: 'dev1' }]);
      Review.create.mockResolvedValue({ _id: 'rev1' });

      await reviewCtrl.createReview(req, res);

      expect(Review.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user123',
        rentalId: 'rental1',
        rating: 5,
        comment: 'Great',
        images: ['img1.jpg']
      }));
      expect(mockIo.to).toHaveBeenCalledWith('device_dev1');
      expect(mockIo.emit).toHaveBeenCalledWith('deviceReviewUpdate', { type: 'REVIEW_ADD', deviceId: 'dev1' });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ reviewIds: ['rev1'] }));
    });

    test('REV-SUB-02: Submit review - rental not completed', async () => {
      req.params = { rentalId: 'rental1' };
      // Rental.findOne returns null if condition { ..., status: 'COMPLETED' } is not met
      Rental.findOne.mockResolvedValue(null);

      await reviewCtrl.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'You can only review after completing rental' });
    });

    test('REV-SUB-03: Submit review - no items selected', async () => {
      req.params = { rentalId: 'rental1' };
      req.body = { rentalItemIds: [] };

      Rental.findOne.mockResolvedValue({ _id: 'rental1' });
      RentalItem.find.mockResolvedValue([]); // Emulates empty items found

      await reviewCtrl.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'No valid items found for review' });
    });

    test('REV-SUB-04: Submit review - duplicate review', async () => {
      req.params = { rentalId: 'rental1' };
      req.body = { rentalItemIds: ['ri1'] };

      Rental.findOne.mockResolvedValue({ _id: 'rental1' });
      RentalItem.find.mockResolvedValue([{ _id: 'ri1', deviceId: 'dev1' }]);
      
      const dupError = new Error('Duplicate');
      dupError.code = 11000;
      Review.create.mockRejectedValue(dupError);

      await reviewCtrl.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'You already reviewed one or more items in this rental' });
    });

    test('REV-SUB-05: Submit review - max 5 images (middleware handled)', async () => {
      // Logic handled in uploadCloud.array('images', 5) configuration which is mocked.
      // We test that taking > 5 handled successfully at controller assuming middleware passes array
      req.params = { rentalId: 'rental1' };
      req.body = { rentalItemIds: ['ri1'] };
      req.files = [1,2,3,4,5].map(i => ({ path: `img${i}.jpg` }));

      Rental.findOne.mockResolvedValue({ _id: 'rental1' });
      RentalItem.find.mockResolvedValue([{ _id: 'ri1', deviceId: 'dev1' }]);
      Review.create.mockResolvedValue({ _id: 'rev1' });

      await reviewCtrl.createReview(req, res);

      expect(Review.create).toHaveBeenCalledWith(expect.objectContaining({
        images: expect.arrayContaining(['img1.jpg', 'img5.jpg'])
      }));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('REV-SUB-06: Submit review without images', async () => {
      req.params = { rentalId: 'rental1' };
      req.body = { rentalItemIds: ['ri1'] };
      req.files = [];

      Rental.findOne.mockResolvedValue({ _id: 'rental1' });
      RentalItem.find.mockResolvedValue([{ _id: 'ri1', deviceId: 'dev1' }]);
      Review.create.mockResolvedValue({ _id: 'rev1' });

      await reviewCtrl.createReview(req, res);

      expect(Review.create).toHaveBeenCalledWith(expect.objectContaining({
        images: []
      }));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('REV-SUB-07: Submit review - invalid rentalId', async () => {
      req.params = { rentalId: 'invalid' };
      Rental.findOne.mockResolvedValue(null);

      await reviewCtrl.createReview(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ===========================================================================
  // UPDATE REVIEW (REV-UPD-01 to 05)
  // ===========================================================================
  describe('Update Review (REV-UPD-01 to 05)', () => {

    test('REV-UPD-01: Update review - within 48h', async () => {
      req.params = { reviewId: 'rev1' };
      req.body = { rating: 4, comment: 'Updated' };
      
      const mockReview = {
        _id: 'rev1',
        userId: 'user123',
        deviceId: 'dev1',
        createdAt: new Date(), // Just now
        save: jest.fn().mockResolvedValue({})
      };
      
      Review.findById.mockResolvedValue(mockReview);

      await reviewCtrl.updateReview(req, res);

      expect(mockReview.rating).toBe(4);
      expect(mockReview.comment).toBe('Updated');
      expect(mockReview.save).toHaveBeenCalled();
      expect(mockIo.to).toHaveBeenCalledWith('device_dev1');
      expect(mockIo.emit).toHaveBeenCalledWith('deviceReviewUpdate', { type: 'REVIEW_UPDATE', deviceId: 'dev1' });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Cập nhật review thành công' }));
    });

    test('REV-UPD-02: Update review - after 48h', async () => {
      req.params = { reviewId: 'rev1' };
      
      const pastDate = new Date(Date.now() - 50 * 3600 * 1000); // 50 hours ago
      Review.findById.mockResolvedValue({ userId: 'user123', createdAt: pastDate });

      await reviewCtrl.updateReview(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Đã quá 48 giờ, không thể chỉnh sửa review' });
    });

    test('REV-UPD-03: Update review - not owner', async () => {
      req.params = { reviewId: 'rev1' };
      req.user = { id: 'otherUser' };
      
      Review.findById.mockResolvedValue({ userId: { toString: () => 'user123' }, createdAt: new Date() });

      await reviewCtrl.updateReview(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Không phải review của bạn' });
    });

    test('REV-UPD-04: Update review - not found', async () => {
      req.params = { reviewId: 'nonexistent' };
      Review.findById.mockResolvedValue(null);

      await reviewCtrl.updateReview(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy review' });
    });

    test('REV-UPD-05: Update review - add new images', async () => {
      req.params = { reviewId: 'rev1' };
      req.files = [{ path: 'newImg.jpg' }];
      
      const mockReview = {
        _id: 'rev1',
        userId: 'user123',
        deviceId: 'dev1',
        createdAt: new Date(),
        images: ['oldImg.jpg'],
        save: jest.fn().mockResolvedValue({})
      };
      
      Review.findById.mockResolvedValue(mockReview);

      await reviewCtrl.updateReview(req, res);

      expect(mockReview.images).toEqual(['oldImg.jpg', 'newImg.jpg']);
      expect(mockReview.save).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // DELETE REVIEW (REV-DEL-01 to 04)
  // ===========================================================================
  describe('Delete Review (REV-DEL-01 to 04)', () => {

    test('REV-DEL-01: Delete review - within 48h', async () => {
      req.params = { reviewId: 'rev1' };
      
      Review.findById.mockResolvedValue({
        _id: 'rev1',
        userId: 'user123',
        deviceId: 'dev1',
        createdAt: new Date(),
      });
      Review.findByIdAndDelete.mockResolvedValue({});

      await reviewCtrl.deleteReview(req, res);

      expect(Review.findByIdAndDelete).toHaveBeenCalledWith('rev1');
      expect(mockIo.to).toHaveBeenCalledWith('device_dev1');
      expect(mockIo.emit).toHaveBeenCalledWith('deviceReviewUpdate', { type: 'REVIEW_DELETE', deviceId: 'dev1' });
      expect(res.json).toHaveBeenCalledWith({ message: 'Đã xóa review thành công' });
    });

    test('REV-DEL-02: Delete review - after 48h', async () => {
      req.params = { reviewId: 'rev1' };
      const pastDate = new Date(Date.now() - 50 * 3600 * 1000); // 50 hours ago
      
      Review.findById.mockResolvedValue({ userId: 'user123', createdAt: pastDate });

      await reviewCtrl.deleteReview(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Đã quá 48 giờ, không thể xóa review' });
    });

    test('REV-DEL-03: Delete review - not owner', async () => {
      req.params = { reviewId: 'rev1' };
      req.user = { id: 'otherUser' };
      
      Review.findById.mockResolvedValue({ userId: { toString: () => 'user123' }, createdAt: new Date() });

      await reviewCtrl.deleteReview(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Không phải review của bạn' });
    });

    test('REV-DEL-04: Delete review - not found', async () => {
      req.params = { reviewId: 'nonexistent' };
      Review.findById.mockResolvedValue(null);

      await reviewCtrl.deleteReview(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy review' });
    });
  });
});
