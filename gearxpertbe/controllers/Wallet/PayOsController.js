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

    // Test webhook hoặc empty
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

    const rentals = await Rental.find({ orderCode });

    // 1. Thanh toán THẤT BẠI hoặc HỦY → rollback stock (đã có sẵn), không đụng rentedQuantity
    if (body.code !== "00" || webhookData.code !== "00") {
      console.log(`[WEBHOOK] Đơn ${orderCode} thất bại/hủy`);

      if (
        rentals.length > 0 &&
        rentals[0].paymentStatus === "UNPAID" &&
        rentals[0].status !== "CANCELLED"
      ) {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          await Rental.updateMany(
            { orderCode },
            { status: "CANCELLED" },
            { session }
          );

          for (const rental of rentals) {
            const items = await RentalItem.find({
              rentalId: rental._id,
            }).session(session);
            for (const item of items) {
              const device = await Device.findByIdAndUpdate(
                item.deviceId,
                { $inc: { stockQuantity: item.quantity } },
                { new: true, session }
              );
              if (device?.stockQuantity > 0 && device.status === "RENTED") {
                await Device.updateOne(
                  { _id: device._id },
                  { status: "AVAILABLE" },
                  { session }
                );
              }
            }
          }

          await session.commitTransaction();
          session.endSession();
          return res
            .status(200)
            .json({ success: true, message: "Cancelled & stock restored" });
        } catch (err) {
          await session.abortTransaction();
          session.endSession();
          console.error("[WEBHOOK CANCEL ERROR]", err);
          return res.status(500).json({ success: false });
        }
      }
      return res.status(200).json({ success: true });
    }

    // 2. THANH TOÁN THÀNH CÔNG (BANK) → tăng rentedQuantity + update status nếu cần
    if (rentals.length > 0 && rentals[0].paymentStatus !== "PAID") {
      const session = await mongoose.startSession();
      session.startTransaction();

      try {
        const customerId = rentals[0].customerId;
        const deviceIdsToClear = [];

        // Update PAID
        await Rental.updateMany(
          { orderCode },
          { paymentStatus: "PAID", status: "PENDING" },
          { session }
        );

        // Thu thập deviceIds để clear cart + tăng rentedQuantity
        for (const rental of rentals) {
          const items = await RentalItem.find({ rentalId: rental._id }).session(
            session
          );
          for (const item of items) {
            deviceIdsToClear.push(item.deviceId.toString());

            // TĂNG rentedQuantity khi thanh toán thành công
            const device = await Device.findByIdAndUpdate(
              item.deviceId,
              { $inc: { rentedQuantity: item.quantity } },
              { new: true, session }
            );

            // Nếu rentedQuantity đã bằng hoặc vượt stock → set status RENTED
            if (device && device.rentedQuantity >= device.stockQuantity) {
              await Device.updateOne(
                { _id: device._id },
                { status: "RENTED" },
                { session }
              );
            }
          }
        }

        // Clear cart (chỉ các món đã thanh toán)
        const cart = await Cart.findOne({
          customerId,
          cartType: "NORMAL",
        }).session(session);
        if (cart && cart.items.length > 0) {
          const cartItems = await CartItem.find({
            _id: { $in: cart.items },
          }).session(session);
          const toDelete = cartItems
            .filter((ci) => deviceIdsToClear.includes(ci.deviceId.toString()))
            .map((ci) => ci._id);

          if (toDelete.length > 0) {
            await CartItem.deleteMany({ _id: { $in: toDelete } }).session(
              session
            );
            cart.items = cart.items.filter(
              (id) => !toDelete.some((d) => d.equals(id))
            );
            await cart.save({ session });
          }
        }

        // Trừ voucher (chỉ 1 lần cho toàn bộ order)
        let voucherUsed = false;
        if (rentals[0].voucherCode) {
          const updated = await Voucher.updateOne(
            {
              code: rentals[0].voucherCode,
              status: "ACTIVE",
            },
            { $inc: { usedCount: 1 } },
            { session }
          );
          voucherUsed = updated.modifiedCount === 1;
        }

        // Gửi thông báo cho supplier
        for (const rental of rentals) {
          await sendRentalNotification(
            rental,
            "SUPPLIER",
            "Đơn thuê đã thanh toán thành công",
            `Khách hàng đã thanh toán ${rental.totalAmount.toLocaleString(
              "vi-VN"
            )}₫ qua ngân hàng`,
            "/payments" // hoặc tùy chỉnh link
          );
        }

        await session.commitTransaction();
        session.endSession();

        console.log(
          `[WEBHOOK SUCCESS] Đơn ${orderCode} - Voucher used: ${voucherUsed}`
        );
        return res.status(200).json({ success: true });
      } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("[WEBHOOK RENTAL ERROR]", err);
        return res.status(500).json({ success: false });
      }
    }

    // 3. TOP-UP WALLET (không liên quan rentedQuantity)
    const payment = await Payment.findOne({ orderCode });
    if (payment && payment.status !== "PAID") {
      // ... giữ nguyên phần top-up
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

      console.log(`[WEBHOOK] Top-up thành công cho user ${payment.user}`);
      return res.status(200).json({ success: true });
    }

    // Idempotent: đã xử lý trước đó
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("WEBHOOK GLOBAL ERROR:", err.message);
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
