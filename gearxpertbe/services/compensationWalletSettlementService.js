const Wallet = require("../models/Wallet");
const WalletTransaction = require("../models/WalletTransaction");
const { splitDepositForCompensation } = require("../utils/compensationMoneyMath");
const { compensationAuditLog } = require("../utils/compensationAuditLog");

/** Mongo session tùy chọn (khi null: chạy tuần tự, tương thích mongod standalone). */
function withSess(q, session) {
  return session ? q.session(session) : q;
}
function saveSess(session) {
  return session ? { session } : {};
}
function txSess(session) {
  return session ? { session, ordered: true } : { ordered: true };
}

function logWalletTxBatch(label, created) {
  const arr = Array.isArray(created) ? created : [created];
  compensationAuditLog("WALLET_TX_BATCH", {
    label,
    count: arr.length,
    transactionIds: arr.filter(Boolean).map((d) => String(d._id)),
    types: arr.map((d) => d.type),
  });
}

/**
 * @param {import("mongoose").ClientSession|null|undefined} session
 * @param {{ rental: import("mongoose").Document, proposal: import("mongoose").Document, approvedAmount: number }} params
 * @returns {Promise<{ applied: boolean, deductedFromDeposit?: number, customerPaidFromWallet?: number, supplierReceivedTotal?: number, mode?: string, message?: string }>}
 */
async function applyCompensationWalletOnAdminApprove(session, { rental, proposal, approvedAmount }) {
  const C = Math.max(0, Number(approvedAmount) || 0);
  if (C === 0) {
    compensationAuditLog("WALLET_SETTLE_SKIP", { mode: "SKIP_ZERO", approvedAmount: 0 });
    return { applied: false, mode: "SKIP_ZERO" };
  }

  const resolution = proposal.suggestedResolution || "REQUEST_GX_REVIEW";
  const rentalId = rental._id;
  const shortId = String(rentalId).slice(-6);
  const proposalId = proposal?._id ? String(proposal._id) : null;

  compensationAuditLog("WALLET_SETTLE_START", {
    rentalId: String(rentalId),
    proposalId,
    shortId,
    resolution,
    approvedAmount: C,
    depositStatus: rental.depositStatus,
    depositOnRental: Math.max(0, Number(rental.depositAmount) || 0),
  });

  const adminWallet = await withSess(Wallet.findOne({ isSystem: true }), session);
  if (!adminWallet) {
    throw new Error("Không tìm thấy ví hệ thống");
  }

  const [supplierWallet, customerWallet] = await Promise.all([
    withSess(Wallet.findOne({ user: rental.supplierId }), session),
    withSess(Wallet.findOne({ user: rental.customerId }), session),
  ]);
  if (!supplierWallet) {
    throw new Error("Không tìm thấy ví NCC");
  }
  if (!customerWallet) {
    throw new Error("Không tìm thấy ví khách hàng");
  }

  const deposit = Math.max(0, Number(rental.depositAmount) || 0);
  const depositHeld = rental.depositStatus === "HELD";
  const depositRefunded = rental.depositStatus === "REFUNDED";

  let deductedFromDeposit = 0;
  let customerPaidFromWallet = 0;
  let supplierReceivedTotal = 0;

  /** Lỗi vận hành nền tảng (shipper/staff): trừ ví hệ thống, cộng NCC — không dùng cọc / ví khách. */
  if (resolution === "PLATFORM_LIABILITY") {
    if (Number(adminWallet.availableBalance) < C) {
      throw new Error(
        `Số dư ví khả dụng của hệ thống không đủ để đền bù — cần ${C.toLocaleString("vi-VN")}đ`
      );
    }
    
    const ad0 = adminWallet.balance;
    adminWallet.balance -= C;
    adminWallet.availableBalance -= C; 
    await adminWallet.save(saveSess(session));

    const s0 = supplierWallet.balance;
    supplierWallet.balance += C;
    await supplierWallet.save(saveSess(session));

    const txPl = await WalletTransaction.create(
      [
        {
          wallet: adminWallet._id,
          type: "ADJUSTMENT",
          amount: -C,
          balanceBefore: ad0,
          balanceAfter: adminWallet.balance,
          referenceType: "RENTAL",
          referenceId: rentalId,
          description: `Hệ thống GearXpert đền bù thiệt hại (PLATFORM_LIABILITY) đơn #${shortId}`,
          status: "SUCCESS",
          metadata: { isSystemLiability: true }
        },
        {
          wallet: supplierWallet._id,
          type: "PAYOUT",
          amount: C,
          balanceBefore: s0,
          balanceAfter: supplierWallet.balance,
          referenceType: "RENTAL",
          referenceId: rentalId,
          description: `Nhận tiền đền bù từ hệ thống GearXpert (đơn #${shortId})`,
          status: "SUCCESS",
        },
      ],
      txSess(session)
    );
    logWalletTxBatch("PLATFORM_LIABILITY", txPl);
    const outPl = {
      applied: true,
      mode: "PLATFORM_LIABILITY",
      deductedFromDeposit: 0,
      customerPaidFromWallet: 0,
      supplierReceivedTotal: C,
      platformPaidFromWallet: C,
    };
    compensationAuditLog("WALLET_SETTLE_DONE", { rentalId: String(rentalId), proposalId, ...outPl });
    return outPl;
  }

  if (resolution === "REQUEST_GX_REVIEW") {
    if (depositHeld) {
      const { fromDeposit, overDeposit } = splitDepositForCompensation(deposit, C);
      
      if (fromDeposit > 0) {
        if (Number(adminWallet.balance) < fromDeposit) {
          throw new Error("Số dư ví hệ thống không đủ để giải phóng cọc cho bồi thường");
        }
        const ad0 = adminWallet.balance;
        adminWallet.balance -= fromDeposit; // Trừ từ quỹ escrow
        await adminWallet.save(saveSess(session));

        const sup0 = supplierWallet.balance;
        supplierWallet.balance += fromDeposit;
        await supplierWallet.save(saveSess(session));

        const txFromDeposit = await WalletTransaction.create(
          [
            {
              wallet: adminWallet._id,
              type: "DEPOSIT_RELEASE",
              amount: -fromDeposit,
              balanceBefore: ad0,
              balanceAfter: adminWallet.balance,
              referenceType: "RENTAL",
              referenceId: rentalId,
              description: `Giải phóng cọc cho bồi thường sự cố (Admin duyệt) đơn #${shortId}`,
              status: "SUCCESS",
            },
            {
              wallet: supplierWallet._id,
              type: "PAYOUT",
              amount: fromDeposit,
              balanceBefore: sup0,
              balanceAfter: supplierWallet.balance,
              referenceType: "RENTAL",
              referenceId: rentalId,
              description: `Nhận tiền bồi thường trừ từ tiền cọc của khách (đơn #${shortId})`,
              status: "SUCCESS",
            },
          ],
          txSess(session)
        );
        logWalletTxBatch("REQUEST_GX_FROM_DEPOSIT", txFromDeposit);
        deductedFromDeposit = fromDeposit;
        supplierReceivedTotal += fromDeposit;
      }

      if (overDeposit > 0) {
        if (Number(customerWallet.balance) < overDeposit) {
          throw new Error(
            `Ví khách không đủ số dư cho phần bồi thường vượt cọc (cần ${overDeposit.toLocaleString("vi-VN")}đ)`
          );
        }
        const c0 = customerWallet.balance;
        customerWallet.balance -= overDeposit;
        await customerWallet.save(saveSess(session));

        const s1 = supplierWallet.balance;
        supplierWallet.balance += overDeposit;
        await supplierWallet.save(saveSess(session));

        const txOver = await WalletTransaction.create(
          [
            {
              wallet: customerWallet._id,
              type: "PAYMENT",
              amount: -overDeposit,
              balanceBefore: c0,
              balanceAfter: customerWallet.balance,
              referenceType: "RENTAL",
              referenceId: rentalId,
              description: `Bồi thường sự cố phần vượt quá tiền cọc (đơn #${shortId})`,
              status: "SUCCESS",
            },
            {
              wallet: supplierWallet._id,
              type: "PAYOUT",
              amount: overDeposit,
              balanceBefore: s1,
              balanceAfter: supplierWallet.balance,
              referenceType: "RENTAL",
              referenceId: rentalId,
              description: `Nhận bồi thường phần vượt cọc từ khách (đơn #${shortId})`,
              status: "SUCCESS",
            },
          ],
          txSess(session)
        );
        logWalletTxBatch("REQUEST_GX_OVER_DEPOSIT", txOver);
        customerPaidFromWallet += overDeposit;
        supplierReceivedTotal += overDeposit;
      }

      const outHeld = {
        applied: true,
        mode: "REQUEST_GX_REVIEW_HELD",
        deductedFromDeposit,
        customerPaidFromWallet,
        supplierReceivedTotal,
      };
      compensationAuditLog("WALLET_SETTLE_DONE", { rentalId: String(rentalId), proposalId, ...outHeld });
      return outHeld;
    }

    if (depositRefunded) {
      if (Number(customerWallet.balance) < C) {
        throw new Error(
          `Ví khách không đủ số dư để bồi thường (cần ${C.toLocaleString("vi-VN")}đ)`
        );
      }
      const c0 = customerWallet.balance;
      customerWallet.balance -= C;
      await customerWallet.save(saveSess(session));

      const s0 = supplierWallet.balance;
      supplierWallet.balance += C;
      await supplierWallet.save(saveSess(session));

      const txRef = await WalletTransaction.create(
        [
          {
            wallet: customerWallet._id,
            type: "PAYMENT",
            amount: -C,
            balanceBefore: c0,
            balanceAfter: customerWallet.balance,
            referenceType: "RENTAL",
            referenceId: rentalId,
            description: `Bồi thường sự cố đơn #${shortId} (khấu trừ từ ví do cọc đã hoàn)`,
            status: "SUCCESS",
          },
          {
            wallet: supplierWallet._id,
            type: "PAYOUT",
            amount: C,
            balanceBefore: s0,
            balanceAfter: supplierWallet.balance,
            referenceType: "RENTAL",
            referenceId: rentalId,
            description: `Nhận tiền bồi thường sự cố từ khách (đơn #${shortId})`,
            status: "SUCCESS",
          },
        ],
        txSess(session)
      );
      logWalletTxBatch("REQUEST_GX_REFUNDED_DEPOSIT", txRef);
      customerPaidFromWallet = C;
      supplierReceivedTotal = C;
      const outRef = {
        applied: true,
        mode: "REQUEST_GX_REVIEW_REFUNDED",
        customerPaidFromWallet,
        supplierReceivedTotal,
        deductedFromDeposit: 0,
      };
      compensationAuditLog("WALLET_SETTLE_DONE", { rentalId: String(rentalId), proposalId, ...outRef });
      return outRef;
    }
    throw new Error(
      "Trạng thái cọc đơn thuê không hỗ trợ quyết toán tự động (cần HELD hoặc REFUNDED). Vui lòng xử lý thủ công."
    );
  }

  if (resolution === "CUSTOMER_PAY") {
    if (Number(customerWallet.balance) < C) {
      throw new Error(
        `Ví khách không đủ số dư cho phương án CUSTOMER_PAY (cần ${C.toLocaleString("vi-VN")}đ)`
      );
    }
    const c0 = customerWallet.balance;
    customerWallet.balance -= C;
    await customerWallet.save(saveSess(session));

    const s0 = supplierWallet.balance;
    supplierWallet.balance += C;
    await supplierWallet.save(saveSess(session));

    const txCpay = await WalletTransaction.create(
      [
        {
          wallet: customerWallet._id,
          type: "PAYMENT",
          amount: -C,
          balanceBefore: c0,
          balanceAfter: customerWallet.balance,
          referenceType: "RENTAL",
          referenceId: rentalId,
          description: `Khách trả bồi thường sự cố (thỏa thuận trực tiếp) đơn #${shortId}`,
          status: "SUCCESS",
        },
        {
          wallet: supplierWallet._id,
          type: "PAYOUT",
          amount: C,
          balanceBefore: s0,
          balanceAfter: supplierWallet.balance,
          referenceType: "RENTAL",
          referenceId: rentalId,
          description: `Nhận tiền bồi thường từ khách (theo thỏa thuận) đơn #${shortId}`,
          status: "SUCCESS",
        },
      ],
      txSess(session)
    );
    logWalletTxBatch("CUSTOMER_PAY", txCpay);
    const outCpay = {
      applied: true,
      mode: "CUSTOMER_PAY",
      customerPaidFromWallet: C,
      supplierReceivedTotal: C,
      deductedFromDeposit: 0,
    };
    compensationAuditLog("WALLET_SETTLE_DONE", { rentalId: String(rentalId), proposalId, ...outCpay });
    return outCpay;
  }

  if (resolution === "SUPPLIER_BEAR") {
    if (Number(supplierWallet.balance) < C) {
      throw new Error(
        `Ví NCC không đủ số dư để bồi thường ngược cho khách (cần ${C.toLocaleString("vi-VN")}đ)`
      );
    }
    const s0 = supplierWallet.balance;
    supplierWallet.balance -= C;
    await supplierWallet.save(saveSess(session));

    const c0 = customerWallet.balance;
    customerWallet.balance += C;
    await customerWallet.save(saveSess(session));

    const txBear = await WalletTransaction.create(
      [
        {
          wallet: supplierWallet._id,
          type: "ADJUSTMENT",
          amount: -C,
          balanceBefore: s0,
          balanceAfter: supplierWallet.balance,
          referenceType: "RENTAL",
          referenceId: rentalId,
          description: `NCC bồi thường ngược cho khách do lỗi từ phía NCC (đơn #${shortId})`,
          status: "SUCCESS",
        },
        {
          wallet: customerWallet._id,
          type: "REFUND",
          amount: C,
          balanceBefore: c0,
          balanceAfter: customerWallet.balance,
          referenceType: "RENTAL",
          referenceId: rentalId,
          description: `Nhận tiền bồi thường từ NCC do sự cố đơn #${shortId}`,
          status: "SUCCESS",
        },
      ],
      txSess(session)
    );
    logWalletTxBatch("SUPPLIER_BEAR", txBear);
    const outBear = {
      applied: true,
      mode: "SUPPLIER_BEAR",
      supplierReceivedTotal: -C,
      customerReceivedTotal: C,
      deductedFromDeposit: 0,
    };
    compensationAuditLog("WALLET_SETTLE_DONE", { rentalId: String(rentalId), proposalId, ...outBear });
    return outBear;
  }

  compensationAuditLog("WALLET_SETTLE_FAIL", { rentalId: String(rentalId), proposalId, reason: "UNKNOWN_RESOLUTION" });
  return { applied: false, mode: "UNKNOWN_RESOLUTION" };
}

module.exports = { applyCompensationWalletOnAdminApprove };
