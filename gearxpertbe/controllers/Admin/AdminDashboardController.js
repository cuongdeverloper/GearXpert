const Device = require("../../models/Device");
const Rental = require("../../models/Rental");
const RentalItem = require("../../models/RentalItem");
const User = require("../../models/User");

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
    const rentals = await Rental.find()
      .populate("customerId", "fullName")
      .sort({ createdAt: -1 });

    const rentalItems = await Promise.all(
      rentals.map(async (rental) => {
        const rentalItem = await RentalItem.findOne({ rentalId: rental._id })
          .populate("deviceId", "name");
        return {
          id: rental._id,
          customerName: rental.customerId?.fullName || "Unknown",
          deviceName: rentalItem?.deviceId?.name || "Device",
          rentalStartDate: rental.rentalStartDate,
          rentalEndDate: rental.rentalEndDate,
          totalAmount: rental.totalAmount,
          paymentStatus: rental.paymentStatus,
          status: rental.status,
          deliveryAddress: rental.deliveryAddress || {},
        };
      })
    );

    res.json({ rentals: rentalItems });
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
          rentedDevices: {
            $sum: { $cond: [{ $eq: ["$status", "RENTED"] }, 1, 0] },
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
      activeRentals: activeRentalMap[supplier._id.toString()] || 0,
    }));

    res.json({ suppliers: result });
  } catch (error) {
    console.error("Admin suppliers error:", error);
    res.status(500).json({ message: "Failed to load suppliers" });
  }
};
