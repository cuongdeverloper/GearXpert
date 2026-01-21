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
      useInsurance,
      notes,
      voucherCode,
    } = req.body;

    /* ================= 1. LOAD CART & VALIDATE ================= */
    const cart = await Cart.findOne({ customerId, cartType })
      .populate({ path: "items", populate: { path: "deviceId" } })
      .session(session);

    if (!cart || !cart.items.length) {
      throw new Error("Giỏ hàng trống");
    }

    /* ================= 2. CALCULATE PRICES & SUPPLIER CHECK ================= */
    let supplierId = null;
    let rentPriceTotal = 0;
    let depositAmount = 0;
    const rentalItems = [];

    for (const item of cart.items) {
      const device = item.deviceId;

      // Đảm bảo thiết bị còn tồn tại và cùng một nhà cung cấp
      if (!device) throw new Error("Thiết bị không tồn tại");

      const deviceSupplierId = device.supplierId.toString();
      if (!supplierId) supplierId = deviceSupplierId;
      else if (supplierId !== deviceSupplierId) {
        throw new Error(
          "Chỉ được đặt thiết bị từ cùng một nhà cung cấp trong một đơn hàng"
        );
      }

      // Kiểm tra tồn kho trước khi tạo đơn
      if (device.stockQuantity < item.quantity) {
        throw new Error(
          `Thiết bị ${device.name} đã hết hàng hoặc không đủ số lượng`
        );
      }

      const rent = device.rentPrice.perDay * item.totalDays * item.quantity;
      const deposit = device.depositAmount * item.quantity;

      rentPriceTotal += rent;
      depositAmount += deposit;

      rentalItems.push({
        deviceId: device._id,
        quantity: item.quantity,
        rentalStartDate: item.rentalStartDate,
        rentalEndDate: item.rentalEndDate,
        totalDays: item.totalDays,
        rentPrice: rent,
        depositAmount: deposit,
      });
    }

    const insuranceAmount = useInsurance
      ? Math.round(rentPriceTotal * 0.05)
      : 0;
    const deliveryFee = 10000; // Phí ship mẫu

    /* ================= 3. VOUCHER LOGIC ================= */
    let voucherDiscount = 0;
    let appliedVoucher = null;
    if (voucherCode) {
      appliedVoucher = await Voucher.findOne({
        code: voucherCode.toUpperCase(),
        status: "ACTIVE",
      }).session(session);

      if (appliedVoucher) {
        // Kiểm tra điều kiện voucher (ví dụ: đơn hàng tối thiểu)
        if (appliedVoucher.discountType === "PERCENT") {
          voucherDiscount = Math.round(
            (rentPriceTotal * appliedVoucher.discountValue) / 100
          );
          if (appliedVoucher.maxDiscount)
            voucherDiscount = Math.min(
              voucherDiscount,
              appliedVoucher.maxDiscount
            );
        } else {
          voucherDiscount = appliedVoucher.discountValue;
        }
      }
    }

    const totalAmount =
      rentPriceTotal +
      depositAmount +
      insuranceAmount +
      deliveryFee -
      voucherDiscount;

    /* ================= 4. INITIALIZE RENTAL STATUS ================= */
    let paymentStatus = "UNPAID";
    let rentalStatus = "PENDING"; // Chờ thanh toán

    /* ================= 5. HANDLE WALLET PAYMENT ================= */
    if (paymentMethod === "WALLET") {
      const wallet = await Wallet.findOne({ user: customerId }).session(
        session
      );

      if (!wallet || wallet.balance < totalAmount) {
        throw new Error("Số dư ví không đủ");
      }

      const balanceBefore = wallet.balance;
      wallet.balance -= totalAmount;
      await wallet.save({ session });

      await WalletTransaction.create(
        [
          {
            wallet: wallet._id,
            type: "PAYMENT",
            amount: -totalAmount,
            balanceBefore,
            balanceAfter: wallet.balance,
            referenceType: "RENTAL",
            status: "SUCCESS",
            description: `Thanh toán đơn thuê thiết bị qua ví`,
          },
        ],
        { session }
      );

      paymentStatus = "PAID";
      rentalStatus = "PENDING"; // Đơn hàng đã sẵn sàng để xử lý
    }

    /* ================= 6. SAVE RENTAL TO DB ================= */
    const rentalArray = await Rental.create(
      [
        {
          customerId,
          supplierId,
          rentPriceTotal,
          depositAmount,
          insuranceAmount,
          deliveryFee,
          totalAmount,
          paymentMethod,
          paymentStatus,
          status: rentalStatus,
          voucherCode: appliedVoucher?.code,
          voucherDiscount,
          deliveryAddress,
          phoneNumber,
          notes,
        },
      ],
      { session }
    );

    const newRental = rentalArray[0];

    await RentalItem.insertMany(
      rentalItems.map((item) => ({ ...item, rentalId: newRental._id })),
      { session }
    );

    // Link transaction với rental ID nếu dùng ví
    if (paymentMethod === "WALLET") {
      await WalletTransaction.findOneAndUpdate(
        {
          referenceType: "RENTAL",
          wallet: (await Wallet.findOne({ user: customerId }))._id,
        },
        { referenceId: newRental._id },
        { sort: { createdAt: -1 }, session }
      );
    }

    /* ================= 7. UPDATE STOCK & VOUCHER ================= */
    for (const item of rentalItems) {
      console.log(`Đang trừ stock cho ${item.deviceId}. Số lượng mua: ${item.quantity}`);
      const updatedDevice = await Device.findOneAndUpdate(
        { _id: item.deviceId, stockQuantity: { $gte: item.quantity } },
        { $inc: { stockQuantity: -item.quantity } },
        { new: true, session }
      );
      console.log(`Stock mới: ${updatedDevice?.stockQuantity}`);
      if (!updatedDevice)
        throw new Error(`Lỗi cập nhật tồn kho cho thiết bị ${item.deviceId}`);

      if (updatedDevice.stockQuantity === 0) {
        await Device.updateOne(
          { _id: updatedDevice._id },
          { status: "RENTED" },
          { session }
        );
      }
    }

    if (appliedVoucher) {
      await Voucher.updateOne(
        { _id: appliedVoucher._id },
        { $inc: { usedCount: 1 } },
        { session }
      );
    }
    

   
    /* ================= 8. PAYOS INTEGRATION (BANK) ================= */
    let paymentLinkRes = null;

    if (paymentMethod === "BANK") {
      const orderCode = Number(String(Date.now()).slice(-9));

      const body = {
        orderCode,
        amount: totalAmount,
        description: `GXP ${newRental._id.toString().slice(-6)}`.toUpperCase(),
        returnUrl: `${process.env.FRONTEND_URL}/payment/success?rentalId=${newRental._id}`,
        cancelUrl: `${process.env.FRONTEND_URL}/payment/cancel?rentalId=${newRental._id}`,
      };

      try {
        paymentLinkRes = await payos.paymentRequests.create(body);

        // Cập nhật orderCode vào bản ghi vừa tạo
        await Rental.findByIdAndUpdate(
          newRental._id,
          { orderCode },
          { session }
        );
        newRental.orderCode = orderCode; // Cập nhật biến local để dùng tiếp nếu cần
      } catch (payosErr) {
        console.error("PayOS Error:", payosErr);
        throw new Error("Không thể tạo liên kết thanh toán ngân hàng");
      }
    }

    /* ================= 9. CLEAR CART ================= */
    await CartItem.deleteMany({
      _id: { $in: cart.items.map((i) => i._id) },
    }).session(session);
    cart.items = [];
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Đặt hàng thành công",
      rentalId: newRental._id,
      paymentMethod,
      paymentLink: paymentLinkRes, // Trả về checkoutUrl cho frontend
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("CHECKOUT ERROR:", err);
    res
      .status(400)
      .json({ message: err.message || "Quá trình thanh toán thất bại" });
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
    if (paymentInfo.status === 'PAID') {
      rental.paymentStatus = 'PAID';
      
      // Sửa dòng này cho khớp với Enum của bạn (thường là APPROVED hoặc PAID)
      // Nếu Model của bạn dùng 'PAID' thì để 'PAID', nếu dùng 'APPROVED' thì để 'APPROVED'
      rental.status = 'APPROVED'; 
      
      await rental.save();
      return res.status(200).json({ success: true });
    }

    res.status(200).json({ success: false, status: paymentInfo.status });
  } catch (error) {
    console.error("Lỗi Verify:", error.message);
    res.status(500).json({ message: "Lỗi kết nối PayOS" });
  }
};