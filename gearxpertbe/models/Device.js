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
      default: 0, // fix: default 0 hợp lý hơn khi mới tạo
      min: 0,
    },

    rentedQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Thêm để khớp với updateDeviceCounts
    availableQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    maintenanceCount: { type: Number, default: 0 },
    damagedCount: { type: Number, default: 0 },

    /* ===== ADD-ON ===== */
    isAddon: { type: Boolean, default: false },

    compatibleWith: [{ type: mongoose.Schema.Types.ObjectId, ref: "Device" }],

    requiredAddons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Device" }],

    images: [String],

    /* ===== GIÁ THUÊ ===== */
    rentPrice: {
      perDay: { type: Number, required: true },
      perWeek: Number,
      perMonth: Number,
    },

    depositAmount: { type: Number, required: true },

    /* ===== TRẠNG THÁI TỔNG QUÁT ===== */
    status: {
      type: String,
      enum: ["AVAILABLE", "SUSPICIOUS", "STOPPED", "DISCONTINUED"],
      default: "AVAILABLE",
      index: true,
    },

    /* ===== VỊ TRÍ KHO CHÍNH ===== */
    location: {
      warehouse: String,
      city: String,
    },

    /* ===== SPECS LINH HOẠT ===== */
    specs: { type: Map, of: mongoose.Schema.Types.Mixed },

    /* ===== REVIEW STATS ===== */
    ratingAvg: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual availableQuantity (dùng khi không cần cache field)
deviceSchema.virtual("realAvailable").get(function () {
  return this.stockQuantity - this.rentedQuantity;
});

/* ===== SLUG GENERATION ===== */
function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

deviceSchema.pre("save", async function (next) {
  if (!this.isModified("name") && this.slug) return next();

  const base = generateSlug(this.name);
  let slug = base;
  let suffix = 1;

  const Device = mongoose.model("Device");
  while (await Device.exists({ slug, _id: { $ne: this._id } })) {
    slug = `${base}-${suffix}`;
    suffix++;
  }
  this.slug = slug;
  next();
});

// Index cho text search và query phổ biến
deviceSchema.index({ name: "text", description: "text", category: "text" });
deviceSchema.index({ supplierId: 1, status: 1 });

module.exports = mongoose.model("Device", deviceSchema);
