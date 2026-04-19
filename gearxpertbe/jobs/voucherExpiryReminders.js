const cron = require("node-cron");
const mongoose = require("mongoose");
const Voucher = require("../models/Voucher");
const StoreFollow = require("../models/StoreFollow");
const User = require("../models/User");
const NotificationConfig = require("../configs/NotificationConfig");

const startVoucherExpiryReminders = () => {
    // Chạy vào 00:00 hằng ngày
    cron.schedule("0 0 * * *", async () => {
        if (mongoose.connection.readyState !== 1) return;

        console.log("🕒 Running Monthly Voucher Expiry Reminder Job (Daily at 00:00)...");

        const now = new Date();
        const threeDaysLater = new Date();
        threeDaysLater.setDate(now.getDate() + 3);
        threeDaysLater.setHours(23, 59, 59, 999);

        try {
            const expiringVouchers = await Voucher.find({
                status: "ACTIVE",
                expiredAt: { $gte: now, $lte: threeDaysLater }
            });

            for (const voucher of expiringVouchers) {
                const diffTime = new Date(voucher.expiredAt) - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let timeLabel = "";
                if (diffDays === 0) timeLabel = "hết hạn trong hôm nay";
                else if (diffDays === 1) timeLabel = "sẽ hết hạn vào ngày mai";
                else timeLabel = `chỉ còn ${diffDays} ngày hiệu lực`;

                const title = `⚠️ Voucher ${voucher.code} sắp hết hạn!`;
                const message = `Ưu đãi giảm ${voucher.discountValue}${voucher.discountType === 'PERCENT' ? '%' : 'đ'} của bạn ${timeLabel}. Sử dụng ngay kẻo lỡ!`;

                if (voucher.type === "SUPPLIER") {
                    // Gửi cho followers
                    const followers = await StoreFollow.find({ 
                        supplierId: voucher.supplierId,
                        notifyVoucher: true 
                    });

                    for (const follow of followers) {
                        await NotificationConfig.sendNotification({
                            senderId: voucher.supplierId,
                            receiverId: follow.userId,
                            title,
                            message,
                            link: "/vouchers",
                            type: "STORE_VOUCHER"
                        });
                    }
                } else if (voucher.type === "GLOBAL") {
                    // Gửi cho khách hàng
                    const customers = await User.find({ role: "CUSTOMER", status: "ACTIVE" }).select("_id");
                    
                    for (const customer of customers) {
                        await NotificationConfig.sendNotification({
                            senderId: null,
                            receiverId: customer._id,
                            title,
                            message,
                            link: "/vouchers",
                            type: "SYSTEM"
                        });
                    }
                }
            }
            console.log("✅ Voucher Expiry Reminder Job completed.");
        } catch (error) {
            console.error("❌ Voucher Expiry Reminder Job Error:", error);
        }
    });
};

module.exports = { startVoucherExpiryReminders };
