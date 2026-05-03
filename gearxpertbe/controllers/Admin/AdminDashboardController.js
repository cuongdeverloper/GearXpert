const mongoose = require("mongoose");
const Device = require("../../models/Device");
const Rental = require("../../models/Rental");
const RentalItem = require("../../models/RentalItem");
const User = require("../../models/User");
const SupplierProfile = require("../../models/SupplierProfile");

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date) =>
  new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

const formatPercentChange = (current, previous) => {
  if (!previous) {
    return current ? "+100%" : "0%";
  }
  const change = ((current - previous) / previous) * 100;
  const rounded = Math.round(change);
  return `${rounded >= 0 ? "+" : ""}${rounded}%`;
};

const sumRentalAmount = async (match) => {
  const result = await Rental.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);
  return result[0]?.total || 0;
};

exports.getAdminDashboard = async (req, res) => {
  try {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const previousMonthStart = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
    const previousMonthEnd = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));

    const totalUsers = await User.countDocuments({ role: { $ne: "ADMIN" } });
    const previousUsers = await User.countDocuments({
      role: { $ne: "ADMIN" },
      createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
    });

    const activeStatuses = ["APPROVED", "DELIVERING", "RENTING", "RETURNING", "INSPECTING"];
    const activeRentals = await Rental.countDocuments({ status: { $in: activeStatuses } });
    const previousActiveRentals = await Rental.countDocuments({
      status: { $in: activeStatuses },
      createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
    });

    const totalDevices = await Device.countDocuments();
    const previousDevices = await Device.countDocuments({
      createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
    });

    const currentRevenue = await sumRentalAmount({
      paymentStatus: "PAID",
      createdAt: { $gte: currentMonthStart, $lte: now },
    });
    const previousRevenue = await sumRentalAmount({
      paymentStatus: "PAID",
      createdAt: { $gte: previousMonthStart, $lte: previousMonthEnd },
    });

    const stats = [
      {
        label: "Total Users",
        value: totalUsers.toLocaleString("en-US"),
        change: formatPercentChange(totalUsers, totalUsers - previousUsers),
        icon: "users",
        color: "bg-blue-100 text-blue-600",
      },
      {
        label: "Active Rentals",
        value: activeRentals.toLocaleString("en-US"),
        change: formatPercentChange(activeRentals, previousActiveRentals),
        icon: "box",
        color: "bg-green-100 text-green-600",
      },
      {
        label: "Total Devices",
        value: totalDevices.toLocaleString("en-US"),
        change: formatPercentChange(totalDevices, previousDevices),
        icon: "package",
        color: "bg-yellow-100 text-yellow-600",
      },
      {
        label: "Monthly Revenue",
        value: `$${currentRevenue.toLocaleString("en-US")}`,
        change: formatPercentChange(currentRevenue, previousRevenue),
        icon: "dollar",
        color: "bg-purple-100 text-purple-600",
      },
    ];

    const recentRentalsRaw = await Rental.find()
      .populate("customerId", "fullName")
      .sort({ createdAt: -1 })
      .limit(4);

    const recentRentals = await Promise.all(
      recentRentalsRaw.map(async (rental) => {
        const rentalItem = await RentalItem.findOne({ rentalId: rental._id })
          .populate("deviceId", "name");
        return {
          id: rental._id,
          customerName: rental.customerId?.fullName || "Unknown",
          deviceName: rentalItem?.deviceId?.name || "Device",
          totalAmount: rental.totalAmount,
          status: rental.status,
        };
      })
    );

    const topDevices = await RentalItem.aggregate([
      {
        $group: {
          _id: "$deviceId",
          totalRentals: { $sum: "$quantity" },
        },
      },
      { $sort: { totalRentals: -1 } },
      { $limit: 5 },
      { $lookup: { from: "devices", localField: "_id", foreignField: "_id", as: "device" } },
      { $unwind: "$device" },
      { $lookup: { from: "users", localField: "device.supplierId", foreignField: "_id", as: "supplier" } },
      { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          name: "$device.name",
          supplierName: "$supplier.fullName",
          ratingAvg: "$device.ratingAvg",
          totalRentals: 1,
        },
      },
    ]);

    res.json({
      stats,
      topDevices,
      recentRentals,
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({ message: "Failed to load admin dashboard" });
  }
};

exports.getAdminRentals = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = "", status = "ALL" } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Filter build
    const filter = {};
    if (status && status !== "ALL") {
      filter.status = status;
    }

    // Since we need to search across populated fields (customer name, supplier name), 
    // and RentalItem device names, we'll use aggregation for best performance with search.
    
    const pipeline = [
      { $match: filter },
      // Join customer
      {
        $lookup: {
          from: "users",
          localField: "customerId",
          foreignField: "_id",
          as: "customer"
        }
      },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
      // Join supplier
      {
        $lookup: {
          from: "users",
          localField: "supplierId",
          foreignField: "_id",
          as: "supplier"
        }
      },
      { $unwind: { path: "$supplier", preserveNullAndEmptyArrays: true } },
      // Join rental items to get device names
      {
        $lookup: {
          from: "rentalitems",
          localField: "_id",
          foreignField: "rentalId",
          as: "items"
        }
      },
      // Lookup device details for each item
      {
        $lookup: {
          from: "devices",
          localField: "items.deviceId",
          foreignField: "_id",
          as: "itemDevices"
        }
      }
    ];

    // Search filter if provided
    if (search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      pipeline.push({
        $match: {
          $or: [
            { "customer.fullName": searchRegex },
            { "supplier.fullName": searchRegex },
            { "itemDevices.name": searchRegex },
            { orderCode: searchRegex },
            { _id: search.trim().length === 24 ? new mongoose.Types.ObjectId(search.trim()) : null }
          ]
        }
      });
    }

    // Count before pagination
    const countPipeline = [...pipeline, { $count: "total" }];
    const countResult = await Rental.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Pagination and sorting
    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: limitNum });

    // Project final result
    pipeline.push({
      $project: {
        id: "$_id",
        orderCode: 1,
        customerName: "$customer.fullName",
        customerEmail: "$customer.email",
        supplierName: "$supplier.fullName",
        supplierEmail: "$supplier.email",
        devices: "$itemDevices.name",
        // Get dates and duration from the first rental item (assuming all items have same dates)
        rentalStartDate: { $arrayElemAt: ["$items.rentalStartDate", 0] },
        rentalEndDate: { $arrayElemAt: ["$items.rentalEndDate", 0] },
        totalDays: { $arrayElemAt: ["$items.totalDays", 0] },
        totalAmount: 1,
        paymentStatus: 1,
        status: 1,
        deliveryAddress: 1,
        createdAt: 1
      }
    });

    const rentals = await Rental.aggregate(pipeline);

    res.json({
      rentals,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum)
    });
  } catch (error) {
    console.error("Admin rentals error:", error);
    res.status(500).json({ message: "Failed to load rentals" });
  }
};

exports.getAdminReports = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: { $ne: "ADMIN" } });
    const totalRentals = await Rental.countDocuments();
    const totalRevenue = await sumRentalAmount({ paymentStatus: "PAID" });

    const topDevice = await Device.find().sort({ ratingAvg: -1 }).limit(1);
    const topDeviceName = topDevice[0]?.name || "N/A";
    const avgRatingResult = await Device.aggregate([
      { $match: { reviewCount: { $gt: 0 } } },
      { $group: { _id: null, avgRating: { $avg: "$ratingAvg" } } },
    ]);
    const averageRating = Number(avgRatingResult[0]?.avgRating || 0).toFixed(1);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newUsers = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const activeUsers = await User.countDocuments({ status: "ACTIVE" });
    const blockedUsers = await User.countDocuments({ status: "BLOCKED" });
    const churnRate = totalUsers ? `${((blockedUsers / totalUsers) * 100).toFixed(1)}%` : "0%";

    const reports = [
      {
        id: "revenue-report",
        title: "Monthly Revenue Report",
        type: "revenue",
        period: "This month",
        totalRevenue,
        totalRentals,
        totalUsers,
      },
      {
        id: "device-report",
        title: "Device Performance Report",
        type: "device",
        period: "All time",
        topDevice: topDeviceName,
        totalRentals,
        averageRating,
      },
      {
        id: "user-report",
        title: "User Activity Report",
        type: "user",
        period: "Last 7 days",
        newUsers,
        activeUsers,
        churnRate,
      },
    ];

    res.json({ reports });
  } catch (error) {
    console.error("Admin reports error:", error);
    res.status(500).json({ message: "Failed to load reports" });
  }
};

exports.getAdminSuppliers = async (req, res) => {
  try {
    const suppliers = await User.find({ role: "SUPPLIER" }).sort({ createdAt: -1 });

    const deviceCounts = await Device.aggregate([
      {
        $group: {
          _id: "$supplierId",
          totalDevices: { $sum: 1 },
          totalItems: { $sum: "$stockQuantity" },
          rentedDevices: {
            $sum: { $cond: [{ $gt: ["$rentedQuantity", 0] }, 1, 0] },
          },
        },
      },
    ]);

    const activeStatuses = ["APPROVED", "DELIVERING", "RENTING", "RETURNING", "INSPECTING"];
    const activeRentalCounts = await Rental.aggregate([
      { $match: { status: { $in: activeStatuses } } },
      { $group: { _id: "$supplierId", activeRentals: { $sum: 1 } } },
    ]);

    const deviceCountMap = deviceCounts.reduce((acc, item) => {
      acc[item._id.toString()] = item;
      return acc;
    }, {});

    const activeRentalMap = activeRentalCounts.reduce((acc, item) => {
      acc[item._id.toString()] = item.activeRentals;
      return acc;
    }, {});

    const result = suppliers.map((supplier) => ({
      id: supplier._id,
      fullName: supplier.fullName,
      email: supplier.email,
      status: supplier.status,
      rank: supplier.rank,
      isVerified: supplier.isVerified,
      totalDevices: deviceCountMap[supplier._id.toString()]?.totalDevices || 0,
      totalItems: deviceCountMap[supplier._id.toString()]?.totalItems || 0,
      activeRentals: activeRentalMap[supplier._id.toString()] || 0,
    }));

    res.json({ suppliers: result });
  } catch (error) {
    console.error("Admin suppliers error:", error);
    res.status(500).json({ message: "Failed to load suppliers" });
  }
};

exports.getAdminSupplierDetail = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid ID" });
    }

    const supplier = await User.findById(id).select("-password");
    if (!supplier || supplier.role !== "SUPPLIER") {
      return res.status(404).json({ message: "Supplier not found" });
    }

    const profile = await SupplierProfile.findOne({ userId: id });

    // Aggregate stats
    const deviceStats = await Device.aggregate([
      { $match: { supplierId: new mongoose.Types.ObjectId(id) } },
      {
        $group: {
          _id: null,
          totalDevices: { $sum: 1 },
          totalItems: { $sum: "$stockQuantity" },
          totalRented: { $sum: "$rentedQuantity" },
          avgRating: { $avg: "$ratingAvg" },
          totalReviews: { $sum: "$reviewCount" }
        }
      }
    ]);

    const activeStatuses = ["APPROVED", "DELIVERING", "RENTING", "RETURNING", "INSPECTING"];
    const activeRentals = await Rental.countDocuments({
      supplierId: id,
      status: { $in: activeStatuses }
    });

    const recentRentals = await Rental.find({ supplierId: id })
      .populate("customerId", "fullName email")
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        ...supplier.toObject(),
        profile,
        stats: {
          totalDevices: deviceStats[0]?.totalDevices || 0,
          totalItems: deviceStats[0]?.totalItems || 0,
          totalRented: deviceStats[0]?.totalRented || 0,
          avgRating: deviceStats[0]?.avgRating || 0,
          totalReviews: deviceStats[0]?.totalReviews || 0,
          activeRentals
        },
        recentRentals
      }
    });
  } catch (error) {
    console.error("Admin supplier detail error:", error);
    res.status(500).json({ message: "Failed to load supplier details" });
  }
};

const formatMonthLabel = (date) =>
  `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

exports.getAdminDashboardCharts = async (req, res) => {
  try {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      return {
        label: formatMonthLabel(date),
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
      };
    });

    const paidRentals = await Rental.find({
      paymentStatus: "PAID",
      createdAt: { $gte: months[0].start, $lte: months[months.length - 1].end },
    }).select("totalAmount createdAt");

    const revenueSeries = months.map((bucket) => {
      const total = paidRentals.reduce((sum, rental) => {
        if (rental.createdAt >= bucket.start && rental.createdAt <= bucket.end) {
          return sum + rental.totalAmount;
        }
        return sum;
      }, 0);
      return { label: bucket.label, total };
    });

    const statusAgg = await Rental.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const statusBreakdown = statusAgg.map((item) => ({
      status: item._id,
      count: item.count,
    }));

    const categoryAgg = await Device.aggregate([
      { $match: { isAddon: false } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);
    const categoryBreakdown = categoryAgg.map((item) => ({
      category: item._id || "OTHER",
      count: item.count,
    }));

    res.json({ revenueSeries, statusBreakdown, categoryBreakdown });
  } catch (error) {
    console.error("Admin charts error:", error);
    res.status(500).json({ message: "Failed to load dashboard charts" });
  }
};

// ── Admin: Paginated device listing ──────────────────────────────────────────
exports.getAdminDevices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = "",
      category,
      status,
      includeAddons,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};

    // Addon filter
    if (includeAddons === "true" || includeAddons === true) {
      // include both
    } else {
      // default: only main products (not addons)
      filter.isAddon = false;
    }

    // Category filter
    if (category && category !== "ALL") {
      filter.category = category;
    }

    // Status filter
    if (status && status !== "ALL") {
      filter.status = status;
    }

    // Text search (name, slug)
    if (search.trim()) {
      const regex = new RegExp(search.trim(), "i");
      filter.$or = [{ name: regex }, { slug: regex }];
    }

    const [devices, total] = await Promise.all([
      Device.find(filter)
        .populate("supplierId", "fullName")
        .select(
          "_id name slug description rentPrice ratingAvg reviewCount location images category status stockQuantity rentedQuantity depositAmount isAddon supplierId"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Device.countDocuments(filter),
    ]);

    // Attach supplier display name
    const supplierIds = [
      ...new Set(
        devices
          .map((d) => d.supplierId?._id?.toString())
          .filter(Boolean)
      ),
    ];
    const profiles = await SupplierProfile.find({
      userId: { $in: supplierIds },
    }).lean();
    const profileMap = profiles.reduce((acc, p) => {
      acc[p.userId.toString()] = p;
      return acc;
    }, {});

    const result = devices.map((device) => {
      const profile = profileMap[device.supplierId?._id?.toString()];
      return {
        _id: device._id,
        name: device.name,
        slug: device.slug,
        description: device.description,
        rentPrice: device.rentPrice,
        ratingAvg: device.ratingAvg,
        reviewCount: device.reviewCount,
        location: device.location,
        images: device.images,
        category: device.category,
        status: device.status,
        stockQuantity: device.stockQuantity,
        rentedQuantity: device.rentedQuantity,
        depositAmount: device.depositAmount,
        isAddon: device.isAddon,
        supplierId: device.supplierId?._id,
        supplierName:
          profile?.businessName || device.supplierId?.fullName || "N/A",
      };
    });

    res.json({
      devices: result,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error("Admin devices error:", error);
    res.status(500).json({ message: "Failed to load devices" });
  }
};
