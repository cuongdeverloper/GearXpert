const cron = require("node-cron");
const mongoose = require("mongoose");
const Rental = require("../models/Rental");
const RentalItem = require("../models/RentalItem");
const DeviceItem = require("../models/DeviceItem");
const CartItem = require("../models/CartItem");
const { sendRentalNotification } = require("../controllers/Rental/RentalController"); 

// Chạy mỗi ngày lúc 00:05 (hoặc chỉnh giờ bạn muốn)
cron.schedule("5 0 * * *", async () => {
  console.log("[CRON] Bắt đầu kiểm tra đơn UNPAID + PENDING quá 1 ngày...");

  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const expiredRentals = await Rental.find({
    paymentStatus: "UNPAID",
    status: "PENDING",
    createdAt: { $lte: oneDayAgo },
  }).lean();

  if (expiredRentals.length === 0) {
    console.log("[CRON] Không có đơn nào cần hủy tự động.");
    return;
  }

  console.log(`[CRON] Tìm thấy ${expiredRentals.length} đơn cần hủy tự động.`);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    for (const rental of expiredRentals) {
      // 1. Lấy tất cả RentalItem của đơn này
      const rentalItems = await RentalItem.find({ rentalId: rental._id }).session(session);

      // 2. Restore quantity & status DeviceItem
      for (const item of rentalItems) {
        if (item.deviceItemIds && item.deviceItemIds.length > 0) {
          // Restore status DeviceItem → AVAILABLE
          await DeviceItem.updateMany(
            { _id: { $in: item.deviceItemIds } },
            { $set: { status: "AVAILABLE" } },
            { session }
          );

          await DeviceItem.updateDeviceCounts(item.deviceId, session);

          console.log(
            `[CRON RESTORE] Đơn ${rental._id}: restored ${item.quantity} DeviceItem(s) for device ${item.deviceId}`
          );
        }
      }

      // 3. Update Rental status
      await Rental.updateOne(
        { _id: rental._id },
        {
          status: "CANCELLED",
          cancelledAt: new Date(),
          cancelReason: "Hết hạn thanh toán (tự động sau 24h)",
        },
        { session }
      );

      // 4. Gửi thông báo cho CUSTOMER
      await sendRentalNotification(
        rental,
        "CUSTOMER",
        "Đơn thuê đã bị hủy tự động",
        `Đơn #${rental._id.toString().slice(-6)} của bạn đã bị hủy do chưa thanh toán sau 24 giờ. Vui lòng đặt lại nếu vẫn muốn thuê.`
      );

      // 5. Gửi thông báo cho SUPPLIER
      await sendRentalNotification(
        rental,
        "SUPPLIER",
        "Đơn thuê bị hủy tự động",
        `Đơn #${rental._id.toString().slice(-6)} của khách đã bị hủy do hết hạn thanh toán (24h). Thiết bị đã được khôi phục về kho.`
      );

    }

    await session.commitTransaction();
    console.log(`[CRON SUCCESS] Đã hủy tự động và restore ${expiredRentals.length} đơn.`);
  } catch (err) {
    await session.abortTransaction();
    console.error("[CRON ERROR] Auto cancel unpaid rentals failed:", err);
  } finally {
    session.endSession();
  }
});

// Khởi động cron khi server chạy (thêm vào file server chính, ví dụ app.js hoặc index.js)
console.log("[CRON] Auto cancel unpaid rentals job đã được lên lịch (00:05 hàng ngày).");