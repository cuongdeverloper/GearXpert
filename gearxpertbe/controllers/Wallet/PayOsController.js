const { createHmac } = require("crypto"); // Dùng thư viện crypto có sẵn của Node.js
const Wallet = require("../../models/Wallet");
const WalletTransaction = require("../../models/WalletTransaction");
const Payment = require("../../models/Payment");
const Rental = require("../../models/Rental");
const RentalItem = require("../../models/RentalItem");
const Device = require("../../models/Device");
const Cart = require("../../models/Cart");
const CartItem = require("../../models/CartItem");
const Voucher = require("../../models/Voucher");

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
      if ([null, undefined, "undefined", "null"].includes(value)) {
        value = "";
      }
      return `${key}=${value}`;
    })
    .join("&");
}

/**
 * Hàm kiểm tra tính chính xác của dữ liệu Webhook
 */
function isValidWebhookSignature(webhookBody, checksumKey) {
  const { data, signature } = webhookBody;
  if (!data || !signature) return false;

  const sortedDataByKey = sortObjDataByKey(data);
  const dataQueryStr = convertObjToQueryStr(sortedDataByKey);
  const computedSignature = createHmac("sha256", checksumKey)
    .update(dataQueryStr)
    .digest("hex");

  return computedSignature === signature;
}

/**
 * 🔔 WEBHOOK PAYOS - Xử lý thông báo
 */
exports.handleWebhook = async (req, res) => {
  try {
    const body = req.body;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (!body || Object.keys(body).length === 0 || body.desc === "test") {
      return res
        .status(200)
        .json({ success: true, message: "Webhook URL active" });
    }

    if (!isValidWebhookSignature(body, checksumKey)) {
      console.error("[WEBHOOK] Invalid signature");
      return res
        .status(200)
        .json({ success: false, message: "Invalid Signature" });
    }

    const webhookData = body.data;
    const orderCode = webhookData.orderCode;

    // Chỉ xử lý khi thanh toán thành công
    if (body.code !== "00" || webhookData.code !== "00") {
      console.log(`[WEBHOOK] Đơn ${orderCode} thất bại/hủy`);
      return res.status(200).json({ success: true });
    }

    const rentals = await Rental.find({ orderCode });

    if (rentals.length === 0) {
      // Có thể là top-up wallet hoặc order khác → xử lý tiếp bên dưới
    } else if (rentals[0].paymentStatus !== "PAID") {
      // Đây là thanh toán rental (BANK)
      const customerId = rentals[0].customerId;
      let voucherCodeToUse = null;
      const isRepay = rentals.length === 1;

      let totalPlatformFee = 0;

      for (const rental of rentals) {
        rental.paymentStatus = "PAID";
        rental.status = "PENDING";
        await rental.save();

        totalPlatformFee += rental.paymentBreakdown.platformFee;

        if (rental.voucherCode && !voucherCodeToUse) {
          voucherCodeToUse = rental.voucherCode;
        }

        const notiTitle = isRepay
          ? "Đơn thuê đã thanh toán thành công (thanh toán lại)"
          : "Đơn thuê đã thanh toán thành công";
        const notiMessage = isRepay
          ? `Khách hàng đã thanh toán lại ${rental.totalAmount.toLocaleString(
              "vi-VN"
            )}₫ qua ngân hàng.`
          : `Khách hàng đã thanh toán ${rental.totalAmount.toLocaleString(
              "vi-VN"
            )}₫ qua ngân hàng.`;

        await NotificationConfig.sendNotification({
          senderId: customerId,
          receiverId: rental.supplierId,
          title: notiTitle,
          message: notiMessage,
          link: `/supplier/orders/${rental._id}`,
          type: "ORDER",
        });
      }

      // Cộng phí nền tảng vào ví system
      const systemWallet = await Wallet.findOne({ isSystem: true });
      if (systemWallet) {
        const sysBalanceBefore = systemWallet.balance;
        systemWallet.balance += totalPlatformFee;
        await systemWallet.save();

        await WalletTransaction.create({
          wallet: systemWallet._id,
          type: "PLATFORM_FEE",
          amount: totalPlatformFee,
          balanceBefore: sysBalanceBefore,
          balanceAfter: systemWallet.balance,
          referenceType: "RENTAL",
          status: "SUCCESS",
          description: `Thu phí nền tảng từ ${rentals.length} đơn thuê (PayOS - ${orderCode})`,
        });
      }

      // Tăng usedCount voucher (chỉ 1 lần)
      if (voucherCodeToUse) {
        await Voucher.updateOne(
          { code: voucherCodeToUse, status: "ACTIVE" },
          { $inc: { usedCount: 1 } }
        );
      }

      console.log(
        `[WEBHOOK SUCCESS] Rental ${orderCode} - Platform fee ${totalPlatformFee} đã cộng vào ví system`
      );
      return res.status(200).json({ success: true });
    }

    // Xử lý top-up wallet (giữ nguyên)
    const payment = await Payment.findOne({ orderCode });
    if (payment && payment.status !== "PAID") {
      payment.status = "PAID";
      await payment.save();

      let wallet = await Wallet.findOne({ user: payment.user });
      if (!wallet)
        wallet = await Wallet.create({ user: payment.user, balance: 0 });

      const before = wallet.balance;
      wallet.balance += payment.amount;
      await wallet.save();

      await WalletTransaction.create({
        wallet: wallet._id,
        type: "TOP_UP",
        amount: payment.amount,
        balanceBefore: before,
        balanceAfter: wallet.balance,
        status: "SUCCESS",
        description: `Nạp tiền PayOS (Mã: ${orderCode})`,
      });

      return res.status(200).json({ success: true });
    }

    // Idempotent
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("WEBHOOK ERROR:", err.message);
    return res.status(200).json({ success: true }); // Luôn trả 200 cho PayOS
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
      items: [
        {
          name: "Thuê thiết bị GearXpert",
          quantity: 1,
          price: newRental.totalAmount,
        },
      ],
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
