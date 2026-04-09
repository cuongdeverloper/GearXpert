const cron = require('node-cron');
const Rental = require('../models/Rental');
const RentalItem = require('../models/RentalItem');
const NotificationConfig = require('../configs/NotificationConfig');
const { ensureDraftForReturn } = require('../services/ReturnService');
const { emitOperationStaffUpdate } = require('../utils/operationStaffSocket');

async function runAutoReturn() {
  const now = new Date();

  // rentalEndDate nằm trên RentalItem, không phải Rental.
  // Tìm RentalItem hết hạn thuộc các đơn đang RENTING
  const expiredItems = await RentalItem.find({
    rentalEndDate: { $lte: now },
  }).distinct('rentalId');

  if (expiredItems.length === 0) return;

  // Lọc các Rental thực sự đang RENTING
  const expiringRentals = await Rental.find({
    _id: { $in: expiredItems },
    status: 'RENTING',
  });

  if (expiringRentals.length === 0) return;


  for (const rental of expiringRentals) {
    try {
      // rental.status = 'RETURNING';
      // await rental.save();
      await Rental.updateOne({ _id: rental._id }, { status: 'RETURNING' });

      // Ensure retrieval draft exists as soon as rental enters RETURNING.
      await ensureDraftForReturn({ rentalId: rental._id });

      // Thông báo cho khách hàng
      try {
        await NotificationConfig.sendNotification({
          senderId: null,
          receiverId: rental.customerId,
          title: 'Đơn thuê đã hết hạn - Cần trả thiết bị',
          message: `Đơn thuê #${rental._id.toString().slice(-6).toUpperCase()} đã hết hạn thuê. Nhân viên sẽ đến thu hồi thiết bị sớm, vui lòng chuẩn bị thiết bị để bàn giao.`,
          link: `/my-rentals`,
          type: 'ORDER',
        });
      } catch (notifErr) {
        console.error(`[AutoReturn] Notification to customer failed:`, notifErr.message);
      }

      // Thông báo cho nhà cung cấp
      try {
        await NotificationConfig.sendNotification({
          senderId: null,
          receiverId: rental.supplierId,
          title: 'Thiết bị đang được thu hồi',
          message: `Đơn thuê #${rental._id.toString().slice(-6).toUpperCase()} đã hết hạn và chuyển sang trạng thái Thu hồi.`,
          link: `/supplier/rental-requests`,
          type: 'ORDER',
        });
      } catch (notifErr) {
        console.error(`[AutoReturn] Notification to supplier failed:`, notifErr.message);
      }

      emitOperationStaffUpdate({
        action: 'RENTAL_AUTO_RETURNING',
        message: 'Có đơn chuyển sang thu hồi (hết hạn).',
        rentalId: String(rental._id),
      });
    } catch (err) {
      console.error(`[AutoReturn] Failed for rental ${rental._id}:`, err.message);
    }
  }
}

function startAutoReturnJob() {
  // Chạy mỗi 30 phút để kiểm tra đơn hết hạn
  cron.schedule('*/30 * * * *', async () => {
    try {
      await runAutoReturn();
    } catch (err) {
      console.error('[AutoReturn] Unexpected error:', err.message);
    }
  });
}

module.exports = { startAutoReturnJob };
