const Cart = require("../../models/Cart");
const CartItem = require("../../models/CartItem");
const Rental = require("../../models/Rental");
const RentalItem = require("../../models/RentalItem");
const Device = require("../../models/Device");
const Voucher = require("../../models/Voucher");
const Wallet = require("../../models/Wallet");
const WalletTransaction = require("../../models/WalletTransaction");
const mongoose = require("mongoose");

const { PayOS } = require("@payos/node");

const payos = new PayOS(
  process.env.PAYOS_CLIENT_ID,
  process.env.PAYOS_API_KEY,
  process.env.PAYOS_CHECKSUM_KEY
);

exports.checkoutRental = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const customerId = req.user.id;

    const {
      cartType = "NORMAL",
      deliveryAddress,
      phoneNumber,
      paymentMethod,
      useInsurance = false,
      notes,
      voucherCode,
      shippingFee = 0,
    } = req.body;

    /* ================= 1. LOAD CART ================= */
    const cart = await Cart.findOne({ customerId, cartType })
      .populate({
        path: "items",
        populate: { path: "deviceId" },
      })
      .session(session);

    if (!cart || cart.items.length === 0) {
      throw new Error("Giỏ hàng trống");
    }

    /* ================= 2. GROUP ITEMS BY SUPPLIER ================= */
    const supplierGroups = {};

    for (const item of cart.items) {
      const device = item.deviceId;
      if (!device) throw new Error("Thiết bị không tồn tại");

      if (device.stockQuantity < item.quantity) {
        throw new Error(`Thiết bị ${device.name} không đủ số lượng`);
      }

      const supplierId = device.supplierId.toString();

      if (!supplierGroups[supplierId]) {
        supplierGroups[supplierId] = {
          items: [],
          rentPriceTotal: 0,
          depositAmount: 0,
        };
      }

      const rent = device.rentPrice.perDay * item.totalDays * item.quantity;
      const deposit = device.depositAmount * item.quantity;

      supplierGroups[supplierId].rentPriceTotal += rent;
      supplierGroups[supplierId].depositAmount += deposit;

      supplierGroups[supplierId].items.push({
        deviceId: device._id,
        quantity: item.quantity,
        rentalStartDate: item.rentalStartDate,
        rentalEndDate: item.rentalEndDate,
        totalDays: item.totalDays,
        rentPrice: rent,
        depositAmount: deposit,
      });
    }

    const supplierIds = Object.keys(supplierGroups);

    /* ================= 3. VOUCHER ================= */
    let appliedVoucher = null;

    if (voucherCode) {
      appliedVoucher = await Voucher.findOne({
        code: voucherCode.toUpperCase(),
        status: "ACTIVE",
      }).session(session);
    }

    /* ================= 4. CREATE RENTAL DATA ================= */
    const rentalCreationData = [];
    let grandTotalAmount = 0;

    for (let i = 0; i < supplierIds.length; i++) {
      const supplierId = supplierIds[i];
      const group = supplierGroups[supplierId];

      const insuranceAmount = useInsurance
        ? Math.round(group.rentPriceTotal * 0.05)
        : 0;

      // ✅ Chỉ supplier đầu tiên chịu phí ship
      const deliveryFee = i === 0 ? shippingFee : 0;

      // ✅ Chỉ supplier đầu tiên được áp voucher
      let voucherDiscount = 0;
      if (appliedVoucher && i === 0) {
        if (appliedVoucher.discountType === "PERCENT") {
          voucherDiscount = Math.round(
            (group.rentPriceTotal * appliedVoucher.discountValue) / 100
          );
          if (appliedVoucher.maxDiscount) {
            voucherDiscount = Math.min(
              voucherDiscount,
              appliedVoucher.maxDiscount
            );
          }
        } else {
          voucherDiscount = appliedVoucher.discountValue;
        }
      }

      const totalAmount =
        group.rentPriceTotal +
        group.depositAmount +
        insuranceAmount +
        deliveryFee -
        voucherDiscount;

      rentalCreationData.push({
        supplierId,
        rentPriceTotal: group.rentPriceTotal,
        depositAmount: group.depositAmount,
        insuranceAmount,
        deliveryFee,
        voucherDiscount,
        totalAmount,
        items: group.items,
      });

      grandTotalAmount += totalAmount;
    }

    /* ================= 5. PAYMENT ================= */
    let paymentStatus = "UNPAID";
    let rentalStatus = "PENDING";

    if (paymentMethod === "WALLET") {
      const wallet = await Wallet.findOne({ user: customerId }).session(
        session
      );

      if (!wallet || wallet.balance < grandTotalAmount) {
        throw new Error("Số dư ví không đủ");
      }

      const balanceBefore = wallet.balance;
      wallet.balance -= grandTotalAmount;
      await wallet.save({ session });

      await WalletTransaction.create(
        [
          {
            wallet: wallet._id,
            type: "PAYMENT",
            amount: -grandTotalAmount,
            balanceBefore,
            balanceAfter: wallet.balance,
            referenceType: "RENTAL",
            status: "SUCCESS",
            description: `Thanh toán ${supplierIds.length} đơn thuê thiết bị`,
          },
        ],
        { session }
      );

      paymentStatus = "PAID";
    }

    /* ================= 6. FORMAT ADDRESS ================= */
    const formattedAddress = {
      receiverName: deliveryAddress.receiverName || "Khách hàng",
      street: deliveryAddress.street,
      district: deliveryAddress.district,
      city: deliveryAddress.city,
      fullAddress: deliveryAddress.fullAddress,
    };

    /* ================= 7. CREATE RENTALS ================= */
    const createdRentals = [];

    for (const data of rentalCreationData) {
      const [rental] = await Rental.create(
        [
          {
            customerId,
            supplierId: data.supplierId,
            rentPriceTotal: data.rentPriceTotal,
            depositAmount: data.depositAmount,
            insuranceAmount: data.insuranceAmount,
            deliveryFee: data.deliveryFee,
            voucherDiscount: data.voucherDiscount,
            totalAmount: data.totalAmount,
            paymentMethod,
            paymentStatus,
            status: rentalStatus,
            voucherCode: appliedVoucher?.code,
            deliveryAddress: formattedAddress,
            phoneNumber,
            notes,
          },
        ],
        { session }
      );

      await RentalItem.insertMany(
        data.items.map((item) => ({
          ...item,
          rentalId: rental._id,
        })),
        { session }
      );

      createdRentals.push(rental);
    }

    /* ================= 8. UPDATE STOCK ================= */
    for (const data of rentalCreationData) {
      for (const item of data.items) {
        const updated = await Device.findOneAndUpdate(
          {
            _id: item.deviceId,
            stockQuantity: { $gte: item.quantity },
          },
          { $inc: { stockQuantity: -item.quantity } },
          { new: true, session }
        );

        if (!updated) {
          throw new Error("Lỗi cập nhật tồn kho");
        }

        if (updated.stockQuantity === 0) {
          await Device.updateOne(
            { _id: updated._id },
            { status: "RENTED" },
            { session }
          );
        }
      }
    }

    if (appliedVoucher) {
      await Voucher.updateOne(
        { _id: appliedVoucher._id },
        { $inc: { usedCount: 1 } },
        { session }
      );
    }

    /* ================= 9. PAYOS ================= */
    let paymentLink = null;

    if (paymentMethod === "BANK") {
      const orderCode = Number(String(Date.now()).slice(-9));

      paymentLink = await payos.paymentRequests.create({
        orderCode,
        amount: grandTotalAmount,
        description: `GXP ${createdRentals[0]._id.toString().slice(-6)}`,
        returnUrl: `${process.env.FRONTEND_URL}/payment/success`,
        cancelUrl: `${process.env.FRONTEND_URL}/payment/cancel`,
      });

      await Rental.updateMany(
        { _id: { $in: createdRentals.map((r) => r._id) } },
        { orderCode },
        { session }
      );
    }

    /* ================= 10. CLEAR CART ================= */
    await CartItem.deleteMany({
      _id: { $in: cart.items.map((i) => i._id) },
    }).session(session);

    cart.items = [];
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Checkout thành công",
      rentalIds: createdRentals.map((r) => r._id),
      paymentMethod,
      paymentLink,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("CHECKOUT ERROR:", err);
    res.status(400).json({
      message: err.message || "Thanh toán thất bại",
    });
  }
};

/**
 * Kiểm tra người dùng đã từng thuê thiết bị này chưa (để cho phép review)
 */
exports.hasRentedDevice = async (req, res) => {
  try {
    const customerId = req.user._id;
    const deviceId = req.params.deviceId;

    // Tìm xem có RentalItem nào chứa deviceId này thuộc về customerId không
    const rentalItem = await RentalItem.findOne({ deviceId }).populate({
      path: "rentalId",
      match: { customerId, paymentStatus: "PAID" },
    });

    res.json({ hasRented: !!(rentalItem && rentalItem.rentalId) });
  } catch (error) {
    res.status(500).json({ message: "Lỗi kiểm tra lịch sử thuê" });
  }
};
// Thêm vào file controller của bạn
exports.verifyRentalPayment = async (req, res) => {
  try {
    const { rentalId } = req.body;
    const rental = await Rental.findById(rentalId);

    if (!rental) return res.status(404).json({ message: "Không tìm thấy đơn" });

    // Gọi sang PayOS để lấy trạng thái mới nhất (không cần Ngrok)
    const paymentInfo = await payos.getPaymentLinkInformation(rental.orderCode);

    console.log("Trạng thái đơn hàng từ PayOS:", paymentInfo.status);

    // QUAN TRỌNG: PayOS trả về trạng thái 'PAID' nếu đã thanh toán
    if (paymentInfo.status === "PAID") {
      rental.paymentStatus = "PAID";

      // Sửa dòng này cho khớp với Enum của bạn (thường là APPROVED hoặc PAID)
      // Nếu Model của bạn dùng 'PAID' thì để 'PAID', nếu dùng 'APPROVED' thì để 'APPROVED'
      rental.status = "APPROVED";

      await rental.save();
      return res.status(200).json({ success: true });
    }

    res.status(200).json({ success: false, status: paymentInfo.status });
  } catch (error) {
    console.error("Lỗi Verify:", error.message);
    res.status(500).json({ message: "Lỗi kết nối PayOS" });
  }
};
// GET /rentals/supplier/:supplierId?status=PENDING,APPROVED
exports.getSupplierRentals = async (req, res) => {
  try {
    const { supplierId } = req.params;
    let { status } = req.query;
    let statusArr = [];
    if (status) {
      statusArr = status.split(",").map((s) => s.trim().toUpperCase());
    }
    const query = { supplierId };
    if (statusArr.length > 0) {
      query.status = { $in: statusArr };
    }
    // Lấy rentals trước, populate customer và address
    const rentals = await Rental.find(query)
      .populate("customerId", "fullName avatar email")
      .populate("deliveryAddress", "fullAddress")
      .sort({ createdAt: -1 });

    // Lấy rentalItems cho từng rental, populate deviceId
    const rentalsWithItems = await Promise.all(
      rentals.map(async (rental) => {
        const rentalItems = await RentalItem.find({
          rentalId: rental._id,
        }).populate("deviceId");
        return {
          ...rental.toObject(),
          rentalItems,
        };
      })
    );

    res.json({ rentals: rentalsWithItems });
  } catch (error) {
    console.error("Error getSupplierRentals:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getMyRentals = async (req, res) => {
  try {
    const customerId = req.user.id;

    let rentals = await Rental.find({ customerId })
      .sort({ createdAt: -1 })
      .populate({
        path: "items",
        populate: {
          path: "deviceId",
          select: "name images supplierId", // ← THÊM supplierId vào đây
          populate: {
            path: "supplierId", // ← Populate supplier
            select: "fullName avatar phone email", // Chọn field cần thiết (có thể thêm rating, address nếu muốn)
          },
        },
      })
      .populate({
        path: "extensionRequests",
        match: { status: "PENDING" },
        select: "requestedEndDate requestedDays proposedExtraAmount status",
      })
      .lean(); // lean để response nhanh, object plain JS

    // Manual populate virtual nếu cần (nhưng populate field thật deviceId đã đủ)
    rentals = await Promise.all(
      rentals.map(async (rental) => {
        const itemsWithVirtuals = await Promise.all(
          rental.items.map(async (item) => {
            // Nếu deviceId chưa là object → populate thủ công (trường hợp hiếm)
            let deviceInfo = item.deviceId;
            if (typeof deviceInfo === "string") {
              deviceInfo = await mongoose
                .model("Device")
                .findById(deviceInfo)
                .select("name images")
                .lean();
            }

            const itemObj = await mongoose
              .model("RentalItem")
              .findById(item._id)
              .lean();

            itemObj.deliveryIssues = await mongoose
              .model("DeliveryIssueReport")
              .find({ rentalItemIds: item._id })
              .sort({ createdAt: -1 })
              .select(
                "issueType description status images resolvedNote createdAt updatedAt"
              )
              .lean();

            itemObj.damageReports = await mongoose
              .model("DamageReport")
              .find({ rentalItemId: item._id })
              .sort({ createdAt: -1 })
              .select(
                "description severity status images compensationAmount createdAt updatedAt"
              )
              .lean();

            return {
              ...item,
              ...itemObj,
              deviceId: deviceInfo || item.deviceId, // fallback
            };
          })
        );

        return {
          ...rental,
          items: itemsWithVirtuals,
        };
      })
    );

    res.json({ rentals });
  } catch (error) {
    console.error("Error getMyRentals:", error);
    res.status(500).json({ message: error.message });
  }
};

// PATCH /rentals/:rentalId/approve
exports.approveRental = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const rental = await Rental.findById(rentalId);
    if (!rental)
      return res.status(404).json({ message: "Không tìm thấy đơn thuê" });
    if (rental.status === "APPROVED")
      return res.status(400).json({ message: "Đơn đã được duyệt" });
    rental.status = "APPROVED";
    await rental.save();
    res.json({ success: true, message: "Đã duyệt đơn thuê", rental });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /rentals/:rentalId/reject
exports.rejectRental = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const { reason, details, customerMessage } = req.body;
    const rental = await Rental.findById(rentalId);
    if (!rental)
      return res.status(404).json({ message: "Không tìm thấy đơn thuê" });
    if (rental.status === "REJECTED")
      return res.status(400).json({ message: "Đơn đã bị từ chối" });
    rental.status = "REJECTED";
    if (reason) rental.rejectionReason = reason;
    if (details) rental.rejectionNote = details;
    if (customerMessage) rental.rejectionMessage = customerMessage;
    rental.rejectedAt = new Date();
    // Skip full validation on legacy rentals missing required fields
    await rental.save({ validateBeforeSave: false });
    res.json({ success: true, message: "Đã từ chối đơn thuê", rental });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const formatDayLabel = (date) =>
  `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;

const formatMonthLabel = (date) =>
  `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;

const formatYearLabel = (date) => `${date.getFullYear()}`;

const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());
const endOfDay = (date) =>
  new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999
  );

const sumAmount = async (match) => {
  const result = await Rental.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);
  return result[0]?.total || 0;
};

// GET /rentals/supplier/:supplierId/revenue
exports.getSupplierRevenue = async (req, res) => {
  try {
    const { supplierId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(supplierId)) {
      return res.status(400).json({ message: "SupplierId không hợp lệ" });
    }

    const supplierObjectId = new mongoose.Types.ObjectId(supplierId);
    const now = new Date();

    const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalPaid = await sumAmount({
      supplierId: supplierObjectId,
      paymentStatus: "PAID",
    });
    const totalRefunded = await sumAmount({
      supplierId: supplierObjectId,
      paymentStatus: "REFUNDED",
    });
    const monthlyPaid = await sumAmount({
      supplierId: supplierObjectId,
      paymentStatus: "PAID",
      createdAt: { $gte: startMonth, $lte: now },
    });
    const monthlyRefunded = await sumAmount({
      supplierId: supplierObjectId,
      paymentStatus: "REFUNDED",
      createdAt: { $gte: startMonth, $lte: now },
    });

    const activeStatuses = [
      "APPROVED",
      "DELIVERING",
      "RENTING",
      "RETURNING",
      "INSPECTING",
    ];
    const activeRentals = await Rental.countDocuments({
      supplierId: supplierObjectId,
      status: { $in: activeStatuses },
    });

    const avgRatingResult = await Device.aggregate([
      { $match: { supplierId: supplierObjectId } },
      { $group: { _id: null, avgRating: { $avg: "$ratingAvg" } } },
    ]);
    const avgRating = avgRatingResult[0]?.avgRating || 0;

    const yearStart = new Date(now.getFullYear() - 2, 0, 1);
    const revenueRentals = await Rental.find({
      supplierId: supplierObjectId,
      paymentStatus: { $in: ["PAID", "REFUNDED"] },
      createdAt: { $gte: yearStart, $lte: now },
    }).select("createdAt totalAmount paymentStatus");

    const dayBuckets = Array.from({ length: 7 }, (_, idx) => {
      const date = new Date(now);
      date.setDate(now.getDate() - (6 - idx));
      return {
        label: formatDayLabel(date),
        start: startOfDay(date),
        end: endOfDay(date),
      };
    });

    const monthBuckets = Array.from({ length: 6 }, (_, idx) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - idx), 1);
      return {
        label: formatMonthLabel(date),
        start: new Date(date.getFullYear(), date.getMonth(), 1),
        end: new Date(
          date.getFullYear(),
          date.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        ),
      };
    });

    const yearBuckets = Array.from({ length: 3 }, (_, idx) => {
      const year = now.getFullYear() - (2 - idx);
      const date = new Date(year, 0, 1);
      return {
        label: formatYearLabel(date),
        start: new Date(year, 0, 1),
        end: new Date(year, 11, 31, 23, 59, 59, 999),
      };
    });

    const summarizeBuckets = (buckets) =>
      buckets.map((bucket) => {
        let totalIn = 0;
        let totalOut = 0;
        let rentalsCount = 0;

        revenueRentals.forEach((rental) => {
          if (
            rental.createdAt >= bucket.start &&
            rental.createdAt <= bucket.end
          ) {
            if (rental.paymentStatus === "PAID") {
              totalIn += rental.totalAmount;
              rentalsCount += 1;
            } else if (rental.paymentStatus === "REFUNDED") {
              totalOut += rental.totalAmount;
            }
          }
        });

        return {
          label: bucket.label,
          in: totalIn,
          out: totalOut,
          revenue: totalIn - totalOut,
          rentals: rentalsCount,
        };
      });

    const cashFlow = {
      DAY: summarizeBuckets(dayBuckets).map((b) => ({
        label: b.label,
        in: b.in,
        out: b.out,
      })),
      MONTH: summarizeBuckets(monthBuckets).map((b) => ({
        label: b.label,
        in: b.in,
        out: b.out,
      })),
      YEAR: summarizeBuckets(yearBuckets).map((b) => ({
        label: b.label,
        in: b.in,
        out: b.out,
      })),
    };

    const monthlyBreakdown = summarizeBuckets(monthBuckets)
      .slice(-4)
      .map((item) => ({
        label: item.label,
        revenue: item.revenue,
        rentals: item.rentals,
      }));

    const topDevices = await RentalItem.aggregate([
      {
        $lookup: {
          from: "rentals",
          localField: "rentalId",
          foreignField: "_id",
          as: "rental",
        },
      },
      { $unwind: "$rental" },
      {
        $match: {
          "rental.supplierId": supplierObjectId,
          "rental.paymentStatus": "PAID",
        },
      },
      {
        $group: {
          _id: "$deviceId",
          revenue: { $sum: "$rentPrice" },
          rentals: { $sum: "$quantity" },
        },
      },
      {
        $lookup: {
          from: "devices",
          localField: "_id",
          foreignField: "_id",
          as: "device",
        },
      },
      { $unwind: "$device" },
      { $project: { name: "$device.name", revenue: 1, rentals: 1 } },
      { $sort: { revenue: -1 } },
      { $limit: 4 },
    ]);

    const recentRentals = await Rental.find({
      supplierId: supplierObjectId,
      paymentStatus: { $in: ["PAID", "REFUNDED"] },
    })
      .populate("customerId", "fullName")
      .sort({ createdAt: -1 })
      .limit(5);

    const transactions = recentRentals.map((rental) => ({
      id: rental._id,
      amount:
        rental.paymentStatus === "REFUNDED"
          ? -rental.totalAmount
          : rental.totalAmount,
      description:
        rental.paymentStatus === "REFUNDED"
          ? `Hoàn tiền đơn thuê #${rental._id.toString().slice(-6)}`
          : `Thanh toán đơn thuê #${rental._id.toString().slice(-6)}`,
      createdAt: rental.createdAt.toLocaleString("vi-VN"),
      status: rental.paymentStatus,
      customerName: rental.customerId?.fullName || "",
    }));

    res.json({
      summary: {
        totalRevenue: totalPaid - totalRefunded,
        monthlyRevenue: monthlyPaid - monthlyRefunded,
        activeRentals,
        avgRating,
      },
      cashFlow,
      monthlyBreakdown,
      topDevices,
      transactions,
    });
  } catch (error) {
    console.error("Error getSupplierRevenue:", error);
    res.status(500).json({ message: error.message });
  }
};
// 1. HỦY ĐƠN & HOÀN TIỀN (Chỉ cho PENDING)
exports.cancelRental = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { rentalId } = req.params;
    const rental = await Rental.findOne({
      _id: rentalId,
      customerId: req.user.id,
    }).session(session);

    if (!rental || rental.status !== "PENDING") {
      throw new Error("Đơn hàng không thể hủy ở trạng thái này");
    }

    // Nếu đã thanh toán (PAID) thì hoàn tiền về ví
    if (rental.paymentStatus === "PAID") {
      const wallet = await Wallet.findOne({ user: rental.customerId }).session(
        session
      );
      const balanceBefore = wallet.balance;
      wallet.balance += rental.totalAmount;
      await wallet.save({ session });

      await WalletTransaction.create(
        [
          {
            wallet: wallet._id,
            type: "REFUND",
            amount: rental.totalAmount,
            balanceBefore,
            balanceAfter: wallet.balance,
            referenceType: "RENTAL",
            referenceId: rental._id,
            description: `Hoàn tiền hủy đơn đơn thuê #${rental._id
              .toString()
              .slice(-6)}`,
          },
        ],
        { session }
      );
    }

    // Hoàn trả tồn kho (Stock)
    const items = await RentalItem.find({ rentalId: rental._id }).session(
      session
    );
    for (const item of items) {
      await Device.findByIdAndUpdate(
        item.deviceId,
        { $inc: { stockQuantity: item.quantity } },
        { session }
      );
    }

    rental.status = "CANCELLED";
    await rental.save({ session });

    await session.commitTransaction();
    res.json({ message: "Hủy đơn và hoàn tiền thành công" });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};

// 2. XÁC NHẬN ĐÃ NHẬN HÀNG & CỘNG TIỀN CHO SUPPLIER
exports.confirmReceived = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { rentalId } = req.params;
    const rental = await Rental.findById(rentalId).session(session);

    if (rental.status !== "DELIVERING")
      throw new Error("Đơn hàng chưa ở trạng thái giao hàng");

    // Hoàn thành đơn
    rental.status = "RENTING"; // Hoặc COMPLETED tùy flow của bạn, ở đây chọn RENTING vì khách bắt đầu dùng
    await rental.save({ session });

    // Cộng tiền cho Supplier (Sau khi trừ phí sàn nếu có)
    const supplierWallet = await Wallet.findOne({
      user: rental.supplierId,
    }).session(session);
    const amountToSupplier = rental.rentPriceTotal; // Giả sử chỉ cộng tiền thuê, cọc giữ lại hệ thống

    const balanceBefore = supplierWallet.balance;
    supplierWallet.balance += amountToSupplier;
    await supplierWallet.save({ session });

    await WalletTransaction.create(
      [
        {
          wallet: supplierWallet._id,
          type: "PAYMENT", // Hoặc 'REVENUE'
          amount: amountToSupplier,
          balanceBefore,
          balanceAfter: supplierWallet.balance,
          referenceType: "RENTAL",
          referenceId: rental._id,
          description: `Nhận tiền thuê từ đơn #${rental._id
            .toString()
            .slice(-6)}`,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    res.json({ message: "Xác nhận thành công" });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message });
  } finally {
    session.endSession();
  }
};
const ExtensionRequest = require("../../models/ExtensionRequest"); // import model mới

exports.extendRental = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { rentalId } = req.params;
    const { newEndDate, requestedDays, extraAmount, note } = req.body;

    // Tìm rental để lấy thông tin supplierId, customerId, items
    const rental = await Rental.findById(rentalId)
      .populate("items")
      .session(session);

    if (!rental) throw new Error("Không tìm thấy đơn thuê");

    if (rental.status !== "RENTING") {
      throw new Error("Chỉ được yêu cầu gia hạn khi đang thuê");
    }

    // Kiểm tra ngày hợp lệ
    const currentEnd = new Date(rental.items[0]?.rentalEndDate);
    const proposedEnd = new Date(newEndDate);

    if (proposedEnd <= currentEnd) {
      throw new Error("Ngày gia hạn phải sau ngày trả hiện tại");
    }

    const actualRequestedDays = Math.ceil(
      (proposedEnd - currentEnd) / (1000 * 60 * 60 * 24)
    );

    if (actualRequestedDays !== requestedDays) {
      throw new Error("Số ngày gia hạn không khớp, vui lòng thử lại");
    }

    // Tạo document ExtensionRequest mới
    const extensionRequest = await ExtensionRequest.create(
      [
        {
          rentalId: rental._id,
          customerId: rental.customerId,
          supplierId: rental.supplierId,
          requestedEndDate: proposedEnd,
          requestedDays,
          proposedExtraAmount: extraAmount,
          note: note || "",
          status: "PENDING",
        },
      ],
      { session }
    );

    // Optional: Cập nhật Rental để đánh dấu có yêu cầu pending (dễ filter)
    rental.extensionStatus = "PENDING";
    await rental.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      message:
        "Yêu cầu gia hạn đã được gửi thành công, chờ xác nhận từ bên cho thuê",
      extensionRequest: extensionRequest[0],
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Extend Rental Error:", err);
    res
      .status(400)
      .json({ message: err.message || "Gửi yêu cầu gia hạn thất bại" });
  } finally {
    session.endSession();
  }
};
