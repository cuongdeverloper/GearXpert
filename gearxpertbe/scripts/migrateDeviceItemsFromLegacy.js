/**
 * Migration: bổ sung DeviceItem (đơn vị vật lý) cho mỗi Device khi DB cũ chỉ có số trên Device.
 *
 * Cách ước lượng số đơn vị cần có:
 *   target = max(stockQuantity + rentedQuantity trên Device, số DeviceItem hiện có)
 * (Hệ cũ thường dùng stock ≈ khả dụng, rented = đang thuê → tổng vật lý ≈ tổng hai field.)
 *
 * Mỗi bản ghi thiếu được tạo với:
 *   status: AVAILABLE, condition: GOOD
 *   internalCode: MIG-{fullDeviceId}-{timestamp}-{index}
 * (serialNumber để trống — index sparse unique vẫn cho phép nhiều doc không có serial.)
 *
 * Chạy (từ thư mục gearxpertbe, đã có .env với DB_HOST):
 *   node scripts/migrateDeviceItemsFromLegacy.js
 *
 * Chỉ in kế hoạch, không ghi DB:
 *   DRY_RUN=1 node scripts/migrateDeviceItemsFromLegacy.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Device = require("../models/Device");
const DeviceItem = require("../models/DeviceItem");

const DRY_RUN = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";

function legacyTargetTotal(device) {
  const stock = device.stockQuantity || 0;
  const rented = device.rentedQuantity || 0;
  return Math.max(0, stock + rented);
}

async function migrate() {
  if (!process.env.DB_HOST) {
    throw new Error("DB_HOST is not set in environment");
  }

  await mongoose.connect(process.env.DB_HOST);
  console.log("Connected to DB");
  console.log(DRY_RUN ? "DRY RUN — không ghi database\n" : "");

  const devices = await Device.find({}).select("_id name stockQuantity rentedQuantity").lean();
  console.log(`Tổng Device: ${devices.length}\n`);

  const runTimestamp = Date.now();
  let totalToCreate = 0;
  let devicesNeedingInsert = 0;
  const lines = [];

  for (const d of devices) {
    const current = await DeviceItem.countDocuments({ deviceId: d._id });
    const target = Math.max(legacyTargetTotal(d), current);
    const need = target - current;

    if (need > 0) {
      devicesNeedingInsert += 1;
      totalToCreate += need;
      lines.push({
        name: d.name,
        id: d._id,
        current,
        target,
        need,
      });
    }
  }

  console.log(`Thiết bị cần bổ sung DeviceItem: ${devicesNeedingInsert}`);
  console.log(`Tổng DeviceItem sẽ tạo: ${totalToCreate}\n`);

  if (DRY_RUN) {
    for (const row of lines.slice(0, 80)) {
      console.log(
        `  ${(row.name || "").slice(0, 42).padEnd(42)} | có: ${row.current} → mục tiêu: ${row.target} | thêm: ${row.need}`
      );
    }
    if (lines.length > 80) console.log(`  ... và ${lines.length - 80} dòng khác`);
    await mongoose.disconnect();
    console.log("\nDRY RUN xong.");
    return;
  }

  let inserted = 0;

  for (const d of devices) {
    const current = await DeviceItem.countDocuments({ deviceId: d._id });
    const target = Math.max(legacyTargetTotal(d), current);
    const need = target - current;
    const idStr = d._id.toString();

    if (need <= 0) {
      await DeviceItem.updateDeviceCounts(d._id);
      continue;
    }

    const batch = [];
    for (let i = 1; i <= need; i++) {
      batch.push({
        deviceId: d._id,
        internalCode: `MIG-${idStr}-${runTimestamp}-${i}-${inserted + i}`,
        status: "AVAILABLE",
        condition: "GOOD",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await DeviceItem.collection.insertMany(batch);
    inserted += need;
    await DeviceItem.updateDeviceCounts(d._id);
    console.log(`  ✓ ${(d.name || idStr).slice(0, 50)}: +${need} DeviceItem (mục tiêu ${target})`);
  }

  // Các Device không thiếu item vẫn được sync ở trên khi need <= 0
  console.log(`\nHoàn tất. Đã chèn ${inserted} DeviceItem; cache stock/rented trên Device đã cập nhật.`);
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
