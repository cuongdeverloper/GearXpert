/**
 * Chỉ luồng admin duyệt / từ chối (và legacy review) đề xuất bồi thường
 * Route: /api/reports/admin/issues/:issueId/compensation-proposal/*
 */
const DeliveryIssueReport = require("../../models/DeliveryIssueReport");
const DamageReport = require("../../models/DamageReport");
const CompensationProposal = require("../../models/CompensationProposal");
const Rental = require("../../models/Rental");
const NotificationConfig = require("../../configs/NotificationConfig");
const { getUser } = require("../../utils/socketUser");
const { emitOperationStaffUpdate } = require("../../utils/operationStaffSocket");
const { toCompensationProposalDto } = require("../../utils/toCompensationProposalDto");
const { buildCompensationSettlementPreview } = require("../../utils/buildCompensationSettlementPreview");
const { applyCompensationWalletOnAdminApprove } = require("../../services/compensationWalletSettlementService");
const {
  applyRentalStateAfterCompensationWallet,
  updateDeviceItemsAfterCompensationAdminApproval,
} = require("../../services/compensationRentalStateAfterWalletService");
const { compensationAuditLog } = require("../../utils/compensationAuditLog");
const {
  executeConfirmReturnSettlement,
  sendRentalNotification: rentalSendRentalNotification,
} = require("../Rental/RentalController");
const mongoose = require("mongoose");

/**
 * @param {import("express").Request} req
 * @param {"APPROVED"|"REJECTED"|null} forcedDecision — null: đọc từ body.decision (legacy /review)
 */
async function runAdminCompensationProposalDecision(req, forcedDecision = null) {
  const adminId = req.user.id;
  const { issueId } = req.params;
  if (!issueId || !mongoose.Types.ObjectId.isValid(issueId)) {
    return { status: 400, body: { message: "issueId không hợp lệ" } };
  }
  const { decision = "APPROVED", approvedAmount, note = "" } = req.body || {};
  const cleanDecision = forcedDecision
    ? forcedDecision
    : String(decision || "APPROVED").trim();
  const cleanNote = String(note || "").trim();

  if (!["APPROVED", "REJECTED"].includes(cleanDecision)) {
    return { status: 400, body: { message: "decision phải là APPROVED hoặc REJECTED" } };
  }

  let issueDoc = await DeliveryIssueReport.findById(issueId);
  let referenceModel = "DeliveryIssueReport";
  if (!issueDoc) {
    issueDoc = await DamageReport.findById(issueId);
    referenceModel = "DamageReport";
  }
  if (!issueDoc) {
    return { status: 404, body: { message: "Không tìm thấy báo cáo sự cố" } };
  }

  const proposal = await CompensationProposal.findOne({
    referenceModel,
    referenceId: issueDoc._id,
  }).sort({ submittedAt: -1, createdAt: -1 });

  if (!proposal) {
    return {
      status: 404,
      body: { message: "Chưa có đề xuất bồi thường cho sự cố này" },
    };
  }

  if (proposal.flowStatus !== "PENDING_ADMIN_REVIEW") {
    return {
      status: 409,
      body: { message: "Đề xuất chưa ở trạng thái chờ admin duyệt" },
    };
  }

  if (proposal.customerDecision !== "ACCEPTED" || proposal.supplierDecision !== "ACCEPTED") {
    return {
      status: 409,
      body: { message: "Chỉ duyệt khi cả khách hàng và supplier đều đã xác nhận đề xuất" },
    };
  }

  let finalApprovedAmount = 0;
  if (cleanDecision === "APPROVED") {
    const customApprovedAmount =
      approvedAmount === undefined || approvedAmount === null
        ? Number(proposal.amount || 0)
        : Number(approvedAmount);
    if (!Number.isFinite(customApprovedAmount) || customApprovedAmount < 0) {
      return { status: 400, body: { message: "approvedAmount không hợp lệ" } };
    }
    finalApprovedAmount = customApprovedAmount;
  }

  const rentalId = proposal.rentalId || issueDoc.rentalId;
  /** Có nội dung khi admin duyệt + đã gọi quyết toán ví (APPROVE) */
  let walletSummary = null;
  /** Đóng đơn thuê tự động sau duyệt (khi rental đang RETURNING) */
  let rentalClosure = null;

  if (cleanDecision === "REJECTED") {
    compensationAuditLog("ADMIN_DECISION", {
      action: "REJECT",
      issueId: String(issueId),
      proposalId: String(proposal._id),
      rentalId: rentalId ? String(rentalId) : null,
      adminId: String(adminId),
    });
    if (!proposal.handledByAdminId) {
      proposal.handledByAdminId = adminId;
    }
    proposal.adminDecision = "REJECTED";
    proposal.adminDecidedAt = new Date();
    proposal.adminDecidedBy = adminId;
    proposal.adminDecisionNote = cleanNote || undefined;
    proposal.approvedCompensationAmount = 0;
    proposal.flowStatus = "ADMIN_REJECTED";
    await proposal.save();

    if (!issueDoc.statusHistory) issueDoc.statusHistory = [];
    issueDoc.status = "PROCESSING";
    issueDoc.statusHistory.push({
      status: "PROCESSING",
      changedBy: adminId,
      note: `Admin từ chối đề xuất bồi thường${cleanNote ? `: ${cleanNote}` : ""} — NCC có thể gửi đề xuất mới`,
      createdAt: new Date(),
    });
    await issueDoc.save();
  } else {
    let issueAfter = issueDoc;
    let proposalForDto = null;
    let walletApplySucceeded = false;
    try {
      compensationAuditLog("ADMIN_DECISION", {
        action: "APPROVE_START",
        issueId: String(issueId),
        proposalId: String(proposal._id),
        rentalId: rentalId ? String(rentalId) : null,
        finalApprovedAmount,
        suggestedResolution: proposal.suggestedResolution,
        adminId: String(adminId),
      });
      const claimHandler = proposal.handledByAdminId ? {} : { handledByAdminId: adminId };
      const p = await CompensationProposal.findOneAndUpdate(
        { _id: proposal._id, flowStatus: "PENDING_ADMIN_REVIEW" },
        { $set: { flowStatus: "PENDING_WALLET", ...claimHandler } },
        { new: true }
      );
      if (!p) {
        throw new Error(
          "Đề xuất đã được xử lý, đang ghi ví, hoặc không còn chờ duyệt. Vui lòng tải lại trang (tránh bấm Approve hai lần)."
        );
      }
      p.adminDecision = "APPROVED";
      p.adminDecidedAt = new Date();
      p.adminDecidedBy = adminId;
      p.adminDecisionNote = cleanNote || undefined;
      p.approvedCompensationAmount = finalApprovedAmount;

      if (finalApprovedAmount > 0 && !rentalId) {
        throw new Error("Thiếu đơn thuê (rental) gắn với đề xuất / sự cố — không thể quyết toán ví với mức bồi thường > 0");
      }

      if (rentalId && finalApprovedAmount > 0) {
        const r = await Rental.findById(rentalId);
        if (!r) {
          throw new Error("Không tìm thấy đơn thuê để quyết toán bồi thường (rentalId không khớp hoặc đã xóa)");
        }
        walletSummary = await applyCompensationWalletOnAdminApprove(null, {
          rental: r,
          proposal: p,
          approvedAmount: finalApprovedAmount,
        });
        compensationAuditLog("ADMIN_WALLET_RESULT", {
          proposalId: String(p._id),
          rentalId: String(rentalId),
          walletSummary,
        });
        if (!walletSummary || !walletSummary.applied) {
          const mode = walletSummary && walletSummary.mode;
          if (mode === "UNKNOWN_RESOLUTION" || !mode) {
            throw new Error(
              "Quyết toán ví: loại hình xử lý (suggestedResolution) chưa hỗ trợ tự động. Kiểm tra dữ liệu đề xuất hoặc xử lý thủ công trước khi duyệt lại."
            );
          }
          throw new Error(
            `Chưa ghi sổ ví tự động (${String(mode)}). Có thể trạng thái cọc/đơn không hợp lệ; xem tạm tính (settlement-preview) rồi xử lý thủ công hoặc sửa hồ sơ đơn.`
          );
        }
        walletApplySucceeded = true;
        p.appliedToDeposit = (walletSummary.deductedFromDeposit || 0) > 0;
        p.deductedFromDepositAmount = walletSummary.deductedFromDeposit || 0;
        p.appliedToDepositAt = p.appliedToDeposit ? new Date() : undefined;
      } else {
        if (finalApprovedAmount === 0 || !rentalId) {
          compensationAuditLog("ADMIN_WALLET_RESULT", {
            proposalId: String(p._id),
            rentalId: rentalId ? String(rentalId) : null,
            walletSummary: null,
            skipped: true,
            reason: !rentalId ? "NO_RENTAL" : "ZERO_APPROVED",
          });
        }
        p.appliedToDeposit = false;
        p.deductedFromDepositAmount = 0;
      }

      p.flowStatus = "ADMIN_APPROVED";
      await p.save();
      if (rentalId) {
        await Rental.findByIdAndUpdate(rentalId, { $addToSet: { compensationProposalIds: p._id } });
        await applyRentalStateAfterCompensationWallet(rentalId, walletSummary);
      }

      const IssueModel = referenceModel === "DeliveryIssueReport" ? DeliveryIssueReport : DamageReport;
      const iss = await IssueModel.findById(issueDoc._id);
      if (!iss) {
        throw new Error("Không tìm thấy báo cáo sự cố");
      }
      if (!iss.statusHistory) iss.statusHistory = [];
      const approvedNote = `Admin đã duyệt đề xuất bồi thường: ${finalApprovedAmount.toLocaleString("vi-VN")}đ${cleanNote ? ` — Ghi chú: ${cleanNote}` : ""
        }`;
      iss.status = "RESOLVED";
      iss.resolutionNote = `Đề xuất bồi thường đã duyệt: ${finalApprovedAmount.toLocaleString("vi-VN")}đ`;
      iss.compensationAmount = finalApprovedAmount;
      iss.statusHistory.push({
        status: "RESOLVED",
        changedBy: adminId,
        note: approvedNote,
        createdAt: new Date(),
      });
      await iss.save();
      issueAfter = iss;

      await updateDeviceItemsAfterCompensationAdminApproval(iss);

      if (rentalId) {
        const rentSnap = await Rental.findById(rentalId).select("status").lean();
        if (rentSnap?.status === "RETURNING") {
          const closeSession = await mongoose.startSession();
          closeSession.startTransaction();
          try {
            const mockReq = {
              params: { rentalId: String(rentalId) },
              user: { id: adminId, role: req.user?.role || "ADMIN" },
              body: {},
              files: undefined,
            };
            const out = await executeConfirmReturnSettlement(closeSession, mockReq, {
              requireApprovedCompensation: true,
            });
            const { rental: rentClosed, returnDraft, supplierReceive: supRecv, totalDepositUsedForCompensation: depUsed } = out;
            const actorIdClose = out.actorId;
            const customerBody =
              depUsed > 0
                ? `Thiết bị đã thu hồi. Phần cọc còn lại (sau bồi thường admin đã duyệt) đã hoàn về ví. Cảm ơn bạn!`
                : `Thiết bị đã được thu hồi thành công. Cọc đã được hoàn về ví của bạn. Cảm ơn bạn!`;
            await rentalSendRentalNotification(
              rentClosed,
              "CUSTOMER",
              "Đơn thuê đã hoàn thành (sau khi admin duyệt bồi thường)",
              customerBody
            );
            await rentalSendRentalNotification(
              rentClosed,
              "SUPPLIER",
              "Đơn hoàn tất - Đã nhận tiền thuê",
              `Bạn đã nhận được ${supRecv.toLocaleString("vi-VN")}₫ tiền thuê từ đơn #${rentClosed._id.toString().slice(-6)}.`
            );
            await closeSession.commitTransaction();
            rentalClosure = {
              closed: true,
              returnRecordId: String(returnDraft._id),
              rentalStatus: "COMPLETED",
            };
            emitOperationStaffUpdate({
              action: "RETURN_COMPLETED",
              message: "Hoàn tất thu hồi tự động cùng lúc admin duyệt bồi thường.",
              rentalId: String(rentalId),
              actorId: String(actorIdClose),
            });
            compensationAuditLog("ADMIN_APPROVE_AUTO_CLOSE_RENTAL", {
              rentalId: String(rentalId),
              returnRecordId: String(returnDraft._id),
            });
          } catch (closeErr) {
            await closeSession.abortTransaction();
            console.error("ADMIN_APPROVE_AUTO_CLOSE_RENTAL_ERR:", closeErr);
            rentalClosure = {
              closed: false,
              error: closeErr.message || "AUTO_CLOSE_FAILED",
            };
            compensationAuditLog("ADMIN_APPROVE_AUTO_CLOSE_RENTAL_FAIL", {
              rentalId: String(rentalId),
              error: closeErr.message,
            });
          } finally {
            closeSession.endSession();
          }
        } else {
          rentalClosure = {
            closed: false,
            skipped: "RENTAL_NOT_RETURNING",
            currentStatus: rentSnap?.status || null,
          };
        }
      }

      proposalForDto = p;
      compensationAuditLog("ADMIN_DECISION", {
        action: "APPROVE_OK",
        issueId: String(issueId),
        proposalId: String(p._id),
        issueStatus: issueAfter.status,
        flowStatus: p.flowStatus,
        approvedCompensationAmount: p.approvedCompensationAmount,
        appliedToDeposit: p.appliedToDeposit,
        deductedFromDepositAmount: p.deductedFromDepositAmount,
      });
    } catch (e) {
      compensationAuditLog("ADMIN_DECISION", {
        action: "APPROVE_ERROR",
        issueId: String(issueId),
        proposalId: String(proposal._id),
        error: e.message,
      });
      try {
        if (walletApplySucceeded) {
          await CompensationProposal.findByIdAndUpdate(proposal._id, {
            $set: {
              flowStatus: "ADMIN_APPROVED",
              adminDecision: "APPROVED",
              adminDecidedAt: new Date(),
              adminDecidedBy: adminId,
            },
          });
        } else {
          await CompensationProposal.updateOne(
            { _id: proposal._id, flowStatus: "PENDING_WALLET" },
            { $set: { flowStatus: "PENDING_ADMIN_REVIEW" } }
          );
        }
      } catch (revertErr) {
        console.error("revert after approve error:", revertErr);
      }
      return {
        status: 400,
        body: { message: e.message || "Không thể hoàn tất duyệt (ví / giao dịch)" },
      };
    }
    if (!proposalForDto) {
      return { status: 500, body: { message: "Lỗi lưu sau duyệt" } };
    }
    issueDoc = issueAfter;
  }

  const proposalForResponse =
    cleanDecision === "APPROVED"
      ? (await CompensationProposal.findById(proposal._id)) || proposal
      : proposal;

  const rental = rentalId
    ? await Rental.findById(rentalId).select("supplierId customerId status")
    : null;

  if (rental?.supplierId) {
    await NotificationConfig.sendNotification({
      senderId: adminId,
      receiverId: rental.supplierId,
      title:
        cleanDecision === "APPROVED"
          ? "Admin đã duyệt đề xuất bồi thường"
          : "Admin từ chối đề xuất bồi thường",
      message:
        cleanDecision === "APPROVED"
          ? `Case #${String(issueDoc._id).slice(-6)}: mức bồi thường ghi nhận ${finalApprovedAmount.toLocaleString(
            "vi-VN"
          )}đ. Sự cố ghi nhận kết thúc${walletSummary && walletSummary.applied ? " — đã ghi sổ ví theo mức duyệt." : "."
          }`
          : `Case #${String(issueDoc._id).slice(-6)}: đề xuất bị từ chối — có thể gửi đề xuất mới nếu cần.`,
      link: `/supplier/issues/${issueDoc._id}`,
      type: "COMPENSATION_PROPOSAL_REVIEW",
    });
  }
  if (rental?.customerId) {
    await NotificationConfig.sendNotification({
      senderId: adminId,
      receiverId: rental.customerId,
      title:
        cleanDecision === "APPROVED"
          ? "Đề xuất bồi thường đã được admin duyệt"
          : "Đề xuất bồi thường đã bị admin từ chối",
      message:
        cleanDecision === "APPROVED"
          ? `Mức bồi thường admin ghi nhận: ${finalApprovedAmount.toLocaleString(
            "vi-VN"
          )}đ. Sự cố trên hồ sơ thuê đã kết thúc${walletSummary && walletSummary.applied
            ? " — số tương ứng đã phản ánh trên ví (nếu áp dụng được)."
            : "."
          }`
          : "Đề xuất không được chấp nhận. Bạn theo dõi thông báo / chat nếu shop gửi đề xuất mới.",
      link: `/customer/rentals/${issueDoc.rentalId}`,
      type: "COMPENSATION_PROPOSAL_REVIEW",
    });
  }

  const staffId = issueDoc.staffId && issueDoc.staffId.toString();
  if (staffId && staffId !== String(adminId)) {
    await NotificationConfig.sendNotification({
      senderId: adminId,
      receiverId: issueDoc.staffId,
      title:
        cleanDecision === "APPROVED"
          ? "Admin đã chốt bồi thường (case bạn từng ghi nhận)"
          : "Admin từ chối đề xuất bồi thường (case bạn từng ghi nhận)",
      message:
        cleanDecision === "APPROVED"
          ? `Case #${String(issueDoc._id).slice(-6)} duyệt mức ${finalApprovedAmount.toLocaleString("vi-VN")}đ. Sự cố ghi nhận RESOLVED.`
          : `Case #${String(issueDoc._id).slice(-6)}: đề xuất bồi thường bị từ chối, sự cố mở lại xử lý với NCC.`,
      link: "/staff",
      type: "COMPENSATION_PROPOSAL_REVIEW",
    });
  }

  const io = req.app && req.app.get("io");
  if (io && rental) {
    const payload = {
      type: "COMPENSATION_PROPOSAL_ADMIN_REVIEW",
      issueId: String(issueDoc._id),
      rentalId: String(issueDoc.rentalId),
      referenceModel,
      decision: cleanDecision,
      flowStatus: proposalForResponse.flowStatus,
      proposalId: String(proposalForResponse._id),
      issueStatus: issueDoc.status,
      rentalStatus: cleanDecision === "APPROVED" && rental ? rental.status : undefined,
    };
    for (const uid of [rental.supplierId, rental.customerId]) {
      if (!uid) continue;
      const s = getUser(uid.toString());
      if (s && s.socketId) {
        io.to(s.socketId).emit("issueUpdate", payload);
      }
    }
  }

  emitOperationStaffUpdate({
    message: `Admin ${cleanDecision === "APPROVED" ? "duyệt" : "từ chối"} đề xuất bồi thường case #${String(
      issueDoc._id
    ).slice(-6)}`,
    issueId: String(issueDoc._id),
    rentalId: String(issueDoc.rentalId),
  });

  let approveMessage =
    "Đã duyệt: cập nhật đề xuất, sự cố RESOLVED, quyết toán ví (nếu hợp lệ) và thông báo";
  if (cleanDecision === "APPROVED") {
    if (rentalClosure?.closed) {
      approveMessage =
        "Đã duyệt bồi thường và đóng đơn thuê trong cùng một bước (payout tiền thuê + hoàn cọc còn lại).";
    } else if (rentalClosure?.error) {
      approveMessage = `Đã duyệt bồi thường. Đóng đơn tự động thất bại — ${rentalClosure.error}. Có thể gọi POST /api/rentals/:rentalId/confirm-return-after-compensation.`;
    } else if (rentalClosure?.skipped === "RENTAL_NOT_RETURNING") {
      approveMessage =
        "Đã duyệt bồi thường. Đơn chưa ở trạng thái RETURNING nên chưa đóng tự động — khi thu hồi xong hãy gọi confirm-return (hoặc confirm-return-after-compensation).";
    }
  }

  return {
    status: 200,
    body: {
      success: true,
      message:
        cleanDecision === "APPROVED" ? approveMessage : "Đã từ chối đề xuất bồi thường, sự cố mở lại cho NCC",
      proposal: toCompensationProposalDto(
        typeof proposalForResponse.toObject === "function"
          ? proposalForResponse.toObject()
          : proposalForResponse
      ),
      issue: { _id: issueDoc._id, status: issueDoc.status, referenceModel },
      ...(cleanDecision === "APPROVED" && walletSummary
        ? { walletSettlement: walletSummary }
        : {}),
      ...(cleanDecision === "APPROVED" && rentalClosure ? { rentalClosure } : {}),
    },
  };
}

exports.adminApproveCompensationProposal = async (req, res) => {
  try {
    const result = await runAdminCompensationProposalDecision(req, "APPROVED");
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("adminApproveCompensationProposal:", err);
    return res.status(500).json({ message: err.message || "Lỗi server" });
  }
};

exports.adminRejectCompensationProposal = async (req, res) => {
  try {
    const result = await runAdminCompensationProposalDecision(req, "REJECTED");
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("adminRejectCompensationProposal:", err);
    return res.status(500).json({ message: err.message || "Lỗi server" });
  }
};

/** Legacy: body `{ decision, approvedAmount?, note? }` */
exports.adminReviewCompensationProposal = async (req, res) => {
  try {
    const result = await runAdminCompensationProposalDecision(req, null);
    return res.status(result.status).json(result.body);
  } catch (err) {
    console.error("adminReviewCompensationProposal:", err);
    return res.status(500).json({ message: err.message || "Lỗi server" });
  }
};

/**
 * Admin: sau khi NCC escalate (issue AWAITING_ADMIN_GX), soạn đề xuất trung gian.
 * Luồng tạm: bỏ bước khách/shop xác nhận trên app — tạo thẳng PENDING_ADMIN_REVIEW (hai bên coi như đã OK)
 * để admin xem tạm tính (settlement-preview) rồi duyệt quyết toán + đóng case.
 */
exports.adminCreateGxMediationProposal = async (req, res) => {
  try {
    const adminId = req.user.id;
    const { issueId } = req.params;
    if (!issueId || !mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({ message: "issueId không hợp lệ" });
    }

    let issueDoc = await DeliveryIssueReport.findById(issueId);
    let referenceModel = "DeliveryIssueReport";
    if (!issueDoc) {
      issueDoc = await DamageReport.findById(issueId);
      referenceModel = "DamageReport";
    }
    if (!issueDoc) {
      return res.status(404).json({ message: "Không tìm thấy báo cáo sự cố" });
    }

    if (issueDoc.status !== "AWAITING_ADMIN_GX") {
      return res.status(400).json({
        message:
          "Chỉ tạo đề xuất trung gian khi sự cố đang ở trạng thái chờ Admin GearXpert (sau khi NCC nhờ can thiệp).",
      });
    }

    const rental = await Rental.findById(issueDoc.rentalId).select("supplierId customerId");
    if (!rental?.supplierId) {
      return res.status(400).json({ message: "Thiếu thông tin đơn thuê / NCC" });
    }

    const terminalProposal = new Set([
      "ADMIN_APPROVED",
      "ADMIN_REJECTED",
      "CUSTOMER_REJECTED",
      "SUPPLIER_REJECTED",
    ]);
    const latest = await CompensationProposal.findOne({
      referenceModel,
      referenceId: issueDoc._id,
    }).sort({ submittedAt: -1, createdAt: -1 });
    if (latest && !terminalProposal.has(latest.flowStatus)) {
      return res.status(409).json({
        message:
          "Đang có đề xuất bồi thường chưa kết thúc. Hoàn tất hoặc đóng luồng hiện tại trước khi tạo đề xuất mới.",
      });
    }

    const { amount, reason, explanation, suggestedResolution, forwardedMessagePreview } = req.body || {};
    const cleanAmount = Number(amount ?? 0);
    const cleanReason = String(reason || "").trim();
    const cleanExplanation = String(explanation || "").trim();
    const cleanResolution = String(suggestedResolution || "").trim();
    const cleanForwardPreview = String(forwardedMessagePreview || "").trim();

    if (!Number.isFinite(cleanAmount) || cleanAmount < 0) {
      return res.status(400).json({ message: "Số tiền bồi thường không hợp lệ" });
    }
    if (!cleanReason) {
      return res.status(400).json({ message: "Vui lòng nhập lý do đề xuất" });
    }
    if (!cleanExplanation || cleanExplanation.length < 10) {
      return res.status(400).json({
        message: "Vui lòng nhập giải thích chi tiết (tối thiểu 10 ký tự)",
      });
    }
    if (!["CUSTOMER_PAY", "SUPPLIER_BEAR", "REQUEST_GX_REVIEW", "PLATFORM_LIABILITY"].includes(cleanResolution)) {
      return res.status(400).json({
        message:
          "Phương án đề xuất không hợp lệ. Hợp lệ: CUSTOMER_PAY, SUPPLIER_BEAR, REQUEST_GX_REVIEW, PLATFORM_LIABILITY",
      });
    }
    if (
      (cleanResolution === "CUSTOMER_PAY" || cleanResolution === "PLATFORM_LIABILITY") &&
      cleanAmount <= 0
    ) {
      return res.status(400).json({
        message:
          cleanResolution === "CUSTOMER_PAY"
            ? "Khi đề xuất khách đền bù, số tiền phải lớn hơn 0"
            : "Hệ thống đền bù thiệt hại: số tiền phải lớn hơn 0",
      });
    }

    const uploadedImages = Array.isArray(req.files)
      ? req.files.map((f) => f?.path).filter(Boolean)
      : [];

    const submittedAtNow = new Date();

    issueDoc.assignedAdminId = issueDoc.assignedAdminId || adminId;
    const prevIssueStatus = issueDoc.status;
    if (!issueDoc.statusHistory) issueDoc.statusHistory = [];
    issueDoc.statusHistory.push({
      status: prevIssueStatus,
      changedBy: adminId,
      note: "Admin GearXpert tạo đề xuất trung gian — luồng tạm: chờ admin xem tạm tính và quyết toán (không yêu cầu xác nhận app)",
      createdAt: new Date(),
    });
    await issueDoc.save();

    const decidedAtNow = new Date();
    const syntheticAcceptNote =
      "Luồng tạm (GX admin): không yêu cầu xác nhận khách/shop trên app — chờ admin duyệt quyết toán cuối.";

    const created = await CompensationProposal.create({
      referenceModel,
      referenceId: issueDoc._id,
      rentalId: issueDoc.rentalId,
      supplierId: rental.supplierId,
      customerId: rental.customerId || undefined,
      proposedBy: adminId,
      origin: "ADMIN_GX",
      amount: cleanAmount,
      currency: "VND",
      reason: cleanReason,
      explanation: cleanExplanation,
      suggestedResolution: cleanResolution,
      images: uploadedImages,
      submittedAt: submittedAtNow,
      forwardedMessagePreview: cleanForwardPreview || undefined,
      customerDecision: "ACCEPTED",
      customerDecidedAt: decidedAtNow,
      customerDecisionNote: syntheticAcceptNote,
      supplierDecision: "ACCEPTED",
      supplierDecidedAt: decidedAtNow,
      supplierDecisionNote: syntheticAcceptNote,
      directGearXpertReview: true,
      handledByAdminId: adminId,
      adminDecision: "PENDING",
      flowStatus: "PENDING_ADMIN_REVIEW",
    });

    const proposalDto = toCompensationProposalDto(created.toObject());

    const notifyPairs = [];
    if (rental.customerId) {
      notifyPairs.push({
        receiverId: rental.customerId,
        title: "GearXpert đã ghi nhận phương án trung gian",
        message: `Case #${String(issueDoc._id).slice(-6)}: admin đã nhập đề xuất trung gian. Tiền sẽ quyết toán sau khi admin xác nhận cuối trên hệ thống.`,
        link: `/customer/rentals/${issueDoc.rentalId}`,
      });
    }
    notifyPairs.push({
      receiverId: rental.supplierId,
      title: "GearXpert đã ghi nhận phương án trung gian",
      message: `Case #${String(issueDoc._id).slice(-6)}: admin đã nhập đề xuất trung gian. Tiền sẽ quyết toán sau khi admin xác nhận cuối.`,
      link: `/supplier/issues/${issueDoc._id}`,
    });

    await Promise.all(
      notifyPairs.map((n) =>
        NotificationConfig.sendNotification({
          senderId: adminId,
          receiverId: n.receiverId,
          title: n.title,
          message: n.message,
          link: n.link,
          type: "COMPENSATION_PROPOSAL",
        })
      )
    );

    return res.json({
      success: true,
      message: "Đã tạo đề xuất — chờ admin xem tạm tính và duyệt quyết toán",
      proposal: proposalDto,
    });
  } catch (err) {
    console.error("adminCreateGxMediationProposal:", err);
    return res.status(500).json({ message: err.message || "Lỗi server" });
  }
};

/** GET .../compensation-proposals/:proposalId/settlement-preview?approvedAmount= — chỉ tạm tính, không ghi DB */
exports.getCompensationSettlementPreview = async (req, res) => {
  try {
    const { proposalId } = req.params;
    const { approvedAmount: qAmt } = req.query;
    if (!mongoose.Types.ObjectId.isValid(proposalId)) {
      return res.status(400).json({ message: "proposalId không hợp lệ" });
    }
    const proposal = await CompensationProposal.findById(proposalId).lean();
    if (!proposal) {
      return res.status(404).json({ message: "Không tìm thấy đề xuất" });
    }
    const rental = proposal.rentalId
      ? await Rental.findById(proposal.rentalId)
        .select(
          "_id status depositAmount rentPriceTotal depositStatus escrowStatus paymentBreakdown"
        )
        .lean()
      : null;
    if (!rental) {
      return res.status(404).json({ message: "Không tìm thấy đơn thuê gắn đề xuất" });
    }
    const approved =
      qAmt === undefined || qAmt === "" ? Number(proposal.amount || 0) : Number(qAmt);
    if (!Number.isFinite(approved) || approved < 0) {
      return res.status(400).json({ message: "approvedAmount không hợp lệ" });
    }
    return res.json(
      buildCompensationSettlementPreview({ rental, proposal, approvedAmount: approved })
    );
  } catch (err) {
    console.error("getCompensationSettlementPreview:", err);
    return res.status(500).json({ message: err.message || "Lỗi server" });
  }
};
