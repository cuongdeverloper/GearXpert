/**
 * Migration script: Generate slugs for all existing devices
 * Run once: node scripts/migrateDeviceSlugs.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Device = require("../models/Device");

async function migrate() {
  await mongoose.connect(process.env.DB_HOST);
  console.log("Connected to DB");

  const devices = await Device.find({ $or: [{ slug: null }, { slug: "" }, { slug: { $exists: false } }] });
  console.log(`Found ${devices.length} devices without slug`);

  for (const device of devices) {
    // Trigger pre-save hook which generates slug
    await device.save();
    console.log(`  ✓ ${device.name} → ${device.slug}`);
  }

  console.log("Migration complete!");
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
