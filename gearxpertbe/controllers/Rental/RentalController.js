const Cart = require("../../models/Cart");
const CartItem = require("../../models/CartItem");
const Rental = require("../../models/Rental");
const Contract = require("../../models/Contract");
const ContractItem = require("../../models/ContractItem");
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
// Đầu file RentalController.js (hoặc nơi bạn định nghĩa các hàm)
const NotificationConfig = require("../../configs/NotificationConfig"); // điều chỉnh path cho đúng

// Helper gửi noti cho supplier hoặc customer
const sendRentalNotification = async (
  rental,
  receiverRole,
  title,
  message,
  linkSuffix = ""
) => {
  const receiverId =
    receiverRole === "SUPPLIER" ? rental.supplierId : rental.customerId;
  const senderId =
    receiverRole === "SUPPLIER" ? rental.customerId : rental.supplierId;

  await NotificationConfig.sendNotification({
    senderId,
    receiverId,
    title,
    message,
    link: linkSuffix
      ? `/my-rentals/${rental._id}${linkSuffix}`
      : `/my-rentals/${rental._id}`, // tùy frontend route
    type: "ORDER",
  });
};
exports.checkoutRental = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let grandTotalAmount = 0;
  let tempOrderCode = null;
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
    const formattedAddress = {
      receiverName: deliveryAddress?.receiverName || "Khách hàng",
      street: deliveryAddress?.street || "",
      district: deliveryAddress?.district || "",
      city: deliveryAddress?.city || "",
      fullAddress: deliveryAddress?.fullAddress || "",
    };
    /* ================= 1. LOAD CART ================= */
    const cart = await Cart.findOne({ customerId, cartType })
      .populate({ path: "items", populate: { path: "deviceId" } })
      .session(session);

    if (!cart || cart.items.length === 0) throw new Error("Giỏ hàng trống");

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

      if (
        appliedVoucher &&
        appliedVoucher.usedCount >= appliedVoucher.usageLimit
      ) {
        throw new Error("Mã giảm giá đã hết lượt sử dụng");
      }
    }

    /* ================= 4. TÍNH TOÁN ================= */
    const rentalCreationData = [];

    for (const supplierId of supplierIds) {
      const group = supplierGroups[supplierId];
      const insuranceAmount = useInsurance
        ? Math.round(group.rentPriceTotal * 0.05)
        : 0;
      const deliveryFee = shippingFee;

      let voucherDiscount = 0;
      if (appliedVoucher) {
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
        } else if (appliedVoucher.discountType === "FIXED") {
          voucherDiscount = appliedVoucher.discountValue; // discount cố định
          // Optional: check nếu vượt quá rentPriceTotal thì cap lại
          voucherDiscount = Math.min(voucherDiscount, group.rentPriceTotal);
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

    /* ================= 5. TRỪ STOCK ================= */
    for (const data of rentalCreationData) {
      for (const item of data.items) {
        const updated = await Device.findOneAndUpdate(
          { _id: item.deviceId, stockQuantity: { $gte: item.quantity } },
          { $inc: { stockQuantity: -item.quantity } },
          { new: true, session }
        );
        if (!updated)
          throw new Error(`Lỗi cập nhật tồn kho hoặc thiết bị vừa hết hàng`);

        if (updated.stockQuantity === 0) {
          await Device.updateOne(
            { _id: updated._id },
            { status: "RENTED" },
            { session }
          );
        }
      }
    }

    /* ================= 6. XỬ LÝ THANH TOÁN WALLET ================= */
    let paymentStatus = "UNPAID";
    let walletSuccess = false;

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
            description: `Thanh toán ${supplierIds.length} đơn thuê`,
          },
        ],
        { session }
      );

      paymentStatus = "PAID";
      walletSuccess = true;

      // Trừ voucher NGAY
      if (appliedVoucher) {
        const updated = await Voucher.updateOne(
          {
            _id: appliedVoucher._id,
            usedCount: { $lt: appliedVoucher.usageLimit },
          },
          { $inc: { usedCount: 1 } },
          { session }
        );
        if (updated.modifiedCount === 0) {
          throw new Error(
            "Mã giảm giá đã hết lượt sử dụng ngay lúc thanh toán"
          );
        }
      }

      // TĂNG rentedQuantity cho WALLET (chỉ WALLET tăng ở đây)
      for (const data of rentalCreationData) {
        for (const item of data.items) {
          const updatedDevice = await Device.findByIdAndUpdate(
            item.deviceId,
            { $inc: { rentedQuantity: item.quantity } },
            { new: true, session }
          );

          // Nếu rented >= stock → set status RENTED
          if (
            updatedDevice &&
            updatedDevice.rentedQuantity >= updatedDevice.stockQuantity
          ) {
            await Device.updateOne(
              { _id: updatedDevice._id },
              { status: "RENTED" },
              { session }
            );
          }
        }
      }
    }

    /* ================= 7. TẠO RENTALS ================= */
    const createdRentals = [];
    for (const data of rentalCreationData) {
      const rentalData = {
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
        status: "PENDING",
        voucherCode: appliedVoucher?.code,
        deliveryAddress: formattedAddress,
        phoneNumber,
        notes,
      };

      // Nếu BANK, set orderCode tạm unique cho từng rental
      if (paymentMethod === "BANK") {
        rentalData.orderCode = Number(
          String(Date.now()) + Math.floor(Math.random() * 1000)
        ); // unique mỗi lần loop
      }

      const [rental] = await Rental.create([rentalData], { session });

      await RentalItem.insertMany(
        data.items.map((item) => ({ ...item, rentalId: rental._id })),
        { session }
      );

      createdRentals.push(rental);
    }

    /* ================= GỬI NOTIFICATION (CHỈ WALLET) ================= */
    if (walletSuccess) {
      for (const rental of createdRentals) {
        await sendRentalNotification(
          rental,
          "SUPPLIER",
          "Có đơn thuê mới!",
          `Khách hàng vừa thanh toán thành công ${rental.totalAmount.toLocaleString(
            "vi-VN"
          )}₫`,
          ""
        );
      }
    }

    /* ================= 8. HOÀN TẤT WALLET ================= */
    if (paymentMethod === "WALLET") {
      await CartItem.deleteMany({
        _id: { $in: cart.items.map((i) => i._id) },
      }).session(session);
      cart.items = [];
      await cart.save({ session });
    }

    /* ================= 9. PAYOS (BANK) ================= */
    let paymentLink = null;
    if (paymentMethod === "BANK") {
      const orderCode = Number(String(Date.now()).slice(-9));
      // Lấy rentalId đại diện (đầu tiên trong createdRentals)
      const representativeRentalId = createdRentals[0]._id.toString();
      paymentLink = await payos.paymentRequests.create({
        orderCode,
        amount: grandTotalAmount,
        description: `GXP ${createdRentals[0]._id.toString().slice(-6)}`,
        returnUrl: `${process.env.FRONTEND_URL}/payment/success?rentalId=${representativeRentalId}`,
        cancelUrl: `${process.env.FRONTEND_URL}/payment/cancel?rentalId=${representativeRentalId}`,
      });

      await Rental.updateMany(
        { _id: { $in: createdRentals.map((r) => r._id) } },
        { orderCode },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message:
        paymentMethod === "BANK"
          ? "Vui lòng hoàn tất thanh toán"
          : "Checkout thành công",
      rentalIds: createdRentals.map((r) => r._id),
      paymentMethod,
      paymentLink: paymentLink,
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();

    console.error("CHECKOUT ERROR - Chi tiết:", {
      message: err.message,
      stack: err.stack,
      code: err.code,
      paymentMethod: req.body?.paymentMethod,
      customerId: req.user?.id,
      grandTotalAmount,
    });

    let errorMessage = err.message || "Thanh toán thất bại";
    if (err.code === 11000) {
      errorMessage =
        "Lỗi hệ thống: Không thể tạo đơn thuê (duplicate key). Vui lòng thử lại sau.";
    }

    res.status(400).json({ message: errorMessage });
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
      rental.status = "DELIVERING";

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

exports.getDeliveringRentals = async (req, res) => {
  try {
    const rentals = await Rental.find({ status: "DELIVERING" })
      .populate("customerId", "fullName avatar email")
      .sort({ updatedAt: -1 });

    const rentalsWithItems = await Promise.all(
      rentals.map(async (rental) => {
        const rentalItems = await RentalItem.find({
          rentalId: rental._id,
        }).populate("deviceId", "name images");
        return {
          ...rental.toObject(),
          rentalItems,
        };
      })
    );

    res.json({ rentals: rentalsWithItems });
  } catch (error) {
    console.error("Error getDeliveringRentals:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getReturningRentals = async (req, res) => {
  try {
    const rentals = await Rental.find({ status: "RETURNING" })
      .populate("customerId", "fullName avatar email")
      .sort({ updatedAt: -1 });

    const rentalsWithItems = await Promise.all(
      rentals.map(async (rental) => {
        const rentalItems = await RentalItem.find({
          rentalId: rental._id,
        }).populate("deviceId", "name images");
        return {
          ...rental.toObject(),
          rentalItems,
        };
      })
    );

    res.json({ rentals: rentalsWithItems });
  } catch (error) {
    console.error("Error getReturningRentals:", error);
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
    await sendRentalNotification(
      rental,
      "CUSTOMER",
      "Đơn thuê đã được duyệt",
      "Nhà cung cấp đã xác nhận đơn thuê của bạn. Chuẩn bị nhận hàng nhé!"
    );
    await rental.save();
    res.json({ success: true, message: "Đã duyệt đơn thuê", rental });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// PATCH /rentals/:rentalId/reject
exports.rejectRental = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { rentalId } = req.params;
    const supplierId = req.user.id; // Supplier đang đăng nhập

    const { reason, details, customerMessage } = req.body;

    // 1. Tìm và kiểm tra quyền
    const rental = await Rental.findById(rentalId).session(session);
    if (!rental) {
      throw new Error("Không tìm thấy đơn thuê");
    }

    if (rental.supplierId.toString() !== supplierId) {
      throw new Error("Bạn không có quyền từ chối đơn này");
    }

    if (rental.status !== "PENDING") {
      throw new Error("Chỉ có thể từ chối đơn ở trạng thái chờ xử lý");
    }

    // 2. Cập nhật trạng thái rental
    rental.status = "REJECTED";
    rental.rejectionReason = reason || "Không có lý do cụ thể";
    rental.rejectionNote = details || "";
    rental.rejectionMessage =
      customerMessage || "Đơn đã bị từ chối bởi nhà cung cấp";
    rental.rejectedAt = new Date();

    await rental.save({ session });
    await NotificationConfig.sendNotification({
      senderId: supplierId, // supplier từ chối
      receiverId: rental.customerId,
      title: "Đơn thuê bị từ chối",
      message: `Đơn thuê của bạn đã bị từ chối. Lý do: ${
        reason || "Không có lý do cụ thể"
      }${details ? " - " + details : ""}`,
      link: `/my-rentals/${rental._id}`,
      type: "ORDER",
    });
    // 3. Hoàn lại tồn kho VÀ cập nhật status device
    const rentalItems = await RentalItem.find({ rentalId: rental._id }).session(
      session
    );

    for (const item of rentalItems) {
      const device = await Device.findById(item.deviceId).session(session);
      if (!device) continue;

      // Hoàn lại số lượng
      device.stockQuantity += item.quantity;

      // Cập nhật status device
      if (device.stockQuantity > 0) {
        device.status = "AVAILABLE"; // hoặc "IN_STOCK" tùy enum của bạn
      } else {
        device.status = "STOPPED";
      }

      await device.save({ session });
    }

    // 4. Hoàn tiền nếu đã thanh toán
    if (rental.paymentStatus === "PAID") {
      const wallet = await Wallet.findOne({ user: rental.customerId }).session(
        session
      );
      if (!wallet) {
        console.warn(`Không tìm thấy ví của khách hàng ${rental.customerId}`);
      } else {
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
              description: `Hoàn tiền do nhà cung cấp từ chối đơn #${rental._id
                .toString()
                .slice(-6)}`,
              status: "SUCCESS",
            },
          ],
          { session }
        );
      }

      rental.paymentStatus = "REFUNDED";
      await rental.save({ session });
    }

    // 5. (Optional) Xóa cart items liên quan nếu cần
    // await CartItem.deleteMany({ rentalId: rental._id }).session(session);

    // 6. Commit transaction
    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Đã từ chối đơn thuê và hoàn tất các bước liên quan",
      rental,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("REJECT RENTAL ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Từ chối đơn thất bại",
    });
  } finally {
    session.endSession();
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
    await sendRentalNotification(
      rental,
      "SUPPLIER",
      "Khách hàng đã hủy đơn thuê",
      `Khách hàng đã hủy đơn #${rental._id
        .toString()
        .slice(-6)}. Tồn kho đã được hoàn lại.`
    );
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

    if (!rental.deliveredAt)
      throw new Error("Nhân viên chưa xác nhận đã giao hàng. Vui lòng chờ nhân viên xác nhận.");

    // Hoàn thành đơn
    rental.status = "RENTING"; // Hoặc COMPLETED tùy flow của bạn, ở đây chọn RENTING vì khách bắt đầu dùng
    await rental.save({ session });
    await sendRentalNotification(
      rental,
      "SUPPLIER",
      "Khách đã xác nhận nhận hàng",
      "Khách hàng đã xác nhận nhận thiết bị thành công."
    );
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
    await NotificationConfig.sendNotification({
      senderId: rental.customerId,
      receiverId: rental.supplierId,
      title: "Yêu cầu gia hạn đơn thuê",
      message: `Khách hàng yêu cầu gia hạn thêm ${requestedDays} ngày đến ${newEndDate.toLocaleDateString(
        "vi-VN"
      )}. Số tiền đề xuất thêm: ${extraAmount.toLocaleString()}đ`,
      link: `/supplier/orders/${rental._id}`,
      type: "ORDER",
    });
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
exports.startDelivery = async (req, res) => {
  try {
    const { rentalId } = req.params;

    const rental = await Rental.findById(rentalId);
    if (!rental) {
      return res.status(404).json({ message: "Rental not found" });
    }

    // 1️⃣ update rental status
    rental.status = "DELIVERING";
    await rental.save();

    await sendRentalNotification(
      rental,
      "CUSTOMER",
      "Đơn thuê đang được giao",
      "Nhà cung cấp đã bắt đầu giao hàng. Vui lòng theo dõi trạng thái."
    );
    // 2️⃣ create contract DELIVERY
    const contract = await Contract.create({
      rentalId: rental._id,
      contractType: "DELIVERY",
      status: "DRAFT",
      deliveryMethod: rental.deliveryFee > 0 ? "SHIP" : "HANDOVER",
      location: rental.deliveryAddress.fullAddress,
    });

    // 3️⃣ create contract items
    const rentalItems = await RentalItem.find({ rentalId: rental._id });

    const contractItems = rentalItems.map((item) => ({
      contractId: contract._id,
      rentalItemId: item._id,
      deviceId: item.deviceId,
      quantity: item.quantity,
      conditionBefore: item.conditionBeforeRent,
    }));

    await ContractItem.insertMany(contractItems);

    return res.status(200).json({
      message: "Delivery started & contract created",
      contractId: contract._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.confirmPickup = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const rental = await Rental.findById(rentalId);
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    if (rental.status !== "DELIVERING")
      return res.status(400).json({ message: "Rental is not in DELIVERING status" });
    if (rental.pickedUpAt)
      return res.status(400).json({ message: "Pickup already confirmed" });

    rental.pickedUpAt = new Date();
    await rental.save();

    return res.status(200).json({ message: "Pickup confirmed", pickedUpAt: rental.pickedUpAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.confirmReturn = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const rental = await Rental.findById(rentalId);
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    if (rental.status !== "RETURNING")
      return res.status(400).json({ message: "Rental is not in RETURNING status" });

    rental.status = "COMPLETED";
    await rental.save();

    // Notify customer
    await sendRentalNotification(
      rental,
      "CUSTOMER",
      "Đơn thuê đã hoàn thành",
      `Thiết bị của đơn #${rental._id.toString().slice(-6).toUpperCase()} đã được thu hồi thành công. Cảm ơn bạn đã sử dụng dịch vụ!`
    );

    // Notify supplier
    await sendRentalNotification(
      rental,
      "SUPPLIER",
      "Thiết bị đã được thu hồi - Đơn hoàn tất",
      `Đơn thuê #${rental._id.toString().slice(-6).toUpperCase()} đã hoàn tất. Thiết bị đã được thu hồi từ khách hàng.`
    );

    return res.status(200).json({ message: "Return confirmed, rental is now COMPLETED" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.confirmDelivery = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const rental = await Rental.findById(rentalId);
    if (!rental) return res.status(404).json({ message: "Rental not found" });
    if (rental.status !== "DELIVERING")
      return res.status(400).json({ message: "Rental is not in DELIVERING status" });
    if (!rental.pickedUpAt)
      return res.status(400).json({ message: "Please confirm pickup before confirming delivery" });
    if (rental.deliveredAt)
      return res.status(400).json({ message: "Delivery already confirmed" });

    rental.deliveredAt = new Date();
    await rental.save();

    await sendRentalNotification(
      rental,
      "CUSTOMER",
      "Thiết bị đã được giao đến bạn!",
      "Nhân viên đã xác nhận giao hàng thành công. Vui lòng kiểm tra và xác nhận đã nhận hàng."
    );

    return res.status(200).json({ message: "Delivery confirmed", deliveredAt: rental.deliveredAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.repayRental = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { rentalId } = req.params;
    const customerId = req.user.id;

    // Tìm rental đại diện
    const rental = await Rental.findOne({
      _id: rentalId,
      customerId,
      paymentStatus: "UNPAID",
      status: "PENDING",
    }).session(session);

    if (!rental) {
      throw new Error("Không tìm thấy đơn chờ thanh toán hợp lệ");
    }

    let rentalsToRepay = [rental];
    let totalAmount = rental.totalAmount;

    // Nếu có orderCode cũ (từ checkout group) → tìm toàn bộ group
    if (rental.orderCode) {
      rentalsToRepay = await Rental.find({
        orderCode: rental.orderCode,
        customerId,
        paymentStatus: "UNPAID",
      }).session(session);

      // Tính tổng amount của group
      totalAmount = rentalsToRepay.reduce((sum, r) => sum + r.totalAmount, 0);
    }

    // Tạo orderCode mới (riêng cho lần repay này)
    const newOrderCode = Number(String(Date.now()).slice(-9));

    // Tạo payment link PayOS
    const paymentLinkData = await payos.paymentRequests.create({
      orderCode: newOrderCode,
      amount: totalAmount,
      description: `GXP repay #${rental._id.toString().slice(-6)}
 
      `,
      returnUrl: `${process.env.FRONTEND_URL}/payment/success?rentalId=${rental._id}`,
      cancelUrl: `${process.env.FRONTEND_URL}/payment/cancel?rentalId=${rental._id}`,
    });

    if (!paymentLinkData?.checkoutUrl) {
      throw new Error("Không thể tạo link thanh toán PayOS");
    }

    // Cập nhật orderCode mới cho TOÀN BỘ group (hoặc single)
    await Rental.updateMany(
      { _id: { $in: rentalsToRepay.map((r) => r._id) } },
      { orderCode: newOrderCode },
      { session }
    );

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: `Đã tạo link thanh toán mới cho ${rentalsToRepay.length} đơn`,
      paymentLink: paymentLinkData.checkoutUrl,
      amount: totalAmount,
      orderCode: newOrderCode,
      rentalId: rental._id, // đại diện
      isGroup: rentalsToRepay.length > 1,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Repay Rental Error:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Không thể tạo thanh toán lại",
    });
  } finally {
    session.endSession();
  }
};
exports.cancelPayRental = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { rentalId } = req.params;
    const customerId = req.user.id;

    // Tìm rental đại diện
    const rental = await Rental.findOne({
      _id: rentalId,
      customerId,
    }).session(session);

    if (!rental) {
      throw new Error("Không tìm thấy đơn hàng");
    }

    // Tìm toàn bộ group (nếu có orderCode)
    let rentalsToCancel = [rental];
    if (rental.orderCode) {
      rentalsToCancel = await Rental.find({
        orderCode: rental.orderCode,
        customerId,
        status: { $in: ["PENDING", "UNPAID"] },
      }).session(session);
    }

    if (rentalsToCancel.length === 0) {
      throw new Error("Không có đơn hàng nào có thể hủy");
    }

    // Chỉ cập nhật status CANCELLED cho toàn bộ group
    await Rental.updateMany(
      { _id: { $in: rentalsToCancel.map((r) => r._id) } },
      {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancelReason: "Khách hàng hủy từ trang thanh toán thất bại",
      },
      { session }
    );

    await session.commitTransaction();

    res.json({
      success: true,
      message: `Đã hủy thành công ${rentalsToCancel.length} đơn hàng`,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Cancel Rental Error:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Hủy đơn thất bại",
    });
  } finally {
    session.endSession();
  }
};
exports.repaySingleRental = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { rentalId } = req.params;
    const customerId = req.user.id;

    // Tìm rental cụ thể, đảm bảo UNPAID + PENDING
    const rental = await Rental.findOne({
      _id: rentalId,
      customerId,
      paymentStatus: "UNPAID",
      status: "PENDING",
    }).session(session);

    if (!rental) {
      throw new Error("Không tìm thấy đơn chờ thanh toán hợp lệ");
    }

    // Luôn chỉ xử lý single rental
    const rentalsToRepay = [rental];
    const totalAmount = rental.totalAmount;

    // Tạo orderCode mới riêng cho rental này
    const newOrderCode = Number(String(Date.now()).slice(-9));

    // Tạo payment link PayOS chỉ cho rental này
    const paymentLinkData = await payos.paymentRequests.create({
      orderCode: newOrderCode,
      amount: totalAmount,
      description: `GXP repay single #${rental._id.toString().slice(-6)}`,
      returnUrl: `${process.env.FRONTEND_URL}/payment/success?rentalId=${rental._id}`,
      cancelUrl: `${process.env.FRONTEND_URL}/payment/cancel?rentalId=${rental._id}`,
    });

    if (!paymentLinkData?.checkoutUrl) {
      throw new Error("Không thể tạo link thanh toán PayOS");
    }

    // Cập nhật orderCode mới CHỈ cho rental này
    rental.orderCode = newOrderCode;
    await rental.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      success: true,
      message: "Đã tạo link thanh toán mới cho đơn lẻ này",
      paymentLink: paymentLinkData.checkoutUrl,
      amount: totalAmount,
      orderCode: newOrderCode,
      rentalId: rental._id,
      isGroup: false,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Repay Single Rental Error:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Không thể tạo thanh toán lại cho đơn lẻ",
    });
  } finally {
    session.endSession();
  }
};