const cron = require('node-cron');
const mongoose = require('mongoose');
const Rental = require('../models/Rental');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const NotificationConfig = require('../configs/NotificationConfig');

const AUTO_CONFIRM_HOURS = 24;

async function runAutoConfirm() {
  const threshold = new Date(Date.now() - AUTO_CONFIRM_HOURS * 60 * 60 * 1000);

  // Find rentals where staff confirmed delivery but customer hasn't confirmed yet
  const rentals = await Rental.find({
    status: 'DELIVERING',
    deliveredAt: { $lte: threshold },
  });

  if (rentals.length === 0) return;

  console.log(`[AutoConfirm] Processing ${rentals.length} overdue rental(s)...`);

  for (const rental of rentals) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      // Re-fetch inside session
      const freshRental = await Rental.findById(rental._id).session(session);

      // Guard: may have been confirmed in the meantime
      if (!freshRental || freshRental.status !== 'DELIVERING') {
        await session.abortTransaction();
        session.endSession();
        continue;
      }

      freshRental.status = 'RENTING';
      await freshRental.save({ session });

      // Credit supplier wallet
      const supplierWallet = await Wallet.findOne({ user: freshRental.supplierId }).session(session);
      if (supplierWallet) {
        const amountToSupplier = freshRental.rentPriceTotal;
        const balanceBefore = supplierWallet.balance;
        supplierWallet.balance += amountToSupplier;
        await supplierWallet.save({ session });

        await WalletTransaction.create(
          [
            {
              wallet: supplierWallet._id,
              type: 'PAYMENT',
              amount: amountToSupplier,
              balanceBefore,
              balanceAfter: supplierWallet.balance,
              referenceType: 'RENTAL',
              referenceId: freshRental._id,
              description: `Tự động xác nhận nhận hàng (quá 24h) - Đơn #${freshRental._id.toString().slice(-6)}`,
            },
          ],
          { session }
        );
      }

      await session.commitTransaction();

      // Send notifications (outside transaction is fine for notifications)
      try {
        await NotificationConfig.sendNotification({
          senderId: null,
          receiverId: freshRental.supplierId,
          title: 'Đơn hàng tự động xác nhận',
          message: `Khách hàng không xác nhận sau 24h. Hệ thống đã tự động xác nhận đơn #${freshRental._id.toString().slice(-6)} — thiết bị đang được sử dụng.`,
          link: `/supplier/rental-requests`,
          type: 'ORDER',
        });
        await NotificationConfig.sendNotification({
          senderId: null,
          receiverId: freshRental.customerId,
          title: 'Đơn hàng đã được xác nhận tự động',
          message: `Do bạn chưa xác nhận nhận hàng sau 24h, hệ thống đã tự động xác nhận đơn #${freshRental._id.toString().slice(-6)}.`,
          link: `/my-rentals`,
          type: 'ORDER',
        });
      } catch (notifErr) {
        console.error('[AutoConfirm] Notification error:', notifErr.message);
      }

      console.log(`[AutoConfirm] Auto-confirmed rental ${freshRental._id}`);
    } catch (err) {
      await session.abortTransaction();
      console.error(`[AutoConfirm] Failed for rental ${rental._id}:`, err.message);
    } finally {
      session.endSession();
    }
  }
}

function startAutoConfirmJob() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('[AutoConfirm] Running auto-confirm delivery check...');
    try {
      await runAutoConfirm();
    } catch (err) {
      console.error('[AutoConfirm] Unexpected error:', err.message);
    }
  });
  console.log('[AutoConfirm] Job scheduled (every hour).');
}

module.exports = { startAutoConfirmJob };
