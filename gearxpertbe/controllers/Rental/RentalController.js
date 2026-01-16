const Cart = require('../../models/Cart');
const CartItem = require('../../models/CartItem');
const Rental = require('../../models/Rental');
const RentalItem = require('../../models/RentalItem');
const Device = require('../../models/Device');
const Voucher = require('../../models/Voucher');

const Wallet = require('../../models/Wallet');
const WalletTransaction = require('../../models/WalletTransaction');
const mongoose = require('mongoose');

exports.checkoutRental = async (req, res) => {
  // Bắt đầu một session để đảm bảo tính an toàn dữ liệu (Transaction)
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const customerId = req.user.id;
    const {
      cartType = 'NORMAL',
      deliveryAddress,
      phoneNumber,
      paymentMethod,
      useInsurance,
      notes,
      voucherCode
    } = req.body;

    /* ================= 1. LOAD CART ================= */
    const cart = await Cart.findOne({ customerId, cartType })
      .populate({ path: 'items', populate: { path: 'deviceId' } })
      .session(session);

    if (!cart || !cart.items.length) {
      throw new Error('Giỏ hàng trống');
    }

    /* ================= 2. CALC PRICE & VALIDATE SUPPLIER ================= */
    let supplierId = null;
    let rentPriceTotal = 0;
    let depositAmount = 0;
    const rentalItems = [];

    for (const item of cart.items) {
      const device = item.deviceId;
      
      // Kiểm tra nhà cung cấp duy nhất
      const deviceSupplierId = device.supplierId.toString();
      if (!supplierId) supplierId = deviceSupplierId;
      else if (supplierId !== deviceSupplierId) {
        throw new Error('Chỉ được checkout thiết bị từ cùng 1 nhà cung cấp');
      }

      // Kiểm tra tính khả dụng
      if (device.status !== 'AVAILABLE') {
        throw new Error(`Thiết bị ${device.name} không khả dụng`);
      }

      const rent = device.rentPrice.perDay * item.totalDays * item.quantity;
      const deposit = device.depositAmount * item.quantity;

      rentPriceTotal += rent;
      depositAmount += deposit;

      rentalItems.push({
        deviceId: device._id,
        quantity: item.quantity,
        rentalStartDate: item.rentalStartDate,
        rentalEndDate: item.rentalEndDate,
        totalDays: item.totalDays,
        rentPrice: rent,
        depositAmount: deposit
      });
    }

    const insuranceAmount = useInsurance ? Math.round(rentPriceTotal * 0.05) : 0;
    const deliveryFee = 50000;

    /* ================= 3. VOUCHER ================= */
    let voucherDiscount = 0;
    let appliedVoucher = null;
    if (voucherCode) {
      appliedVoucher = await Voucher.findOne({ code: voucherCode.toUpperCase(), status: 'ACTIVE' }).session(session);
      if (appliedVoucher) {
        // Logic tính giảm giá (giữ nguyên của bạn...)
        if (appliedVoucher.discountType === 'PERCENT') {
          voucherDiscount = Math.round((rentPriceTotal * appliedVoucher.discountValue) / 100);
          if (appliedVoucher.maxDiscount) voucherDiscount = Math.min(voucherDiscount, appliedVoucher.maxDiscount);
        } else {
          voucherDiscount = appliedVoucher.discountValue;
        }
      }
    }

    const totalAmount = rentPriceTotal + depositAmount + insuranceAmount + deliveryFee - voucherDiscount;

    /* ================= 4. XỬ LÝ THANH TOÁN VÍ (WALLET) ================= */
    let paymentStatus = 'UNPAID';
    let rentalStatus = 'PENDING';

    if (paymentMethod === 'WALLET') {
      const wallet = await Wallet.findOne({ user: customerId }).session(session);
      
      if (!wallet || wallet.balance < totalAmount) {
        throw new Error('Số dư ví không đủ để thực hiện thanh toán');
      }

      const balanceBefore = wallet.balance;
      wallet.balance -= totalAmount;
      await wallet.save({ session });

      // Tạo giao dịch ví
      await WalletTransaction.create([{
        wallet: wallet._id,
        type: 'PAYMENT',
        amount: -totalAmount,
        balanceBefore: balanceBefore,
        balanceAfter: wallet.balance,
        referenceType: 'RENTAL',
        status: 'SUCCESS',
        description: `Thanh toán đơn thuê thiết bị`
      }], { session });

      paymentStatus = 'PAID';
      rentalStatus = 'PAID'; 
    }

    /* ================= 5. CREATE RENTAL & ITEMS ================= */
    const rental = await Rental.create([{
      customerId,
      supplierId,
      rentPriceTotal,
      depositAmount,
      insuranceAmount,
      deliveryFee,
      totalAmount,
      paymentMethod,
      paymentStatus, // Trạng thái dựa trên kết quả ví
      status: rentalStatus,
      voucherCode: appliedVoucher?.code,
      voucherDiscount,
      deliveryAddress,
      phoneNumber,
      notes
    }], { session });

    const newRental = rental[0];

    await RentalItem.insertMany(
      rentalItems.map(i => ({ ...i, rentalId: newRental._id })),
      { session }
    );

    // Cập nhật ReferenceId cho Transaction ví nếu có
    if (paymentMethod === 'WALLET') {
        await WalletTransaction.findOneAndUpdate(
            { referenceType: 'RENTAL', wallet: (await Wallet.findOne({user: customerId}))._id },
            { referenceId: newRental._id },
            { sort: { createdAt: -1 }, session }
        );
    }

    /* ================= 6. CẬP NHẬT TRẠNG THÁI THIẾT BỊ & VOUCHER ================= */
    await Device.updateMany(
      { _id: { $in: rentalItems.map(i => i.deviceId) } },
      { status: 'RENTED' },
      { session }
    );

    if (appliedVoucher) {
      await Voucher.updateOne(
        { _id: appliedVoucher._id },
        { $inc: { usedCount: 1 } },
        { session }
      );
    }

    /* ================= 7. CLEAR CART ================= */
    await CartItem.deleteMany({ cartId: cart._id }, { session });
    await Cart.deleteOne({ _id: cart._id }, { session });

    // Hoàn tất giao dịch
    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Checkout thành công',
      rentalId: newRental._id,
      paymentStatus
    });

  } catch (err) {
    // Nếu có bất kỳ lỗi nào, hủy bỏ toàn bộ thay đổi (bao gồm cả tiền ví)
    await session.abortTransaction();
    session.endSession();
    console.error("CHECKOUT ERROR:", err);
    res.status(400).json({ message: err.message || 'Checkout thất bại' });
  }
};
/**
 * GET /rentals/has-rented/:deviceId
 */
exports.hasRentedDevice = async (req, res) => {
  const customerId = req.user._id;
  const deviceId = req.params.deviceId;

  const rented = await RentalItem.findOne({ deviceId })
    .populate({
      path: 'rentalId',
      match: { customerId }
    });

  res.json({ hasRented: !!rented?.rentalId });
};
