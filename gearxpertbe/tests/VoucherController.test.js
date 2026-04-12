const {
  validateVoucher, getAllVouchers, createVoucherByAdmin,
  getVouchersForAdmin, deleteVoucher, updateVoucherByAdmin,
  getVouchersBySupplier, createVoucherBySupplier, updateVoucherStatusBySupplier
} = require("../controllers/Voucher/VoucherController");
const Voucher = require("../models/Voucher");
const Cart = require("../models/Cart");
const SupplierProfile = require("../models/SupplierProfile");
const { notifyFollowers } = require("../controllers/Supplier/SupplierController");
const mongoose = require("mongoose");

jest.mock("../models/Voucher");
jest.mock("../models/Cart");
jest.mock("../models/SupplierProfile");
jest.mock("../controllers/Supplier/SupplierController", () => ({
  notifyFollowers: jest.fn().mockImplementation(() => Promise.resolve())
}));

describe("Voucher Controller - Master Completion", () => {
  const mockRes = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() });
  const user = { id: new mongoose.Types.ObjectId().toString() };
  const mockId = new mongoose.Types.ObjectId().toString();

  beforeEach(() => { jest.clearAllMocks(); });

  // 1. VALIDATE VOUCHER (All 400s and Success paths)
  it('validateVoucher: All Branches', async () => {
    // 404
    Voucher.findOne.mockResolvedValueOnce(null);
    await validateVoucher({ body: { code: "X" }, user }, mockRes());
    // Expired
    Voucher.findOne.mockResolvedValueOnce({ status: "ACTIVE", expiredAt: new Date(0) });
    await validateVoucher({ body: { code: "B" }, user }, mockRes());
    // Limit
    Voucher.findOne.mockResolvedValueOnce({ status: "ACTIVE", expiredAt: new Date(8e15), usageLimit: 5, usedCount: 5 });
    await validateVoucher({ body: { code: "B" }, user }, mockRes());
    // Empty Cart
    Voucher.findOne.mockResolvedValueOnce({ status: "ACTIVE", expiredAt: new Date(8e15) });
    Cart.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue({ items: [] }) });
    await validateVoucher({ body: { code: "C", cartType: "R" }, user }, mockRes());
    // Min Order Value Fail
    Voucher.findOne.mockResolvedValueOnce({ type: "GLOBAL", status: "ACTIVE", expiredAt: new Date(8e15), minOrderValue: 9999 });
    Cart.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue({ items: [{ deviceId: { rentPrice: { perDay: 1 } }, totalDays: 1, quantity: 1 }] }) });
    await validateVoucher({ body: { code: "V" }, user }, mockRes());

    // SUCCESS - SUPPLIER + FIXED
    const sId = new mongoose.Types.ObjectId();
    const vSupplier = { type: "SUPPLIER", supplierId: sId, status: "ACTIVE", expiredAt: new Date(8e15), minOrderValue: 0, discountType: "FIXED", discountValue: 50 };
    Voucher.findOne.mockResolvedValueOnce(vSupplier);
    const items = [{ deviceId: { rentPrice: { perDay: 100 }, supplierId: { equals: (id) => id.toString() === sId.toString() } }, totalDays: 1, quantity: 1 }];
    Cart.findOne.mockReturnValue({ populate: jest.fn().mockResolvedValue({ items }) });
    await validateVoucher({ body: { code: "S" }, user }, mockRes());

    // SUCCESS - GLOBAL + PERCENT + MaxDiscount (82-84)
    Voucher.findOne.mockResolvedValueOnce({ type: "GLOBAL", status: "ACTIVE", expiredAt: new Date(8e15), minOrderValue: 0, discountType: "PERCENT", discountValue: 50, maxDiscount: 10 });
    await validateVoucher({ body: { code: "G" }, user }, mockRes());
  });

  // 2. LISTINGS (123, 132, 218, 227)
  it('Listings: full mapping', async () => {
    Voucher.find.mockReturnValue({ sort: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([{ type: "SUPPLIER", supplierId: "s1" }]) });
    // hit profile exists
    SupplierProfile.findOne.mockReturnValue({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue({ businessName: "B" }) });
    await getAllVouchers({}, mockRes());
    await getVouchersForAdmin({}, mockRes());
    // hit profile not exists
    SupplierProfile.findOne.mockReturnValueOnce({ select: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue(null) });
    await getVouchersBySupplier({ user }, mockRes());
  });

  // 3. CREATION & NOTIFICATION (192, 411)
  it('Creation Logic', async () => {
    const saveMock = jest.fn().mockResolvedValue({});
    Voucher.mockImplementation(() => ({ save: saveMock }));
    
    await createVoucherByAdmin({ body: { code: "G", discountValue: 1, minOrderValue: 1, usageLimit: 10 } }, mockRes());
    await createVoucherBySupplier({ user, body: { code: "S", discountValue: 1, usageLimit: 10, minOrderValue: 0, discountType: "FIXED" } }, mockRes());
    expect(notifyFollowers).toHaveBeenCalled();
  });

  // 4. UPDATES & DELETE (256, 303, 323, 464)
  it('Modifications Logic', async () => {
    Voucher.findByIdAndDelete.mockResolvedValue({_id:1});
    await deleteVoucher({ params: { id: "1" } }, mockRes());

    Voucher.findById.mockResolvedValueOnce({ type: "SUPPLIER" });
    Voucher.findByIdAndUpdate.mockResolvedValueOnce({});
    await updateVoucherByAdmin({ params: { id: "1" }, body: { status: "ACTIVE" } }, mockRes());

    Voucher.findById.mockResolvedValueOnce({ type: "GLOBAL" });
    Voucher.findByIdAndUpdate.mockResolvedValueOnce({});
    await updateVoucherByAdmin({ params: { id: "1" }, body: { discountValue: 10 } }, mockRes());

    Voucher.findOneAndUpdate.mockResolvedValue({_id:1});
    await updateVoucherStatusBySupplier({ user, params: { id: "1" }, body: { status: "ACTIVE" } }, mockRes());
  });

  // 5. ERRORS & VALIDATIONS
  it('Error paths', async () => {
    await createVoucherByAdmin({ body: { discountValue: -1 } }, mockRes());
    await createVoucherBySupplier({ user, body: { usageLimit: 0 } }, mockRes());
    Voucher.find.mockImplementation(() => { throw new Error(); });
    await getAllVouchers({}, mockRes());
  });
});