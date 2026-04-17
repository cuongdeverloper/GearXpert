const ExtensionRequest = require("../../models/ExtensionRequest");
const Rental = require("../../models/Rental");
const RentalItem = require("../../models/RentalItem");
const Wallet = require("../../models/Wallet");
const WalletTransaction = require("../../models/WalletTransaction");
const mongoose = require("mongoose");

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
    const PLATFORM_FEE_RATE = 0.1; // 10%
    
    rental.rentPriceTotal += extraAmount;
    rental.totalAmount += extraAmount;
    
    // Update payment breakdown
    rental.paymentBreakdown.rentAmount += extraAmount;
    const platformFee = Math.round(rental.paymentBreakdown.rentAmount * PLATFORM_FEE_RATE);
    rental.paymentBreakdown.platformFee = platformFee;
    rental.paymentBreakdown.supplierReceive = rental.paymentBreakdown.rentAmount - platformFee;
    
    // Update rental items end dates
    const startDate = rental.rentalStartDate || rental.items?.[0]?.rentalStartDate || rental.createdAt;
    const totalDays = Math.ceil((new Date(extensionRequest.requestedEndDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));
    await RentalItem.updateMany(
      { rentalId: rental._id },
      { 
        rentalEndDate: extensionRequest.requestedEndDate,
        totalDays: totalDays > 0 ? totalDays : extensionRequest.requestedDays,
        isExtended: true
      },
      { session }
    );

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

      // Trừ tiền từ ví admin
      const adminWallet = await Wallet.findOne({ isSystem: true }).session(session);
      if (adminWallet) {
        const adminBalanceBefore = adminWallet.balance;
        adminWallet.balance -= refundAmount;
        await adminWallet.save({ session });

        await WalletTransaction.create(
          [
            {
              wallet: adminWallet._id,
              type: "PLATFORM_FEE_REFUND",
              amount: -refundAmount,
              balanceBefore: adminBalanceBefore,
              balanceAfter: adminWallet.balance,
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
