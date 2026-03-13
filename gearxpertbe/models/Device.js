const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    name: { type: String, required: true, index: true },

    slug: { type: String, unique: true, index: true },

    description: String,

    category: {
      type: String,
      enum: [
        "CAMERA",
        "AUDIO",
        "OFFICE",
        "GAMING",
        "ACCESSORY",
        "LIGHTING",
        "DRONE",
        "OTHER",
      ],
      required: true,
      index: true,
    },

    stockQuantity: {
      type: Number,
      default: 1,
      min: 0,
    },

    /* ===== ADD-ON ===== */
    isAddon: { type: Boolean, default: false },

    compatibleWith: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Device",
      },
    ],

    requiredAddons: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Device",
      },
    ],

    images: [String],

    /* ===== GIÁ THUÊ ===== */
    rentPrice: {
      perDay: { type: Number, required: true },
      perWeek: Number,
      perMonth: Number,
    },

    depositAmount: { type: Number, required: true },

    status: {
      type: String,
      enum: ["AVAILABLE", "RENTED", "MAINTENANCE", "BROKEN", "STOPPED"],
      default: "AVAILABLE",
      index: true,
    },
    rentedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    /* ===== VỊ TRÍ ===== */
    location: {
      warehouse: String,
      city: String,
    },

    /* ===== SPECS LINH HOẠT ===== */
    specs: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },

    /* ===== MAINTENANCE SUMMARY ===== */
    maintenanceSummary: {
      lastMaintenanceAt: Date,
      nextMaintenanceAt: Date,
      totalMaintenanceCount: { type: Number, default: 0 },
    },

    /* ===== REVIEW STATS ===== */
    ratingAvg: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* ===== SLUG GENERATION ===== */
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")                     // tách dấu tiếng Việt
    .replace(/[\u0300-\u036f]/g, "")      // xoá dấu
    .replace(/đ/g, "d").replace(/Đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")          // ký tự đặc biệt → gạch ngang
    .replace(/^-+|-+$/g, "");             // trim gạch đầu/cuối
}

deviceSchema.pre("save", async function (next) {
  if (!this.isModified("name") && this.slug) return next();

  const base = generateSlug(this.name);
  let slug = base;
  let suffix = 1;

  // Tìm slug unique — bỏ qua chính document này (khi update)
  const Device = mongoose.model("Device");
  while (await Device.exists({ slug, _id: { $ne: this._id } })) {
    slug = `${base}-${suffix}`;
    suffix++;
  }
  this.slug = slug;
  next();
});

// Virtual (tính availableQuantity)
deviceSchema.virtual('availableQuantity').get(function () {
  return this.stockQuantity - this.rentedQuantity;
});

deviceSchema.set('toJSON', { virtuals: true });
deviceSchema.set('toObject', { virtuals: true });


deviceSchema.index({ name: "text", description: "text", category: "text" });
module.exports = mongoose.model("Device", deviceSchema);
