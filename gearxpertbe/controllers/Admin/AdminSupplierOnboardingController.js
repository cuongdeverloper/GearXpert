const mongoose = require("mongoose");
const SupplierContract = require("../../models/SupplierContract");
const User = require("../../models/User");
const SupplierProfile = require("../../models/SupplierProfile");
const Notification = require("../../models/Notification");
const { sendMail } = require("../../configs/sendMail");
const {
  supplierOnboardingApprovedTemplate,
  supplierOnboardingRejectedTemplate,
} = require("../../utils/EmailTemplates");

async function emailSupplierApproved(userDoc) {
  if (!userDoc?.email) return;
  const html = supplierOnboardingApprovedTemplate(userDoc.fullName);
  const result = await sendMail(
    userDoc.email,
    "[GearXpert] Đăng ký nhà cung cấp được phê duyệt",
    html
  );
  if (!result) console.warn("[supplier-onboarding] Gửi email phê duyệt thất bại:", userDoc.email);
}

async function emailSupplierRejected(userDoc, rejectionReason) {
  if (!userDoc?.email) return;
  const html = supplierOnboardingRejectedTemplate(userDoc.fullName, rejectionReason);
  const result = await sendMail(
    userDoc.email,
    "[GearXpert] Đăng ký nhà cung cấp chưa được chấp nhận",
    html
  );
  if (!result) console.warn("[supplier-onboarding] Gửi email từ chối thất bại:", userDoc.email);
}

const upsertSupplierProfileApproved = async (userId, session) => {
  await SupplierProfile.findOneAndUpdate(
    { userId },
    {
      $set: { status: "ACTIVE", verifiedAt: new Date() },
      $setOnInsert: { businessName: "Cửa hàng mới" },
    },
    { upsert: true, new: true, session }
  );
};

const populateContract = [
  { path: "user", select: "fullName email phone role status isVerifiedEkyc avatar" },
  { path: "reviewedBy", select: "fullName email" },
];

/**
 * GET /api/admin/supplier-onboarding
 * Query: status = PENDING | APPROVED | REJECTED | ALL (default PENDING)
 */
exports.listSupplierOnboardingRequests = async (req, res) => {
  try {
    const raw = (req.query.status || "PENDING").toString().toUpperCase();
    const allowed = ["PENDING", "APPROVED", "REJECTED", "ALL"];
    const status = allowed.includes(raw) ? raw : "PENDING";

    const filter = status === "ALL" ? {} : { status };

    const requests = await SupplierContract.find(filter)
      .populate(populateContract)
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      requests,
    });
  } catch (error) {
    console.error("listSupplierOnboardingRequests:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi tải danh sách yêu cầu",
      error: error.message,
    });
  }
};

/**
 * POST /api/admin/supplier-onboarding/:id/approve
 */
exports.approveSupplierOnboarding = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const contractId = req.params.id;
    const adminId = req.user.id;

    const contract = await SupplierContract.findById(contractId).session(session);
    if (!contract) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu." });
    }

    if (contract.status === "APPROVED") {
      await session.commitTransaction();
      session.endSession();
      return res.status(200).json({
        success: true,
        message: "Yêu cầu đã được phê duyệt trước đó.",
        contract: await SupplierContract.findById(contractId).populate(populateContract),
      });
    }

    if (contract.status !== "PENDING") {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể phê duyệt yêu cầu đang ở trạng thái chờ xử lý.",
      });
    }

    const user = await User.findById(contract.user).session(session);
    if (!user) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ success: false, message: "Không tìm thấy người dùng." });
    }

    if (user.role === "SUPPLIER") {
      contract.status = "APPROVED";
      contract.reviewedBy = adminId;
      contract.rejectionReason = "";
      await contract.save({ session });
      await session.commitTransaction();
      session.endSession();

      await Notification.create({
        senderId: adminId,
        receiverId: contract.user,
        type: "SYSTEM",
        title: "Đăng ký nhà cung cấp được phê duyệt",
        message:
          "Hợp đồng đăng ký của bạn đã được đánh dấu phê duyệt. Bạn có thể tiếp tục sử dụng khu vực nhà cung cấp.",
        link: "/supplier",
      }).catch(() => {});
      await emailSupplierApproved(user);

      return res.status(200).json({
        success: true,
        message: "Tài khoản đã là nhà cung cấp; hợp đồng đã được đánh dấu phê duyệt.",
        contract: await SupplierContract.findById(contractId).populate(populateContract),
      });
    }

    user.role = "SUPPLIER";
    await user.save({ session });

    contract.status = "APPROVED";
    contract.reviewedBy = adminId;
    contract.rejectionReason = "";
    await contract.save({ session });

    await upsertSupplierProfileApproved(contract.user, session);

    await session.commitTransaction();
    session.endSession();

    await Notification.create({
      senderId: adminId,
      receiverId: contract.user,
      type: "SYSTEM",
      title: "Đăng ký nhà cung cấp được phê duyệt",
      message:
        "Tài khoản của bạn đã được nâng cấp thành Nhà cung cấp. Bạn có thể đăng thiết bị và quản lý cửa hàng.",
      link: "/supplier",
    }).catch(() => {});
    await emailSupplierApproved(user);

    const updated = await SupplierContract.findById(contractId).populate(populateContract);

    return res.status(200).json({
      success: true,
      message: "Đã phê duyệt yêu cầu trở thành nhà cung cấp.",
      contract: updated,
    });
  } catch (error) {
    await session.abortTransaction().catch(() => {});
    session.endSession();
    console.error("approveSupplierOnboarding:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi phê duyệt",
      error: error.message,
    });
  }
};

/**
 * POST /api/admin/supplier-onboarding/:id/reject
 * Body: { rejectionReason: string }
 */
exports.rejectSupplierOnboarding = async (req, res) => {
  try {
    const contractId = req.params.id;
    const adminId = req.user.id;
    const rejectionReason = (req.body.rejectionReason || req.body.reason || "").trim();

    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập lý do từ chối.",
      });
    }

    const contract = await SupplierContract.findById(contractId);
    if (!contract) {
      return res.status(404).json({ success: false, message: "Không tìm thấy yêu cầu." });
    }

    if (contract.status === "REJECTED") {
      return res.status(200).json({
        success: true,
        message: "Yêu cầu đã bị từ chối trước đó.",
        contract: await SupplierContract.findById(contractId).populate(populateContract),
      });
    }

    if (contract.status !== "PENDING") {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể từ chối yêu cầu đang ở trạng thái chờ xử lý.",
      });
    }

    contract.status = "REJECTED";
    contract.reviewedBy = adminId;
    contract.rejectionReason = rejectionReason;
    await contract.save();

    await Notification.create({
      senderId: adminId,
      receiverId: contract.user,
      type: "SYSTEM",
      title: "Yêu cầu trở thành nhà cung cấp bị từ chối",
      message: `Lý do: ${rejectionReason}. Bạn có thể gửi lại yêu cầu sau khi chỉnh sửa thông tin.`,
      link: "/profile",
    }).catch(() => {});

    const applicant = await User.findById(contract.user).select("email fullName").lean();
    if (applicant) {
      await emailSupplierRejected(applicant, rejectionReason);
    }

    const updated = await SupplierContract.findById(contractId).populate(populateContract);

    return res.status(200).json({
      success: true,
      message: "Đã từ chối yêu cầu.",
      contract: updated,
    });
  } catch (error) {
    console.error("rejectSupplierOnboarding:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi từ chối",
      error: error.message,
    });
  }
};
