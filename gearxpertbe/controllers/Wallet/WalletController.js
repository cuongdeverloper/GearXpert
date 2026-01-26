const { PayOS } = require('@payos/node'); // ✅ ĐÚNG theo mẫu v2

const Wallet = require('../../models/Wallet');
const WalletTransaction = require('../../models/WalletTransaction');
const WithdrawRequest = require('../../models/WithdrawRequest');
const Payment = require('../../models/Payment');

// ✅ Khởi tạo PayOS v2
const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

// Debug để chắc chắn SDK v2
console.log('PayOS v2 - paymentRequests tồn tại:', !!payos.paymentRequests);

/**
 * 🔵 NẠP TIỀN – TẠO LINK THANH TOÁN
 * POST /api/wallet/topup
 */


exports.topUpWallet = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;
    const cleanAmount = parseInt(amount, 10); 
    if (isNaN(cleanAmount) || cleanAmount < 10000) {
      return res.status(400).json({ message: 'Số tiền tối thiểu 10.000đ' });
    }
    if (!amount || Number(amount) < 10000) {
      return res.status(400).json({ message: 'Số tiền tối thiểu 10.000đ' });
    }

    // 1. Tìm ví của user
    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet) return res.status(404).json({ message: "Không tìm thấy ví người dùng" });

    // 2. Tạo orderCode (PayOS giới hạn độ dài số)
    const orderCode = Math.floor(Date.now() / 1000) + Math.floor(Math.random() * 1000);

    // 3. Tạo Payment (để track bên thứ 3)
    const payment = await Payment.create({
      user: userId,
      amount: cleanAmount,
      orderCode,
      status: 'INIT'
    });

    // 4. Tạo WalletTransaction (để hiển thị "Đang xử lý" trên UI WalletPage)
    await WalletTransaction.create({
      wallet: wallet._id,
      type: 'TOP_UP',
      amount: cleanAmount,
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance, // Chưa cộng tiền nên after = before
      status: 'PENDING',
      referenceType: 'SYSTEM',
      referenceId: payment._id,
      description: `Nạp tiền qua PayOS (Mã: ${orderCode})`
    });

    const body = {
      orderCode: Number(orderCode), // Ép kiểu số chắc chắn
      amount: Number(cleanAmount),  // Ép kiểu số chắc chắn
      description: `Nap tien ${orderCode}`.slice(0, 25), // Bỏ chữ "Vi", hạn chế ký tự đặc biệt
      returnUrl: `${process.env.FRONTEND_URL}/wallet/success`,
      cancelUrl: `${process.env.FRONTEND_URL}/wallet/cancel`
    };

    let paymentLinkRes;
    if (payos.paymentRequests?.create) {
      paymentLinkRes = await payos.paymentRequests.create(body);
    } else {
      paymentLinkRes = await payos.createPaymentLink(body);
    }

    // Đảm bảo trả về đúng data mà PayOS cung cấp
    return res.status(200).json({
      success: true,
      data: paymentLinkRes // Trả về toàn bộ object gồm checkoutUrl, qrCode...
    });
  } catch (err) {
    console.error('TOPUP ERROR:', err);
    return res.status(500).json({ message: 'Lỗi nạp tiền', error: err.message });
  }
};

/**
 * 🟢 LẤY THÔNG TIN VÍ
 * GET /api/wallet/me
 */
exports.getMyWallet = async (req, res) => {
  const wallet = await Wallet.findOne({ user: req.user.id });
  res.json(wallet);
};

/**
 * 🟢 LỊCH SỬ GIAO DỊCH
 * GET /api/wallet/transactions
 */
exports.getWalletTransactions = async (req, res) => {
  const wallet = await Wallet.findOne({ user: req.user.id });
  if (!wallet) return res.json([]);

  const transactions = await WalletTransaction
    .find({ wallet: wallet._id })
    .sort({ createdAt: -1 });

  res.json(transactions);
};
exports.verifyTopUp = async (req, res) => {
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { orderCode } = req.body;
    
    // 1. Kiểm tra bản ghi Payment
    const payment = await Payment.findOne({ orderCode: Number(orderCode) }).session(session);
    if (!payment) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Giao dịch không tồn tại" });
    }

    if (payment.status === 'PAID') {
      await session.abortTransaction();
      return res.json({ success: true, message: "Giao dịch đã được xử lý trước đó" });
    }

    // 2. Kiểm tra trạng thái thực tế từ PayOS
    const info = await payos.getPaymentLinkInformation(orderCode);
    
    if (info.status === 'PAID') {
      // A. Cập nhật trạng thái Payment
      payment.status = 'PAID';
      payment.rawResponse = info;
      await payment.save({ session });

      // B. Cập nhật tiền trong Wallet
      let wallet = await Wallet.findOne({ user: payment.user }).session(session);
      const before = wallet.balance;
      wallet.balance += payment.amount;
      await wallet.save({ session });

      // C. Cập nhật WalletTransaction từ PENDING -> SUCCESS
      await WalletTransaction.findOneAndUpdate(
        { 
          wallet: wallet._id, 
          referenceId: payment._id, 
          type: 'TOP_UP' 
        },
        { 
          status: 'SUCCESS',
          balanceBefore: before,
          balanceAfter: wallet.balance,
          description: `Nạp tiền thành công qua PayOS (Mã: ${orderCode})`
        },
        { session }
      );

      await session.commitTransaction();
      session.endSession();
      return res.json({ success: true });
    } else if (info.status === 'CANCELLED' || info.status === 'EXPIRED') {
        // Xử lý nếu giao dịch thất bại/hết hạn
        payment.status = 'FAILED';
        await payment.save({ session });
        
        await WalletTransaction.findOneAndUpdate(
            { wallet: payment.user, referenceId: payment._id },
            { status: 'FAILED' },
            { session }
        );
        await session.commitTransaction();
        return res.json({ success: false, status: info.status });
    }

    await session.abortTransaction();
    res.json({ success: false, status: info.status });
  } catch (error) {
    if (session.inAtomicalContext) await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
};

/**
 * 💸 YÊU CẦU RÚT TIỀN
 */
exports.requestWithdraw = async (req, res) => {
  const mongoose = require('mongoose');
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, bankInfo } = req.body; 
    // bankInfo: { bankName, accountNumber, accountName }

    const wallet = await Wallet.findOne({ user: req.user.id }).session(session);

    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ message: "Số dư không đủ" });
    }

    const before = wallet.balance;
    wallet.balance -= amount;
    await wallet.save({ session });

    // 1. Tạo yêu cầu rút tiền cho Admin duyệt (Trạng thái PENDING)
    const withdraw = await WithdrawRequest.create([{
      user: req.user.id,
      wallet: wallet._id,
      amount,
      bankInfo,
      status: 'PENDING'
    }], { session });

    // 2. Tạo lịch sử ví (Trạng thái SUCCESS - vì tiền ĐÃ TRỪ xong)
    await WalletTransaction.create([{
      wallet: wallet._id,
      type: 'WITHDRAW',
      amount: -amount,
      balanceBefore: before,
      balanceAfter: wallet.balance,
      status: 'SUCCESS', // Để SUCCESS ở đây là hợp lý về mặt số dư
      referenceType: 'SYSTEM',
      referenceId: withdraw[0]._id, // Link tới đơn rút tiền
      description: `Rút tiền về ${bankInfo.bankName} - Đang chờ xử lý chuyển khoản`
    }], { session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: "Yêu cầu rút tiền thành công, vui lòng chờ Admin chuyển khoản" });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: error.message });
  }
}