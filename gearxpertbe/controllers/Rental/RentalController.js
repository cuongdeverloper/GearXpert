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
const DeviceItem = require("../../models/DeviceItem");
const DeliveryTask = require("../../models/DeliveryTask");
const mongoose = require("mongoose");
const {
  ensureDraftForDelivery,
  syncCancelledRental,
} = require("../../services/HandoverService");
const {
  ensureDraftForReturn,
  completeReturn,
  listByRental,
  syncClosedRental,
} = require("../../services/ReturnService");

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
/**
 * GET /api/rentals/:rentalId
 * Lấy chi tiết một đơn thuê (dành cho customer xem chi tiết)
 */
exports.getRentalById = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const customerId = req.user.id; // Bảo mật: chỉ cho phép xem đơn của chính mình

    if (!mongoose.Types.ObjectId.isValid(rentalId)) {
      return res.status(400).json({ message: "Rental ID không hợp lệ" });
    }

    const rental = await Rental.findOne({
      _id: rentalId,
      customerId: customerId, // Quan trọng: ngăn user xem đơn của người khác
    })
      .populate({
        path: "extensionRequests",
        match: { status: "PENDING" },
        select:
          "requestedEndDate requestedDays proposedExtraAmount status note",
      })
      .lean();

    if (!rental) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn thuê hoặc bạn không có quyền xem",
      });
    }

    // Populate RentalItems + nested data
    const rentalItems = await RentalItem.find({ rentalId: rental._id })
      .populate([
        {
          path: "deviceId",
          select: "name slug images supplierId rentPrice depositAmount",
          populate: {
            path: "supplierId",
            select: "fullName avatar phone email",
          },
        },
        {
          path: "deviceItemIds", // mảng serial thực tế
          select: "serialNumber internalCode condition status location images",
        },
      ])
      .lean();

    // Thêm reports + serialNumbers cho từng item (giống getMyRentals)
    const itemsWithReports = await Promise.all(
      rentalItems.map(async (item) => {
        const deliveryIssues = await mongoose
          .model("DeliveryIssueReport")
          .find({ rentalItemId: item._id })
          .sort({ createdAt: -1 })
          .select(
            "issueType description status images resolvedNote createdAt updatedAt"
          )
          .lean();

        const damageReports = await mongoose
          .model("DamageReport")
          .find({ rentalItemId: item._id })
          .sort({ createdAt: -1 })
          .select(
            "description severity status images compensationAmount createdAt updatedAt"
          )
          .lean();

        return {
          ...item,
          deliveryIssues,
          damageReports,
          serialNumbers: item.deviceItemIds?.map((d) => d.serialNumber) || [],
          conditions: item.deviceItemIds?.map((d) => d.condition) || [],
        };
      })
    );

    const result = {
      ...rental,
      items: itemsWithReports,
    };

    res.json({
      success: true,
      rental: result,
    });
  } catch (error) {
    console.error("Error getRentalById:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi lấy chi tiết đơn thuê",
    });
  }
};
exports.checkoutRental = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  let grandTotalAmount = 0;
  const PLATFORM_FEE_RATE = 0.1; // 10% trên rent sau voucher

  try {
    const customerId = req.user.id;
    const {
      cartType = "NORMAL",
      deliveryAddress,
      phoneNumber,
      paymentMethod,
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

    // 1. Load cart
    const cart = await Cart.findOne({ customerId, cartType })
      .populate({ path: "items", populate: { path: "deviceId" } })
      .session(session);

    if (!cart || cart.items.length === 0) throw new Error("Giỏ hàng trống");

    // 2. Group items by supplier
    const supplierGroups = {};
    for (const item of cart.items) {
      const device = item.deviceId;
      if (!device) throw new Error("Thiết bị không tồn tại");

      const availableCount = await DeviceItem.countDocuments({
        deviceId: device._id,
        status: "AVAILABLE",
      }).session(session);

      if (availableCount < item.quantity) {
        throw new Error(
          `Thiết bị ${device.name} không đủ số lượng khả dụng (còn ${availableCount}/${item.quantity})`
        );
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

    // 3. Voucher
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

    // 4. Tính toán chi tiết theo từng supplier
    const rentalCreationData = [];
    let totalPlatformFee = 0;

    for (const supplierId of supplierIds) {
      const group = supplierGroups[supplierId];

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
          voucherDiscount = Math.min(
            appliedVoucher.discountValue,
            group.rentPriceTotal
          );
        }
      }

      const rentAfterDiscount = group.rentPriceTotal - voucherDiscount;
      const platformFee = Math.round(rentAfterDiscount * PLATFORM_FEE_RATE);
      const supplierReceive = rentAfterDiscount - platformFee;

      const totalCustomerPay =
        rentAfterDiscount + group.depositAmount + deliveryFee;

      grandTotalAmount += totalCustomerPay;
      totalPlatformFee += platformFee;

      rentalCreationData.push({
        supplierId,
        rentPriceTotal: group.rentPriceTotal,
        rentAfterDiscount,
        voucherDiscount,
        platformFee,
        supplierReceive,
        depositAmount: group.depositAmount,
        deliveryFee,
        totalCustomerPay,
        items: group.items,
      });
    }

    // 5. Allocate DeviceItem (giữ nguyên)

    const allocatedData = [];
    for (const data of rentalCreationData) {
      const allocatedItems = [];
      for (const item of data.items) {
        const deviceItemIds = await allocateDeviceItems(
          item.deviceId,
          item.quantity,
          session
        );
        allocatedItems.push({ ...item, deviceItemIds });
      }
      allocatedData.push({ ...data, items: allocatedItems });
    }

    // 6. Xử lý thanh toán WALLET → trừ khách + cộng phí vào ví system
    let paymentStatus = "UNPAID";
    let walletSuccess = false;

    if (paymentMethod === "WALLET") {
      const customerWallet = await Wallet.findOne({ user: customerId }).session(
        session
      );
      if (!customerWallet || customerWallet.balance < grandTotalAmount) {
        throw new Error("Số dư ví không đủ");
      }

      // Trừ tiền khách
      const custBalanceBefore = customerWallet.balance;
      customerWallet.balance -= grandTotalAmount;
      await customerWallet.save({ session });

      await WalletTransaction.create(
        [
          {
            wallet: customerWallet._id,
            type: "PAYMENT",
            amount: -grandTotalAmount,
            balanceBefore: custBalanceBefore,
            balanceAfter: customerWallet.balance,
            referenceType: "RENTAL",
            status: "SUCCESS",
            description: `Thanh toán ${supplierIds.length} đơn thuê (bao gồm cọc)`,
          },
        ],
        { session }
      );

      // Cộng phí nền tảng vào ví system
      const systemWallet = await Wallet.findOne({ isSystem: true }).session(
        session
      );
      if (!systemWallet) {
        throw new Error("Không tìm thấy ví hệ thống");
      }

      const sysBalanceBefore = systemWallet.balance;
      systemWallet.balance += totalPlatformFee;
      await systemWallet.save({ session });

      await WalletTransaction.create(
        [
          {
            wallet: systemWallet._id,
            type: "PLATFORM_FEE", // bạn có thể thêm enum này vào schema nếu muốn
            amount: totalPlatformFee,
            balanceBefore: sysBalanceBefore,
            balanceAfter: systemWallet.balance,
            referenceType: "RENTAL",
            status: "SUCCESS",
            description: `Thu phí nền tảng từ ${supplierIds.length} đơn thuê`,
          },
        ],
        { session }
      );

      paymentStatus = "PAID";
      walletSuccess = true;

      // Tăng usedCount voucher
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
    }

    // 7. Tạo Rentals (bỏ insuranceAmount)
    const createdRentals = [];
    for (const data of allocatedData) {
      const rentalData = {
        customerId,
        supplierId: data.supplierId,
        rentPriceTotal: data.rentPriceTotal,
        depositAmount: data.depositAmount,
        deliveryFee: data.deliveryFee,
        voucherDiscount: data.voucherDiscount,
        totalAmount: data.totalCustomerPay,

        paymentBreakdown: {
          rentAmount: data.rentAfterDiscount,
          depositAmount: data.depositAmount,
          platformFee: data.platformFee,
          supplierReceive: data.supplierReceive,
        },

        paymentMethod,
        paymentStatus,
        status: "PENDING",
        escrowStatus: "HOLDING",
        depositStatus: "HELD",
        supplierPayoutStatus: "PENDING",
        voucherCode: appliedVoucher?.code,
        deliveryAddress: formattedAddress,
        phoneNumber,
        notes,
      };

      if (paymentMethod === "BANK") {
        rentalData.orderCode = Number(
          String(Date.now()) + Math.floor(Math.random() * 1000)
        );
      }

      const [rental] = await Rental.create([rentalData], { session });

      // RentalItems (giữ nguyên, bỏ insurance nếu có)
      const rentalItemsData = data.items.map((item) => ({
        rentalId: rental._id,
        deviceId: item.deviceId,
        deviceItemIds: item.deviceItemIds,
        quantity: item.quantity,
        rentalStartDate: item.rentalStartDate,
        rentalEndDate: item.rentalEndDate,
        totalDays: item.totalDays,
        rentPrice: item.rentPrice / item.quantity,
        depositAmount: item.depositAmount / item.quantity,
        isAddon: false,
      }));

      await RentalItem.insertMany(rentalItemsData, { session });
      createdRentals.push(rental);
    }

    // 8. Notification (giữ nguyên)

    if (walletSuccess) {
      for (const rental of createdRentals) {
        await sendRentalNotification(
          rental,
          "SUPPLIER",
          "Có đơn thuê mới!",
          `Khách hàng đã thanh toán ${rental.totalAmount.toLocaleString(
            "vi-VN"
          )}₫ (bao gồm cọc). Bạn sẽ nhận được phần tiền thuê sau khi đơn hoàn tất.`
        );

        await sendRentalNotification(
          rental,
          "CUSTOMER",
          "Đặt thuê thành công",
          `Bạn đã đặt thuê thành công đơn #${rental._id
            .toString()
            .slice(-6)}. Vui lòng chờ nhà cung cấp xác nhận.`
        );
      }
    }

    // 9. Xóa cart (giữ nguyên)

    await CartItem.deleteMany({
      _id: { $in: cart.items.map((i) => i._id) },
    }).session(session);
    cart.items = [];
    await cart.save({ session });

    // 10. PayOS cho BANK (giữ nguyên, orderCode dùng chung cho group)
    let paymentLink = null;
    if (paymentMethod === "BANK") {
      const orderCode = Number(String(Date.now()).slice(-9));
      const representativeRentalId = createdRentals[0]._id.toString();

      paymentLink = await payos.paymentRequests.create({
        orderCode,
        amount: grandTotalAmount,
        description: `GXP - Thuê thiết bị & đặt cọc`,
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
    res.status(201).json({
      message:
        paymentMethod === "BANK"
          ? "Vui lòng hoàn tất thanh toán"
          : "Checkout thành công",
      rentalIds: createdRentals.map((r) => r._id),
      paymentMethod,
      paymentLink,
      totalAmount: grandTotalAmount,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("CHECKOUT ERROR:", err);
    res.status(400).json({ message: err.message || "Thanh toán thất bại" });
  } finally {
    session.endSession();
  }
};

// Helper allocate (giữ nguyên)
async function allocateDeviceItems(deviceId, quantity, session) {
  const items = await DeviceItem.find({
    deviceId,
    status: "AVAILABLE",
  })
    .limit(quantity)
    .session(session);

  if (items.length < quantity) {
    throw new Error(
      `Không đủ thiết bị khả dụng (còn ${items.length}/${quantity})`
    );
  }

  // Chuyển status sang RENTED
  for (const item of items) {
    item.status = "RENTED";
    await item.save({ session });
  }

  // Trừ trực tiếp rentedQuantity + cập nhật availableQuantity
  // stockQuantity KHÔNG giảm (vì tổng item vẫn giữ nguyên)
  const updateResult = await Device.updateOne(
    { _id: deviceId },
    {
      $inc: {
        rentedQuantity: quantity, // tăng rented
        stockQuantity: -quantity, // giảm available
      },
    },
    { session }
  );

  console.log(
    `[ALLOCATE SUCCESS] Device ${deviceId}: +${quantity} rented, -${quantity} available. ` +
      `Update result: ${JSON.stringify(updateResult)}`
  );

  return items.map((item) => item._id);
}
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
    const query = { status: "DELIVERING" };

    if (req.user?.role === "OPERATION_STAFF") {
      query.$or = [
        { assignedOperationStaffId: null },
        { assignedOperationStaffId: req.user.id },
      ];
    }

    const rentals = await Rental.find(query)
      .populate("customerId", "fullName avatar email")
      .populate("assignedOperationStaffId", "fullName email")
      .sort({ updatedAt: -1 });

    const rentalsWithItems = await Promise.all(
      rentals.map(async (rental) => {
        const rentalItems = await RentalItem.find({
          rentalId: rental._id,
        }).populate("deviceId", "name images");

        // Ensure DeliveryTask exists
        let deliveryTask = await DeliveryTask.findOne({
          rentalId: rental._id,
          type: "DELIVERY",
          status: { $in: ["PENDING", "ASSIGNED", "IN_TRANSIT"] },
        })
          .sort({ createdAt: -1 })
          .lean();

        // Auto-create task if it doesn't exist for DELIVERING rentals
        if (!deliveryTask) {
          const newTask = await DeliveryTask.create({
            rentalId: rental._id,
            deviceIds: rentalItems.map((item) => item.deviceId),
            type: "DELIVERY",
            status: "PENDING",
            pickupRequestId: null,
            notes: "",
          });
          deliveryTask = newTask.toObject();
        }

        return {
          ...rental.toObject(),
          rentalItems,
          deliveryTask,
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
    const query = { status: "RETURNING" };
    if (req.user?.role === "OPERATION_STAFF") {
      query.assignedOperationStaffId = req.user.id;
    }

    const rentals = await Rental.find(query)
      .populate("customerId", "fullName avatar email")
      .populate("assignedOperationStaffId", "fullName email")
      .sort({ updatedAt: -1 });

    const rentalsWithItems = await Promise.all(
      rentals.map(async (rental) => {
        // Ensure each RETURNING rental has a retrieval draft for operation flow.
        await ensureDraftForReturn({
          rentalId: rental._id,
          staffId:
            req.user?.role === "OPERATION_STAFF"
              ? req.user.id
              : rental.assignedOperationStaffId,
          actorId: req.user?.id,
        });

        const returnRecords = await listByRental(rental._id);
        const activeReturnRecord = returnRecords.find((record) =>
          ["DRAFT", "IN_PROGRESS"].includes(record.status)
        );

        const rentalItems = await RentalItem.find({
          rentalId: rental._id,
        }).populate("deviceId", "name images");

        return {
          ...rental.toObject(),
          rentalItems,
          returnRecord: activeReturnRecord || null,
        };
      })
    );

    res.json({ rentals: rentalsWithItems });
  } catch (error) {
    console.error("Error getReturningRentals:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.claimDeliveryTask = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (req.user?.role !== "OPERATION_STAFF") {
      throw new Error("Chỉ operation staff mới có thể nhận đơn");
    }

    const { taskId } = req.params;
    const staffId = req.user.id;

    const existingTask = await DeliveryTask.findById(taskId).session(session);
    if (!existingTask) {
      throw new Error("Không tìm thấy delivery task");
    }

    if (existingTask.type !== "DELIVERY") {
      throw new Error("Task này không phải task giao hàng");
    }

    if (["COMPLETED", "FAILED"].includes(existingTask.status)) {
      throw new Error("Task đã kết thúc, không thể nhận");
    }

    if (
      existingTask.deliveryStaffId &&
      String(existingTask.deliveryStaffId) !== String(staffId)
    ) {
      throw new Error("Task đã được staff khác nhận");
    }

    const claimedTask = await DeliveryTask.findOneAndUpdate(
      {
        _id: taskId,
        type: "DELIVERY",
        status: { $in: ["PENDING", "ASSIGNED", "IN_TRANSIT"] },
        $or: [{ deliveryStaffId: null }, { deliveryStaffId: staffId }],
      },
      {
        $set: {
          deliveryStaffId: staffId,
          status: existingTask.status === "IN_TRANSIT" ? "IN_TRANSIT" : "ASSIGNED",
          claimedAt: existingTask.claimedAt || new Date(),
        },
      },
      { new: true, session }
    );

    if (!claimedTask) {
      throw new Error("Không thể nhận task do xung đột đồng thời");
    }

    const rentalUpdate = await Rental.findOneAndUpdate(
      {
        _id: claimedTask.rentalId,
        status: "DELIVERING",
        $or: [
          { assignedOperationStaffId: null },
          { assignedOperationStaffId: staffId },
        ],
      },
      {
        $set: {
          assignedOperationStaffId: staffId,
          assignmentLockedAt: new Date(),
        },
      },
      { new: true, session }
    );

    if (!rentalUpdate) {
      throw new Error("Đơn đã bị staff khác lock hoặc không còn ở trạng thái DELIVERING");
    }

    await session.commitTransaction();

    return res.status(200).json({
      success: true,
      message: "Nhận đơn thành công",
      task: claimedTask,
      rentalId: claimedTask.rentalId,
    });
  } catch (err) {
    await session.abortTransaction();
    return res.status(409).json({
      success: false,
      message: err.message || "Không thể nhận task",
    });
  } finally {
    session.endSession();
  }
};

exports.getMyRentals = async (req, res) => {
  try {
    const customerId = req.user.id;

    let rentals = await Rental.find({ customerId })
      .sort({ createdAt: -1 })
      .populate({
        path: "extensionRequests",
        match: { status: "PENDING" },
        select: "requestedEndDate requestedDays proposedExtraAmount status",
      })
      .lean();

    rentals = await Promise.all(
      rentals.map(async (rental) => {
        const rentalItems = await RentalItem.find({ rentalId: rental._id })
          .populate([
            {
              path: "deviceId",
              select: "name slug images supplierId rentPrice depositAmount",
              populate: {
                path: "supplierId",
                select: "fullName avatar phone email",
              },
            },
            {
              path: "deviceItemIds", // populate mảng deviceItemIds
              select:
                "serialNumber internalCode condition status location images lastMaintenance nextMaintenanceDue",
            },
          ])
          .lean();

        // Thêm reports cho từng RentalItem
        const itemsWithReports = await Promise.all(
          rentalItems.map(async (item) => {
            const deliveryIssues = await mongoose
              .model("DeliveryIssueReport")
              .find({ rentalItemId: item._id })
              .sort({ createdAt: -1 })
              .select(
                "issueType description status images resolvedNote createdAt updatedAt"
              )
              .lean();

            const damageReports = await mongoose
              .model("DamageReport")
              .find({ rentalItemId: item._id })
              .sort({ createdAt: -1 })
              .select(
                "description severity status images compensationAmount createdAt updatedAt"
              )
              .lean();

            return {
              ...item,
              deliveryIssues,
              damageReports,
              // Thêm danh sách serial để frontend hiển thị
              serialNumbers:
                item.deviceItemIds?.map((d) => d.serialNumber) || [],
              conditions: item.deviceItemIds?.map((d) => d.condition) || [],
            };
          })
        );

        return {
          ...rental,
          items: itemsWithReports,
        };
      })
    );

    res.json({ rentals });
  } catch (error) {
    console.error("Error getMyRentals:", error);
    res
      .status(500)
      .json({ message: error.message || "Lỗi lấy danh sách đơn thuê" });
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
    const supplierId = req.user.id;

    const { reason, details, customerMessage } = req.body;

    const rental = await Rental.findById(rentalId).session(session);
    if (!rental) throw new Error("Không tìm thấy đơn thuê");

    if (rental.supplierId.toString() !== supplierId) {
      throw new Error("Bạn không có quyền từ chối đơn này");
    }

    if (rental.status !== "PENDING") {
      throw new Error("Chỉ có thể từ chối đơn ở trạng thái chờ xử lý");
    }

    rental.status = "REJECTED";
    rental.rejectionReason = reason || "Không có lý do cụ thể";
    rental.rejectionNote = details || "";
    rental.rejectionMessage =
      customerMessage || "Đơn đã bị từ chối bởi nhà cung cấp";
    rental.rejectedAt = new Date();

    await rental.save({ session });

    await NotificationConfig.sendNotification({
      senderId: supplierId,
      receiverId: rental.customerId,
      title: "Đơn thuê bị từ chối",
      message: `Đơn thuê của bạn đã bị từ chối. Lý do: ${
        reason || "Không có lý do cụ thể"
      }${details ? " - " + details : ""}`,
      link: `/my-rentals/${rental._id}`,
      type: "ORDER",
    });

    // Hoàn lại status DeviceItem (không còn quantity ở Device)
    const rentalItems = await RentalItem.find({ rentalId: rental._id }).session(
      session
    );
    for (const item of rentalItems) {
      if (item.deviceItemIds && item.deviceItemIds.length > 0) {
        await DeviceItem.updateMany(
          { _id: { $in: item.deviceItemIds } },
          { $set: { status: "AVAILABLE" } },
          { session }
        );
      }
    }

    // Hoàn tiền nếu đã PAID
    if (rental.paymentStatus === "PAID") {
      const wallet = await Wallet.findOne({ user: rental.customerId }).session(
        session
      );
      if (wallet) {
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
// ====================== CANCEL RENTAL - ĐÃ SỬA ======================
exports.cancelRental = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { rentalId } = req.params;
    const customerId = req.user.id;

    // 1. Tìm rental
    const rental = await Rental.findOne({
      _id: rentalId,
      customerId,
    }).session(session);

    if (!rental) {
      throw new Error("Không tìm thấy đơn hàng");
    }

    if (rental.status !== "PENDING") {
      throw new Error("Chỉ có thể hủy đơn ở trạng thái PENDING");
    }

    const refundAmount = rental.totalAmount || 0;

    // 2. Hoàn tiền cho khách nếu đã thanh toán
    if (rental.paymentStatus === "PAID" && refundAmount > 0) {
      const customerWallet = await Wallet.findOne({
        user: rental.customerId,
      }).session(session);
      if (customerWallet) {
        const balanceBefore = customerWallet.balance;
        customerWallet.balance += refundAmount;
        await customerWallet.save({ session });

        await WalletTransaction.create(
          [
            {
              wallet: customerWallet._id,
              type: "REFUND",
              amount: refundAmount,
              balanceBefore,
              balanceAfter: customerWallet.balance,
              referenceType: "RENTAL",
              referenceId: rental._id,
              description: `Hoàn tiền hủy đơn #${rental._id
                .toString()
                .slice(-6)}`,
              status: "SUCCESS",
            },
          ],
          { session }
        );
      }

      // Hoàn platform fee về ví system (nếu có)
      if (rental.paymentBreakdown?.platformFee > 0) {
        const systemWallet = await Wallet.findOne({ isSystem: true }).session(
          session
        );
        if (systemWallet) {
          const sysBefore = systemWallet.balance;
          systemWallet.balance -= rental.paymentBreakdown.platformFee;
          await systemWallet.save({ session });

          await WalletTransaction.create(
            [
              {
                wallet: systemWallet._id,
                type: "PLATFORM_FEE_REFUND",
                amount: -rental.paymentBreakdown.platformFee,
                balanceBefore: sysBefore,
                balanceAfter: systemWallet.balance,
                referenceType: "RENTAL",
                referenceId: rental._id,
                description: `Hoàn phí nền tảng do hủy đơn #${rental._id
                  .toString()
                  .slice(-6)}`,
                status: "SUCCESS",
              },
            ],
            { session }
          );
        }
      }
    }

    // 3. Hoàn lại DeviceItem và cập nhật stock Device
    const rentalItems = await RentalItem.find({ rentalId: rental._id }).session(
      session
    );
    for (const item of rentalItems) {
      if (item.deviceItemIds && item.deviceItemIds.length > 0) {
        await DeviceItem.updateMany(
          { _id: { $in: item.deviceItemIds } },
          { $set: { status: "AVAILABLE" } },
          { session }
        );

        await Device.updateOne(
          { _id: item.deviceId },
          {
            $inc: {
              stockQuantity: item.quantity,
              rentedQuantity: -item.quantity,
            },
          },
          { session }
        );
      }
    }

    // 4. Cập nhật rental - DÙNG $set để tránh validation lỗi paymentBreakdown
    await Rental.updateOne(
      { _id: rentalId },
      {
        $set: {
          status: "CANCELLED",
          paymentStatus: "REFUNDED",
          cancelledAt: new Date(),
          cancelReason: "Khách hàng yêu cầu hủy",
        },
      },
      { session }
    );

    // 5. Gửi thông báo
    await sendRentalNotification(
      rental,
      "SUPPLIER",
      "Đơn thuê bị hủy",
      `Khách hàng đã hủy đơn #${rental._id.toString().slice(-6)}.`
    );

    await sendRentalNotification(
      rental,
      "CUSTOMER",
      "Hủy đơn thành công",
      `Đơn thuê #${rental._id
        .toString()
        .slice(-6)} đã được hủy. Tiền đã hoàn về ví.`
    );

    await session.commitTransaction();

    try {
      await syncCancelledRental({
        rentalId: rental._id,
        actorId: customerId,
      });
    } catch (syncError) {
      // Keep cancel successful even if handover sync fails; staff can run manual sync endpoint.
      console.error("SYNC CANCEL HANDOVER ERROR:", syncError.message);
    }

    try {
      await syncClosedRental({
        rentalId: rental._id,
        actorId: customerId,
      });
    } catch (syncError) {
      console.error("SYNC CANCEL RETURN ERROR:", syncError.message);
    }

    res.json({
      success: true,
      message: "Hủy đơn thành công và tiền đã được hoàn",
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
// 2. XÁC NHẬN ĐÃ NHẬN HÀNG & CỘNG TIỀN CHO SUPPLIER
exports.confirmReceived = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { rentalId } = req.params;
    const rental = await Rental.findById(rentalId).session(session);

    if (rental.status !== "DELIVERING") {
      throw new Error("Đơn hàng chưa ở trạng thái giao hàng");
    }

    if (!rental.deliveredAt) {
      throw new Error("Nhân viên chưa xác nhận đã giao hàng");
    }

    rental.status = "RENTING";
    rental.pickedUpAt = new Date(); // hoặc deliveredAt nếu phù hợp
    await rental.save({ session });

    await sendRentalNotification(
      rental,
      "SUPPLIER",
      "Khách đã xác nhận nhận hàng",
      "Khách hàng đã nhận thiết bị, đơn đang trong thời gian thuê."
    );

    await sendRentalNotification(
      rental,
      "CUSTOMER",
      "Nhận hàng thành công",
      "Bạn đã xác nhận nhận thiết bị. Hãy sử dụng cẩn thận và trả đúng hạn."
    );

    await session.commitTransaction();
    res.json({ message: "Xác nhận nhận hàng thành công" });
  } catch (err) {
    await session.abortTransaction();
    res.status(400).json({ message: err.message || "Xác nhận thất bại" });
  } finally {
    session.endSession();
  }
};
const ExtensionRequest = require("../../models/ExtensionRequest"); // import model mới

// ====================== EXTEND RENTAL - ĐÃ SỬA ======================
// ====================== EXTEND RENTAL - PHIÊN BẢN MẠNH & CÓ LOG ======================
exports.extendRental = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { rentalId } = req.params;
    let { newEndDate, requestedDays, extraAmount = 0, note = "" } = req.body;

    console.log("📥 Extend Request received:", {
      rentalId,
      newEndDate,
      requestedDays,
      extraAmount,
    });

    if (!newEndDate) throw new Error("Vui lòng chọn ngày gia hạn mới");

    const rental = await Rental.findById(rentalId)
      .populate("items")
      .session(session);

    if (!rental) throw new Error("Không tìm thấy đơn thuê");

    if (rental.status !== "RENTING") {
      throw new Error("Chỉ được yêu cầu gia hạn khi đang thuê");
    }

    // === KIỂM TRA NGÀY ===
    let currentEndDateStr = rental.items?.[0]?.rentalEndDate;
    if (!currentEndDateStr) {
      console.error("❌ Không tìm thấy rentalEndDate trong items");
      throw new Error("Không tìm thấy ngày kết thúc hiện tại của đơn");
    }

    const currentEnd = new Date(currentEndDateStr);
    const proposedEnd = new Date(newEndDate);

    if (isNaN(currentEnd.getTime())) {
      console.error("❌ currentEndDate không hợp lệ:", currentEndDateStr);
      throw new Error("Ngày kết thúc hiện tại không hợp lệ");
    }

    if (isNaN(proposedEnd.getTime())) {
      console.error("❌ newEndDate không hợp lệ:", newEndDate);
      throw new Error("Ngày gia hạn mới không hợp lệ");
    }

    if (proposedEnd <= currentEnd) {
      throw new Error("Ngày gia hạn phải sau ngày trả hiện tại");
    }

    const actualRequestedDays = Math.ceil(
      (proposedEnd - currentEnd) / (1000 * 60 * 60 * 24)
    );

    if (actualRequestedDays <= 0) {
      throw new Error("Số ngày gia hạn phải lớn hơn 0");
    }

    // Tạo yêu cầu gia hạn
    const extensionRequest = await ExtensionRequest.create(
      [
        {
          rentalId: rental._id,
          customerId: rental.customerId,
          supplierId: rental.supplierId,
          requestedEndDate: proposedEnd,
          requestedDays: actualRequestedDays,
          proposedExtraAmount: Number(extraAmount) || 0,
          note: note.trim(),
          status: "PENDING",
        },
      ],
      { session }
    );

    // Cập nhật trạng thái rental
    await Rental.updateOne(
      { _id: rentalId },
      { $set: { extensionStatus: "PENDING" } },
      { session }
    );

    // Gửi thông báo
    await NotificationConfig.sendNotification({
      senderId: rental.customerId,
      receiverId: rental.supplierId,
      title: "Yêu cầu gia hạn đơn thuê",
      message: `Khách hàng yêu cầu gia hạn thêm ${actualRequestedDays} ngày đến ${proposedEnd.toLocaleDateString(
        "vi-VN"
      )}. Phí đề xuất: ${Number(extraAmount).toLocaleString()}đ`,
      link: `/supplier/orders/${rental._id}`,
      type: "ORDER",
    });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Yêu cầu gia hạn đã được gửi thành công",
      extensionRequest: extensionRequest[0],
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Extend Rental Error:", err);
    res.status(400).json({
      success: false,
      message: err.message || "Gửi yêu cầu gia hạn thất bại",
    });
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
    rental.assignedOperationStaffId = null;
    rental.assignmentLockedAt = null;
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

    const activeTask = await DeliveryTask.findOne({
      rentalId: rental._id,
      type: "DELIVERY",
      status: { $in: ["PENDING", "ASSIGNED", "IN_TRANSIT"] },
    });

    let task = activeTask;
    if (!task) {
      task = await DeliveryTask.create({
        rentalId: rental._id,
        deviceIds: rentalItems.map((item) => item.deviceId),
        type: "DELIVERY",
        status: "PENDING",
      });
    }

    return res.status(200).json({
      message: "Delivery started & contract created",
      contractId: contract._id,
      deliveryTaskId: task?._id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.confirmPickup = async (req, res) => {
  try {
    const { rentalId } = req.params;
    const actorId = req.user?.id;
    const actorRole = req.user?.role;

    const rental = await Rental.findById(rentalId);
    if (!rental) return res.status(404).json({ message: "Rental not found" });

    if (actorRole === "OPERATION_STAFF") {
      if (!rental.assignedOperationStaffId) {
        return res.status(409).json({ message: "Đơn chưa có staff nhận. Vui lòng nhận đơn trước" });
      }

      if (String(rental.assignedOperationStaffId) !== String(actorId)) {
        return res.status(403).json({ message: "Đơn đã được lock cho staff khác" });
      }
    }

    if (rental.status !== "DELIVERING")
      return res
        .status(400)
        .json({ message: "Rental is not in DELIVERING status" });
    if (rental.pickedUpAt)
      return res.status(400).json({ message: "Pickup already confirmed" });

    rental.pickedUpAt = new Date();
    await rental.save();

    const deliveryTask = await DeliveryTask.findOneAndUpdate(
      {
        rentalId: rental._id,
        type: "DELIVERY",
        status: { $in: ["PENDING", "ASSIGNED", "IN_TRANSIT"] },
      },
      {
        $set: {
          deliveryStaffId: rental.assignedOperationStaffId || actorId,
          claimedAt: new Date(),
          status: "IN_TRANSIT",
        },
      },
      { new: true }
    );

    const handover = await ensureDraftForDelivery({
      rentalId: rental._id,
      deliveryTaskId: deliveryTask?._id,
      staffId: rental.assignedOperationStaffId || actorId,
      actorId,
    });

    return res
      .status(200)
      .json({
        message: "Pickup confirmed",
        pickedUpAt: rental.pickedUpAt,
        handoverId: handover?._id,
      });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.confirmReturn = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { rentalId } = req.params;
    const rental = await Rental.findById(rentalId).session(session);
    const actorId = req.user?.id;
    const actorRole = req.user?.role;

    if (!rental) throw new Error("Không tìm thấy đơn thuê");

    if (actorRole === "OPERATION_STAFF") {
      if (!rental.assignedOperationStaffId) {
        throw new Error("Đơn chưa có staff được phân công");
      }
      if (String(rental.assignedOperationStaffId) !== String(actorId)) {
        throw new Error("Đơn đang được lock cho staff khác");
      }
    }

    if (rental.status !== "RETURNING") {
      throw new Error("Đơn chưa ở trạng thái trả hàng");
    }

    const returnDraft = await ensureDraftForReturn({
      rentalId: rental._id,
      staffId: actorId,
      actorId,
      session,
    });

    // Giả sử đã kiểm tra thiết bị OK (không hỏng, không forfeit deposit)
    // → Payout tiền thuê cho supplier (sau trừ phí nền tảng)
    const supplierReceive = rental.paymentBreakdown.supplierReceive;

    const supplierWallet = await Wallet.findOne({
      user: rental.supplierId,
    }).session(session);
    if (!supplierWallet) throw new Error("Không tìm thấy ví supplier");

    const supBefore = supplierWallet.balance;
    supplierWallet.balance += supplierReceive;
    await supplierWallet.save({ session });

    await WalletTransaction.create(
      [
        {
          wallet: supplierWallet._id,
          type: "PAYOUT",
          amount: supplierReceive,
          balanceBefore: supBefore,
          balanceAfter: supplierWallet.balance,
          referenceType: "RENTAL",
          referenceId: rental._id,
          description: `Payout tiền thuê đơn #${rental._id
            .toString()
            .slice(-6)}`,
          status: "SUCCESS",
        },
      ],
      { session }
    );

    // Hoàn cọc cho khách (nếu không forfeit)
    if (rental.depositAmount > 0) {
      const customerWallet = await Wallet.findOne({
        user: rental.customerId,
      }).session(session);
      if (customerWallet) {
        const custBefore = customerWallet.balance;
        customerWallet.balance += rental.depositAmount;
        await customerWallet.save({ session });

        await WalletTransaction.create(
          [
            {
              wallet: customerWallet._id,
              type: "DEPOSIT_REFUND",
              amount: rental.depositAmount,
              balanceBefore: custBefore,
              balanceAfter: customerWallet.balance,
              referenceType: "RENTAL",
              referenceId: rental._id,
              description: `Hoàn cọc đơn #${rental._id.toString().slice(-6)}`,
              status: "SUCCESS",
            },
          ],
          { session }
        );
      }
    }

    // Cập nhật trạng thái cuối
    rental.status = "COMPLETED";
    rental.depositStatus = "REFUNDED";
    rental.supplierPayoutStatus = "PAID";
    rental.escrowStatus = "RELEASED";
    await rental.save({ session });

    await completeReturn({
      returnRecordId: returnDraft._id,
      inspection: {
        ...(returnDraft?.inspection || {}),
        actualReturnedAt: new Date(),
      },
      settlement: {
        depositOutcome: rental.depositAmount > 0 ? "REFUND_FULL" : undefined,
        deductedAmount: 0,
        disputeReason: "",
        operatorNote: "Hoàn tất thu hồi - không phát hiện bất thường.",
      },
      staffId: actorId,
      actorId,
      session,
    });

    // Gửi thông báo
    await sendRentalNotification(
      rental,
      "CUSTOMER",
      "Đơn thuê đã hoàn thành",
      `Thiết bị đã được thu hồi thành công. Cọc đã được hoàn về ví của bạn. Cảm ơn bạn!`
    );

    await sendRentalNotification(
      rental,
      "SUPPLIER",
      "Đơn hoàn tất - Đã nhận tiền thuê",
      `Bạn đã nhận được ${supplierReceive.toLocaleString(
        "vi-VN"
      )}₫ tiền thuê từ đơn #${rental._id.toString().slice(-6)}.`
    );

    await session.commitTransaction();
    res.status(200).json({
      message: "Đơn thuê đã hoàn tất thành công",
      rentalId: rental._id,
      status: "COMPLETED",
      returnRecordId: returnDraft._id,
    });
  } catch (err) {
    await session.abortTransaction();
    console.error("Confirm Return Error:", err);
    res
      .status(400)
      .json({ message: err.message || "Xác nhận trả hàng thất bại" });
  } finally {
    session.endSession();
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

    for (const item of rentalsToCancel) {
      try {
        await syncCancelledRental({
          rentalId: item._id,
          actorId: customerId,
        });
      } catch (syncError) {
        console.error("SYNC CANCEL HANDOVER ERROR:", syncError.message);
      }

      try {
        await syncClosedRental({
          rentalId: item._id,
          actorId: customerId,
        });
      } catch (syncError) {
        console.error("SYNC CANCEL RETURN ERROR:", syncError.message);
      }
    }

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
    // Lưu ý: dùng updateOne để tránh trigger validation full-doc (một số rental cũ có thể thiếu paymentBreakdown)
    await Rental.updateOne(
      { _id: rental._id },
      { $set: { orderCode: newOrderCode } },
      { session }
    );

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
const fs = require("fs/promises");
const path = require("path");
const { PDFDocument } = require("pdf-lib");
const fontkit = require("@pdf-lib/fontkit");

exports.previewContract = async (req, res) => {
  try {
    const {
      deliveryAddress,
      phoneNumber,
      cartItems,
      totalDeposit,
      total,
      currentDate,
      signatureDataUrl,
    } = req.body;

    const templatePath = path.join(
      __dirname,
      "../../templatesContract/hop-dong-mau.pdf"
    );
    const fontPath = path.join(__dirname, "../../fonts/DejaVuSans.ttf");

    const pdfBytes = await fs.readFile(templatePath);
    const pdfDoc = await PDFDocument.load(pdfBytes);

    pdfDoc.registerFontkit(fontkit);
    const font = await pdfDoc.embedFont(await fs.readFile(fontPath));

    const form = pdfDoc.getForm();
    const page = pdfDoc.getPages()[0];

    // Điền text
    const safeSetText = (name, value) => {
      try {
        form.getTextField(name)?.setText(value || "");
      } catch (e) {}
    };

    safeSetText("receiverName", deliveryAddress?.receiverName);
    safeSetText("phoneNumber", phoneNumber);
    safeSetText("fullAddress", deliveryAddress?.fullAddress);
    safeSetText("rentalDate", currentDate);

    const itemsText =
      cartItems
        ?.map(
          (item, i) =>
            `${i + 1}. ${item.deviceName} x${item.quantity} (${
              item.totalDays
            } ngày)`
        )
        .join("\n") || "Không có thiết bị";

    safeSetText("itemsList", itemsText);
    safeSetText("totalAmount", `${(total || 0).toLocaleString("vi-VN")} đ`);
    safeSetText(
      "depositAmount",
      `${(totalDeposit || 0).toLocaleString("vi-VN")} đ`
    );

    form.getFields().forEach((field) => {
      if (field.constructor.name === "PDFTextField")
        field.updateAppearances(font);
    });

    // ==================== CHỮ KÝ (drawImage - không cần button field) ====================
    if (signatureDataUrl) {
      const base64Data = signatureDataUrl.replace(
        /^data:image\/\w+;base64,/,
        ""
      );
      const signatureBytes = Buffer.from(base64Data, "base64");
      const signatureImage = await pdfDoc.embedPng(signatureBytes);

      page.drawImage(signatureImage, {
        x: 340, // đã chỉnh chuẩn theo template của bạn
        y: 70, // vị trí đúng phần "BEN THUE"
        width: 165,
        height: 68,
      });
      console.log("✅ Chữ ký đã được embed thành công (drawImage)");
    } else {
      console.log("❌ Không có chữ ký trong payload");
    }

    const resultPdf = await pdfDoc.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'inline; filename="preview-hop-dong.pdf"'
    );
    res.send(Buffer.from(resultPdf));
  } catch (err) {
    console.error("Preview contract error:", err);
    res.status(500).json({ message: "Lỗi tạo preview", error: err.message });
  }
};
