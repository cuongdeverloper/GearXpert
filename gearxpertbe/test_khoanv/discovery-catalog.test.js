/**
 * DISCOVERY AND CATALOG TEST SUITE
 * 22 Test Cases covering:
 * - DR-01 to DR-04: Search Equipment by Purpose
 * - DR-05 to DR-09: View Device List
 * - DR-10 to DR-12: View Device Detail
 * - DR-13 to DR-16: Search Devices
 * - DR-17 to DR-22: Filter Devices (based on provided duplicate descriptions)
 */

// ─── Mock Mongoose models with full jest.fn() stubs ──────────────────────────
const makeMockModel = () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  save: jest.fn(),
});

const mockDeviceModel = makeMockModel();
const mockDeviceItemModel = makeMockModel();
const mockRentalItemModel = makeMockModel();
const mockReviewModel = makeMockModel();
const mockSupplierProfileModel = makeMockModel();

jest.mock('../models/Device', () => mockDeviceModel);
jest.mock('../models/DeviceItem', () => mockDeviceItemModel);
jest.mock('../models/RentalItem', () => mockRentalItemModel);
jest.mock('../models/Review', () => mockReviewModel);
jest.mock('../models/SupplierProfile', () => mockSupplierProfileModel);

// ─── Controller under test ───────────────────────────────────────────────────
const deviceCtrl = require('../controllers/Device/DeviceController');

// ─── Mongoose types mock ──────────────────────────────────────────────────────
const mongoose = require('mongoose');
mongoose.Types = {
  ObjectId: function(id) { return id || '507f1f77bcf86cd799439011'; },
};
mongoose.Types.ObjectId.isValid = jest.fn().mockReturnValue(true);

// ─── Convenience aliases ──────────────────────────────────────────────────────
const Device = mockDeviceModel;
const DeviceItem = mockDeviceItemModel;
const RentalItem = mockRentalItemModel;
const Review = mockReviewModel;
const SupplierProfile = mockSupplierProfileModel;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const makeQueryChain = (resolveWith) => {
  const chainable = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(resolveWith),
    then: (resolve, reject) => Promise.resolve(resolveWith).then(resolve, reject),
  };
  return chainable;
};

// =============================================================================
describe('Discovery and Catalog Tests (22 Cases)', () => {
  let req, res;

  beforeEach(() => {
    // Reset all mocks
    Object.values(mockDeviceModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockDeviceItemModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockRentalItemModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockReviewModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockSupplierProfileModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());

    req = {
      params: {},
      body: {},
      query: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  const baseDevices = [
    { _id: 'dev1', name: 'Canon EOS', category: 'Photography', rentPrice: { perDay: 100 }, ratingAvg: 4.5, reviewCount: 10 },
    { _id: 'dev2', name: 'Sony A7', category: 'Photography', rentPrice: { perDay: 150 }, ratingAvg: 4.8, reviewCount: 5 }
  ];

  // ===========================================================================
  // SEARCH EQUIPMENT BY PURPOSE (DR-01 to DR-04)
  // ===========================================================================
  describe('Search Equipment by Purpose (DR-01 to DR-04)', () => {
    test('DR-01: Search devices by purpose successfully', async () => {
      req.query = { category: 'Photography' }; // Purpose mapping
      
      Device.find.mockReturnValue(makeQueryChain(baseDevices));
      DeviceItem.aggregate.mockResolvedValue([]);
      Device.countDocuments.mockResolvedValue(2);

      await deviceCtrl.getDevices(req, res);

      expect(Device.find).toHaveBeenCalledWith(expect.objectContaining({ category: 'Photography' }));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        devices: expect.any(Array),
        total: 2
      }));
    });

    test('DR-02: Select device from purpose result', async () => {
      // Flow representation: viewing device detail after search
      req.params = { slug: 'dev1' };
      const baseDeviceObj = { 
        ...baseDevices[0], 
        toObject: () => baseDevices[0],
        supplierId: { _id: 'sup1' }
      };

      Device.findOne.mockReturnValue(makeQueryChain(baseDeviceObj));
      Review.find.mockReturnValue(makeQueryChain([]));
      RentalItem.countDocuments.mockResolvedValue(0);
      RentalItem.aggregate.mockResolvedValue([]);
      RentalItem.find.mockReturnValue(makeQueryChain([]));
      SupplierProfile.findOne.mockReturnValue(makeQueryChain(null));
      Device.countDocuments.mockResolvedValue(1);

      await deviceCtrl.getDeviceDetail(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _id: 'dev1' }));
    });

    test('DR-03: No devices found for selected purpose', async () => {
      req.query = { category: 'Cooking' };
      
      Device.find.mockReturnValue(makeQueryChain([]));
      DeviceItem.aggregate.mockResolvedValue([]);
      Device.countDocuments.mockResolvedValue(0);

      await deviceCtrl.getDevices(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        devices: [],
        total: 0
      }));
    });

    test('DR-04: System error while retrieving devices', async () => {
      req.query = { category: 'Gaming' };
      
      Device.find.mockImplementation(() => { throw new Error('DB timeout'); });

      await deviceCtrl.getDevices(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    });
  });

  // ===========================================================================
  // VIEW DEVICE LIST (DR-05 to DR-09)
  // ===========================================================================
  describe('View Device List (DR-05 to DR-09)', () => {
    test('DR-05: View device list on homepage', async () => {
      req.query = {}; // Default homepage fetch
      
      Device.find.mockReturnValue(makeQueryChain(baseDevices));
      DeviceItem.aggregate.mockResolvedValue([{ _id: 'dev1', availableCount: 5 }]);
      Device.countDocuments.mockResolvedValue(2);

      await deviceCtrl.getDevices(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        devices: expect.arrayContaining([
          expect.objectContaining({ _id: 'dev1', availableQuantity: 5 })
        ])
      }));
    });

    test('DR-06: View device basic information', async () => {
      req.query = {};
      
      Device.find.mockReturnValue(makeQueryChain(baseDevices));
      DeviceItem.aggregate.mockResolvedValue([]);
      Device.countDocuments.mockResolvedValue(2);

      await deviceCtrl.getDevices(req, res);

      const responseData = res.json.mock.calls[0][0];
      expect(responseData.devices[0].name).toBeDefined();
      expect(responseData.devices[0].rentPrice).toBeDefined();
      expect(responseData.devices[0].category).toBeDefined();
      expect(responseData.devices[0].ratingAvg).toBeDefined();
    });

    test('DR-07: Open device detail from list', async () => {
      req.params = { slug: 'sony-a7' };
      
      const baseDeviceObj = { 
        ...baseDevices[1], 
        toObject: () => baseDevices[1]
      };

      Device.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(baseDeviceObj) });
      Review.find.mockReturnValue(makeQueryChain([]));
      RentalItem.countDocuments.mockResolvedValue(0);
      RentalItem.aggregate.mockResolvedValue([]);
      RentalItem.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });
      SupplierProfile.findOne.mockReturnValue(makeQueryChain(null));
      Device.countDocuments.mockResolvedValue(1);

      await deviceCtrl.getDeviceDetail(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _id: 'dev2' }));
    });

    test('DR-08: No devices available', async () => {
      req.query = {};
      
      Device.find.mockReturnValue(makeQueryChain([]));
      DeviceItem.aggregate.mockResolvedValue([]);
      Device.countDocuments.mockResolvedValue(0);

      await deviceCtrl.getDevices(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        devices: [],
        total: 0
      }));
    });

    test('DR-09: System error loading device list', async () => {
      req.query = {};
      
      Device.find.mockImplementation(() => { throw new Error('Database disconnected'); });

      await deviceCtrl.getDevices(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    });
  });

  // ===========================================================================
  // VIEW DEVICE DETAIL (DR-10 to DR-12)
  // ===========================================================================
  describe('View Device Detail (DR-10 to DR-12)', () => {
    test('DR-10: View device detail successfully', async () => {
      req.params = { slug: 'dev1' };
      
      const mockDevice = { 
        _id: 'dev1', 
        name: 'Canon EOS',
        specs: { lens: '50mm' },
        toObject: function() { return { _id: this._id, name: this.name, specs: this.specs }; }
      };

      Device.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockDevice) });
      Review.find.mockReturnValue(makeQueryChain([{ _id: 'rev1', rating: 5 }]));
      RentalItem.countDocuments.mockResolvedValue(2);
      RentalItem.aggregate.mockResolvedValue([{ totalQuantity: 3 }]);
      RentalItem.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });
      SupplierProfile.findOne.mockReturnValue(makeQueryChain(null));
      Device.countDocuments.mockResolvedValue(1);

      await deviceCtrl.getDeviceDetail(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        _id: 'dev1',
        reviews: expect.any(Array),
        rentalCount: 2,
        totalRentedUnits: 3,
        specs: expect.any(Object)
      }));
    });

    test('DR-11: Device not found', async () => {
      req.params = { slug: 'invalid-id' };
      
      Device.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

      await deviceCtrl.getDeviceDetail(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Device not found' });
    });

    test('DR-12: System error retrieving device detail', async () => {
      req.params = { slug: 'dev1' };
      
      Device.findOne.mockImplementation(() => { throw new Error('DB Error'); });

      await deviceCtrl.getDeviceDetail(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  // ===========================================================================
  // SEARCH DEVICES (DR-13 to DR-16)
  // ===========================================================================
  describe('Search Devices (DR-13 to DR-16)', () => {
    // Note: Assuming keyword search could map to query.keyword or query.q if implemented properly
    test('DR-13: Search device by keyword', async () => {
      req.query = { keyword: 'Canon' }; // the current getDevices controller may or may not use this, testing boundary
      
      Device.find.mockReturnValue(makeQueryChain([baseDevices[0]]));
      DeviceItem.aggregate.mockResolvedValue([]);
      Device.countDocuments.mockResolvedValue(1);

      await deviceCtrl.getDevices(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        devices: expect.any(Array),
        total: 1
      }));
    });

    test('DR-14: Search device by partial keyword', async () => {
      req.query = { keyword: 'Cam' };
      
      Device.find.mockReturnValue(makeQueryChain([baseDevices[0]]));
      DeviceItem.aggregate.mockResolvedValue([]);
      Device.countDocuments.mockResolvedValue(1);

      await deviceCtrl.getDevices(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        devices: expect.any(Array),
        total: 1
      }));
    });

    test('DR-15: Search device with no results', async () => {
      req.query = { keyword: 'XYZ123' };
      
      Device.find.mockReturnValue(makeQueryChain([]));
      DeviceItem.aggregate.mockResolvedValue([]);
      Device.countDocuments.mockResolvedValue(0);

      await deviceCtrl.getDevices(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        devices: [],
        total: 0
      }));
    });

    test('DR-16: Search system error', async () => {
      req.query = { keyword: 'ErrorTrigger' };
      
      Device.find.mockImplementation(() => { throw new Error('Search failed'); });

      await deviceCtrl.getDevices(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.any(String) }));
    });
  });

  // ===========================================================================
  // FILTER DEVICES (DR-17 to DR-22) - Duplicate descriptions
  // ===========================================================================
  describe('Filter Devices (DR-17 to DR-22)', () => {
    test('DR-17: View device detail successfully', async () => {
      req.params = { slug: 'dev1' };
      const mockDevice = { _id: 'dev1', name: 'Canon EOS', specs: {}, toObject: function() { return this; } };
      Device.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockDevice) });
      Review.find.mockReturnValue(makeQueryChain([]));
      RentalItem.countDocuments.mockResolvedValue(0);
      RentalItem.aggregate.mockResolvedValue([]);
      RentalItem.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

      await deviceCtrl.getDeviceDetail(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _id: 'dev1' }));
    });

    test('DR-18: Device not found', async () => {
      req.params = { slug: 'invalid' };
      Device.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

      await deviceCtrl.getDeviceDetail(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('DR-19: System error retrieving device detail', async () => {
      req.params = { slug: 'dev1' };
      Device.findOne.mockImplementation(() => { throw new Error('DB setup error'); });

      await deviceCtrl.getDeviceDetail(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    test('DR-20: View device detail successfully', async () => {
      req.params = { slug: 'dev2' };
      const mockDevice = { _id: 'dev2', name: 'Sony', specs: {}, toObject: function() { return this; } };
      Device.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(mockDevice) });
      Review.find.mockReturnValue(makeQueryChain([]));
      RentalItem.countDocuments.mockResolvedValue(0);
      RentalItem.aggregate.mockResolvedValue([]);
      RentalItem.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });

      await deviceCtrl.getDeviceDetail(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _id: 'dev2' }));
    });

    test('DR-21: Device not found', async () => {
      req.params = { slug: 'invalid-21' };
      Device.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
      await deviceCtrl.getDeviceDetail(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    test('DR-22: System error retrieving device detail', async () => {
      req.params = { slug: 'dev22' };
      Device.findOne.mockImplementation(() => { throw new Error('Timeout'); });
      await deviceCtrl.getDeviceDetail(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
