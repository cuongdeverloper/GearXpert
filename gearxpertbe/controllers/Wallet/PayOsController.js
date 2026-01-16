const { PayOS } = require('@payos/node'); // ✅ Đảm bảo có dấu { }
const Wallet = require('../../models/Wallet');
const WalletTransaction = require('../../models/WalletTransaction');
const Payment = require('../../models/Payment');

// Khởi tạo PayOS
const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);


/**
 * 🔔 WEBHOOK PAYOS
 */
exports.handleWebhook = async (req, res) => {
  try {
    // Xác thực dữ liệu từ PayOS gửi về
    const webhookData = payos.verifyPaymentWebhookData(req.body);

    if (webhookData.status !== 'PAID') {
      return res.json({ success: true });
    }

    const payment = await Payment.findOne({ orderCode: webhookData.orderCode });
    if (!payment || payment.status === 'PAID') {
      return res.json({ success: true });
    }

    // 1. Cập nhật trạng thái Payment
    payment.status = 'PAID';
    payment.rawResponse = webhookData;
    await payment.save();

    // 2. Cập nhật số dư ví
    let wallet = await Wallet.findOne({ user: payment.user });
    if (!wallet) {
      wallet = await Wallet.create({ user: payment.user, balance: 0 });
    }

    const before = wallet.balance;
    wallet.balance += payment.amount;
    await wallet.save();

    // 3. Lưu lịch sử giao dịch
    await WalletTransaction.create({
      wallet: wallet._id,
      type: 'TOP_UP',
      amount: payment.amount,
      balanceBefore: before,
      balanceAfter: wallet.balance,
      status: 'SUCCESS',
      description: `Nạp tiền thành công qua PayOS (Mã: ${webhookData.orderCode})`
    });

    return res.json({ success: true });
  } catch (err) {
    console.error('WEBHOOK ERROR:', err);
    return res.status(400).json({ message: 'Webhook signature invalid' });
  }
};