const cron = require("node-cron");
const mongoose = require("mongoose");
const DeviceItem = require("../models/DeviceItem");
const MaintenanceReminder = require("../models/MaintenanceReminder");
const NotificationConfig = require("../configs/NotificationConfig");

/**
 * Preventive Maintenance Cron Job
 * Chạy lúc 2:00 AM hàng ngày
 * Scan các DeviceItem đến lịch bảo trì và tạo MaintenanceReminder cho Supplier
 */
const startPreventiveMaintenanceJob = () => {
  // Chạy thực tế 2:00 AM: '0 2 * * *' || '* * * * *' để test nhanh
  // Để test thủ công: gọi runPreventiveMaintenanceJob() trực tiếp
  cron.schedule("* * * * *", async () => {
    await runPreventiveMaintenanceJob();
  });
};

const runPreventiveMaintenanceJob = async () => {
  if (mongoose.connection.readyState !== 1) {
    // console.warn("[PreventiveMaintenance] DB chưa kết nối, bỏ qua lần chạy này");
    return;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let createdCount = 0;
  let skippedCount = 0;

  try {
    // Lấy các DeviceItem status AVAILABLE (đang ở kho, không đang thuê)
    // và chưa có reminder PENDING
    const candidates = await DeviceItem.find({
      status: { $in: ["AVAILABLE"] },
      $or: [
        // Điều kiện 1: đủ số lần thuê
        {
          $expr: {
            $gte: [
              { $ifNull: ["$rentalCountSinceLastMaintenance", 0] },
              { $ifNull: ["$maintenanceInterval", 5] },
            ],
          },
        },
        // Điều kiện 2: quá hạn nextMaintenanceDue
        {
          nextMaintenanceDue: { $lte: today },
        },
      ],
    })
      .populate("deviceId", "supplierId name")
      .lean();


    for (const item of candidates) {
      if (!item.deviceId) {
        skippedCount++;
        continue;
      }

      const supplierId = item.deviceId?.supplierId;
      if (!supplierId) {
        skippedCount++;
        continue;
      }

      // Kiểm tra đã có reminder PENDING chưa (do index unique)
      const existing = await MaintenanceReminder.findOne({
        deviceItemId: item._id,
        status: "PENDING",
      });

      if (existing) {
        skippedCount++;
        continue; // Đã có reminder đang chờ, không tạo thêm
      }

      // Xác định loại trigger
      const rentalCount = item.rentalCountSinceLastMaintenance || 0;
      const interval = item.maintenanceInterval || 5;

      let triggerType = "RENTAL_COUNT";
      let triggerValue = `Đã thuê ${rentalCount}/${interval} lần`;

      if (item.nextMaintenanceDue && new Date(item.nextMaintenanceDue) <= today) {
        const daysPast = Math.floor(
          (today - new Date(item.nextMaintenanceDue)) / (1000 * 60 * 60 * 24)
        );
        triggerType = "NEXT_DUE";
        triggerValue = `Quá hạn bảo trì ${daysPast} ngày`;
      }

      // Tạo Reminder
      await MaintenanceReminder.create({
        deviceItemId: item._id,
        deviceId: item.deviceId._id,
        supplierId,
        triggerType,
        triggerValue,
        status: "PENDING",
      });

      createdCount++;

      // Gửi notification cho Supplier
      try {
        await NotificationConfig.sendNotification({
          senderId: null,
          receiverId: supplierId,
          title: "🔧 Nhắc nhở bảo trì thiết bị",
          message: `${item.deviceId.name} (${item.internalCode || item.serialNumber || "N/A"}): ${triggerValue}. Vui lòng lên lịch bảo trì.`,
          link: "/supplier/maintenance",
          type: "SYSTEM",
        });
      } catch (notifyErr) {
        console.error(`[PreventiveMaintenance] Lỗi gửi notification cho ${supplierId}:`, notifyErr.message);
      }
    }
  } catch (err) {
    console.error("[PreventiveMaintenance] Lỗi cron job:", err);
  }
};

module.exports = { startPreventiveMaintenanceJob, runPreventiveMaintenanceJob };
