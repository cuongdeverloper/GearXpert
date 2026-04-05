const ExtensionRequest = require("../../models/ExtensionRequest");
const Rental = require("../../models/Rental");
const RentalItem = require("../../models/RentalItem");
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
    if (extensionRequest.supplierId._id.toString() !== req.user.id) {
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
    
    const requests = await ExtensionRequest.find({
      supplierId: supplierId,
      status: "PENDING"
    })
    .populate({
      path: "rentalId",
      populate: {
        path: "items",
        populate: {
          path: "deviceId",
          select: "name"
        }
      }
    })
    .populate("customerId", "fullName")
    .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      extensionRequests: requests
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
    
    // Update rental items end dates
    const RentalItem = require("../../models/RentalItem");
    await RentalItem.updateMany(
      { rentalId: rental._id },
      { 
        rentalEndDate: extensionRequest.requestedEndDate,
        totalDays: Math.ceil((new Date(extensionRequest.requestedEndDate) - new Date(rental.rentalStartDate)) / (1000 * 60 * 60 * 24))
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
      message: "Lỗi khi chấp nhận gia hạn"
    });
  }
};

// Reject extension request
const rejectExtension = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;
    
    const extensionRequest = await ExtensionRequest.findByIdAndUpdate(
      requestId,
      {
        status: "REJECTED",
        rejectedReason: reason || "Không được chấp nhận",
        rejectedAt: new Date()
      },
      { new: true }
    );

    if (!extensionRequest) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy yêu cầu gia hạn"
      });
    }

    res.status(200).json({
      success: true,
      message: "Đã từ chối gia hạn thành công"
    });
  } catch (error) {
    console.error("Error rejecting extension:", error);
    res.status(500).json({
      success: false,
      message: "Lỗi khi từ chối gia hạn"
    });
  }
};

module.exports = {
  getSupplierExtensionRequests,
  approveExtension,
  rejectExtension,
  checkSupplierPermission
};
