const cron = require("node-cron");
const mongoose = require("mongoose");
const RentalItem = require("../models/RentalItem");
const Rental = require("../models/Rental");
const NotificationConfig = require("../configs/NotificationConfig");

const startRentalDueReminders = () => {
  // Chạy mỗi giây để test: '* * * * * *'
  // Chạy thực tế 8h sáng: '0 8 * * *'
  cron.schedule("0 8 * * *", async () => {
    if (mongoose.connection.readyState !== 1) return;

    console.log("🔄 Đang quét RentalItems sắp hết hạn...");

    const now = new Date();
    const todayStart = new Date(now.setHours(0, 0, 0, 0));
    const todayEnd = new Date(now.setHours(23, 59, 59, 999));

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const tomorrowEnd = new Date(todayEnd);
    tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

    try {
      // --- 1. NHẮC TRƯỚC 1 NGÀY ---
      // Tìm RentalItem có ngày kết thúc là ngày mai
      const itemsDueTomorrow = await RentalItem.find({
        status: "RENTING",
        rentalEndDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
      }).populate({
        path: "rentalId",
        match: { isRemindedTomorrow: false }, // Chỉ lấy nếu đơn cha chưa nhắc
      });

      for (const item of itemsDueTomorrow) {
        const rental = item.rentalId;
        if (!rental) continue; // Bỏ qua nếu rental đã được nhắc hoặc không tồn tại

        await NotificationConfig.sendNotification({
          senderId: rental.supplierId,
          receiverId: rental.customerId,
          title: "⏰ Còn 1 ngày nữa phải trả thiết bị!",
          message: `Thiết bị ${
            item.deviceSnapshot?.name
          } trong đơn #${rental._id
            .toString()
            .slice(-6)} sẽ hết hạn vào ngày mai.`,
          link: `/my-rentals/${rental._id}`,
          type: "RENTAL_REMINDER",
        });

        // Đánh dấu đơn cha đã nhắc để không gửi lặp cho các Item khác cùng đơn
        await Rental.findByIdAndUpdate(rental._id, {
          isRemindedTomorrow: true,
        });
        console.log(`✅ Đã gửi nhắc nhở ngày mai cho đơn: ${rental._id}`);
      }

      // --- 2. NHẮC ĐÚNG NGÀY HÔM NAY ---
      const itemsDueToday = await RentalItem.find({
        status: "RENTING",
        rentalEndDate: { $gte: todayStart, $lte: todayEnd },
      }).populate({
        path: "rentalId",
        match: { isRemindedToday: false },
      });

      for (const item of itemsDueToday) {
        const rental = item.rentalId;
        if (!rental) continue;

        await NotificationConfig.sendNotification({
          senderId: rental.supplierId,
          receiverId: rental.customerId,
          title: "📦 Hôm nay là ngày trả thiết bị",
          message: `Thiết bị ${
            item.deviceSnapshot?.name
          } trong đơn #${rental._id
            .toString()
            .slice(-6)} đã đến hạn trả hôm nay.`,
          link: `/my-rentals/${rental._id}`,
          type: "RENTAL_REMINDER",
        });

        await Rental.findByIdAndUpdate(rental._id, { isRemindedToday: true });
        console.log(`✅ Đã gửi nhắc nhở hôm nay cho đơn: ${rental._id}`);
      }
    } catch (error) {
      console.error("❌ Cron RentalItem Error:", error);
    }
  });
};

module.exports = { startRentalDueReminders };
