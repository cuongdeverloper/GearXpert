const ShopReport = require("../../models/ShopReport");
const SupplierProfile = require("../../models/SupplierProfile");
const { sendMail } = require("../../configs/sendMail");
const { shopReportStatusTemplate, shopReportNotificationForSupplierTemplate } = require("../../utils/EmailTemplates");

const createShopReport = async (req, res) => {
  try {
    const { shopId, reason, description, purchasedProductId } = req.body;
    const userId = req.user.id; // From checkAccessToken middleware

    let evidenceUrls = [];
    if (req.files && req.files.length > 0) {
      evidenceUrls = req.files.map(file => file.path);
    }

    // Robust shopId resolution: if shopId is a userId, find the associated profile
    let resolvedShopId = shopId;
    const profile = await SupplierProfile.findOne({ 
      $or: [
        { _id: shopId },
        { userId: shopId }
      ]
    });
    
    if (profile) {
      resolvedShopId = profile._id;
      
      // Prevent reporting own shop
      if (profile.userId.toString() === userId.toString()) {
        return res.status(400).json({
          success: false,
          message: "Bạn không thể báo cáo cửa hàng của chính mình."
        });
      }
    }

    const report = new ShopReport({
      reporter: userId,
      shop: resolvedShopId,
      reason,
      description,
      evidence: evidenceUrls,
      purchasedProduct: purchasedProductId || null
    });

    await report.save();

    // Populate for immediate response
    const populatedReport = await ShopReport.findById(report._id)
      .populate("reporter", "fullName email")
      .populate("shop", "businessName")
      .populate("purchasedProduct", "deviceName");

    res.status(201).json({
      success: true,
      message: "Báo cáo của bạn đã được gửi thành công. Admin sẽ xem xét sớm nhất có thể.",
      data: populatedReport
    });
  } catch (error) {
    console.error("Error creating shop report:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi gửi báo cáo.",
      error: error.message
    });
  }
};

const getAllReports = async (req, res) => {
  try {
    let reports = await ShopReport.find()
      .populate("reporter", "fullName email phone")
      .populate("shop", "businessName")
      .populate("purchasedProduct", "deviceName")
      .sort({ createdAt: -1 });

    // Handle legacy reports where shop might be a userId and populate failed
    reports = await Promise.all(reports.map(async (report) => {
      if (!report.shop) {
        // Find the original raw document to get the shopId
        const rawReport = await ShopReport.findById(report._id).select("shop").lean();
        if (rawReport && rawReport.shop) {
           const profile = await SupplierProfile.findOne({ userId: rawReport.shop }).select("businessName").lean();
           if (profile) {
             report.shop = profile;
           }
        }
      }
      return report;
    }));

    res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error("Error fetching shop reports:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi tải danh sách báo cáo.",
      error: error.message
    });
  }
};

const updateReportStatus = async (req, res) => {
  try {
    const { reportId } = req.params;
    const { status, adminNotes } = req.body;

    const existingReport = await ShopReport.findById(reportId);
    if (!existingReport) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy báo cáo."
      });
    }

    // Workflow Constraints: 
    // If it's already RESOLVED or REJECTED, it CANNOT be moved back to PENDING or RECEIVED.
    // Note: Switching between RESOLVED <-> REJECTED is still allowed.
    if (['RESOLVED', 'REJECTED'].includes(existingReport.status) && ['PENDING', 'RECEIVED'].includes(status)) {
       return res.status(400).json({
          success: false,
          message: "Báo cáo này đã được chốt kết quả, không thể hoàn tác về trạng thái tiếp nhận."
       });
    }

    const report = await ShopReport.findByIdAndUpdate(
      reportId,
      { status, adminNotes },
      { new: true }
    )
      .populate("reporter", "fullName email")
      .populate({
        path: "shop",
        select: "businessName userId status penaltyStage resolvedReportCount lastResolvedReportAt suspendedUntil isPermanentlyHidden",
        populate: { path: "userId", select: "email fullName" }
      });

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy báo cáo."
      });
    }

    // AUTOMATED PENALTY LOGIC (Apply when changing FROM something else TO RESOLVED)
    if (status === 'RESOLVED' && existingReport.status !== 'RESOLVED' && report.shop) {
       const profile = await SupplierProfile.findById(report.shop._id);
       if (profile) {
          const now = new Date();
          
          // Reset check: if more than 30 days passed since reference date, reset
          const referenceDate = (profile.suspendedUntil && profile.suspendedUntil > profile.lastResolvedReportAt)
             ? profile.suspendedUntil
             : (profile.lastResolvedReportAt || profile.createdAt);

          const daysSinceLastActive = (now - referenceDate) / (1000 * 60 * 60 * 24);
          
          if (daysSinceLastActive > 30) {
             profile.resolvedReportCount = 0;
             profile.penaltyStage = 0;
             profile.status = 'ACTIVE';
          }

          // Stage progression
          if (!profile.isPermanentlyHidden) {
             profile.resolvedReportCount += 1;
             profile.lastResolvedReportAt = now;

             if (profile.resolvedReportCount >= 3) {
                if (profile.penaltyStage === 0) {
                   profile.penaltyStage = 1;
                   profile.suspendedUntil = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
                   profile.resolvedReportCount = 0;
                   profile.status = 'SUSPENDED';
                } else if (profile.penaltyStage === 1) {
                   profile.penaltyStage = 2;
                   profile.suspendedUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                   profile.resolvedReportCount = 0;
                   profile.status = 'SUSPENDED';
                } else if (profile.penaltyStage === 2) {
                   profile.penaltyStage = 3;
                   profile.isPermanentlyHidden = true;
                   profile.status = 'SUSPENDED';
                }
             }
             await profile.save();
          }
       }
    }

    // REVERT PENALTY (Apply when changing FROM RESOLVED TO REJECTED)
    if (existingReport.status === 'RESOLVED' && status === 'REJECTED' && report.shop) {
       const profile = await SupplierProfile.findById(report.shop._id);
       if (profile && !profile.isPermanentlyHidden) {
          // Revert count if possible (prevent negative)
          if (profile.resolvedReportCount > 0) {
             profile.resolvedReportCount -= 1;
             await profile.save();
          }
       }
    }

    // Send email notification to the reporter
    if (['RECEIVED', 'RESOLVED', 'REJECTED'].includes(status)) {
       const reporterEmailHtml = shopReportStatusTemplate(
         report.reporter.fullName,
         report.shop?.businessName || "Shop",
         status,
         adminNotes
       );
       
       let emailSubject = `[GearXpert] Cập nhật tiến độ xử lý báo cáo Shop`;
       if (status === 'RESOLVED') {
         emailSubject = `[GearXpert] Cảm ơn bạn - Báo cáo của bạn đã được xử lý hoàn tất`;
       } else if (status === 'REJECTED') {
         emailSubject = `[GearXpert] Thông báo kết quả xem xét báo cáo Shop`;
       }
       
       sendMail(
         report.reporter.email,
         emailSubject,
         reporterEmailHtml
       );
    }

    // SPECIAL: If status is RECEIVED, also notify the Shop Owner
    if (status === 'RECEIVED' && report.shop?.userId?.email) {
      const supplierEmailHtml = shopReportNotificationForSupplierTemplate(
        report.shop.userId.fullName,
        report.shop.businessName,
        report.reason,
        report.description
      );

      sendMail(
        report.shop.userId.email,
        `[GearXpert] Cảnh báo: Cửa hàng của bạn vừa bị người dùng báo cáo`,
        supplierEmailHtml
      );
    }

    res.status(200).json({
      success: true,
      message: "Cập nhật trạng thái báo cáo thành công.",
      data: report
    });
  } catch (error) {
    console.error("Error updating shop report status:", error);
    res.status(500).json({
      success: false,
      message: "Có lỗi xảy ra khi cập nhật báo cáo.",
      error: error.message
    });
  }
};

module.exports = {
  createShopReport,
  getAllReports,
  updateReportStatus
};
