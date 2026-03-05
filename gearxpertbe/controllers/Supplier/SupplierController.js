const mongoose = require("mongoose");
const SupplierProfile = require("../../models/SupplierProfile");
const User = require("../../models/User");
const Device = require("../../models/Device");

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

    const profile = await SupplierProfile.findOne({
      userId: new mongoose.Types.ObjectId(supplierId),
    }).populate("userId", "fullName phone avatar email");

    if (!profile) {
      return res.status(404).json({
        success: false,
        errorCode: 404,
        message: "Không tìm thấy profile nhà cung cấp",
      });
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

    // Tìm hoặc tạo profile
    let profile = await SupplierProfile.findOne({ userId });
    if (!profile) {
      profile = await SupplierProfile.create({ userId });
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

    // Xử lý upload businessAvatar (multer hoặc cloudinary)
    if (req.files && req.files.businessAvatar) {
      // Giả sử multer lưu file vào req.files
      // Nếu dùng Cloudinary → upload và lấy url
      updateData.businessAvatar = req.files.businessAvatar[0].path; // hoặc url từ cloudinary
    }

    // Cập nhật
    const updated = await SupplierProfile.findByIdAndUpdate(
      profile._id,
      { $set: updateData },
      { new: true, runValidators: true }
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
    if (search) query.$text = { $search: search };

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
