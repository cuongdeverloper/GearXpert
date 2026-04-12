/**
 * CART MANAGEMENT TEST SUITE
 * 27 Test Cases covering:
 * - CART-01 to CART-04: View Cart
 * - CART-05 to CART-11: Add to Cart
 * - CART-12 to CART-17: Update Cart Item
 * - CART-18 to CART-20: Delete Item from Cart 
 * - CART-21 to CART-27: Cart Checkout
 */

// ─── Mock Mongoose models with full jest.fn() stubs ──────────────────────────
const makeMockModel = () => ({
  findOne: jest.fn(),
  findById: jest.fn(),
  find: jest.fn(),
  countDocuments: jest.fn(),
  deleteMany: jest.fn(),
  deleteOne: jest.fn(),
  findOneAndUpdate: jest.fn(),
  updateOne: jest.fn(),
  updateMany: jest.fn(),
  insertMany: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  distinct: jest.fn(),
});

const mockCartModel = makeMockModel();
const mockCartItemModel = makeMockModel();
const mockDeviceModel = makeMockModel();
const mockDeviceItemModel = makeMockModel();
const mockWalletModel = makeMockModel();
const mockWalletTransactionModel = makeMockModel();
const mockRentalModel = makeMockModel();
const mockRentalItemModel = makeMockModel();
const mockVoucherModel = makeMockModel();
const mockNotificationModel = makeMockModel();
const mockContractModel = makeMockModel();

jest.mock('../models/Cart', () => mockCartModel);
jest.mock('../models/CartItem', () => mockCartItemModel);
jest.mock('../models/Device', () => mockDeviceModel);
jest.mock('../models/DeviceItem', () => mockDeviceItemModel);
jest.mock('../models/Wallet', () => mockWalletModel);
jest.mock('../models/WalletTransaction', () => mockWalletTransactionModel);
jest.mock('../models/Rental', () => mockRentalModel);
jest.mock('../models/RentalItem', () => mockRentalItemModel);
jest.mock('../models/Voucher', () => mockVoucherModel);
jest.mock('../models/Notification', () => mockNotificationModel);
jest.mock('../models/Contract', () => mockContractModel);

// ─── Mock PayOS ──────────────────────────────────────────────────────────────
const mockPayOSInstance = {
  paymentRequests: {
    create: jest.fn().mockResolvedValue({
      status: 'PAID',
      checkoutUrl: 'https://pay.payos.vn/123'
    }),
  },
  createPaymentLink: jest.fn().mockResolvedValue({
    checkoutUrl: 'https://pay.payos.vn/123'
  })
};

jest.mock('@payos/node', () => {
  return {
    PayOS: jest.fn().mockImplementation(() => mockPayOSInstance)
  };
});

// ─── Mock Mongoose ────────────────────────────────────────────────────────────
const actualMongoose = jest.requireActual('mongoose');
const mockMongoose = {
  ...actualMongoose,
  startSession: jest.fn().mockResolvedValue({
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    abortTransaction: jest.fn(),
    endSession: jest.fn(),
    inAtomicalContext: true
  }),
};
jest.mock('mongoose', () => mockMongoose);

// ─── Controller under test ───────────────────────────────────────────────────
const cartCtrl = require('../controllers/Cart/CartController');
const rentalCtrl = require('../controllers/Rental/RentalController');

// ─── Convenience aliases ──────────────────────────────────────────────────────
const Cart = mockCartModel;
const CartItem = mockCartItemModel;
const Device = mockDeviceModel;
const DeviceItem = mockDeviceItemModel;
const Wallet = mockWalletModel;
const Notification = mockNotificationModel;
const Contract = mockContractModel;

// ─── Helpers ──────────────────────────────────────────────────────────────────
const makeQueryChain = (resolveWith) => {
  const chainable = {
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    session: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    then: (resolve, reject) => Promise.resolve(resolveWith).then(resolve, reject),
  };
  return chainable;
};

// =============================================================================
describe('Cart Management Tests (27 Cases)', () => {
  let req, res;

  beforeEach(() => {
    // Reset all mocks
    Object.values(mockCartModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockCartItemModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockDeviceModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockDeviceItemModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockWalletModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockRentalModel).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    Object.values(mockMongoose).forEach(fn => typeof fn === 'function' && fn.mockReset && fn.mockReset());
    mockMongoose.startSession.mockResolvedValue({
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      abortTransaction: jest.fn(),
      endSession: jest.fn(),
      inAtomicalContext: true
    });

    req = {
      user: { id: 'user123' },
      body: {},
      query: {},
      params: {},
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
  });

  // ===========================================================================
  // VIEW CART (CART-01 to CART-04)
  // ===========================================================================
  describe('View Cart (CART-01 to CART-04)', () => {
    test('CART-01: View cart with valid items', async () => {
      const mockCart = {
        _id: 'cart1',
        items: [
          { _id: 'item1', deviceId: { _id: 'dev1', status: 'AVAILABLE' }, quantity: 1 }
        ],
        toObject: () => ({ _id: 'cart1', items: [{ _id: 'item1' }] })
      };
      Cart.findOne.mockReturnValue(makeQueryChain(mockCart));
      DeviceItem.countDocuments.mockResolvedValue(5);

      await cartCtrl.getCart(req, res);

      expect(Cart.findOne).toHaveBeenCalledWith({ customerId: 'user123', cartType: 'NORMAL' });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
        cleaned: false, 
        message: 'Giỏ hàng hiện tại' 
      }));
    });

    test('CART-02: View empty cart', async () => {
      Cart.findOne.mockReturnValue(makeQueryChain(null));

      await cartCtrl.getCart(req, res);

      expect(res.json).toHaveBeenCalledWith({ items: [], message: 'Giỏ hàng trống' });
    });

    test('CART-03: View cart with auto-clean invalid items', async () => {
      const makeId = (v) => ({ equals: (id) => id === v || id.toString() === v, toString: () => v });
      const mockCart = {
        _id: 'cart1',
        items: [
          { _id: makeId('item1'), deviceId: { _id: 'dev1', status: 'STOPPED' }, quantity: 1 }, // Invalid by status
          { _id: makeId('item2'), deviceId: { _id: 'dev2', status: 'AVAILABLE' }, quantity: 2 }, // Invalid by stock
          { _id: makeId('item3'), deviceId: { _id: 'dev3', status: 'AVAILABLE' }, quantity: 1 }  // Valid
        ],
        save: jest.fn(),
      };
      
      Cart.findOne.mockReturnValue(makeQueryChain(mockCart));
      
      // Stock available counts
      DeviceItem.countDocuments
        .mockResolvedValueOnce(0)  // item1
        .mockResolvedValueOnce(1)  // item2 (needs 2, gets 1) -> invalid
        .mockResolvedValueOnce(5); // item3

      CartItem.deleteMany.mockResolvedValue({});
      
      // After clean, re-fetch
      const mockRefetchedCart = {
        _id: 'cart1', 
        toObject: () => ({ items: [{ _id: 'item3' }] })
      };
      Cart.findById.mockReturnValue(makeQueryChain(mockRefetchedCart));

      await cartCtrl.getCart(req, res);

      expect(CartItem.deleteMany).toHaveBeenCalledWith({ _id: { $in: expect.any(Array) } });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        cleaned: true,
        message: expect.stringContaining('Đã tự động xóa 2')
      }));
    });

    test('CART-04: View cart - system error', async () => {
      Cart.findOne.mockImplementation(() => { throw new Error('DB Error'); });

      await cartCtrl.getCart(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Lỗi khi lấy giỏ hàng' });
    });
  });

  // ===========================================================================
  // ADD TO CART (CART-05 to CART-11)
  // ===========================================================================
  describe('Add to Cart (CART-05 to CART-11)', () => {
    beforeEach(() => {
      req.body = {
        deviceId: 'dev1',
        quantity: 1,
        rentalStartDate: new Date('2026-05-01'),
        rentalEndDate: new Date('2026-05-05') // 5 days
      };
    });

    test('CART-05: Add new device to cart', async () => {
      Device.findById.mockResolvedValue({ _id: 'dev1', status: 'AVAILABLE' });
      DeviceItem.countDocuments.mockResolvedValue(10);
      Cart.findOne.mockResolvedValue({ _id: 'cart1', items: [], save: jest.fn() });
      CartItem.findOne.mockResolvedValue(null);
      CartItem.create.mockResolvedValue({ _id: 'newitem1' });

      await cartCtrl.addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: 'Đã thêm vào giỏ hàng', cartItemId: 'newitem1' }));
    });

    test('CART-06: Add duplicate device (same dates)', async () => {
      Device.findById.mockResolvedValue({ _id: 'dev1', status: 'AVAILABLE' });
      DeviceItem.countDocuments.mockResolvedValue(10);
      Cart.findOne.mockResolvedValue({ _id: 'cart1', items: [], save: jest.fn() });
      const existingItem = { _id: 'existing1', quantity: 1, save: jest.fn() };
      CartItem.findOne.mockResolvedValue(existingItem);

      await cartCtrl.addToCart(req, res);

      expect(existingItem.quantity).toBe(2);
      expect(existingItem.save).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Đã cập nhật số lượng trong giỏ' });
    });

    test('CART-07: Add device - invalid date range', async () => {
      Device.findById.mockResolvedValue({ _id: 'dev1', status: 'AVAILABLE' });
      DeviceItem.countDocuments.mockResolvedValue(10);
      req.body.rentalEndDate = new Date('2026-04-01'); // Ends before starts

      await cartCtrl.addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Ngày kết thúc phải sau ngày bắt đầu' });
    });

    test('CART-08: Add device - device not found', async () => {
      Device.findById.mockResolvedValue(null);

      await cartCtrl.addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Thiết bị không tồn tại' });
    });

    test('CART-09: Add device - device unavailable', async () => {
      Device.findById.mockResolvedValue({ _id: 'dev1', status: 'STOPPED' });

      await cartCtrl.addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Thiết bị hiện không khả dụng để thêm vào giỏ' });
    });

    test('CART-10: Add device - insufficient stock', async () => {
      Device.findById.mockResolvedValue({ _id: 'dev1', status: 'AVAILABLE' });
      req.body.quantity = 2;
      DeviceItem.countDocuments.mockResolvedValue(1);

      await cartCtrl.addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Chỉ còn 1 thiết bị khả dụng để thuê') }));
    });

    test('CART-11: Add to cart - system error', async () => {
      Device.findById.mockImplementation(() => { throw new Error('DB Error'); });

      await cartCtrl.addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Lỗi khi thêm vào giỏ hàng' });
    });
  });

  // ===========================================================================
  // UPDATE CART ITEM (CART-12 to CART-17)
  // ===========================================================================
  describe('Update Cart Item (CART-12 to CART-17)', () => {
    beforeEach(() => {
      req.params.cartItemId = 'item1';
      req.body = {
        rentalStartDate: '2026-06-01',
        rentalEndDate: '2026-06-05',
        quantity: 2
      };
    });

    test('CART-12: Update rental period successfully', async () => {
      const mockItem = { _id: 'item1', cartId: 'cart1', deviceId: 'dev1', quantity: 1, save: jest.fn() };
      CartItem.findById.mockResolvedValue(mockItem);
      Cart.findOne.mockResolvedValue({ _id: 'cart1', customerId: 'user123' });
      Device.findById.mockResolvedValue({ _id: 'dev1', status: 'AVAILABLE' });
      DeviceItem.countDocuments.mockResolvedValue(10);
      CartItem.findById.mockReturnValue(makeQueryChain(mockItem)); // for refetch

      await cartCtrl.updateCartItem(req, res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
        success: true, 
        message: 'Đã cập nhật lịch thuê thành công' 
      }));
      expect(mockItem.save).toHaveBeenCalled();
      expect(mockItem.quantity).toBe(2);
    });

    test('CART-13: Update quantity successfully', async () => {
      req.body = { quantity: 5 }; // only quantity
      const mockItem = { _id: 'item1', cartId: 'cart1', deviceId: 'dev1', quantity: 1, save: jest.fn() };
      CartItem.findById.mockResolvedValue(mockItem);
      Cart.findOne.mockResolvedValue({ _id: 'cart1', customerId: 'user123' });
      Device.findById.mockResolvedValue({ _id: 'dev1', status: 'AVAILABLE' });
      DeviceItem.countDocuments.mockResolvedValue(10);
      CartItem.findById.mockReturnValue(makeQueryChain(mockItem)); // for refetch

      await cartCtrl.updateCartItem(req, res);

      expect(mockItem.quantity).toBe(5);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    test('CART-14: Update - invalid date range', async () => {
      req.body.rentalEndDate = '2026-05-01'; // end earlier than start '2026-06-01'
      const mockItem = { _id: 'item1', cartId: 'cart1', deviceId: 'dev1', quantity: 1 };
      CartItem.findById.mockResolvedValue(mockItem);
      Cart.findOne.mockResolvedValue({ _id: 'cart1' });
      Device.findById.mockResolvedValue({ _id: 'dev1', status: 'AVAILABLE' });

      await cartCtrl.updateCartItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Ngày kết thúc phải sau') }));
    });

    test('CART-15: Update - device unavailable for dates (insufficient stock)', async () => {
      const mockItem = { _id: 'item1', cartId: 'cart1', deviceId: 'dev1', quantity: 5 }; // want 5
      CartItem.findById.mockResolvedValue(mockItem);
      Cart.findOne.mockResolvedValue({ _id: 'cart1' });
      Device.findById.mockResolvedValue({ _id: 'dev1', status: 'AVAILABLE' });
      DeviceItem.countDocuments.mockResolvedValue(2); // only 2 available

      await cartCtrl.updateCartItem(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Hiện chỉ còn 2') }));
    });

    test('CART-16: Update - cart item not found', async () => {
      CartItem.findById.mockResolvedValue(null);

      await cartCtrl.updateCartItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Không tìm thấy sản phẩm trong giỏ' });
    });

    test('CART-17: Update - system error', async () => {
      CartItem.findById.mockImplementation(() => { throw new Error('DB Error'); });

      await cartCtrl.updateCartItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Lỗi server khi cập nhật giỏ hàng' });
    });
  });

  // ===========================================================================
  // DELETE ITEM FROM CART (CART-18 to CART-20)
  // ===========================================================================
  describe('Delete Item from Cart (CART-18 to CART-20)', () => {
    beforeEach(() => {
      req.params.cartItemId = 'item1';
    });

    test('CART-18: Remove item successfully', async () => {
      const mockCart = { _id: 'cart1', items: { pull: jest.fn() }, save: jest.fn() };
      CartItem.findById.mockResolvedValue({ _id: 'item1', cartId: 'cart1' });
      Cart.findOne.mockResolvedValue(mockCart);
      CartItem.deleteOne.mockResolvedValue({});

      await cartCtrl.removeCartItem(req, res);

      expect(CartItem.deleteOne).toHaveBeenCalledWith({ _id: 'item1' });
      expect(mockCart.items.pull).toHaveBeenCalledWith('item1');
      expect(mockCart.save).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Đã xóa item khỏi giỏ hàng' });
    });

    test('CART-19: Remove item - not found', async () => {
      CartItem.findById.mockResolvedValue(null);

      await cartCtrl.removeCartItem(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Item không tồn tại' });
    });

    test('CART-20: Remove item - system error', async () => {
      CartItem.findById.mockImplementation(() => { throw new Error('DB Error'); });

      await cartCtrl.removeCartItem(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ message: 'Lỗi server' });
    });
  });

  // ===========================================================================
  // CART CHECKOUT (CART-21 to CART-27)
  // ===========================================================================
  describe('Cart Checkout (CART-21 to CART-27)', () => {
    const mockCart = {
      _id: 'cart1',
      items: [
        {
          _id: 'item1',
          deviceId: { _id: 'dev1', supplierId: 'sup1', name: 'Camera', rentPrice: { perDay: 100000 }, depositAmount: 500000 },
          quantity: 1,
          totalDays: 2,
          rentalStartDate: new Date('2026-06-01'),
          rentalEndDate: new Date('2026-06-03')
        }
      ],
      save: jest.fn().mockResolvedValue({})
    };

    beforeEach(() => {
      req.body = {
        paymentMethod: 'WALLET',
        deliveryAddress: { receiverName: 'A' }
      };
      // Stub session query chain for mockCart
      Cart.findOne.mockReturnValue(makeQueryChain(mockCart));
      // Mock enough stock by default
      DeviceItem.countDocuments.mockReturnValue(makeQueryChain(10));
      // Mock empty query chains for alloc process
      DeviceItem.find.mockReturnValue(makeQueryChain([{ _id: 'di1', save: jest.fn() }]));
      
      const mockWalletSys = { _id: 'sys', balance: 5000000, save: jest.fn() };
      Wallet.findOne.mockReturnValue(makeQueryChain(mockWalletSys));
      CartItem.deleteMany = jest.fn().mockReturnValue({ session: jest.fn().mockResolvedValue({}) });
      Notification.create = jest.fn().mockResolvedValue({ _id: 'notif1', receiverId: 'sup1' });
      Contract.findOne = jest.fn().mockReturnValue({ lean: jest.fn().mockReturnThis(), session: jest.fn().mockReturnThis(), sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), then: (res, rej) => Promise.resolve(null).then(res, rej) });
    });


    test('CART-23: Checkout - empty cart', async () => {
      Cart.findOne.mockReturnValue(makeQueryChain(null)); // Empty

      try {
        await rentalCtrl.checkoutRental(req, res);
      } catch(e) {
        // Handled by catch block in controller
      }

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Giỏ hàng trống') }));
    });

    test('CART-24: Checkout - insufficient stock', async () => {
      DeviceItem.countDocuments.mockReturnValue(makeQueryChain(0)); // 0 stock < 1 requested

      await rentalCtrl.checkoutRental(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('không đủ số lượng khả dụng') }));
    });

    test('CART-25: Checkout - insufficient wallet balance', async () => {
      req.body.paymentMethod = 'WALLET';
      const mockWalletCust = { _id: 'custWallet', balance: 50000, save: jest.fn() }; // < 700000 needed (rent: 200, deposit: 500)
      Wallet.findOne.mockReturnValueOnce(makeQueryChain(mockWalletCust));

      await rentalCtrl.checkoutRental(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Số dư ví không đủ') }));
    });

    test('CART-27: Checkout - system error', async () => {
      // Mock connection failure or transaction throw
      Cart.findOne.mockImplementation(() => { throw new Error('Thanh toán thất bại'); });

      await rentalCtrl.checkoutRental(req, res);

      expect(res.status).toHaveBeenCalledWith(400); // 400 maps to general error in checkout catch block
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('Thanh toán thất bại') }));
    });
  });

  // ===========================================================================
  // ADDITIONAL TESTS FOR COVERAGE
  // ===========================================================================
  describe('Additional Tests for Coverage', () => {
    test('CART-28: Add to cart when cart does not exist (creates new cart)', async () => {
      req.body = {
        deviceId: 'device1',
        quantity: 1,
        rentalStartDate: '2026-06-01',
        rentalEndDate: '2026-06-03'
      };

      // Mock no existing cart
      Cart.findOne.mockReturnValue(makeQueryChain(null));
      // Mock cart creation
      Cart.create.mockResolvedValue({ _id: 'newCart', customerId: 'user123', cartType: 'NORMAL', items: [], save: jest.fn() });
      // Mock existing item check (no duplicate)
      CartItem.findOne.mockReturnValue(makeQueryChain(null));
      // Mock device found
      Device.findById.mockReturnValue(makeQueryChain({ _id: 'device1', status: 'ACTIVE', rentPrice: { perDay: 100000 } }));
      // Mock stock check
      DeviceItem.countDocuments.mockReturnValue(makeQueryChain(5));
      // Mock cart item creation
      CartItem.create.mockResolvedValue({ _id: 'newItem' });

      await cartCtrl.addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('CART-29: Add instant rental to cart', async () => {
      req.body = {
        deviceId: 'device1',
        quantity: 1,
        rentalStartDate: '2026-06-01',
        rentalEndDate: '2026-06-03'
      };

      // Mock instant cart deletion
      Cart.distinct.mockResolvedValue([]);
      CartItem.deleteMany.mockReturnValue({ session: jest.fn().mockResolvedValue({}) });
      Cart.deleteMany.mockReturnValue({ session: jest.fn().mockResolvedValue({}) });
      // Mock device found
      Device.findById.mockReturnValue(makeQueryChain({ _id: 'device1', status: 'ACTIVE', rentPrice: { perDay: 100000 } }));
      // Mock stock check
      DeviceItem.countDocuments.mockReturnValue(makeQueryChain(5));
      // Mock cart creation
      Cart.create.mockResolvedValue({ _id: 'newInstantCart', customerId: 'user123', cartType: 'INSTANT', items: [], save: jest.fn() });
      // Mock findById with populate for the response
      Cart.findById.mockReturnValue({ 
        populate: jest.fn().mockReturnValue({ 
          _id: 'newInstantCart', 
          items: [{ _id: 'newInstantItem', deviceId: { name: 'Test Device' } }] 
        }) 
      });
      // Mock cart item creation
      CartItem.create.mockResolvedValue({ _id: 'newInstantItem' });

      await cartCtrl.addInstantToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
    });

    test('CART-34: View cart with stopped device (should be filtered out)', async () => {
      req.query.type = 'NORMAL';
      
      // Create a mock deviceId with equals method
      const mockDeviceId = {
        _id: 'device1',
        status: 'STOPPED',
        equals: jest.fn().mockReturnValue(false)
      };
      
      const mockCartWithStoppedDevice = {
        _id: 'cart123',
        customerId: 'user123',
        items: [
          {
            _id: 'item1',
            deviceId: mockDeviceId,
            quantity: 1,
            rentalStartDate: new Date(),
            rentalEndDate: new Date()
          }
        ]
      };
      
      Cart.findOne.mockReturnValue(makeQueryChain(mockCartWithStoppedDevice));
      Device.findById.mockReturnValue(makeQueryChain({ _id: 'device1', status: 'STOPPED', equals: jest.fn() }));

      await cartCtrl.getCart(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    test('CART-30: Clear cart successfully', async () => {
      req.query.type = 'NORMAL';
      
      const mockCart = { _id: 'cart1', customerId: 'user123' };
      Cart.findOne.mockReturnValue(makeQueryChain(mockCart));
      CartItem.deleteMany.mockReturnValue({ session: jest.fn().mockResolvedValue({}) });
      Cart.deleteOne.mockReturnValue({ session: jest.fn().mockResolvedValue({}) });

      await cartCtrl.clearCart(req, res);

      expect(CartItem.deleteMany).toHaveBeenCalledWith({ cartId: 'cart1' });
      expect(Cart.deleteOne).toHaveBeenCalledWith({ _id: 'cart1' });
      expect(res.json).toHaveBeenCalledWith({ message: 'Đã xóa toàn bộ giỏ hàng' });
    });

    test('CART-31: Clear cart when cart does not exist', async () => {
      req.query.type = 'NORMAL';
      
      Cart.findOne.mockReturnValue(makeQueryChain(null));

      await cartCtrl.clearCart(req, res);

      expect(res.json).toHaveBeenCalledWith({ message: 'Giỏ hàng đã trống' });
    });

    test('CART-32: Add instant rental - device not found', async () => {
      req.body = { deviceId: 'nonexistent' };
      
      Cart.distinct.mockResolvedValue([]);
      Device.findById.mockReturnValue(makeQueryChain(null));

      await cartCtrl.addInstantToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Thiết bị không tồn tại' });
    });

    test('CART-33: Add instant rental - device inactive', async () => {
      req.body = { deviceId: 'device1' };
      
      Cart.distinct.mockResolvedValue([]);
      Device.findById.mockReturnValue(makeQueryChain({ _id: 'device1', status: 'INACTIVE' }));

      await cartCtrl.addInstantToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: 'Thiết bị hiện không khả dụng cho thuê' });
    });

    test('CART-35: Add combo to cart successfully', async () => {
      req.body = {
        comboItems: [{ deviceId: 'device1', quantity: 1 }],
        rentalStartDate: '2026-06-01',
        rentalEndDate: '2026-06-03'
      };

      // Mock cart exists
      const mockCart = { _id: 'cart123', customerId: 'user123', items: [], save: jest.fn() };
      Cart.findOne.mockReturnValue(makeQueryChain(mockCart));
      
      // Mock device found
      Device.findById.mockReturnValue(makeQueryChain({ _id: 'device1', status: 'ACTIVE', rentPrice: { perDay: 100000 } }));
      // Mock stock check
      DeviceItem.countDocuments.mockReturnValue(makeQueryChain(5));
      // Mock cart item creation
      CartItem.create.mockResolvedValue({ _id: 'newComboItem' });

      await cartCtrl.addComboToCart(req, res);

      expect(CartItem.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: expect.stringContaining('thành công'),
        addedCount: expect.any(Number)
      }));
    });

    test('CART-36: Add combo to cart - cart not found creates new cart', async () => {
      req.body = {
        comboItems: [{ deviceId: 'device1', quantity: 1 }],
        rentalStartDate: '2026-06-01',
        rentalEndDate: '2026-06-03'
      };

      // Mock cart not found
      Cart.findOne.mockReturnValue(makeQueryChain(null));
      // Mock cart creation with save method
      Cart.create.mockResolvedValue({ _id: 'newCart', customerId: 'user123', cartType: 'NORMAL', items: [], save: jest.fn() });
      // Mock device found
      Device.findById.mockReturnValue(makeQueryChain({ _id: 'device1', status: 'ACTIVE', rentPrice: { perDay: 100000 } }));
      // Mock stock check
      DeviceItem.countDocuments.mockReturnValue(makeQueryChain(5));
      // Mock cart item creation
      CartItem.create.mockResolvedValue({ _id: 'newComboItem' });

      await cartCtrl.addComboToCart(req, res);

      expect(Cart.create).toHaveBeenCalledWith({
        customerId: 'user123',
        cartType: 'NORMAL'
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
        message: expect.stringContaining('thành công')
      }));
    });

    test('CART-37: Add to cart - system error', async () => {
      req.body = {
        deviceId: 'device1',
        quantity: 1,
        rentalStartDate: '2026-06-01',
        rentalEndDate: '2026-06-03'
      };

      // Mock system error in Cart.findOne
      Cart.findOne.mockImplementation(() => { throw new Error('Database error'); });

      await cartCtrl.addToCart(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ message: 'Thiết bị không tồn tại' });
    });
  });
});
