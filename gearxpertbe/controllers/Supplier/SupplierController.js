const mongoose = require("mongoose");
const SupplierProfile = require("../../models/SupplierProfile");
const User = require("../../models/User");
const Device = require("../../models/Device");
const Voucher = require("../../models/Voucher");
const StoreFollow = require("../../models/StoreFollow");
const { verifyAccessToken } = require("../../middleware/JWTAction");

// =============================================
// ORIGINAL FUNCTIONS — DO NOT MODIFY
// =============================================

// Lấy profile Supplier (public & edit)
exports.getSupplierProfile = async (req, res) => {
  try {
    const { supplierId } = req.params;

    // Validate supplierId
    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({
        success: false,
        errorCode: 400,
        message: "supplierId không hợp lệ",
      });
    }

    // Tìm profile, nếu chưa có và user là SUPPLIER thì tự khởi tạo
    let profile = await SupplierProfile.findOne({
      userId: new mongoose.Types.ObjectId(supplierId),
    }).populate("userId", "fullName phone avatar email");

    if (!profile) {
      // Kiểm tra user có tồn tại và là SUPPLIER không
      const targetUser = await User.findById(supplierId);
      if (!targetUser || targetUser.role !== "SUPPLIER") {
        return res.status(404).json({
          success: false,
          errorCode: 404,
          message: "Không tìm thấy profile nhà cung cấp",
        });
      }

      // Tự khởi tạo profile cho supplier (dùng static helper có default businessName)
      profile = await SupplierProfile.createForUser(supplierId);
      profile = await SupplierProfile.findById(profile._id).populate(
        "userId",
        "fullName phone avatar email"
      );
    }

    const deviceCount = await Device.countDocuments({
      supplierId: new mongoose.Types.ObjectId(supplierId),
      status: "AVAILABLE",
    });

    res.status(200).json({
      success: true,
      errorCode: 0,
      message: "Lấy profile thành công",
      data: {
        ...profile.toObject(),
        deviceCount,
      },
    });
  } catch (err) {
    console.error("getSupplierProfile error:", err);
    res.status(500).json({
      success: false,
      errorCode: 500,
      message: "Lỗi server khi lấy profile",
    });
  }
};

// Cập nhật profile Supplier (chỉ Supplier gọi được)
exports.updateSupplierProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Kiểm tra quyền
    const user = await User.findById(userId);
    if (!user || user.role !== "SUPPLIER") {
      return res.status(403).json({
        success: false,
        errorCode: 403,
        message: "Chỉ nhà cung cấp mới có quyền cập nhật profile này",
      });
    }

    // Tìm hoặc tạo profile (dùng static helper có default businessName)
    let profile = await SupplierProfile.findOne({ userId });
    if (!profile) {
      profile = await SupplierProfile.createForUser(userId);
    }

    // Các field được phép cập nhật
    const allowedFields = [
      "businessName",
      "businessDescription",
      "warehouseAddress",
      "operatingHours",
      "contactZalo",
      "contactFacebook",
      "contactPhone",
    ];

    const updateData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    // Xử lý warehouseAddress dạng dot-notation (warehouseAddress.street, ...)
    const addressFields = ['street', 'district', 'city', 'fullAddress'];
    const hasAddressDotKeys = addressFields.some(
      (f) => req.body[`warehouseAddress.${f}`] !== undefined
    );
    if (hasAddressDotKeys) {
      updateData.warehouseAddress = {};
      addressFields.forEach((f) => {
        if (req.body[`warehouseAddress.${f}`] !== undefined) {
          updateData.warehouseAddress[f] = req.body[`warehouseAddress.${f}`];
        }
      });
    }

    // Xử lý upload businessAvatar (multer hoặc cloudinary)
    if (req.files && req.files.businessAvatar) {
      updateData.businessAvatar = req.files.businessAvatar[0].path;
    }

    // Cập nhật
    const updated = await SupplierProfile.findByIdAndUpdate(
      profile._id,
      { $set: updateData },
      { new: true }
    );

    res.status(200).json({
      success: true,
      errorCode: 0,
      message: "Cập nhật profile thành công",
      data: updated,
    });
  } catch (err) {
    console.error("updateSupplierProfile error:", err);
    res.status(500).json({
      success: false,
      errorCode: 500,
      message: "Lỗi server khi cập nhật profile",
    });
  }
};

// Lấy danh sách thiết bị của Supplier (public)
exports.getSupplierDevices = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { page = 1, limit = 12, category, search } = req.query;

    // Validate supplierId
    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({
        success: false,
        errorCode: 400,
        message: "supplierId không hợp lệ",
      });
    }

    const query = {
      supplierId: new mongoose.Types.ObjectId(supplierId),
      status: "AVAILABLE",
    };

    if (category) query.category = category;
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    const devices = await Device.find(query)
      .select(
        "name images rentPrice depositAmount category stockQuantity ratingAvg reviewCount"
      )
      .sort({ createdAt: -1 })
      .skip((page - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Device.countDocuments(query);

    res.status(200).json({
      success: true,
      errorCode: 0,
      message: "Lấy danh sách thiết bị thành công",
      data: {
        devices,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        },
      },
    });
  } catch (err) {
    console.error("getSupplierDevices error:", err);
    res.status(500).json({
      success: false,
      errorCode: 500,
      message: "Lỗi server khi lấy danh sách thiết bị",
    });
  }
};

// =============================================
// NEW FUNCTIONS — Supplier public storefront
// =============================================

/**
 * GET /api/suppliers/:supplierId/storefront
 * Public storefront profile — works even without SupplierProfile document.
 * Falls back to User data when no SupplierProfile exists.
 */
exports.getSupplierStorefront = async (req, res) => {
  try {
    const { supplierId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({
        success: false,
        errorCode: 400,
        message: "Invalid supplierId",
      });
    }

    const objectId = new mongoose.Types.ObjectId(supplierId);

    const user = await User.findById(objectId).select(
      "fullName phone avatar email role createdAt"
    );
    if (!user || user.role !== "SUPPLIER") {
      return res.status(404).json({
        success: false,
        errorCode: 404,
        message: "Supplier not found",
      });
    }

    const profile = await SupplierProfile.findOne({ userId: objectId });

    const deviceCount = await Device.countDocuments({ supplierId: objectId });

    const ratingAgg = await Device.aggregate([
      { $match: { supplierId: objectId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$ratingAvg" },
          totalReviews: { $sum: "$reviewCount" },
        },
      },
    ]);

    const data = {
      _id: profile?._id || null,
      userId: {
        _id: user._id,
        fullName: user.fullName,
        phone: user.phone,
        avatar: user.avatar,
        email: user.email,
      },
      businessName: profile?.businessName || user.fullName,
      businessDescription: profile?.businessDescription || null,
      businessAvatar: profile?.businessAvatar || user.avatar,
      warehouseAddress: profile?.warehouseAddress || null,
      contactZalo: profile?.contactZalo || null,
      contactFacebook: profile?.contactFacebook || null,
      contactPhone: profile?.contactPhone || user.phone,
      operatingHours: profile?.operatingHours || "08:00 - 22:00",
      supplierRating: ratingAgg[0]?.avgRating || 0,
      supplierReviewCount: ratingAgg[0]?.totalReviews || 0,
      deviceCount,
      memberSince: user.createdAt,
      status: profile?.status || "ACTIVE",
    };

    res.status(200).json({ success: true, errorCode: 0, data });
  } catch (err) {
    console.error("getSupplierStorefront error:", err);
    res.status(500).json({
      success: false,
      errorCode: 500,
      message: "Server error",
    });
  }
};

/**
 * GET /api/suppliers/:supplierId/storefront/devices
 * Public device listing for storefront with sort, category filter, search.
 */
exports.getSupplierStorefrontDevices = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const {
      page = 1,
      limit = 12,
      category,
      search,
      sort = "newest",
    } = req.query;

    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({
        success: false,
        errorCode: 400,
        message: "Invalid supplierId",
      });
    }

    const objectId = new mongoose.Types.ObjectId(supplierId);

    const query = {
      supplierId: objectId,
      status: { $nin: ["STOPPED", "BROKEN"] },
    };

    if (category) query.category = category;
    if (search) {
      query.name = { $regex: search, $options: "i" };
    }

    let sortQuery = { createdAt: -1 };
    if (sort === "price-asc") sortQuery = { "rentPrice.perDay": 1 };
    else if (sort === "price-desc") sortQuery = { "rentPrice.perDay": -1 };
    else if (sort === "rating-desc") sortQuery = { ratingAvg: -1 };
    else if (sort === "popular") sortQuery = { reviewCount: -1 };

    const devices = await Device.find(query)
      .select(
        "name images rentPrice depositAmount category stockQuantity rentedQuantity ratingAvg reviewCount status location createdAt"
      )
      .sort(sortQuery)
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    const total = await Device.countDocuments(query);

    const categories = await Device.distinct("category", {
      supplierId: objectId,
      status: { $nin: ["STOPPED", "BROKEN"] },
    });

    res.status(200).json({
      success: true,
      errorCode: 0,
      data: {
        devices,
        categories,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
        },
      },
    });
  } catch (err) {
    console.error("getSupplierStorefrontDevices error:", err);
    res.status(500).json({
      success: false,
      errorCode: 500,
      message: "Server error",
    });
  }
};

/**
 * GET /api/suppliers/:supplierId/storefront/vouchers
 * Public — active, non-expired vouchers for a supplier + GLOBAL vouchers.
 */
exports.getSupplierStorefrontVouchers = async (req, res) => {
  try {
    const { supplierId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({
        success: false,
        errorCode: 400,
        message: "Invalid supplierId",
      });
    }

    const now = new Date();

    const vouchers = await Voucher.find({
      $or: [
        { supplierId: new mongoose.Types.ObjectId(supplierId) },
        { type: "GLOBAL" },
      ],
      status: "ACTIVE",
      expiredAt: { $gt: now },
      $expr: { $lt: ["$usedCount", "$usageLimit"] },
    })
      .select(
        "code description discountType discountValue minOrderValue maxDiscount usageLimit usedCount expiredAt type"
      )
      .sort({ discountValue: -1 })
      .limit(10)
      .lean();

    res.status(200).json({ success: true, errorCode: 0, data: vouchers });
  } catch (err) {
    console.error("getSupplierStorefrontVouchers error:", err);
    res.status(500).json({
      success: false,
      errorCode: 500,
      message: "Server error",
    });
  }
};

// =============================================
// FOLLOW STORE
// =============================================

// Toggle follow/unfollow store
exports.toggleFollowStore = async (req, res) => {
  try {
    const userId = req.user.id;
    const { supplierId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ success: false, message: "supplierId không hợp lệ" });
    }

    if (userId === supplierId) {
      return res.status(400).json({ success: false, message: "Không thể follow chính mình" });
    }

    const existing = await StoreFollow.findOne({ userId, supplierId });

    if (existing) {
      await StoreFollow.deleteOne({ _id: existing._id });
      const followerCount = await StoreFollow.countDocuments({ supplierId });
      return res.status(200).json({
        success: true,
        errorCode: 0,
        message: "Đã bỏ theo dõi",
        data: { isFollowing: false, followerCount },
      });
    }

    await StoreFollow.create({ userId, supplierId });
    const followerCount = await StoreFollow.countDocuments({ supplierId });

    res.status(200).json({
      success: true,
      errorCode: 0,
      message: "Đã theo dõi cửa hàng",
      data: { isFollowing: true, followerCount },
    });
  } catch (err) {
    console.error("toggleFollowStore error:", err);
    res.status(500).json({ success: false, errorCode: 500, message: "Lỗi server" });
  }
};

// Kiểm tra follow status + số follower (public nếu có user, anonymous thì isFollowing = false)
exports.getFollowStatus = async (req, res) => {
  try {
    const { supplierId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ success: false, message: "supplierId không hợp lệ" });
    }

    const followerCount = await StoreFollow.countDocuments({ supplierId });

    // Tự extract token từ header (không cần middleware)
    let isFollowing = false;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded?.id) {
        const existing = await StoreFollow.findOne({ userId: decoded.id, supplierId });
        isFollowing = !!existing;
      }
    }

    res.status(200).json({
      success: true,
      errorCode: 0,
      data: { isFollowing, followerCount },
    });
  } catch (err) {
    console.error("getFollowStatus error:", err);
    res.status(500).json({ success: false, errorCode: 500, message: "Lỗi server" });
  }
};
