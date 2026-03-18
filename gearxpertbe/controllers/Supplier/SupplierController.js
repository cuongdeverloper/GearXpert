const mongoose = require("mongoose");
const SupplierProfile = require("../../models/SupplierProfile");
const User = require("../../models/User");
const Device = require("../../models/Device");
const Voucher = require("../../models/Voucher");
const StoreFollow = require("../../models/StoreFollow");
const Notification = require("../../models/Notification");
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
    const addressFields = ['street', 'district', 'city', 'fullAddress', 'lat', 'lng'];
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
        "name slug images rentPrice depositAmount category stockQuantity rentedQuantity ratingAvg reviewCount status location createdAt"
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

    // Thông báo cho supplier có người mới follow
    User.findById(userId).select("username image").lean().then((u) => {
      const name = u?.username || "Một người dùng";
      const userImage = u?.image || "";
      Notification.create({
        senderId: userId,
        receiverId: supplierId,
        type: "SYSTEM",
        title: "Người theo dõi mới",
        message: `${name} vừa theo dõi cửa hàng của bạn`,
        image: userImage,
        link: "",
      }).then((notif) => {
        // Real-time push via Socket.IO
        const io = req.app.get("io");
        const { getUser } = require("../../utils/socketUser");
        const supplierSocket = getUser(supplierId);
        if (io && supplierSocket) {
          io.to(supplierSocket.socketId).emit("newNotification", {
            _id: notif._id,
            senderId: userId,
            type: "SYSTEM",
            title: notif.title,
            message: notif.message,
            image: notif.image,
            link: notif.link,
            isRead: false,
            createdAt: notif.createdAt,
          });
        }
      });
    }).catch(() => {});

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
    let followData = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token) {
      const decoded = verifyAccessToken(token);
      if (decoded?.id) {
        const existing = await StoreFollow.findOne({ userId: decoded.id, supplierId });
        isFollowing = !!existing;
        if (existing) {
          followData = {
            followId: existing._id,
            notifyVoucher: existing.notifyVoucher,
            notifyNewDevice: existing.notifyNewDevice,
            notifyPost: existing.notifyPost,
          };
        }
      }
    }

    res.status(200).json({
      success: true,
      errorCode: 0,
      data: { isFollowing, followerCount, followData },
    });
  } catch (err) {
    console.error("getFollowStatus error:", err);
    res.status(500).json({ success: false, errorCode: 500, message: "Lỗi server" });
  }
};

// =============================================
// FOLLOWED STORES (Customer side)
// =============================================

// Lấy danh sách stores mà user đang follow
exports.getMyFollowedStores = async (req, res) => {
  try {
    const userId = req.user.id;

    const follows = await StoreFollow.find({ userId })
      .populate('supplierId', 'fullName avatar email')
      .sort({ createdAt: -1 })
      .lean();

    // Lấy thêm SupplierProfile cho businessName, businessAvatar
    const enriched = await Promise.all(
      follows.map(async (f) => {
        const profile = await SupplierProfile.findOne({ userId: f.supplierId._id })
          .select('businessName businessAvatar businessDescription')
          .lean();
        const deviceCount = await Device.countDocuments({ supplierId: f.supplierId._id, status: 'AVAILABLE' });
        return {
          _id: f._id,
          supplierId: f.supplierId._id,
          supplierName: profile?.businessName || f.supplierId.fullName,
          supplierAvatar: profile?.businessAvatar || f.supplierId.avatar,
          supplierDescription: profile?.businessDescription || '',
          deviceCount,
          followedAt: f.createdAt,
          notifyVoucher: f.notifyVoucher,
          notifyNewDevice: f.notifyNewDevice,
          notifyPost: f.notifyPost,
        };
      })
    );

    res.status(200).json({ success: true, errorCode: 0, data: enriched });
  } catch (err) {
    console.error("getMyFollowedStores error:", err);
    res.status(500).json({ success: false, errorCode: 500, message: "Lỗi server" });
  }
};

// Cập nhật notification prefs cho 1 follow
exports.updateFollowPrefs = async (req, res) => {
  try {
    const userId = req.user.id;
    const { followId } = req.params;
    const { notifyVoucher, notifyNewDevice, notifyPost } = req.body;

    const follow = await StoreFollow.findOneAndUpdate(
      { _id: followId, userId },
      {
        ...(notifyVoucher !== undefined && { notifyVoucher }),
        ...(notifyNewDevice !== undefined && { notifyNewDevice }),
        ...(notifyPost !== undefined && { notifyPost }),
      },
      { new: true }
    );

    if (!follow) {
      return res.status(404).json({ success: false, message: "Không tìm thấy" });
    }

    res.status(200).json({ success: true, errorCode: 0, data: follow });
  } catch (err) {
    console.error("updateFollowPrefs error:", err);
    res.status(500).json({ success: false, errorCode: 500, message: "Lỗi server" });
  }
};

// =============================================
// NOTIFY FOLLOWERS (gọi từ controller khác)
// =============================================

/**
 * Gửi notification cho tất cả follower của supplier
 * @param {string} supplierId - ID supplier
 * @param {string} notifyField - 'notifyVoucher' | 'notifyNewDevice' | 'notifyPost'
 * @param {string} type - notification type
 * @param {string} title
 * @param {string} message
 * @param {string} link - optional
 */
exports.notifyFollowers = async (supplierId, notifyField, type, title, message, link = "", req = null) => {
  try {
    const followers = await StoreFollow.find({
      supplierId,
      [notifyField]: true,
    }).select('userId').lean();

    if (followers.length === 0) return;

    // Lấy tên + avatar cửa hàng để ghi rõ trong thông báo
    const profile = await SupplierProfile.findOne({ userId: supplierId }).select('businessName businessAvatar').lean();
    const storeName = profile?.businessName || "Cửa hàng";
    const storeImage = profile?.businessAvatar || "";

    const fullTitle = `${storeName} · ${title}`;

    const notifications = followers.map((f) => ({
      senderId: supplierId,
      receiverId: f.userId,
      type,
      title: fullTitle,
      message,
      image: storeImage,
      link,
    }));

    const saved = await Notification.insertMany(notifications);

    // Real-time push via Socket.IO
    if (req) {
      const io = req.app.get("io");
      const { getUser } = require("../../utils/socketUser");
      if (io) {
        saved.forEach((notif) => {
          const userSocket = getUser(notif.receiverId.toString());
          if (userSocket) {
            io.to(userSocket.socketId).emit("newNotification", {
              _id: notif._id,
              senderId: notif.senderId,
              type: notif.type,
              title: notif.title,
              message: notif.message,
              image: notif.image,
              link: notif.link,
              isRead: false,
              createdAt: notif.createdAt,
            });
          }
        });
      }
    }
  } catch (err) {
    console.error("notifyFollowers error:", err);
  }
};
exports.getPublicSuppliers = async (req, res) => {
  try {
    const { search, district } = req.query;

    // 1. Chỉ lấy danh sách trực tiếp từ SupplierProfile
    const profileQuery = {
      status: 'ACTIVE' 
    };

    if (district) {
      profileQuery['warehouseAddress.district'] = { $regex: district, $options: 'i' };
    }

    if (search) {
      profileQuery.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { businessDescription: { $regex: search, $options: 'i' } }
      ];
    }

    const profiles = await SupplierProfile.find(profileQuery)
      .populate('userId', 'fullName avatar email phone')
      .select('businessName businessDescription businessAvatar warehouseAddress supplierRating supplierReviewCount userId status')
      .sort({ supplierRating: -1 })
      .lean();

    // 2. Tính toán số lượng thiết bị đang AVAILABLE cho mỗi Shop
    const finalData = await Promise.all(profiles.map(async (profile) => {
      const deviceCount = await Device.countDocuments({
        supplierId: profile.userId._id,
        status: "AVAILABLE"
      });
      
      return {
        ...profile,
        deviceCount: deviceCount
      };
    }));

    return res.status(200).json({
      success: true,
      data: finalData
    });

  } catch (error) {
    console.error("getPublicSuppliers internal error:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Lỗi hệ thống khi tải danh sách đối tác" 
    });
  }
};
