const { PayOS } = require('@payos/node'); // ✅ ĐÚNG theo mẫu v2

const Wallet = require('../../models/Wallet');
const WalletTransaction = require('../../models/WalletTransaction');
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
    const userId = req.user?._id || '6954a73190b6a28de8ea2c8b'; // test fallback
    const { amount } = req.body || {};

    if (!amount || Number(amount) < 10000) {
      return res.status(400).json({
        message: 'Số tiền tối thiểu 10.000đ'
      });
    }

    // PayOS yêu cầu orderCode là number và không quá dài
    const orderCode = Number(String(Date.now()).slice(-9));

    await Payment.create({
      user: userId,
      amount: Number(amount),
      orderCode,
      status: 'INIT'
    });

    const body = {
      orderCode,
      amount: Number(amount),
      description: `Nap tien vi ${orderCode}`,
      returnUrl: `${process.env.CLIENT_URL}/wallet/success`,
      cancelUrl: `${process.env.CLIENT_URL}/wallet/cancel`
    };

    let paymentLinkRes;

    // ✅ ƯU TIÊN THEO MẪU V2
    if (payos.paymentRequests?.create) {
      paymentLinkRes = await payos.paymentRequests.create(body);
    } else {
      // fallback cho SDK vẫn còn createPaymentLink
      paymentLinkRes = await payos.createPaymentLink(body);
    }

    return res.json(paymentLinkRes);
  } catch (err) {
    console.error('TOPUP ERROR:', err);
    return res.status(500).json({
      message: 'Lỗi tạo link thanh toán',
      error: err.message
    });
  }
};

/**
 * 🟢 LẤY THÔNG TIN VÍ
 * GET /api/wallet/me
 */
exports.getMyWallet = async (req, res) => {
  const wallet = await Wallet.findOne({ user: req.user._id });
  res.json(wallet);
};

/**
 * 🟢 LỊCH SỬ GIAO DỊCH
 * GET /api/wallet/transactions
 */
exports.getWalletTransactions = async (req, res) => {
  const wallet = await Wallet.findOne({ user: req.user._id });
  if (!wallet) return res.json([]);

  const transactions = await WalletTransaction
    .find({ wallet: wallet._id })
    .sort({ createdAt: -1 });

  res.json(transactions);
};
