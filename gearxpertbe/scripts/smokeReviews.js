require("dotenv").config();
const mongoose = require("mongoose");
const Review = require("../models/Review");
const Device = require("../models/Device");
const User = require("../models/User");

(async () => {
  const uri = process.env.DB_HOST || process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error("No DB_HOST / MONGO_URI in env");
    process.exit(1);
  }
  await mongoose.connect(uri);
  const nRev = await Review.countDocuments();
  const nDev = await Device.countDocuments();
  const sample = await Review.findOne()
    .populate("deviceId", "supplierId name")
    .lean();
  console.log("Review count:", nRev, "Device count:", nDev);
  if (sample) {
    console.log(
      "Sample review device:",
      sample.deviceId?.name,
      "supplierId:",
      String(sample.deviceId?.supplierId)
    );
  } else {
    console.log("No reviews in DB");
  }
  const sup = await User.findOne({ role: "SUPPLIER" }).select("_id").lean();
  if (sup) {
    const devs = await Device.countDocuments({ supplierId: sup._id });
    const ids = await Device.find({ supplierId: sup._id }).distinct("_id");
    const revForSup = await Review.countDocuments({ deviceId: { $in: ids } });
    console.log(
      "First SUPPLIER:",
      String(sup._id),
      "devices:",
      devs,
      "reviews on those devices:",
      revForSup
    );
  }
  const owners = await Device.aggregate([
    { $group: { _id: "$supplierId", cnt: { $sum: 1 } } },
    { $sort: { cnt: -1 } },
    { $limit: 5 },
  ]);
  console.log("Top device owners (supplierId -> device count):");
  for (const o of owners) {
    const ids = await Device.find({ supplierId: o._id }).distinct("_id");
    const rc = await Review.countDocuments({ deviceId: { $in: ids } });
    console.log(" ", String(o._id), "devices:", o.cnt, "reviews:", rc);
  }

  await mongoose.disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
