const mongoose = require("mongoose");

const deviceItemSchema = new mongoose.Schema(
  {
    deviceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Device",
      required: true,
      index: true,
    },

    serialNumber: {
      type: String,
      sparse: true,
      index: { unique: true, sparse: true },
    },

    internalCode: { type: String, sparse: true }, // CAM-001, CAM-002...

    status: {
      type: String,
      enum: [
        "AVAILABLE",
        "RENTED",
        "RESERVED",
        "PENDING_RESOLUTION",
        "MAINTENANCE",
        "REPAIR",
        "DAMAGED",
        "LOST",
        "RETIRED",
      ],
      default: "AVAILABLE",
      index: true,
    },

    condition: {
      type: String,
      enum: ["NEW", "GOOD", "FAIR", "NEEDS_REPAIR", "DAMAGED"],
      default: "GOOD",
      index: true,
    },

    location: {
      warehouse: String,
      city: String,
      note: String,
    },

    lastMaintenance: {
      at: Date,
      note: String,
      cost: Number,
    },

    nextMaintenanceDue: Date,

    // Đếm số lần thuê kể từ lần bảo trì cuối → dùng cho preventive maintenance cron
    rentalCountSinceLastMaintenance: { type: Number, default: 0 },
    // Khoảng cách thuê để nhắc bảo trì (mặc định 5 lần)
    maintenanceInterval: { type: Number, default: 5 },

    images: [String],

    activeIssueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "IssueReport",
      sparse: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// === DEBUG LOG ===
// Mỗi khi hook chạy, sẽ log ra console để bạn kiểm tra xem có trigger không

// Gọi static sync sau khi model đã compile (hooks chạy lúc runtime)
async function syncParentDeviceCounts(deviceId) {
  if (!deviceId) return;
  const DeviceItemModel = mongoose.model("DeviceItem");
  await DeviceItemModel.updateDeviceCounts(deviceId);
}

// 1. Hook khi save từng document — luôn gộp lại Device (post-save không nên dựa isModified)
deviceItemSchema.post("save", async function (doc) {
  await syncParentDeviceCounts(doc.deviceId);
});

// 2. Hook cho findOneAndUpdate / updateOne
deviceItemSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc) {
    return;
  }

  const update = this.getUpdate() || {};
  const setOps = update.$set || update;

  const statusChanged =
    setOps.status !== undefined || update.status !== undefined;
  const conditionChanged =
    setOps.condition !== undefined || update.condition !== undefined;

  if (statusChanged || conditionChanged) {
    await syncParentDeviceCounts(doc.deviceId);
  } else {
    console.log("[HOOK] No relevant change detected → skip");
  }
});

// 3. Hook cho updateMany (bulk update status)
deviceItemSchema.post("updateMany", async function () {
  const filter = this.getFilter();
  const update = this.getUpdate() || {};

  const hasStatusChange = update.$set?.status || update.status;
  if (filter.deviceId && hasStatusChange) {
    await syncParentDeviceCounts(filter.deviceId);
  }
});

// 4. Hook cho insertMany (bulk create)
deviceItemSchema.post("insertMany", async function (docs) {
  if (docs && docs.length > 0) {
    const deviceId = docs[0].deviceId;
    await syncParentDeviceCounts(deviceId);
  }
});

// Hàm helper đồng bộ counts (thêm log chi tiết để debug)
// ... toàn bộ schema và hooks giữ nguyên ...

// Chuyển thành static method
deviceItemSchema.statics.updateDeviceCounts = async function (
  deviceId,
  session = null
) {
  const counts = await this.aggregate([
    // dùng this thay vì mongoose.model("DeviceItem")
    { $match: { deviceId: new mongoose.Types.ObjectId(deviceId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        rented: {
          $sum: { $cond: [{ $in: ["$status", ["RENTED", "RESERVED", "PENDING_RESOLUTION"]] }, 1, 0] },
        },
        maintenance: {
          $sum: { $cond: [{ $eq: ["$status", "MAINTENANCE"] }, 1, 0] },
        },
        damaged: {
          $sum: { $cond: [{ $eq: ["$status", "DAMAGED"] }, 1, 0] },
        },
      },
    },
  ])
    .session(session)
    .exec();

  const result = counts[0] || {
    total: 0,
    rented: 0,
    maintenance: 0,
    damaged: 0,
  };


  const updateResult = await mongoose.model("Device").updateOne(
    { _id: new mongoose.Types.ObjectId(deviceId) },
    {
      $set: {
        stockQuantity: result.total,
        rentedQuantity: result.rented,
        availableQuantity: result.total - result.rented,
        maintenanceCount: result.maintenance,
        damagedCount: result.damaged,
      },
    },
    { session }
  );

  if (updateResult.modifiedCount === 0) {
    console.warn(`[CACHE WARNING] Không update được Device ${deviceId}`);
  } else {
    console.log(`[CACHE SUCCESS] Đã cập nhật cache cho Device ${deviceId}`);
  }
};



module.exports = mongoose.model("DeviceItem", deviceItemSchema);
