const { createHmac } = require("crypto");
const { PayOS } = require("@payos/node");

const Wallet = require("../../models/Wallet");
const WalletTransaction = require("../../models/WalletTransaction");
const Payment = require("../../models/Payment");
const Rental = require("../../models/Rental");
const Voucher = require("../../models/Voucher");
const RentalItem = require("../../models/RentalItem");
const User = require("../../models/User");
const { sendMail } = require("../../configs/sendMail");
const EmailTemplates = require("../../utils/EmailTemplates");

// Init PayOS
const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

/**
 * ================= HELPER =================
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
 * ================= WEBHOOK =================
 * ⚠️ TRẢ RESPONSE NGAY - KHÔNG XỬ LÝ NẶNG
 */
exports.handleWebhook = async (req, res) => {
  try {
    const body = req.body;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    console.log("🔥 PAYOS WEBHOOK:", body);

    // Ping test
    if (!body || Object.keys(body).length === 0 || body.desc === "test") {
      return res.status(200).json({ success: true });
    }

    // Verify signature
    if (!isValidWebhookSignature(body, checksumKey)) {
      console.error("[WEBHOOK] Invalid signature");
      return res.status(200).json({ success: false });
    }

    // ✅ TRẢ NGAY (QUAN TRỌNG NHẤT)
    res.status(200).json({ success: true });

    // 👉 xử lý async phía sau
    console.log("[WEBHOOK] Processing async...");
    processWebhook(body).catch((err) => {
      console.error("[WEBHOOK] Async processing error:", err);
    });

  } catch (err) {
    console.error("WEBHOOK ERROR:", err);
    return res.status(200).json({ success: true });
  }
};

/**
 * ================= PROCESS BACKGROUND =================
 */
const processWebhook = async (body) => {
  try {
    const webhookData = body.data;
    const orderCode = webhookData?.orderCode;

    console.log("[WEBHOOK] Received orderCode:", orderCode);
    console.log("[WEBHOOK] Body code:", body.code, "Data code:", webhookData?.code);

    if (!orderCode) {
      console.log("[WEBHOOK] ❌ No orderCode found");
      return;
    }

    // chỉ xử lý khi thành công
    if (body.code !== "00" || webhookData.code !== "00") {
      console.log("[WEBHOOK] ❌ Payment not successful, skipping");
      return;
    }

    console.log("[WEBHOOK] ✅ Processing order:", orderCode);

    const rentals = await Rental.find({ orderCode });
    console.log("[WEBHOOK] Found rentals:", rentals.length);
    
    if (rentals.length > 0) {
      console.log("[WEBHOOK] Rental status:", rentals[0].paymentStatus);
    }

    // ===== CASE 1: RENTAL =====
    if (rentals.length > 0 && rentals[0].paymentStatus !== "PAID") {
      console.log("[WEBHOOK] 🔄 Updating rental to PAID...");

      // Mark all rentals as PAID first
      for (const rental of rentals) {
        rental.paymentStatus = "PAID";
        rental.status = "PENDING";
        await rental.save();
        handleContractUpload(rental);
      }

      // NEW: Increment voucher usedCount for Bank payment (ONCE per order)
      const firstWithVoucher = rentals.find(r => r.voucherCode);
      if (firstWithVoucher) {
        await Voucher.updateOne(
          { code: firstWithVoucher.voucherCode },
          { $inc: { usedCount: 1 } }
        ).catch(err => console.error("[WEBHOOK] Voucher increment error:", err));
      }

      // Create per-rental system wallet transactions (với đúng referenceId cho mỗi rental)
      const systemWallet = await Wallet.findOne({ isSystem: true });
      if (systemWallet) {
        const txNow = new Date();
        let sysRunningBalance = systemWallet.balance;
        const systemTxs = [];

        for (let idx = 0; idx < rentals.length; idx++) {
          const rental = rentals[idx];
          const pFee = rental.paymentBreakdown?.platformFee || 0;
          const rentAmount = rental.paymentBreakdown?.rentAmount || 0;
          const depositAmt = rental.paymentBreakdown?.depositAmount || 0;
          const shippingFee = rental.deliveryFee || 0;
          // ESCROW = rentAmount - platformFee (rentAmount = rentAfterDiscount trong checkout)
          const netEscrow = Math.max(0, rentAmount - pFee);
          const offset = idx * 4;

          if (pFee > 0) {
            systemTxs.push({
              wallet: systemWallet._id,
              type: "PLATFORM_FEE",
              amount: pFee,
              balanceBefore: sysRunningBalance,
              balanceAfter: sysRunningBalance + pFee,
              status: "SUCCESS",
              description: `Thu phí nền tảng đơn #${rental._id.toString().slice(-6)} (PayOS)`,
              referenceType: "RENTAL",
              referenceId: rental._id,
              createdAt: new Date(txNow.getTime() + offset),
              isEarned: false,
              rentalStatus: "PENDING",
              metadata: { orderCode, paymentMethod: "BANK" },
            });
            sysRunningBalance += pFee;
          }

          if (netEscrow > 0) {
            systemTxs.push({
              wallet: systemWallet._id,
              type: "ESCROW_HOLD",
              amount: netEscrow,
              balanceBefore: sysRunningBalance,
              balanceAfter: sysRunningBalance + netEscrow,
              status: "SUCCESS",
              description: `Tiền thuê tạm giữ đơn #${rental._id.toString().slice(-6)} (PayOS)`,
              referenceType: "RENTAL",
              referenceId: rental._id,
              createdAt: new Date(txNow.getTime() + offset + 1),
            });
            sysRunningBalance += netEscrow;
          }

          if (depositAmt > 0) {
            systemTxs.push({
              wallet: systemWallet._id,
              type: "DEPOSIT_HOLD",
              amount: depositAmt,
              balanceBefore: sysRunningBalance,
              balanceAfter: sysRunningBalance + depositAmt,
              status: "SUCCESS",
              description: `Tiền đặt cọc tạm giữ đơn #${rental._id.toString().slice(-6)} (PayOS)`,
              referenceType: "RENTAL",
              referenceId: rental._id,
              createdAt: new Date(txNow.getTime() + offset + 2),
            });
            sysRunningBalance += depositAmt;
          }

          if (shippingFee > 0) {
            systemTxs.push({
              wallet: systemWallet._id,
              type: "SHIPPING_FEE",
              amount: shippingFee,
              balanceBefore: sysRunningBalance,
              balanceAfter: sysRunningBalance + shippingFee,
              status: "SUCCESS",
              description: `Phí vận chuyển đơn #${rental._id.toString().slice(-6)} (PayOS)`,
              referenceType: "RENTAL",
              referenceId: rental._id,
              createdAt: new Date(txNow.getTime() + offset + 3),
              isEarned: false,
              rentalStatus: "PENDING",
              metadata: { orderCode, paymentMethod: "BANK" },
            });
            sysRunningBalance += shippingFee;
          }
        }

        systemWallet.balance = sysRunningBalance;
        await systemWallet.save();

        if (systemTxs.length > 0) {
          await WalletTransaction.insertMany(systemTxs);
        }
      }

      // --- SEND EMAIL CONFIRMATION ---
      try {
        const customerId = rentals[0].customerId;
        const user = await User.findById(customerId).select("fullName email");
        
        if (user && user.email) {
          const rentalsWithItems = await Promise.all(rentals.map(async (r) => {
            const supplier = await User.findById(r.supplierId).select("fullName");
            const itemsList = await RentalItem.find({ rentalId: r._id }).populate("deviceId", "name");
            
            return {
              ...r.toObject(),
              supplierName: supplier?.fullName || "Nhà cung cấp",
              items: itemsList.map(it => ({
                name: it.deviceId?.name || "Thiết bị",
                quantity: it.quantity,
                rentalStartDate: it.rentalStartDate,
                rentalEndDate: it.rentalEndDate,
                totalAmount: it.rentPrice * it.quantity
              }))
            };
          }));

          const emailHtml = EmailTemplates.orderConfirmationTemplate(
            user.fullName,
            rentalsWithItems,
            orderCode
          );

          await sendMail(user.email, "Thanh toán đơn hàng thành công - GearXpert", emailHtml);
          console.log(`[WEBHOOK] Confirmation email sent to ${user.email}`);
        }
      } catch (mailErr) {
        console.error("[WEBHOOK] Error sending confirmation email:", mailErr);
      }
      // --- END SEND EMAIL ---

      return;
    }

    // ===== CASE 2: WALLET TOPUP =====
    const payment = await Payment.findOne({ orderCode });
    if (payment && payment.status !== "PAID") {
      payment.status = "PAID";
      await payment.save();

      let wallet = await Wallet.findOne({ user: payment.user });
      if (!wallet) {
        wallet = await Wallet.create({ user: payment.user, balance: 0 });
      }

      const before = wallet.balance + (wallet.availableBalance || 0);
      
      // Nếu là ví hệ thống, tiền nạp vào được tính là khả dụng ngay và không vào ví treo (balance)
      if (wallet.isSystem) {
        wallet.availableBalance = (wallet.availableBalance || 0) + payment.amount;
      } else {
        wallet.balance += payment.amount;
      }

      await wallet.save();

      await WalletTransaction.create({
        wallet: wallet._id,
        type: "TOP_UP",
        amount: payment.amount,
        balanceBefore: before,
        balanceAfter: wallet.balance,
        status: "SUCCESS",
        description: `Topup PayOS (${orderCode})`,
      });
    }

  } catch (err) {
    console.error("❌ PROCESS WEBHOOK ERROR:", err);
  }
};

/**
 * ================= CONTRACT UPLOAD (ASYNC) =================
 */
const handleContractUpload = async (rental) => {
  try {
    const { generateDocxBuffer } = require("../Contract/ContractController");
    const Contract = require("../../models/Contract");
    const ContractFile = require("../../models/ContractFile");
    const cloudinary = require("cloudinary").v2;

    const buf = await generateDocxBuffer(rental);

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        {
          resource_type: "raw",
          folder: "contracts",
          public_id: `contract-${rental._id}-${Date.now()}`,
          format: "docx",
        },
        (err, result) => (err ? reject(err) : resolve(result))
      ).end(buf);
    });

    const contractRecord = await Contract.create({
      rentalId: rental._id,
      contractType: "DELIVERY",
      status: "SIGNED",
      customer: rental.customerId,
      supplier: rental.supplierId,
      signedAt: new Date(),
    });

    await ContractFile.create({
      contractId: contractRecord._id,
      fileUrl: uploadResult.secure_url,
      fileType: "DELIVERY",
      uploadedBy: rental.customerId,
    });

  } catch (err) {
    console.error("❌ CONTRACT ERROR:", err);
  }
};

/**
 * ================= CREATE PAYMENT =================
 */
exports.createRentalPaymentLink = async (newRental) => {
  try {
    const orderCode = Number(String(Date.now()).slice(-9));

    const body = {
      orderCode,
      amount: newRental.totalAmount,
      description: `GXP ${String(newRental._id).slice(-6)}`.toUpperCase(),
      returnUrl: `${process.env.FRONTEND_URL}/payment/success?rentalId=${newRental._id}`,
      cancelUrl: `${process.env.FRONTEND_URL}/payment/cancel?rentalId=${newRental._id}`,
      items: [
        {
          name: "GearXpert Rental",
          quantity: 1,
          price: newRental.totalAmount,
        },
      ],
    };

    const resPay = await payos.createPaymentLink(body);

    newRental.orderCode = orderCode;
    await newRental.save();

    return resPay;
  } catch (err) {
    console.error("Create PayOS Error:", err);
    throw err;
  }
};