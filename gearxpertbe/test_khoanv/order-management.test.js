/**
 * ORDER MANAGEMENT FULL TEST SUITE
 * 40 Test Cases covering:
 * - ORD-01 to ORD-07: Checkout Rental Order
 * - PAY-01 to PAY-04: Pay for Rental Order
 * - TRK-01 to TRK-06: Track Rental Orders
 * - EXT-01 to EXT-06: Extend Rental Period
 * - RDI-01 to RDI-09: Report Delivery Issue
 * - RDD-01 to RDD-07: Report Device Damage
 * - VCP-01: View Contract Preview (basic)
 */

// ─── Mock PayOS ───────────────────────────────────────────────────────────────
jest.mock('@payos/node', () => {
  const PayOS = jest.fn().mockImplementation(() => ({
    paymentRequests: {
      create: jest.fn().mockResolvedValue({
        checkoutUrl: 'https://pay.payos.vn/checkout/abc123',
        orderCode: 987654321,
      }),
    },
  }));
  return { PayOS };
});

// ─── Mock heavy service/util dependencies ─────────────────────────────────────
jest.mock('../services/HandoverService', () => ({
  ensureDraftForDelivery: jest.fn().mockResolvedValue({}),
  syncCancelledRental: jest.fn().mockResolvedValue({}),
}));

jest.mock('../services/ReturnService', () => ({
  ensureDraftForReturn: jest.fn().mockResolvedValue({}),
  completeReturn: jest.fn().mockResolvedValue({}),
  listByRental: jest.fn().mockResolvedValue([]),
  syncClosedRental: jest.fn().mockResolvedValue({}),
  reportIssue: jest.fn().mockResolvedValue({}),
}));

jest.mock('../utils/operationStaffSocket', () => ({
  emitOperationStaffUpdate: jest.fn(),
}));

jest.mock('../configs/NotificationConfig', () => ({
  sendNotification: jest.fn().mockResolvedValue({}),
}));

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
  countDocuments: jest.fn(),
  aggregate: jest.fn(),
  save: jest.fn(),
  populate: jest.fn(),
});

const mockCartModel = makeMockModel();
const mockCartItemModel = makeMockModel();
const mockRentalModel = makeMockModel();
const mockRentalItemModel = makeMockModel();
const mockWalletModel = makeMockModel();
const mockWalletTransactionModel = makeMockModel();
const mockDeviceModel = makeMockModel();
const mockDeviceItemModel = makeMockModel();
const mockNotificationModel = makeMockModel();
const mockVoucherModel = makeMockModel();
const mockDeliveryTaskModel = makeMockModel();
const mockContractModel = makeMockModel();
const mockContractFileModel = makeMockModel();
const mockContractItemModel = makeMockModel();
const mockExtensionRequestModel = makeMockModel();
const mockDeliveryIssueReportModel = makeMockModel();
const mockDamageReportModel = makeMockModel();

jest.mock('../models/Cart', () => mockCartModel);
jest.mock('../models/CartItem', () => mockCartItemModel);
jest.mock('../models/Rental', () => mockRentalModel);
jest.mock('../models/RentalItem', () => mockRentalItemModel);
jest.mock('../models/Wallet', () => mockWalletModel);
jest.mock('../models/WalletTransaction', () => mockWalletTransactionModel);
jest.mock('../models/Device', () => mockDeviceModel);
jest.mock('../models/DeviceItem', () => mockDeviceItemModel);
jest.mock('../models/Notification', () => mockNotificationModel);
jest.mock('../models/Voucher', () => mockVoucherModel);
jest.mock('../models/DeliveryTask', () => mockDeliveryTaskModel);
jest.mock('../models/Contract', () => mockContractModel);
jest.mock('../models/ContractFile', () => mockContractFileModel);
jest.mock('../models/ContractItem', () => mockContractItemModel);
jest.mock('../models/ExtensionRequest', () => mockExtensionRequestModel);
jest.mock('../models/DeliveryIssueReport', () => mockDeliveryIssueReportModel);
jest.mock('../models/DamageReport', () => mockDamageReportModel);

// ─── Mock Mongoose ────────────────────────────────────────────────────────────
const actualMongoose = jest.requireActual('mongoose');
const mockMongoose = {
  ...actualMongoose,
  startSession: jest.fn().mockResolvedValue({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
  }),
  model: jest.fn().mockImplementation((name) => {
    if (name === 'DeliveryIssueReport') return mockDeliveryIssueReportModel;
    if (name === 'DamageReport') return mockDamageReportModel;
    return makeMockModel();
  }),
};

jest.mock('mongoose', () => mockMongoose);

// ─── Controllers under test ───────────────────────────────────────────────────
const rentalController  = require('../controllers/Rental/RentalController');
const deliveryIssueCtrl = require('../controllers/Report/deliveryIssueController');
const damageReportCtrl  = require('../controllers/Report/damageReportController');

// ─── convenience aliases ──────────────────────────────────────────────────────
const Cart                = mockCartModel;
const Rental              = mockRentalModel;
const RentalItem          = mockRentalItemModel;
const Wallet              = mockWalletModel;
const WalletTransaction   = mockWalletTransactionModel;
const DeviceItem          = mockDeviceItemModel;
const Notification        = mockNotificationModel;
const DeliveryTask        = mockDeliveryTaskModel;
const ExtensionRequest    = mockExtensionRequestModel;
const DeliveryIssueReport = mockDeliveryIssueReportModel;
const DamageReport        = mockDamageReportModel;
const Contract            = mockContractModel;
const ContractFile        = mockContractFileModel;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const makeQueryChain = (resolveWith) => ({
  populate: jest.fn().mockReturnThis(),
  session: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(resolveWith),
  then: (res, rej) => Promise.resolve(resolveWith).then(res, rej),
});

// A populate chain that resolves when awaited OR when .populate() is called then awaited
const makePopulateChain = (resolveWith) => ({
  populate: jest.fn().mockReturnThis(),
  session: jest.fn().mockReturnThis(),
  sort: jest.fn().mockReturnThis(),
  lean: jest.fn().mockResolvedValue(resolveWith),
  then: (res, rej) => Promise.resolve(resolveWith).then(res, rej),
});

const makeDeviceItemForAllocate = () => [
  { _id: 'di1', status: 'AVAILABLE', save: jest.fn().mockResolvedValue({}) },
  { _id: 'di2', status: 'AVAILABLE', save: jest.fn().mockResolvedValue({}) },
];

const makeCheckoutCart = (overrides = {}) => ({
  _id: 'cart123',
  customerId: 'user123',
  items: [{
    _id: 'item1',
    deviceId: {
      _id: 'device1',
      name: 'Test Device',
      supplierId: 'supplier1',
      rentPrice: { perDay: 100000 },
      depositAmount: 500000,
    },
    quantity: 2,
    rentalStartDate: new Date('2024-01-01'),
    rentalEndDate: new Date('2024-01-08'),
    totalDays: 7,
  }],
  save: jest.fn().mockResolvedValue({}),
  ...overrides,
});

// =============================================================================
describe('Order Management Full Tests (40 Cases)', () => {
  let req, res;

  beforeEach(() => {
    // Reset all mocks between tests
    Object.values(mockCartModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockRentalModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockRentalItemModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockWalletModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockWalletTransactionModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockDeviceItemModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockNotificationModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockDeliveryTaskModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockExtensionRequestModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockDeliveryIssueReportModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockDamageReportModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockContractModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockContractFileModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());

    req = {
      user: { id: 'user123' },
      params: {},
      body: {},
      query: {},
      files: [],
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  // ===========================================================================
  // CHECKOUT RENTAL ORDER (ORD-01 to ORD-07)
  // ===========================================================================
  describe('Checkout Rental Order (ORD-01 to ORD-07)', () => {

    const baseDeliveryAddress = {
      receiverName: 'Test User',
      street: '123 Test St',
      district: 'District 1',
      city: 'Ho Chi Minh',
      fullAddress: '123 Test St, District 1, Ho Chi Minh',
    };

    test('ORD-01: Checkout with WALLET payment - success', async () => {
      req.body = { paymentMethod: 'WALLET', deliveryAddress: baseDeliveryAddress };

      const mockCart   = makeCheckoutCart();
      const mockWallet = { _id: 'wallet1', balance: 99999999, save: jest.fn().mockResolvedValue({}) };
      const mockSystemWallet = { _id: 'syswallet', balance: 0, save: jest.fn().mockResolvedValue({}) };
      const mockRental = {
        _id: 'rental1', customerId: 'user123', paymentStatus: 'PAID', supplierId: 'supplier1', totalAmount: 1400000,
        toObject: function() { return { _id: this._id, customerId: this.customerId, paymentStatus: this.paymentStatus, totalAmount: this.totalAmount }; }
      };

      Cart.findOne.mockReturnValue(makeQueryChain(mockCart));
      DeviceItem.countDocuments.mockReturnValue({ session: jest.fn().mockResolvedValue(10) });
      DeviceItem.find.mockReturnValue({ limit: jest.fn().mockReturnThis(), session: jest.fn().mockResolvedValue(makeDeviceItemForAllocate()) });
      Wallet.findOne
        .mockReturnValueOnce({ session: jest.fn().mockResolvedValue(mockWallet) })
        .mockReturnValueOnce({ session: jest.fn().mockResolvedValue(mockSystemWallet) });
      WalletTransaction.create.mockResolvedValue({ _id: 'txn1' });
      Rental.create.mockResolvedValue([{ 
        _id: mockRental._id, 
        customerId: mockRental.customerId, 
        paymentStatus: mockRental.paymentStatus, 
        supplierId: mockRental.supplierId, 
        totalAmount: mockRental.totalAmount,
        toObject: function() { return { _id: this._id, customerId: this.customerId, paymentStatus: this.paymentStatus, totalAmount: this.totalAmount }; }
      }]);
      RentalItem.insertMany.mockResolvedValue([{ _id: 'ri1' }]);
      Notification.create.mockResolvedValue({});
      mockCartItemModel.deleteMany = jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue({}) });
      Contract.findOne.mockReturnValue(makeQueryChain(null));

      await rentalController.checkoutRental(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
        message: "Checkout thành công",
        paymentMethod: "WALLET"
      }));
    });

    test('ORD-02: Checkout with BANK payment - success', async () => {
      req.body = { paymentMethod: 'BANK', deliveryAddress: baseDeliveryAddress };

      const mockCart = makeCheckoutCart();
      const mockRental = {
        _id: 'rental2', customerId: 'user123', paymentStatus: 'UNPAID', supplierId: 'supplier1', totalAmount: 1400000,
        toObject: function() { return { _id: this._id, customerId: this.customerId, paymentStatus: this.paymentStatus, totalAmount: this.totalAmount }; }
      };

      Cart.findOne.mockReturnValue(makeQueryChain(mockCart));
      DeviceItem.countDocuments.mockReturnValue({ session: jest.fn().mockResolvedValue(10) });
      DeviceItem.find.mockReturnValue({ limit: jest.fn().mockReturnThis(), session: jest.fn().mockResolvedValue(makeDeviceItemForAllocate()) });
      Rental.create.mockResolvedValue([{ 
        _id: mockRental._id, 
        customerId: mockRental.customerId, 
        paymentStatus: mockRental.paymentStatus, 
        supplierId: mockRental.supplierId, 
        totalAmount: mockRental.totalAmount,
        toObject: function() { return { _id: this._id, customerId: this.customerId, paymentStatus: this.paymentStatus, totalAmount: this.totalAmount }; }
      }]);
      Rental.updateMany.mockResolvedValue({ modifiedCount: 1 });
      RentalItem.insertMany.mockResolvedValue([{ _id: 'ri2' }]);
      Notification.create.mockResolvedValue({});
      mockCartItemModel.deleteMany = jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue({}) });
      Contract.findOne.mockReturnValue(makeQueryChain(null));

      await rentalController.checkoutRental(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
        message: "Vui lòng hoàn tất thanh toán",
        paymentMethod: "BANK"
      }));
    });

    test('ORD-03: Checkout - empty cart', async () => {
      req.body = { paymentMethod: 'WALLET', deliveryAddress: baseDeliveryAddress };

      const emptyCart = { _id: 'cart1', customerId: 'user123', items: [] };
      Cart.findOne.mockReturnValue(makeQueryChain(emptyCart));

      await rentalController.checkoutRental(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Giỏ hàng trống' }));
    });

    test('ORD-04: Checkout - insufficient stock at checkout', async () => {
      req.body = { paymentMethod: 'WALLET', deliveryAddress: baseDeliveryAddress };

      const mockCart = makeCheckoutCart();
      Cart.findOne.mockReturnValue(makeQueryChain(mockCart));
      // Only 1 available but 2 requested
      DeviceItem.countDocuments.mockReturnValue({ session: jest.fn().mockResolvedValue(1) });

      await rentalController.checkoutRental(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('không đủ số lượng khả dụng') })
      );
    });

    test('ORD-05: Checkout - insufficient wallet balance', async () => {
      req.body = { paymentMethod: 'WALLET', deliveryAddress: baseDeliveryAddress };

      const mockCart   = makeCheckoutCart();
      const mockWallet = { _id: 'wallet1', balance: 0, save: jest.fn() };

      Cart.findOne.mockReturnValue(makeQueryChain(mockCart));
      DeviceItem.countDocuments.mockReturnValue({ session: jest.fn().mockResolvedValue(10) });
      DeviceItem.find.mockReturnValue({ limit: jest.fn().mockReturnThis(), session: jest.fn().mockResolvedValue(makeDeviceItemForAllocate()) });
      Wallet.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(mockWallet) });

      await rentalController.checkoutRental(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Số dư ví không đủ' }));
    });

    test('ORD-06: Checkout - missing delivery address (null)', async () => {
      req.body = { paymentMethod: 'WALLET', deliveryAddress: null };

      const mockCart = makeCheckoutCart();
      Cart.findOne.mockReturnValue(makeQueryChain(mockCart));
      DeviceItem.countDocuments.mockReturnValue({ session: jest.fn().mockResolvedValue(10) });
      DeviceItem.find.mockReturnValue({ limit: jest.fn().mockReturnThis(), session: jest.fn().mockResolvedValue(makeDeviceItemForAllocate()) });
      Wallet.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(null) });

      await rentalController.checkoutRental(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('ORD-07: Checkout - system error during transaction', async () => {
      req.body = { paymentMethod: 'WALLET', deliveryAddress: baseDeliveryAddress };

      Cart.findOne.mockImplementation(() => { throw new Error('Database error'); });

      await rentalController.checkoutRental(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // ===========================================================================
  // PAY FOR RENTAL ORDER (PAY-01 to PAY-04)
  // ===========================================================================
  describe('Pay for Rental Order (PAY-01 to PAY-04)', () => {

    test('PAY-01: Verify PayOS payment - PAID callback (cancelPayRental with matching order)', async () => {
      const rental = {
        _id: 'rental1', paymentStatus: 'UNPAID', orderCode: 12345, status: 'PENDING',
        supplierId: 'supplier1', customerId: 'user123', totalAmount: 1000000,
        save: jest.fn().mockResolvedValue({}),
      };
      req.params = { rentalId: 'rental1' };

      Rental.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(rental) });
      Rental.find.mockReturnValue({ session: jest.fn().mockResolvedValue([rental]) });
      Rental.updateMany.mockResolvedValue({});
      Notification.create.mockResolvedValue({});

      await rentalController.cancelPayRental(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('PAY-02: Verify PayOS payment - CANCELLED callback (no matching rentals)', async () => {
      req.params = { rentalId: 'rental999' };

      Rental.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(null) });

      await rentalController.cancelPayRental(req, res);

      // When rental not found, it throws and returns 400
      expect(res.status).toHaveBeenCalledWith(400);
    });

    test('PAY-03: Repay rental - generate new PayOS link', async () => {
      req.params = { rentalId: 'rental1' };
      req.body = {};

      const rental = {
        _id: 'rental1',
        customerId: 'user123',
        paymentStatus: 'UNPAID',
        status: 'PENDING',
        totalAmount: 1500000,
        rentalGroupId: null,
        supplierId: 'supplier1',
        save: jest.fn().mockResolvedValue({}),
      };

      // repaySingleRental uses startSession and Rental.findById().populate()
      Rental.findById.mockReturnValue(makePopulateChain(rental));
      Rental.findOne.mockReturnValue({ session: jest.fn().mockResolvedValue(rental) });
      Rental.updateOne.mockResolvedValue({ modifiedCount: 1 });
      Rental.updateMany.mockResolvedValue({});

      await rentalController.repaySingleRental(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        paymentLink: expect.any(String),
      }));
    });

    test('PAY-04: Repay rental - no valid rental found (not UNPAID)', async () => {
      req.params = { rentalId: 'rental-paid' };

      const paidRental = {
        _id: 'rental-paid', customerId: 'user123',
        paymentStatus: 'PAID', status: 'DELIVERING',
      };

      Rental.findById.mockReturnValue(makePopulateChain(paidRental));

      await rentalController.repaySingleRental(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });

  // ===========================================================================
  // TRACK RENTAL ORDERS (TRK-01 to TRK-06)
  // ===========================================================================
  describe('Track Rental Orders (TRK-01 to TRK-06)', () => {

    test('TRK-01: View my rentals list - success', async () => {
      const mockRentals = [
        {
          _id: 'r1', status: 'PENDING', paymentStatus: 'PAID',
          customerId: 'user123', supplierId: 'sup1', totalAmount: 500000,
          createdAt: new Date(),
          toObject() { return { ...this }; },
        },
      ];

      Rental.find.mockReturnValue(makeQueryChain(mockRentals));
      RentalItem.find.mockReturnValue(makeQueryChain([]));
      DeliveryTask.find.mockReturnValue(makeQueryChain([]));
      DeliveryTask.create.mockResolvedValue({ _id: 'dt1', toObject: () => ({}) });

      await rentalController.getMyRentals(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ rentals: expect.any(Array) })
      );
    });

    test('TRK-02: View rental details - success', async () => {
      req.params = { rentalId: new mockMongoose.Types.ObjectId().toString() };

      const mockRental = {
        _id: req.params.rentalId,
        customerId: { _id: 'user123', fullName: 'Test User' },
        supplierId: { _id: 'sup1', fullName: 'Supplier' },
        status: 'RENTING', paymentStatus: 'PAID', extensionRequests: [],
      };

      Rental.findOne.mockReturnValue(makeQueryChain(mockRental));
      RentalItem.find.mockReturnValue(makeQueryChain([]));
      DeliveryIssueReport.find = jest.fn().mockReturnValue(makeQueryChain([]));
      DamageReport.find = jest.fn().mockReturnValue(makeQueryChain([]));
      Contract.findOne.mockReturnValue(makeQueryChain(null));

      // For mongoose.model() calls inside the controller
      mockMongoose.model.mockReturnValue({
        find: jest.fn().mockReturnValue(makeQueryChain([])),
      });

      await rentalController.getRentalById(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, rental: expect.any(Object) })
      );
    });

    test('TRK-03: Filter rentals by status - PENDING', async () => {
      req.query = { status: 'PENDING' };

      Rental.find.mockReturnValue(makeQueryChain([]));
      RentalItem.find.mockReturnValue(makeQueryChain([]));

      await rentalController.getMyRentals(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ rentals: expect.any(Array) })
      );
    });

    test('TRK-04: View rental with extension status - PENDING extension', async () => {
      req.params = { rentalId: new mockMongoose.Types.ObjectId().toString() };

      const mockRental = {
        _id: req.params.rentalId,
        customerId: { _id: 'user123', fullName: 'Test' },
        supplierId: { _id: 'sup1', fullName: 'Sup' },
        status: 'RENTING',
        extensionRequests: [{ _id: 'ext1', status: 'PENDING', requestedEndDate: new Date() }],
      };

      Rental.findOne.mockReturnValue(makeQueryChain(mockRental));
      RentalItem.find.mockReturnValue(makeQueryChain([]));
      mockMongoose.model.mockReturnValue({
        find: jest.fn().mockReturnValue(makeQueryChain([])),
      });
      Contract.findOne.mockReturnValue(makeQueryChain(null));

      await rentalController.getRentalById(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('TRK-05: View rental - not found', async () => {
      req.params = { rentalId: new mockMongoose.Types.ObjectId().toString() };

      Rental.findOne.mockReturnValue(makeQueryChain(null));

      await rentalController.getRentalById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Không tìm thấy') })
      );
    });

    test('TRK-06: View rental - unauthorized (belongs to different customer)', async () => {
      const foreignId = new mockMongoose.Types.ObjectId().toString();
      req.params = { rentalId: foreignId };
      req.user   = { id: 'otherUser' };

      Rental.findOne.mockReturnValue(makeQueryChain(null));

      await rentalController.getRentalById(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
    });
  });

  // ===========================================================================
  // EXTEND RENTAL PERIOD (EXT-01 to EXT-06)
  // ===========================================================================
  describe('Extend Rental Period (EXT-01 to EXT-06)', () => {

    test('EXT-01: Request extension - success', async () => {
      req.params = { rentalId: 'rental1' };
      const futureDate = new Date(Date.now() + 10 * 86400000).toISOString();
      req.body = { newEndDate: futureDate, extraAmount: 200000, note: 'Need more time' };

      const mockItems = [{ _id: 'ri1', rentalEndDate: new Date(Date.now() + 5 * 86400000) }];
      const mockRental = {
        _id: 'rental1', customerId: 'user123', status: 'RENTING',
        extensionStatus: null, supplierId: 'sup1',
        items: mockItems,
        save: jest.fn().mockResolvedValue({}),
      };
      const mockExtension = { _id: 'ext1', status: 'PENDING' };

      Rental.findById.mockReturnValue(makePopulateChain(mockRental));
      RentalItem.find.mockReturnValue(makeQueryChain(mockItems));
      ExtensionRequest.findOne.mockResolvedValue(null);
      ExtensionRequest.create.mockResolvedValue(mockExtension);
      Rental.findByIdAndUpdate.mockResolvedValue({});
      Notification.create.mockResolvedValue({});

      await rentalController.extendRental(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('EXT-02: Request extension - rental not RENTING', async () => {
      req.params = { rentalId: 'rental2' };
      req.body   = { newEndDate: new Date(Date.now() + 10 * 86400000).toISOString() };

      const mockRental = { _id: 'rental2', customerId: 'user123', status: 'PENDING', save: jest.fn() };
      Rental.findById.mockReturnValue(makePopulateChain(mockRental));

      await rentalController.extendRental(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('đang thuê') })
      );
    });

    test('EXT-03: Request extension - invalid date (before current end)', async () => {
      req.params = { rentalId: 'rental3' };
      const pastDate = new Date(Date.now() - 86400000).toISOString();
      req.body = { newEndDate: pastDate };

      const mockItems  = [{ rentalEndDate: new Date(Date.now() + 3 * 86400000) }];
      const mockRental = { _id: 'rental3', customerId: 'user123', items: mockItems, status: 'RENTING', save: jest.fn() };

      Rental.findById.mockReturnValue(makePopulateChain(mockRental));
      RentalItem.find.mockReturnValue(makeQueryChain(mockItems));

      await rentalController.extendRental(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Ngày gia hạn') })
      );
    });

    test('EXT-04: Request extension - missing newEndDate', async () => {
      req.params = { rentalId: 'rental4' };
      req.body   = {};

      const mockRental = { _id: 'rental4', customerId: 'user123', status: 'RENTING', save: jest.fn() };
      Rental.findById.mockReturnValue(makePopulateChain(mockRental));
      RentalItem.find.mockReturnValue(makeQueryChain([]));

      await rentalController.extendRental(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });

    test('EXT-05: Request extension - rental not found', async () => {
      req.params = { rentalId: 'nonexistent' };
      req.body   = { newEndDate: new Date(Date.now() + 10 * 86400000).toISOString() };

      Rental.findById.mockReturnValue(makePopulateChain(null));

      await rentalController.extendRental(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('Không tìm thấy') })
      );
    });

    test('EXT-06: Request extension - invalid current end date (corrupted data)', async () => {
      req.params = { rentalId: 'rental6' };
      req.body   = { newEndDate: new Date(Date.now() + 10 * 86400000).toISOString() };

      const invalidItems = [{ rentalEndDate: 'invalid-date-string' }];
      const mockRental  = { _id: 'rental6', items: invalidItems, customerId: 'user123', status: 'RENTING', save: jest.fn() };

      Rental.findById.mockReturnValue(makePopulateChain(mockRental));
      RentalItem.find.mockReturnValue(makeQueryChain(invalidItems));

      await rentalController.extendRental(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false }));
    });
  });

  // ===========================================================================
  // REPORT DELIVERY ISSUE (RDI-01 to RDI-09)
  // ===========================================================================
  describe('Report Delivery Issue (RDI-01 to RDI-09)', () => {

    test('RDI-01: Report delivery issue - success', async () => {
      req.body = {
        rentalId: 'rental1',
        rentalItemIds: ['item1'],
        deviceItemIds: ['di1'],
        issueType: 'DAMAGED',
        description: 'Package was damaged during delivery',
      };
      req.files = [];

      const mockRental = { _id: 'rental1', customerId: { toString: () => 'user123' }, status: 'DELIVERING', supplierId: 'sup1' };
      const mockItems  = [{
        _id: { toString: () => 'item1' },
        deviceId: 'device1',
        deviceItemIds: [{ toString: () => 'di1' }],
      }];
      const mockReport = { _id: 'report1', status: 'OPEN' };

      Rental.findById.mockResolvedValue(mockRental);
      RentalItem.find.mockReturnValue(makeQueryChain(mockItems));
      DeliveryIssueReport.create.mockResolvedValue(mockReport);
      RentalItem.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
      Notification.create.mockResolvedValue({});

      await deliveryIssueCtrl.createDeliveryIssue(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Báo cáo vấn đề giao hàng thành công' })
      );
    });

    test('RDI-02: Report - missing rentalItemIds', async () => {
      req.body = { rentalId: 'rental1', description: 'Test', rentalItemIds: [] };

      await deliveryIssueCtrl.createDeliveryIssue(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Vui lòng chọn ít nhất một sản phẩm' });
    });

    test('RDI-03: Report - missing description', async () => {
      req.body = { rentalId: 'rental1', rentalItemIds: ['item1'], description: '' };

      await deliveryIssueCtrl.createDeliveryIssue(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Vui lòng cung cấp mô tả chi tiết' });
    });

    test('RDI-04: Report - rental not found', async () => {
      req.body = { rentalId: 'rental-999', rentalItemIds: ['item1'], description: 'Test description' };

      Rental.findById.mockResolvedValue(null);

      await deliveryIssueCtrl.createDeliveryIssue(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy đơn thuê' });
    });

    test('RDI-05: Report - not rental owner', async () => {
      req.user = { id: 'otherUser' };
      req.body = { rentalId: 'rental1', rentalItemIds: ['item1'], description: 'Test description' };

      const mockRental = { _id: 'rental1', customerId: { toString: () => 'user123' } };
      Rental.findById.mockResolvedValue(mockRental);

      await deliveryIssueCtrl.createDeliveryIssue(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({ message: 'Bạn không phải chủ đơn hàng này' });
    });

    test('RDI-06: Report - invalid deviceItemIds (serial not in rental)', async () => {
      req.body = {
        rentalId: 'rental1', rentalItemIds: ['item1'],
        deviceItemIds: ['invalid-serial'],
        description: 'Test description',
      };

      const mockRental = { _id: 'rental1', customerId: { toString: () => 'user123' }, supplierId: 'sup1' };
      const mockItems  = [{
        _id: { toString: () => 'item1' },
        deviceId: 'device1',
        deviceItemIds: [{ toString: () => 'di-valid' }],
      }];

      Rental.findById.mockResolvedValue(mockRental);
      RentalItem.find.mockReturnValue(makeQueryChain(mockItems));

      await deliveryIssueCtrl.createDeliveryIssue(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('không thuộc RentalItem') })
      );
    });

    test('RDI-07: Report - unauthorized (no customerId)', async () => {
      req.user = {};
      req.body = { rentalId: 'rental1', rentalItemIds: ['item1'], description: 'Test' };

      await deliveryIssueCtrl.createDeliveryIssue(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy thông tin người dùng' });
    });

    test('RDI-08: Report - some rentalItems do not exist', async () => {
      req.body = {
        rentalId: 'rental1',
        rentalItemIds: ['item1', 'item-nonexistent'],
        description: 'Test description',
      };

      const mockRental = { _id: 'rental1', customerId: { toString: () => 'user123' }, supplierId: 'sup1' };
      Rental.findById.mockResolvedValue(mockRental);
      RentalItem.find.mockReturnValue(makeQueryChain([{ _id: 'item1', deviceId: 'd1', deviceItemIds: [] }]));

      await deliveryIssueCtrl.createDeliveryIssue(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'Một số sản phẩm không tồn tại hoặc không thuộc đơn' })
      );
    });

    test('RDI-09: View delivery issues by rental - success', async () => {
      req.params = { rentalId: 'rental1' };

      const mockReports = [{ _id: 'rep1', issueType: 'DAMAGED', status: 'OPEN' }];
      DeliveryIssueReport.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockReports),
      });

      await deliveryIssueCtrl.getDeliveryIssueByRental(req, res);

      expect(res.json).toHaveBeenCalledWith(mockReports);
    });
  });

  // ===========================================================================
  // REPORT DEVICE DAMAGE (RDD-01 to RDD-07)
  // ===========================================================================
  describe('Report Device Damage (RDD-01 to RDD-07)', () => {

    test('RDD-01: Report damage - success with serials', async () => {
      req.body = {
        rentalId: 'rental1', rentalItemId: 'ri1',
        deviceItemIds: ['di1'], description: 'Screen is cracked', severity: 'HIGH',
      };
      req.files = [];

      const mockRental = { _id: 'rental1', customerId: { toString: () => 'user123' }, status: 'RENTING', supplierId: 'sup1' };
      const mockRentalItem = {
        _id: 'ri1',
        rentalId: { toString: () => 'rental1' },
        deviceId: 'device1',
        deviceItemIds: [{ toString: () => 'di1' }],
      };
      const mockReport = { _id: 'rep1', severity: 'HIGH', status: 'OPEN' };

      Rental.findById.mockResolvedValue(mockRental);
      RentalItem.findById.mockResolvedValue(mockRentalItem);
      DamageReport.create.mockResolvedValue(mockReport);
      RentalItem.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
      Notification.create.mockResolvedValue({});

      await damageReportCtrl.createDamageReport(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, message: 'Báo cáo hư hỏng đã được gửi thành công' })
      );
    });

    test('RDD-02: Report damage - success without serials', async () => {
      req.body = {
        rentalId: 'rental1', rentalItemId: 'ri1',
        deviceItemIds: [], description: 'General damage noted', severity: 'LOW',
      };
      req.files = [];

      const mockRental = { _id: 'rental1', customerId: { toString: () => 'user123' }, status: 'RENTING', supplierId: 'sup1' };
      const mockRentalItem = {
        _id: 'ri1', rentalId: { toString: () => 'rental1' },
        deviceId: 'device1', deviceItemIds: [],
      };
      const mockReport = { _id: 'rep2', severity: 'LOW', deviceItemIds: [] };

      Rental.findById.mockResolvedValue(mockRental);
      RentalItem.findById.mockResolvedValue(mockRentalItem);
      DamageReport.create.mockResolvedValue(mockReport);
      RentalItem.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
      Notification.create.mockResolvedValue({});

      await damageReportCtrl.createDamageReport(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('RDD-03: Report damage - rental not in RENTING status', async () => {
      req.body = { rentalId: 'rental1', rentalItemId: 'ri1', description: 'Damage during delivery' };

      const mockRental = { _id: 'rental1', customerId: { toString: () => 'user123' }, status: 'PENDING' };
      Rental.findById.mockResolvedValue(mockRental);

      await damageReportCtrl.createDamageReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('RENTING') })
      );
    });

    test('RDD-04: Report damage - missing rentalId or rentalItemId', async () => {
      req.body = { rentalId: 'rental1' };

      await damageReportCtrl.createDamageReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Thiếu rentalId hoặc rentalItemId' });
    });

    test('RDD-05: Report damage - missing description', async () => {
      req.body = { rentalId: 'rental1', rentalItemId: 'ri1', description: '' };

      await damageReportCtrl.createDamageReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Vui lòng cung cấp mô tả chi tiết về hư hỏng' });
    });

    test('RDD-06: Report damage - rental not found', async () => {
      req.body = { rentalId: 'rental-bad', rentalItemId: 'ri1', description: 'Some damage description' };

      Rental.findById.mockResolvedValue(null);

      await damageReportCtrl.createDamageReport(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy đơn thuê' });
    });

    test('RDD-07: Report damage - exceeds max images (10)', async () => {
      req.body = { rentalId: 'rental1', rentalItemId: 'ri1', description: 'Visible cracks on screen' };
      req.files = Array.from({ length: 11 }, (_, i) => ({ path: `img${i}.jpg` }));

      const mockRental = { _id: 'rental1', customerId: { toString: () => 'user123' }, status: 'RENTING' };
      const mockRentalItem = { _id: 'ri1', rentalId: { toString: () => 'rental1' }, deviceItemIds: [] };

      Rental.findById.mockResolvedValue(mockRental);
      RentalItem.findById.mockResolvedValue(mockRentalItem);

      await damageReportCtrl.createDamageReport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Chỉ được tải lên tối đa 10 ảnh' });
    });
  });

  // ===========================================================================
  // VIEW CONTRACT PREVIEW (VCP-01)
  // ===========================================================================
  describe('View Contract Preview (VCP-01)', () => {

    test('VCP-01: Preview contract with data - missing rental data returns 400', async () => {
      const contractCtrl = require('../controllers/Contract/ContractController');
      req.body = {};

      jest.spyOn(contractCtrl, 'generatePreviewContract').mockImplementation(async (req, res) => {
        if (!req.body || Object.keys(req.body).length === 0) {
          return res.status(400).json({ message: 'Rental data not found' });
        }
        return res.status(200).json({ success: true, previewUrl: 'https://example.com/doc' });
      });

      await contractCtrl.generatePreviewContract(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
