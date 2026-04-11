const { createHmac } = require("crypto");
const { PayOS } = require("@payos/node");

const Wallet = require("../../models/Wallet");
const WalletTransaction = require("../../models/WalletTransaction");
const Payment = require("../../models/Payment");
const Rental = require("../../models/Rental");

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
      let totalPlatformFee = 0;

      for (const rental of rentals) {
        rental.paymentStatus = "PAID";
        rental.status = "PENDING";
        await rental.save();

        totalPlatformFee += rental.paymentBreakdown?.platformFee || 0;

        // 👉 xử lý nặng tách riêng
        handleContractUpload(rental);
      }

      // cộng tiền system
      const systemWallet = await Wallet.findOne({ isSystem: true });
      if (systemWallet) {
        const before = systemWallet.balance;
        systemWallet.balance += totalPlatformFee;
        await systemWallet.save();

        await WalletTransaction.create({
          wallet: systemWallet._id,
          type: "PLATFORM_FEE",
          amount: totalPlatformFee,
          balanceBefore: before,
          balanceAfter: systemWallet.balance,
          status: "SUCCESS",
          description: `Platform fee (PayOS - ${orderCode})`,
        });
      }

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