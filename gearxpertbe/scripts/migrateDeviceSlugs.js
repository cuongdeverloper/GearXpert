/**
 * Migration script: Generate slugs for all existing devices
 * Run once: node scripts/migrateDeviceSlugs.js
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Device = require("../models/Device");

async function migrate() {
  await mongoose.connect(process.env.DB_HOST);

  const devices = await Device.find({ $or: [{ slug: null }, { slug: "" }, { slug: { $exists: false } }] });

  for (const device of devices) {
    // Trigger pre-save hook which generates slug
    await device.save();
  }
  await mongoose.disconnect();
}

migrate().catch((err) => {
  console.error("Migration error:", err);
  process.exit(1);
});
