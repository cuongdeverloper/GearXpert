const { createHmac } = require('crypto'); // Dùng thư viện crypto có sẵn của Node.js
const Wallet = require('../../models/Wallet');
const WalletTransaction = require('../../models/WalletTransaction');
const Payment = require('../../models/Payment');
const Rental = require('../../models/Rental');

/**
 * 🛠 CÁC HÀM HỖ TRỢ KIỂM TRA CHỮ KÝ (Theo tài liệu PayOS)
 */
function sortObjDataByKey(object) {
  return Object.keys(object)
    .sort()
    .reduce((obj, key) => {
      obj[key] = object[key];
      return obj;
    }, {});
}

function convertObjToQueryStr(object) {
  return Object.keys(object)
    .filter((key) => object[key] !== undefined)
    .map((key) => {
      let value = object[key];
      if (value && Array.isArray(value)) {
        value = JSON.stringify(value.map((val) => sortObjDataByKey(val)));
      }
      if ([null, undefined, 'undefined', 'null'].includes(value)) {
        value = '';
      }
      return `${key}=${value}`;
    })
    .join('&');
}

/**
 * Hàm kiểm tra tính chính xác của dữ liệu Webhook
 */
function isValidWebhookSignature(webhookBody, checksumKey) {
  const { data, signature } = webhookBody;
  if (!data || !signature) return false;

  const sortedDataByKey = sortObjDataByKey(data);
  const dataQueryStr = convertObjToQueryStr(sortedDataByKey);
  const computedSignature = createHmac('sha256', checksumKey)
    .update(dataQueryStr)
    .digest('hex');

  return computedSignature === signature;
}

/**
 * 🔔 WEBHOOK PAYOS - Xử lý thông báo
 */
exports.handleWebhook = async (req, res) => {
  try {
    const body = req.body;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    // 1. Kiểm tra Ping (Dành cho Dashboard PayOS)
    if (!body || Object.keys(body).length === 0 || body.desc === 'test') {
      return res.status(200).json({ success: true, message: "Webhook URL active" });
    }

    // 2. Kiểm tra chữ ký thủ công (Tránh lỗi "not a function" của SDK)
    const isVerified = isValidWebhookSignature(body, checksumKey);

    if (!isVerified) {
      console.error("[WEBHOOK] Chữ ký không hợp lệ!");
      return res.status(200).json({ success: false, message: "Invalid Signature" });
    }

    const webhookData = body.data;

    // 3. Chỉ xử lý khi trạng thái thanh toán là thành công
    if (body.code !== "00" || webhookData.code !== "00") {
       return res.status(200).json({ success: true, message: "Transaction not successful" });
    }

    const orderCode = webhookData.orderCode;

    /* ================= LUỒNG 1: RENTAL ================= */
    const rental = await Rental.findOne({ orderCode });
    if (rental && rental.paymentStatus !== 'PAID') {
      rental.paymentStatus = 'PAID';
      rental.status = 'APPROVED';
      await rental.save();
      console.log(`[WEBHOOK] Đơn thuê ${orderCode} thành công.`);
      return res.status(200).json({ success: true });
    }

    /* ================= LUỒNG 2: TOP-UP ================= */
    const payment = await Payment.findOne({ orderCode });
    if (payment && payment.status !== 'PAID') {
      payment.status = 'PAID';
      await payment.save();

      let wallet = await Wallet.findOne({ user: payment.user });
      if (!wallet) wallet = await Wallet.create({ user: payment.user, balance: 0 });

      const before = wallet.balance;
      wallet.balance += payment.amount;
      await wallet.save();

      await WalletTransaction.create({
        wallet: wallet._id,
        type: 'TOP_UP',
        amount: payment.amount,
        balanceBefore: before,
        balanceAfter: wallet.balance,
        status: 'SUCCESS',
        description: `Nạp tiền PayOS (Mã: ${orderCode})`
      });

      console.log(`[WEBHOOK] Ví người dùng ${payment.user} đã được cộng tiền.`);
      return res.status(200).json({ success: true });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('WEBHOOK ERROR:', err.message);
    return res.status(200).json({ success: false });
  }
};

/**
 * 🛠 HÀM TẠO LINK THANH TOÁN (Dùng trong Checkout Rental)
 * Sử dụng chuẩn PayOS v2
 */
exports.createRentalPaymentLink = async (newRental) => {
  try {
    // Tạo orderCode duy nhất (9 chữ số cuối của timestamp)
    const orderCode = Number(String(Date.now()).slice(-9));

    const body = {
      orderCode: orderCode,
      amount: newRental.totalAmount,
      description: `GXP ${String(newRental._id).slice(-6)}`.toUpperCase(),
      returnUrl: `${process.env.FRONTEND_URL}/payment/success?rentalId=${newRental._id}`,
      cancelUrl: `${process.env.FRONTEND_URL}/payment/cancel?rentalId=${newRental._id}`,
      items: [{
        name: "Thuê thiết bị GearXpert",
        quantity: 1,
        price: newRental.totalAmount
      }]
    };

    // Gọi SDK PayOS v2
    const paymentLinkRes = await payos.createPaymentLink(body);

    // Lưu orderCode vào đơn hàng để Webhook đối soát sau này
    newRental.orderCode = orderCode;
    await newRental.save();

    return paymentLinkRes;
  } catch (error) {
    console.error("PayOS Create Link Error:", error);
    throw new Error("Không thể khởi tạo thanh toán với PayOS");
  }
};