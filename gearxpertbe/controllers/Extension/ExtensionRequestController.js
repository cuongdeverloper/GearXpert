const ExtensionRequest = require("../../models/ExtensionRequest");
const Rental = require("../../models/Rental");
const RentalItem = require("../../models/RentalItem");
const Wallet = require("../../models/Wallet");
const WalletTransaction = require("../../models/WalletTransaction");
const mongoose = require("mongoose");

const PLATFORM_FEE_RATE = 0.1; // 10% platform fee

// Middleware to check if user is the supplier of the rental
const checkSupplierPermission = async (req, res, next) => {
  try {
    const { requestId } = req.params;
    const extensionRequest = await ExtensionRequest.findById(requestId).populate("supplierId");
    
    if (!extensionRequest) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy yêu cầu gia hạn"
      });
    }

    // Check if current user is the supplier
    // supplierId could be populated or just an ObjectId
    const supplierId = extensionRequest.supplierId?._id?.toString() || extensionRequest.supplierId?.toString();
    if (supplierId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: "Bạn không có quyền thực hiện hành động này"
      });
    }

    req.extensionRequest = extensionRequest;
    next();
  } catch (error) {
    console.error("Permission check error:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi kiểm tra quyền"
    });
  }
};

// Get extension requests for supplier
const getSupplierExtensionRequests = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const { status } = req.query; // Optional status filter
    
    // Build query
    const query = { supplierId };
    if (status && ["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      query.status = status;
    }
    
    const requests = await ExtensionRequest.find(query)
    .populate({
      path: "rentalId",
      populate: {
        path: "items",
        populate: {
          path: "deviceId",
          select: "name images"
        }
      }
    })
    .populate("customerId", "fullName avatar phoneNumber")
    .sort({ createdAt: -1 });

    // Get stats
    const stats = await ExtensionRequest.aggregate([
      { $match: { supplierId: new mongoose.Types.ObjectId(supplierId) } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]);
    
    const statsMap = { PENDING: 0, APPROVED: 0, REJECTED: 0 };
    stats.forEach(s => { statsMap[s._id] = s.count; });

    res.status(200).json({
      success: true,
      extensionRequests: requests,
      stats: statsMap
    });
  } catch (error) {
    console.error("Error fetching extension requests:", error);
    res.status(500).json({
      success: false,
      message: "Không tải được yêu cầu gia hạn"
    });
  }
};

// Approve extension request
const approveExtension = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { requestId } = req.params;
    
    const extensionRequest = await ExtensionRequest.findById(requestId).session(session);
    if (!extensionRequest) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy yêu cầu gia hạn"
      });
    }

    if (extensionRequest.status !== "PENDING") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Yêu cầu đã được xử lý"
      });
    }

    // Update extension request status
    extensionRequest.status = "APPROVED";
    extensionRequest.approvedAt = new Date();
    extensionRequest.approvedExtraAmount = extensionRequest.proposedExtraAmount;
    await extensionRequest.save({ session });

    // Update rental with extension info
    const rental = await Rental.findById(extensionRequest.rentalId).session(session);
    if (!rental) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn thuê"
      });
    }

    rental.isExtended = true;
    rental.extendedEndDate = extensionRequest.requestedEndDate;
    
    // Update payment amounts
    const extraAmount = extensionRequest.proposedExtraAmount;
    
    rental.rentPriceTotal += extraAmount;
    rental.totalAmount += extraAmount;
    
    // Update payment breakdown
    rental.paymentBreakdown.rentAmount += extraAmount;
    const platformFee = Math.round(extraAmount * PLATFORM_FEE_RATE);
    const supplierReceive = extraAmount - platformFee;
    
    rental.paymentBreakdown.platformFee += platformFee;
    rental.paymentBreakdown.supplierReceive += supplierReceive;
    
    // Update individual rental items to keep rentPrice and totalDays consistent
    const rentalItems = await RentalItem.find({ rentalId: rental._id }).session(session);
    const extensionDays = extensionRequest.requestedDays;

    for (const item of rentalItems) {
      // Calculate original daily rate for this item block
      const originalDays = item.totalDays || 1;
      const unitDailyRate = (item.rentPrice || 0) / originalDays;
      
      // Calculate extra rent for this item
      const itemExtraRent = Math.round(unitDailyRate * extensionDays);
      
      // Update item
      item.rentPrice += itemExtraRent;
      item.totalDays += extensionDays;
      item.rentalEndDate = extensionRequest.requestedEndDate;
      item.isExtended = true;
      
      await item.save({ session });
    }

    // === XỬ LÝ THANH TOÁN KHI DUYỆT GIA HẠN ===
    if (extensionRequest.paymentStatus === "PAID" && extraAmount > 0) {
      // Khi request extension, tiền đã được cộng vào admin wallet (PAYOUT lump sum)
      // Khi approve extension: Cộng tiền vào ví admin và tạo PLATFORM_FEE transaction
      // Tiền supplierReceive được giữ trong escrow và sẽ release khi rental complete
      
      const systemWallet = await Wallet.findOne({ isSystem: true }).session(session);
      if (!systemWallet) {
        throw new Error("Không tìm thấy ví hệ thống");
      }
      
      const adminBalanceBefore = systemWallet.balance;
      systemWallet.balance += extraAmount;
      await systemWallet.save({ session });

      const RATE = typeof PLATFORM_FEE_RATE !== 'undefined' ? PLATFORM_FEE_RATE : 0.1;

      // 1. Ghi nhận tiền thuê được giữ (Supplier's share in Escrow)
      await WalletTransaction.create(
        [
          {
            wallet: systemWallet._id,
            type: "ESCROW_HOLD",
            amount: supplierReceive,
            balanceBefore: adminBalanceBefore,
            balanceAfter: adminBalanceBefore + supplierReceive,
            referenceType: "RENTAL",
            referenceId: rental._id,
            description: `Giữ tiền thuê gia hạn (phần NCC) đơn #${rental._id.toString().slice(-6)}`,
            status: "SUCCESS",
            isEarned: false,
            rentalStatus: "RENTING",
            metadata: {
              extensionRequestId: extensionRequest._id,
              isExtension: true
            }
          },
        ],
        { session }
      );

      // 2. Ghi nhận phí nền tảng treo (System's share in Escrow)
      if (platformFee > 0) {
        await WalletTransaction.create(
          [
            {
              wallet: systemWallet._id,
              type: "PLATFORM_FEE",
              amount: platformFee,
              balanceBefore: adminBalanceBefore + supplierReceive,
              balanceAfter: systemWallet.balance,
              referenceType: "RENTAL",
              referenceId: rental._id,
              description: `Phí nền tảng gia hạn (tạm giữ) đơn #${rental._id.toString().slice(-6)}`,
              status: "SUCCESS",
              isEarned: false, // Sẽ được chuyển sang true khi confirmReturn
              rentalStatus: "RENTING",
              metadata: {
                extensionRequestId: extensionRequest._id,
                isExtension: true,
                feeRate: RATE
              }
            },
          ],
          { session }
        );
      }
      
      // Update escrow status nếu cần (đảm bảo tiền gia hạn được giữ trong escrow)
      if (rental.escrowStatus === "RELEASED" || rental.escrowStatus === "PARTIAL_REFUND") {
        rental.escrowStatus = "HOLDING";
      }
    }

    await rental.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Đã chấp nhận gia hạn thành công"
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error approving extension:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reject extension request
const rejectExtension = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    const extensionRequest = await ExtensionRequest.findById(requestId).session(session);
    
    if (!extensionRequest) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy yêu cầu gia hạn"
      });
    }

    if (extensionRequest.status !== "PENDING") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Yêu cầu đã được xử lý"
      });
    }

    // Nếu đã thanh toán, hoàn tiền cho khách và trừ tiền từ ví admin
    if (extensionRequest.paymentStatus === "PAID" && extensionRequest.proposedExtraAmount > 0) {
      const refundAmount = extensionRequest.proposedExtraAmount;

      // Hoàn tiền cho khách
      const customerWallet = await Wallet.findOne({ user: extensionRequest.customerId }).session(session);
      if (customerWallet) {
        const custBalanceBefore = customerWallet.balance;
        customerWallet.balance += refundAmount;
        await customerWallet.save({ session });

        await WalletTransaction.create(
          [
            {
              wallet: customerWallet._id,
              type: "REFUND",
              amount: refundAmount,
              balanceBefore: custBalanceBefore,
              balanceAfter: customerWallet.balance,
              referenceType: "RENTAL",
              referenceId: extensionRequest.rentalId,
              description: `Hoàn tiền gia hạn bị từ chối - đơn thuê #${extensionRequest.rentalId.toString().slice(-6)}`,
              status: "SUCCESS",
            },
          ],
          { session }
        );
      }

      // Cập nhật trạng thái thanh toán
      extensionRequest.paymentStatus = "REFUNDED";
    }

    // Cập nhật trạng thái yêu cầu
    extensionRequest.status = "REJECTED";
    extensionRequest.rejectedReason = reason || "Không được chấp nhận";
    extensionRequest.rejectedAt = new Date();
    await extensionRequest.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Đã từ chối gia hạn và hoàn tiền thành công"
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Error rejecting extension:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Lỗi khi từ chối gia hạn"
    });
  }
};

module.exports = {
  getSupplierExtensionRequests,
  approveExtension,
  rejectExtension,
  checkSupplierPermission
};
