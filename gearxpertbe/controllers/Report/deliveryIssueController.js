const DeliveryIssueReport = require("../../models/DeliveryIssueReport");
const DamageReport = require("../../models/DamageReport");
const CompensationProposal = require("../../models/CompensationProposal");
const Rental = require("../../models/Rental");
const RentalItem = require("../../models/RentalItem");
const DeliveryTask = require("../../models/DeliveryTask");
const Wallet = require("../../models/Wallet");
const WalletTransaction = require("../../models/WalletTransaction");
const User = require("../../models/User");
const Contract = require("../../models/Contract");
const ContractFile = require("../../models/ContractFile");
const ExtensionRequest = require("../../models/ExtensionRequest");
const DeviceItem = require("../../models/DeviceItem");
const mongoose = require("mongoose");
const {
  sendCompensationProposalChatMessage,
  buildSupplierToCustomerProposalText,
} = require("../../services/compensationChatMessageService");
const { ReturnRecord, RETURN_FAILURE_REASON } = require("../../models/ReturnRecord");
const NotificationConfig = require("../../configs/NotificationConfig");
const { ensureDraftForReturn, reportIssue } = require("../../services/ReturnService");
const { emitOperationStaffUpdate } = require("../../utils/operationStaffSocket");
const { toCompensationProposalDto } = require("../../utils/toCompensationProposalDto");

const RETURN_FAILURE_LABELS = {
  [RETURN_FAILURE_REASON.CUSTOMER_UNAVAILABLE]: "Khách vắng mặt / Không liên hệ được",
  [RETURN_FAILURE_REASON.WRONG_ADDRESS]: "Sai địa chỉ / Không tìm thấy vị trí",
  [RETURN_FAILURE_REASON.MISSING_DEVICE]: "Khách báo làm mất thiết bị",
  [RETURN_FAILURE_REASON.DAMAGED_DEVICE]: "Thiết bị hỏng hóc",
  [RETURN_FAILURE_REASON.OTHER]: "Lý do khác",
  [RETURN_FAILURE_REASON.CUSTOMER_NO_SHOW]: "Khách không có mặt",
  [RETURN_FAILURE_REASON.CUSTOMER_REJECT_RETURN]: "Khách từ chối trả",
  [RETURN_FAILURE_REASON.CONTACT_FAILED]: "Không liên hệ được khách",
  [RETURN_FAILURE_REASON.LOCATION_BLOCKED]: "Không thể tiếp cận điểm thu hồi",
  [RETURN_FAILURE_REASON.ORDER_CLOSED_ELSEWHERE]: "Đơn đã đóng ở nhánh khác",
};

/** Thẻ shop gửi khách: đầy đủ nội dung đề xuất. */
function buildCompensationProposalChatPayload(proposalDto, issueId, rentalId) {
  if (!proposalDto) return null;
  const rid = rentalId != null ? String(rentalId) : null;
  const iid = issueId != null ? String(issueId) : null;
  return {
    cardVariant: "PROPOSAL",
    title: "Đề xuất bồi thường sự cố thiết bị",
    issueId: iid,
    proposalId: proposalDto._id || null,
    rentalId: rid,
    amount: Number(proposalDto.amount || 0),
    currency: proposalDto.currency || "VND",
    reason: proposalDto.reason || "",
    explanation: proposalDto.explanation || "",
    suggestedResolution: proposalDto.suggestedResolution || "",
    images: Array.isArray(proposalDto.images) ? proposalDto.images : [],
    customerDecision: proposalDto.customerDecision || "PENDING",
    supplierDecision: proposalDto.supplierDecision || "PENDING",
    adminDecision: proposalDto.adminDecision || "PENDING",
    flowStatus: proposalDto.flowStatus || "PROPOSED",
    directGearXpertReview: Boolean(proposalDto.directGearXpertReview),
    origin: proposalDto.origin || "SUPPLIER",
    customerLink: rid ? `/my-rentals/${rid}` : "/my-rentals",
    supplierLink: iid ? `/supplier/issues/${iid}` : "/supplier/issues",
    link: rid ? `/my-rentals/${rid}` : "/my-rentals",
  };
}

/** Thẻ khách xác nhận/từ chối: layout riêng, không trùng thẻ đề xuất. */
function buildCustomerDecisionChatPayload(proposalDto, issueId, rentalId, decision) {
  if (!proposalDto) return null;
  const rid = rentalId != null ? String(rentalId) : null;
  const iid = issueId != null ? String(issueId) : null;
  const dec = decision === "REJECTED" ? "REJECTED" : "ACCEPTED";
  return {
    cardVariant: "CUSTOMER_DECISION",
    decision: dec,
    issueId: iid,
    rentalId: rid,
    proposalId: proposalDto._id || null,
    amount: Number(proposalDto.amount || 0),
    currency: proposalDto.currency || "VND",
    flowStatus: proposalDto.flowStatus || "PROPOSED",
    customerDecisionNote: String(proposalDto.customerDecisionNote || "").trim() || undefined,
    customerLink: rid ? `/my-rentals/${rid}` : "/my-rentals",
    supplierLink: iid ? `/supplier/issues/${iid}` : "/supplier/issues",
    link: iid ? `/supplier/issues/${iid}` : "/my-rentals",
  };
}

/**
 * Khách chốt đề xuất → 1 thẻ compensation_proposal gửi tới supplier (cùng pipeline MessageController).
 */
async function sendCustomerCompensationProposalCardToSupplier(req, params) {
  const { customerId, supplierId, issueId, rentalId, proposalDto, decision } = params;
  if (!supplierId || !customerId || !proposalDto) return;
  const payload = buildCustomerDecisionChatPayload(proposalDto, issueId, rentalId, decision);
  if (!payload) return;
  const text =
    decision === "ACCEPTED"
      ? "Khách hàng đã xác nhận đề xuất bồi thường."
      : "Khách hàng đã từ chối đề xuất bồi thường.";
  const firstImgRaw =
    Array.isArray(proposalDto.images) && proposalDto.images[0] ? proposalDto.images[0] : "";
  const firstImg = typeof firstImgRaw === "string" ? firstImgRaw : String(firstImgRaw || "");
  try {
    await sendCompensationProposalChatMessage(req, {
      senderId: customerId,
      receiverId: supplierId,
      text,
      image: firstImg,
      payload,
    });
  } catch (emitErr) {
    console.error("sendCustomerCompensationProposalCardToSupplier:", emitErr);
  }
}

async function attachLatestCompensationProposal({ deliveryIssues = [], damageReports = [] }) {
  const toObjectIdList = (items = []) =>
    items
      .map((item) => item?._id)
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .map((id) => new mongoose.Types.ObjectId(id));

  const deliveryIds = toObjectIdList(deliveryIssues);
  const damageIds = toObjectIdList(damageReports);

  const orConditions = [];
  if (deliveryIds.length) {
    orConditions.push({
      referenceModel: "DeliveryIssueReport",
      referenceId: { $in: deliveryIds },
    });
  }
  if (damageIds.length) {
    orConditions.push({
      referenceModel: "DamageReport",
      referenceId: { $in: damageIds },
    });
  }

  const proposalMap = new Map();
  if (orConditions.length) {
    const latestProposals = await CompensationProposal.aggregate([
      { $match: { $or: orConditions } },
      { $sort: { submittedAt: -1, createdAt: -1 } },
      {
        $group: {
          _id: {
            referenceModel: "$referenceModel",
            referenceId: "$referenceId",
          },
          proposal: { $first: "$$ROOT" },
        },
      },
    ]);

    latestProposals.forEach((entry) => {
      const model = entry?._id?.referenceModel;
      const referenceId = entry?._id?.referenceId;
      if (!model || !referenceId) return;
      proposalMap.set(`${model}:${String(referenceId)}`, toCompensationProposalDto(entry.proposal));
    });

    if (proposalMap.size > 0) {
      const handlerIds = [
        ...new Set(
          [...proposalMap.values()]
            .map((dto) => dto.handledByAdminId)
            .filter(Boolean)
            .map((id) => String(id))
        ),
      ];
      if (handlerIds.length) {
        try {
          const handlers = await User.find({
            _id: { $in: handlerIds.map((id) => new mongoose.Types.ObjectId(id)) },
          })
            .select("fullName email")
            .lean();
          const hMap = new Map(handlers.map((h) => [String(h._id), h]));
          proposalMap.forEach((dto) => {
            const hid = dto.handledByAdminId ? String(dto.handledByAdminId) : "";
            if (!hid) return;
            const u = hMap.get(hid);
            if (u) dto.handledByAdmin = { fullName: u.fullName || "", email: u.email || "" };
          });
        } catch (e) {
          console.error("attachLatestCompensationProposal handler enrich:", e);
        }
      }
    }
  }

  const mapIssues = (items = [], modelName) =>
    items.map((item) => {
      const fromNewModel = proposalMap.get(`${modelName}:${String(item?._id)}`);
      if (fromNewModel) {
        return { ...item, compensationProposal: fromNewModel };
      }

      // Backward compatibility: keep rendering embedded legacy shape when it exists.
      if (item?.compensationProposal?.submittedAt) {
        return item;
      }

      return { ...item, compensationProposal: null };
    });

  return {
    deliveryIssues: mapIssues(deliveryIssues, "DeliveryIssueReport"),
    damageReports: mapIssues(damageReports, "DamageReport"),
  };
}

exports.createDeliveryIssue = async (req, res) => {
  try {
    const customerId = req.user?.id;
    if (!customerId) {
      return res
        .status(401)
        .json({ message: "Không tìm thấy thông tin người dùng" });
    }

    const {
      rentalId,
      rentalItemIds: rentalItemIdsRaw, // mảng RentalItem _id
      deviceItemIds = [], // mảng serial (DeviceItem _id)
      issueType,
      description,
    } = req.body;

    // Normalize rentalItemIds - có thể là string hoặc array từ FormData
    let rentalItemIds = rentalItemIdsRaw;
    if (typeof rentalItemIdsRaw === 'string') {
      rentalItemIds = [rentalItemIdsRaw];
    } else if (!Array.isArray(rentalItemIdsRaw)) {
      rentalItemIds = [];
    }

    // Validate rentalItemIds
    if (
      !rentalItemIds ||
      !Array.isArray(rentalItemIds) ||
      rentalItemIds.length === 0
    ) {
      return res
        .status(400)
        .json({ message: "Vui lòng chọn ít nhất một sản phẩm" });
    }

    if (!description?.trim()) {
      return res
        .status(400)
        .json({ message: "Vui lòng cung cấp mô tả chi tiết" });
    }

    // Tìm Rental
    const rental = await Rental.findById(rentalId);
    if (!rental)
      return res.status(404).json({ message: "Không tìm thấy đơn thuê" });

    if (rental.customerId.toString() !== customerId) {
      return res
        .status(403)
        .json({ message: "Bạn không phải chủ đơn hàng này" });
    }

    // Kiểm tra báo cáo trùng lặp - đã có báo cáo giao hàng đang xử lý cho đơn này chưa
    const DeliveryIssueReport = require("../../models/DeliveryIssueReport");
    const existingReport = await DeliveryIssueReport.findOne({
      rentalId,
      status: { $in: ["OPEN", "PROCESSING", "WAITING_EVIDENCE"] }
    });
    if (existingReport) {
      return res.status(400).json({
        message: "Đã có báo cáo giao hàng đang được xử lý cho đơn này. Vui lòng chờ kết quả xử lý trước khi báo cáo mới.",
        existingReportId: existingReport._id
      });
    }

    // Tìm các RentalItem được chọn
    const selectedItems = await RentalItem.find({
      _id: { $in: rentalItemIds },
      rentalId,
    }).lean();

    if (selectedItems.length !== rentalItemIds.length) {
      return res
        .status(400)
        .json({
          message: "Một số sản phẩm không tồn tại hoặc không thuộc đơn",
        });
    }

    // Validate deviceItemIds nếu có
    // Đảm bảo deviceItemIds luôn là array (có thể nhận string từ FormData)
    let normalizedDeviceItemIds = deviceItemIds;
    if (typeof deviceItemIds === 'string') {
      normalizedDeviceItemIds = [deviceItemIds];
    } else if (!Array.isArray(deviceItemIds)) {
      normalizedDeviceItemIds = [];
    }

    if (normalizedDeviceItemIds.length > 0) {
      const itemMap = {};
      selectedItems.forEach((item) => {
        itemMap[item._id.toString()] = (item.deviceItemIds || []).map((id) =>
          id.toString()
        );
      });

      for (let i = 0; i < normalizedDeviceItemIds.length; i++) {
        const devId = normalizedDeviceItemIds[i].toString();
        // Map theo index (giả sử frontend gửi theo thứ tự tương ứng)
        const rentalItemId = rentalItemIds[i % rentalItemIds.length].toString();
        const validIds = itemMap[rentalItemId] || [];

        if (!validIds.includes(devId)) {
          return res.status(400).json({
            message: `Serial ${devId} không thuộc RentalItem ${rentalItemId}`,
          });
        }
      }
    }

    // Xử lý ảnh
    const images = req.files?.map((file) => file.path) || [];

    // Tạo report
    const report = await DeliveryIssueReport.create({
      rentalId,
      rentalItemIds,
      deviceItemIds: normalizedDeviceItemIds.length > 0 ? normalizedDeviceItemIds : undefined,
      deviceIds: selectedItems.map((item) => item.deviceId),
      customerId,
      reportedBy: "CUSTOMER",
      issueType,
      description: description.trim(),
      images,
      status: "OPEN",
      reportContext: "DELIVERY",
    });

    // Notification cho supplier (SỬA Ở ĐÂY)
    try {
      let supplierId = rental.supplierId?.toString();
      if (!supplierId) {
        // Fallback: lấy từ RentalItem đầu tiên → Device → supplierId
        const firstItem = await RentalItem.findOne({
          rentalId: rental._id,
        }).populate("deviceId", "supplierId");
        supplierId = firstItem?.deviceId?.supplierId?.toString();
      }

      if (supplierId) {
        await NotificationConfig.sendNotification({
          senderId: customerId,
          receiverId: supplierId,
          title: "Khách hàng báo cáo vấn đề giao hàng",
          message: `Có khiếu nại giao hàng trên đơn #${rental._id
            .toString()
            .slice(-6)}. Vui lòng kiểm tra.`,
          link: "/delivery-issues",
          type: "DELIVERY_ISSUE",
        });
      } else {
        console.warn(
          `[Notification] Không tìm thấy supplierId cho rental ${rental._id}`
        );
      }
    } catch (notifyErr) {
      console.error("Lỗi gửi notification khi tạo delivery issue:", notifyErr);
      // Không throw → vẫn trả success
    }

    res.status(201).json({
      message: "Báo cáo vấn đề giao hàng thành công",
      data: report,
    });
  } catch (err) {
    console.error("Create Delivery Issue Error:", err);
    res.status(500).json({ message: err.message || "Gửi báo cáo thất bại" });
  }
};

exports.getDeliveryIssueByRental = async (req, res) => {
  const reports = await DeliveryIssueReport.find({
    rentalId: req.params.rentalId,
  }).populate("deviceId");
  res.json(reports);
};

// ── Staff báo cáo sự cố lúc giao hàng ──────────────────────────────────────
exports.createStaffDeliveryIssue = async (req, res) => {
  try {
    const { rentalId, issueType, description } = req.body;
    const staffId = req.user.id;

    const rental = await Rental.findById(rentalId);
    if (!rental)
      return res.status(404).json({ message: "Không tìm thấy đơn thuê" });

    const items = await RentalItem.find({ rentalId });
    const rentalItemIds = items.map((i) => i._id);
    const deviceIds = items.map((i) => i.deviceId);

    const images = req.files?.map((file) => file.path) || [];

    const report = await DeliveryIssueReport.create({
      rentalId,
      rentalItemIds,
      deviceIds,
      deviceItemIds: req.body.deviceItemIds || (req.body.deviceItemId ? [req.body.deviceItemId] : []),
      staffId,
      reportedBy: "STAFF",
      reportContext: "DELIVERY",
      issueType,
      description: description?.trim() || "",
      images,
    });

    // Chuyển trạng thái đơn sang INSPECTING
    rental.status = "INSPECTING";
    rental.inspectedContext = "DELIVERY";
    await rental.save();

    // Notification cho customer (nếu cần)
    try {
      if (rental.customerId) {
        await NotificationConfig.sendNotification({
          senderId: staffId,
          receiverId: rental.customerId.toString(),
          title: "Có sự cố giao hàng",
          message: `Đơn hàng của bạn đang được kiểm tra do phát hiện vấn đề trong quá trình giao.`,
          link: "/my-rentals",
          type: "DELIVERY_ISSUE",
        });
      }
    } catch (notifyErr) {
      console.error("Lỗi gửi notification staff delivery:", notifyErr);
    }

    try {
      let sid = rental.supplierId?.toString();
      if (!sid) {
        const firstItem = await RentalItem.findOne({ rentalId: rental._id }).populate(
          "deviceId",
          "supplierId"
        );
        sid = firstItem?.deviceId?.supplierId?.toString();
      }
      if (sid) {
        await NotificationConfig.sendNotification({
          senderId: staffId,
          receiverId: sid,
          title: "Biên bản sự cố giao hàng (vận hành)",
          message: `Đơn #${rental._id.toString().slice(-6)} có ghi nhận sự cố từ nhân viên vận hành. Vui lòng xem xét xử lý.`,
          link: "/supplier/issues?tab=DELIVERY",
          type: "STAFF_DELIVERY_ISSUE_SUPPLIER",
        });
      }
    } catch (notifySupplierErr) {
      console.error("Lỗi gửi notification supplier (staff delivery issue):", notifySupplierErr);
    }

    emitOperationStaffUpdate({
      action: "STAFF_DELIVERY_ISSUE",
      message: "Có biên bản sự cố giao hàng mới.",
      rentalId: String(rental._id),
      actorId: String(staffId),
    });

    res.status(201).json({
      message:
        "Biên bản sự cố đã được lưu. Đơn hàng chuyển sang trạng thái Kiểm tra.",
      data: report,
    });
  } catch (err) {
    console.error("Create Staff Delivery Issue Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Lấy tất cả sự cố do staff báo cáo (cho ReportsTab - Giao hàng)
exports.getStaffDeliveryIssues = async (req, res) => {
  try {
    const staffId = req.user.id;
    const HANDOVER_FAIL_REGEX = /^(Handover thất bại:|Đơn hàng không thành công vì lý do:)/i;
    const RETURN_FAIL_REGEX = /^Thu hồi thất bại:/i;
    const reports = await DeliveryIssueReport.find({
      staffId,
      reportedBy: "STAFF",
      description: { $not: RETURN_FAIL_REGEX },
      $or: [
        { reportContext: "DELIVERY" },
        { reportContext: { $exists: false } },
        // Backward compatibility: old handover-failed records were mistakenly stored as RETURN.
        { description: HANDOVER_FAIL_REGEX },
      ],
    })
      .populate({
        path: "rentalId",
        select: "customerId phoneNumber",
        populate: { path: "customerId", select: "fullName" },
      })
      .populate({ path: "deviceIds", select: "name images" })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ reports });
  } catch (err) {
    console.error("Get Staff Delivery Issues Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ── Staff báo cáo sự cố lúc THU HỒI ────────────────────────────────────────
exports.createStaffReturnIssue = async (req, res) => {
  try {
    const { rentalId, issueType, description } = req.body;
    const staffId = req.user.id;

    const rental = await Rental.findById(rentalId);
    if (!rental)
      return res.status(404).json({ message: "Không tìm thấy đơn thuê" });

    if (rental.status !== "RETURNING") {
      return res.status(400).json({
        message:
          "Chỉ có thể báo cáo sự cố khi đơn đang ở trạng thái Thu hồi (RETURNING)",
      });
    }

    const items = await RentalItem.find({ rentalId });
    const rentalItemIds = items.map((i) => i._id);
    const deviceIds = items.map((i) => i.deviceId);

    const files = Array.isArray(req.files)
      ? req.files
      : Object.values(req.files || {}).flat();
    const images = files.map((file) => file.path);

    const report = await DeliveryIssueReport.create({
      rentalId,
      rentalItemIds,
      deviceIds,
      deviceItemIds: req.body.deviceItemIds || (req.body.deviceItemId ? [req.body.deviceItemId] : []),
      staffId,
      reportedBy: "STAFF",
      reportContext: "RETURN",
      issueType,
      description: description?.trim() || "",
      images,
    });

    const returnDraft = await ensureDraftForReturn({
      rentalId,
      staffId,
      actorId: staffId,
    });

    await reportIssue({
      returnRecordId: returnDraft._id,
      issue: {
        reportId: report._id,
        issueType,
        detail: description?.trim() || "",
        evidenceUrls: images,
        operatorNote: description?.trim() || "",
        requiresDeepInspection: true,
      },
      inspection: {
        ...(returnDraft?.inspection || {}),
        actualReturnedAt: new Date(),
        requiresDeepInspection: true,
      },
      staffId,
      actorId: staffId,
    });

    // Chuyển trạng thái về INSPECTING
    rental.status = "INSPECTING";
    rental.inspectedContext = "RETURN";
    await rental.save();

    // Notification cho customer
    try {
      if (rental.customerId) {
        await NotificationConfig.sendNotification({
          senderId: staffId,
          receiverId: rental.customerId.toString(),
          title: "Có sự cố khi thu hồi thiết bị",
          message: `Đơn hàng của bạn đang được kiểm tra do phát hiện vấn đề trong quá trình thu hồi.`,
          link: "/my-rentals",
          type: "RETURN_ISSUE",
        });
      }
    } catch (notifyErr) {
      console.error("Lỗi gửi notification staff return:", notifyErr);
    }

    try {
      let sid = rental.supplierId?.toString();
      if (!sid) {
        const firstItem = await RentalItem.findOne({ rentalId: rental._id }).populate(
          "deviceId",
          "supplierId"
        );
        sid = firstItem?.deviceId?.supplierId?.toString();
      }
      if (sid) {
        await NotificationConfig.sendNotification({
          senderId: staffId,
          receiverId: sid,
          title: "Biên bản sự cố thu hồi (vận hành)",
          message: `Đơn #${rental._id.toString().slice(-6)} có ghi nhận sự cố từ nhân viên vận hành. Vui lòng xem xét xử lý.`,
          link: "/supplier/issues?tab=RETURN",
          type: "STAFF_RETURN_ISSUE_SUPPLIER",
        });
      }
    } catch (notifySupplierErr) {
      console.error("Lỗi gửi notification supplier (staff return issue):", notifySupplierErr);
    }

    emitOperationStaffUpdate({
      action: "STAFF_RETURN_ISSUE",
      message: "Có biên bản sự cố thu hồi mới.",
      rentalId: String(rental._id),
      actorId: String(staffId),
    });

    res.status(201).json({
      message:
        "Biên bản sự cố thu hồi đã được lưu. Đơn hàng chuyển sang trạng thái Kiểm tra.",
      data: report,
      returnRecordId: returnDraft._id,
    });
  } catch (err) {
    console.error("Create Staff Return Issue Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// Lấy tất cả sự cố thu hồi do staff báo cáo (cho ReportsTab - Thu hồi)
exports.getStaffReturnIssues = async (req, res) => {
  try {
    const staffId = req.user.id;
    const HANDOVER_FAIL_REGEX = /^(Handover thất bại:|Đơn hàng không thành công vì lý do:)/i;
    const RETURN_FAIL_REGEX = /^Thu hồi thất bại:/i;
    const reports = await DeliveryIssueReport.find({
      staffId,
      reportedBy: "STAFF",
      $or: [
        { reportContext: "RETURN" },
        // Backward compatibility: some return-failed logs were saved without RETURN context.
        { description: RETURN_FAIL_REGEX },
      ],
      // Exclude failed-handover records so they only appear in Delivery tab.
      description: { $not: HANDOVER_FAIL_REGEX },
    })
      .populate({
        path: "rentalId",
        select: "customerId phoneNumber",
        populate: { path: "customerId", select: "fullName" },
      })
      .populate({ path: "deviceIds", select: "name images" })
      .sort({ createdAt: -1 })
      .lean();

    // Fallback: include FAILED return records even if DeliveryIssueReport was not created.
    const failedReturnRecords = await ReturnRecord.find({
      operatorStaffId: staffId,
      status: "FAILED",
    })
      .populate({
        path: "rentalId",
        select: "customerId phoneNumber",
        populate: { path: "customerId", select: "fullName" },
      })
      .sort({ updatedAt: -1 })
      .lean();

    const existingKeys = new Set(
      reports
        .filter((r) => RETURN_FAIL_REGEX.test(r?.description || ""))
        .map((r) => `${String(r?.rentalId?._id || r?.rentalId)}|${r.description}`)
    );

    const fallbackReports = failedReturnRecords
      .map((record) => {
        const reasonLabel = RETURN_FAILURE_LABELS[record?.failure?.reason] || "Khác";
        const description = [
          `Thu hồi thất bại: ${reasonLabel}`,
          record?.failure?.detail || "",
          record?.failure?.operatorNote || "",
        ]
          .filter(Boolean)
          .join(" | ");

        const dedupeKey = `${String(record?.rentalId?._id || record?.rentalId)}|${description}`;
        if (existingKeys.has(dedupeKey)) {
          return null;
        }

        const snapshotItems =
          record?.inspection?.items?.length > 0
            ? record.inspection.items
            : record?.prefetchedSnapshot?.items || [];

        const syntheticDeviceIds = snapshotItems.slice(0, 3).map((item, idx) => ({
          _id: item?.deviceId || `${record._id}-device-${idx}`,
          name: item?.deviceName || "Thiết bị",
        }));

        return {
          _id: `return-failed-${record._id}`,
          rentalId: record.rentalId,
          deviceIds: syntheticDeviceIds,
          issueType: "OTHER",
          description,
          images: Array.isArray(record?.failure?.evidenceUrls) ? record.failure.evidenceUrls : [],
          status: "OPEN",
          createdAt: record?.finishedAt || record?.updatedAt || record?.createdAt,
          reportContext: "RETURN",
          reportedBy: "STAFF",
          source: "RETURN_RECORD",
        };
      })
      .filter(Boolean);

    const merged = [...reports, ...fallbackReports].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    res.json({ reports: merged });
  } catch (err) {
    console.error("Get Staff Return Issues Error:", err);
    res.status(500).json({ message: err.message });
  }
};

// ── Supplier xem tất cả sự cố liên quan đến đơn hàng của mình ──────────────
exports.getSupplierIssues = async (req, res) => {
  try {
    const supplierId = req.user.id;

    const rentals = await Rental.find({ supplierId }).select("_id").lean();
    const rentalIds = rentals.map((r) => r._id);

    if (rentalIds.length === 0) {
      return res.json({ deliveryIssues: [], damageReports: [] });
    }

    const RETURN_FAIL_REGEX = /^Thu hồi thất bại:/i;

    let deliveryIssues = await DeliveryIssueReport.find({
      rentalId: { $in: rentalIds },
    })
      .populate({
        path: "rentalId",
        select: "customerId phoneNumber status inspectedContext",
        populate: { path: "customerId", select: "fullName email phone image" },
      })
      .populate({
        path: "rentalItemIds",
        populate: { path: "deviceItemIds" }
      })
      .populate({ path: "staffId", select: "fullName" })
      .populate({ path: "deviceIds", select: "name images" })
      .populate({ path: "deviceItemIds" })
      .sort({ createdAt: -1 })
      .lean();

    // Fallback: đơn thu hồi FAILED chưa có bản ghi DeliveryIssueReport (đồng bộ với tab staff)
    const failedReturnRecords = await ReturnRecord.find({
      rentalId: { $in: rentalIds },
      status: "FAILED",
    })
      .populate({
        path: "rentalId",
        select: "customerId phoneNumber status inspectedContext",
        populate: { path: "customerId", select: "fullName email phone image" },
      })
      .sort({ updatedAt: -1 })
      .lean();

    const existingKeys = new Set(
      deliveryIssues
        .filter((r) => RETURN_FAIL_REGEX.test(r?.description || ""))
        .map((r) => `${String(r?.rentalId?._id || r?.rentalId)}|${r.description}`)
    );

    const fallbackReports = failedReturnRecords
      .map((record) => {
        const reasonLabel = RETURN_FAILURE_LABELS[record?.failure?.reason] || "Khác";
        const description = [
          `Thu hồi thất bại: ${reasonLabel}`,
          record?.failure?.detail || "",
          record?.failure?.operatorNote || "",
        ]
          .filter(Boolean)
          .join(" | ");

        const dedupeKey = `${String(record?.rentalId?._id || record?.rentalId)}|${description}`;
        if (existingKeys.has(dedupeKey)) {
          return null;
        }

        const snapshotItems =
          record?.inspection?.items?.length > 0
            ? record.inspection.items
            : record?.prefetchedSnapshot?.items || [];

        const syntheticDeviceIds = snapshotItems.slice(0, 3).map((item, idx) => ({
          _id: item?.deviceId || `${record._id}-device-${idx}`,
          name: item?.deviceName || "Thiết bị",
        }));

        return {
          _id: `return-failed-${record._id}`,
          rentalId: record.rentalId,
          deviceIds: syntheticDeviceIds,
          issueType: "OTHER",
          description,
          images: Array.isArray(record?.failure?.evidenceUrls) ? record.failure.evidenceUrls : [],
          status: "OPEN",
          createdAt: record?.finishedAt || record?.updatedAt || record?.createdAt,
          reportContext: "RETURN",
          reportedBy: "STAFF",
          source: "RETURN_RECORD",
        };
      })
      .filter(Boolean);

    deliveryIssues = [...deliveryIssues, ...fallbackReports].sort(
      (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    );

    let damageReports = await DamageReport.find({
      rentalId: { $in: rentalIds },
    })
      .populate({
        path: "rentalId",
        select: "customerId phoneNumber status",
        populate: { path: "customerId", select: "fullName email phone image" },
      })
      .populate({ path: "deviceId", select: "name images" })
      .populate({
        path: "rentalItemId",
        populate: { path: "deviceItemIds" }
      })
      .populate({ path: "deviceItemIds" })
      .sort({ createdAt: -1 })
      .lean();

    const issuesWithProposals = await attachLatestCompensationProposal({
      deliveryIssues,
      damageReports,
    });
    deliveryIssues = issuesWithProposals.deliveryIssues;
    damageReports = issuesWithProposals.damageReports;

    res.json({ deliveryIssues, damageReports });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * PATCH supplier issue status (delivery or damage report).
 * - PROCESSING: from OPEN — "Đánh dấu đang xử lý"
 * - RESOLVED: when rental is REJECTED — "Xác nhận" (supplier acknowledges; no further evidence needed)
 */
exports.supplierUpdateIssueStatus = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { issueId } = req.params;
    const { status: targetStatus } = req.body;

    if (String(issueId).startsWith("return-failed-")) {
      return res.status(400).json({
        message:
          "Không thể cập nhật bản ghi tổng hợp từ hệ thống. Liên hệ vận hành nếu cần.",
      });
    }

    if (!["PROCESSING", "RESOLVED"].includes(targetStatus)) {
      return res.status(400).json({
        message: "status phải là PROCESSING hoặc RESOLVED",
      });
    }

    let doc = await DeliveryIssueReport.findById(issueId);
    let modelName = "DeliveryIssueReport";
    if (!doc) {
      doc = await DamageReport.findById(issueId);
      modelName = "DamageReport";
    }
    if (!doc) {
      return res.status(404).json({ message: "Không tìm thấy báo cáo" });
    }

    const rental = await Rental.findById(doc.rentalId).select("supplierId status");
    if (!rental || rental.supplierId.toString() !== supplierId.toString()) {
      return res.status(403).json({ message: "Không có quyền cập nhật báo cáo này" });
    }

    const prev = doc.status;

    if (targetStatus === "PROCESSING") {
      if (doc.status !== "OPEN") {
        return res.status(400).json({
          message: "Chỉ có thể đánh dấu đang xử lý khi báo cáo đang ở trạng thái Mở (OPEN)",
        });
      }
      doc.status = "PROCESSING";
    } else if (targetStatus === "RESOLVED") {
      if (rental.status !== "REJECTED") {
        return res.status(400).json({
          message:
            "Chỉ dùng xác nhận kết thúc khi đơn thuê đã bị từ chối (REJECTED)",
        });
      }
      if (!["OPEN", "PROCESSING"].includes(doc.status)) {
        return res.status(400).json({
          message: "Không thể xác nhận với trạng thái báo cáo hiện tại",
        });
      }
      doc.status = "RESOLVED";
      if (!doc.resolutionNote && req.body.resolutionNote) {
        doc.resolutionNote = req.body.resolutionNote;
      }
      if (!doc.resolutionNote) {
        doc.resolutionNote = "NCC xác nhận đã nắm thông tin (đơn từ chối).";
      }
    }

    if (!doc.statusHistory) doc.statusHistory = [];
    doc.statusHistory.push({
      status: doc.status,
      changedBy: supplierId,
      note:
        targetStatus === "PROCESSING"
          ? "Supplier: đánh dấu đang xử lý"
          : "Supplier: xác nhận (đơn từ chối)",
      createdAt: new Date(),
    });

    await doc.save();

    const populated =
      modelName === "DeliveryIssueReport"
        ? await DeliveryIssueReport.findById(doc._id)
            .populate({
              path: "rentalId",
              select: "customerId phoneNumber status inspectedContext",
              populate: { path: "customerId", select: "fullName email phone image" },
            })
            .populate({ path: "staffId", select: "fullName" })
            .populate({ path: "deviceIds", select: "name images" })
            .lean()
        : await DamageReport.findById(doc._id)
            .populate({
              path: "rentalId",
              select: "customerId phoneNumber status",
              populate: { path: "customerId", select: "fullName email phone image" },
            })
            .populate({ path: "deviceId", select: "name images" })
            .lean();

    res.json({
      success: true,
      previousStatus: prev,
      issue: populated,
    });
  } catch (err) {
    console.error("supplierUpdateIssueStatus:", err);
    res.status(500).json({ message: err.message || "Lỗi server" });
  }
};

exports.supplierEscalateIssue = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { issueId } = req.params;
    const { note = "" } = req.body || {};
    const cleanNote = String(note || "").trim();

    if (String(issueId).startsWith("return-failed-")) {
      return res.status(400).json({
        message:
          "Không thể can thiệp bản ghi tổng hợp từ hệ thống. Vui lòng xử lý trên bản ghi sự cố gốc.",
      });
    }

    let doc = await DeliveryIssueReport.findById(issueId);
    let modelName = "DeliveryIssueReport";
    if (!doc) {
      doc = await DamageReport.findById(issueId);
      modelName = "DamageReport";
    }
    if (!doc) {
      return res.status(404).json({ message: "Không tìm thấy báo cáo" });
    }

    const rental = await Rental.findById(doc.rentalId).select("supplierId");
    if (!rental || String(rental.supplierId) !== String(supplierId)) {
      return res.status(403).json({ message: "Không có quyền cập nhật báo cáo này" });
    }

    if (doc.status === "AWAITING_ADMIN_GX") {
      return res.status(400).json({
        message: "Báo cáo đã ở trạng thái chờ Admin GearXpert xử lý.",
      });
    }

    if (!["OPEN", "PROCESSING", "WAITING_EVIDENCE"].includes(doc.status)) {
      return res.status(400).json({
        message: "Không thể nhờ can thiệp với trạng thái báo cáo hiện tại",
      });
    }

    const prevStatus = doc.status;
    if (!doc.statusHistory) doc.statusHistory = [];
    doc.statusHistory.push({
      status: prevStatus,
      changedBy: supplierId,
      note: cleanNote
        ? `Supplier nhờ GearXpert can thiệp: ${cleanNote}`
        : "Supplier nhờ GearXpert can thiệp — chuyển chờ Admin GearXpert",
      createdAt: new Date(),
    });

    doc.status = "AWAITING_ADMIN_GX";

    await doc.save();

    const adminUsers = await User.find({ role: "ADMIN" }).select("_id");
    await Promise.all(
      adminUsers.map((adminUser) =>
        NotificationConfig.sendNotification({
          senderId: supplierId,
          receiverId: adminUser._id,
          title: "Supplier nhờ GearXpert can thiệp",
          message: `Case #${String(doc._id).slice(-6)} cần admin hỗ trợ xử lý.`,
          link: `/admin/reports/issues/${doc._id}`,
          type: "DELIVERY_ISSUE",
        })
      )
    );

    return res.json({
      success: true,
      message: "Đã gửi yêu cầu can thiệp tới GearXpert",
      issueId: doc._id,
      issueType: modelName,
    });
  } catch (err) {
    console.error("supplierEscalateIssue:", err);
    return res.status(500).json({ message: err.message || "Lỗi server" });
  }
};

/**
 * Supplier: chấp nhận mức hư hỏng, không bồi thường — đóng sự cố, chỉ thông báo khách + admin.
 */
exports.supplierCloseIssueNoCompensation = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { issueId } = req.params;
    const { note = "" } = req.body || {};
    const cleanNote = String(note || "").trim().slice(0, 500);

    if (String(issueId).startsWith("return-failed-")) {
      return res.status(400).json({
        message:
          "Không thể cập nhật bản ghi tổng hợp từ hệ thống. Vui lòng xử lý trên bản ghi sự cố gốc.",
      });
    }

    let doc = await DeliveryIssueReport.findById(issueId);
    let modelName = "DeliveryIssueReport";
    if (!doc) {
      doc = await DamageReport.findById(issueId);
      modelName = "DamageReport";
    }
    if (!doc) {
      return res.status(404).json({ message: "Không tìm thấy báo cáo" });
    }

    const rental = await Rental.findById(doc.rentalId).select("supplierId customerId");
    if (!rental || String(rental.supplierId) !== String(supplierId)) {
      return res.status(403).json({ message: "Không có quyền cập nhật báo cáo này" });
    }

    const canClose = ["OPEN", "PROCESSING", "WAITING_EVIDENCE", "AWAITING_ADMIN_GX"].includes(
      doc.status
    );
    if (!canClose) {
      return res.status(400).json({
        message: "Sự cố đã kết thúc hoặc không thể đóng ở trạng thái hiện tại",
      });
    }

    const terminalProposal = new Set([
      "ADMIN_APPROVED",
      "ADMIN_REJECTED",
      "CUSTOMER_REJECTED",
      "SUPPLIER_REJECTED",
    ]);
    const existingProposal = await CompensationProposal.findOne({
      referenceId: doc._id,
      referenceModel: modelName,
    });
    if (existingProposal && !terminalProposal.has(existingProposal.flowStatus)) {
      return res.status(400).json({
        message:
          "Đang có đề xuất bồi thường chưa kết thúc. Hãy xử lý xong đề xuất trước khi đóng sự cố theo cách này.",
      });
    }

    const defaultRes = "NCC chấp nhận mức thiệt hại, không bồi thường — đóng sự cố.";
    doc.status = "RESOLVED";
    doc.resolutionNote = cleanNote || defaultRes;
    if (!doc.statusHistory) doc.statusHistory = [];
    doc.statusHistory.push({
      status: "RESOLVED",
      changedBy: supplierId,
      note: cleanNote
        ? `Đóng sự cố, không bồi thường: ${cleanNote}`
        : "Đóng sự cố, không bồi thường (NCC tự chấp nhận mức hư hỏng)",
      createdAt: new Date(),
    });
    await doc.save();

    const customerId = rental.customerId;
    if (customerId) {
      try {
        await NotificationConfig.sendNotification({
          senderId: supplierId,
          receiverId: customerId,
          title: "Shop ghi nhận sự cố (không bồi thường)",
          message: `Nhà cung cấp chấp nhận mức hư hỏng theo hồ sơ, không yêu cầu bồi thường. Sự cố #${String(
            doc._id
          ).slice(-6)} đã đóng.`,
          link: "/my-rentals",
          type: "DELIVERY_ISSUE",
        });
      } catch (notifyErr) {
        console.error("supplierCloseIssueNoCompensation (customer):", notifyErr);
      }
    }

    const adminUsers = await User.find({ role: "ADMIN" }).select("_id");
    await Promise.all(
      adminUsers.map((adminUser) =>
        NotificationConfig.sendNotification({
          senderId: supplierId,
          receiverId: adminUser._id,
          title: "NCC đóng sự cố, không bồi thường",
          message: `Case #${String(doc._id).slice(-6)}: nhà cung cấp tự chấp nhận mức hư hỏng, đã đóng sự cố (chỉ thông tin).`,
          link: `/admin/reports/issues/${doc._id}`,
          type: "DELIVERY_ISSUE",
        })
      )
    );

    const populated =
      modelName === "DeliveryIssueReport"
        ? await DeliveryIssueReport.findById(doc._id)
            .populate({
              path: "rentalId",
              select: "customerId phoneNumber status inspectedContext",
              populate: { path: "customerId", select: "fullName email phone image" },
            })
            .populate({ path: "staffId", select: "fullName" })
            .populate({ path: "deviceIds", select: "name images" })
            .lean()
        : await DamageReport.findById(doc._id)
            .populate({
              path: "rentalId",
              select: "customerId phoneNumber status",
              populate: { path: "customerId", select: "fullName email phone image" },
            })
            .populate({ path: "deviceId", select: "name images" })
            .lean();

    return res.json({
      success: true,
      message: "Đã đóng sự cố. Khách hàng và admin đã nhận thông báo.",
      issue: populated,
    });
  } catch (err) {
    console.error("supplierCloseIssueNoCompensation:", err);
    return res.status(500).json({ message: err.message || "Lỗi server" });
  }
};

exports.supplierCancelAndRefund = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const supplierId = req.user.id;
    const { issueId } = req.params;

    const doc = await DeliveryIssueReport.findById(issueId).session(session);
    if (!doc || doc.reportedBy !== "STAFF") {
      throw new Error("Chỉ xử lý cho sự cố giao hàng do nhân viên báo cáo");
    }

    const rental = await Rental.findById(doc.rentalId).session(session);
    if (!rental || rental.supplierId.toString() !== supplierId.toString()) {
      throw new Error("Không có quyền cập nhật báo cáo này");
    }

    if (!["OPEN", "PROCESSING", "WAITING_EVIDENCE", "AWAITING_ADMIN_GX"].includes(doc.status)) {
      throw new Error("Không thể hủy đơn với trạng thái báo cáo hiện tại");
    }

    // Process refund
    const refundAmount = rental.totalAmount || 0;
    if (rental.paymentStatus === "PAID" && refundAmount > 0) {
      const customerWallet = await Wallet.findOne({ user: rental.customerId }).session(session);
      if (customerWallet) {
        const balanceBefore = customerWallet.balance;
        customerWallet.balance += refundAmount;
        await customerWallet.save({ session });

        await WalletTransaction.create([{
          wallet: customerWallet._id,
          amount: refundAmount,
          type: "REFUND",
          status: "SUCCESS",
          balanceBefore,
          balanceAfter: customerWallet.balance,
          description: `Hoàn tiền do sự cố giao hàng thất bại (Đơn ${doc.rentalId.toString().slice(-6)})`
        }], { session });
      }
    }

    // Update Rental Status
    rental.status = "CANCELLED";
    rental.cancelReason = "Sự cố giao hàng thất bại - NCC hủy đơn";
    await rental.save({ session });

    // Prevent duplicate tasks
    await DeliveryTask.updateMany(
      { rentalId: rental._id, status: { $in: ["PENDING", "ASSIGNED", "IN_TRANSIT"] } },
      { status: "FAILED" },
      { session }
    );

    // Update Issue
    doc.status = "RESOLVED";
    doc.resolutionNote = "NCC đã hủy đơn và hoàn tiền cho khách hàng";
    if (!doc.statusHistory) doc.statusHistory = [];
    doc.statusHistory.push({
      status: "RESOLVED",
      changedBy: supplierId,
      note: doc.resolutionNote,
      createdAt: new Date(),
    });
    await doc.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.json({ success: true, message: "Đã hủy đơn và lên lệnh hoàn tiền", issue: doc });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("supplierCancelAndRefund error:", err);
    res.status(500).json({ message: err.message || "Lỗi khi hủy đơn" });
  }
};

exports.supplierAdditionalDelivery = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const supplierId = req.user.id;
    const { issueId } = req.params;
    const { notes } = req.body;

    let images = [];
    if (req.files && req.files.length > 0) {
      images = req.files.map((file) => file.path);
    }

    const doc = await DeliveryIssueReport.findById(issueId).session(session);
    if (!doc || doc.reportedBy !== "STAFF") {
      throw new Error("Chỉ xử lý cho sự cố giao hàng do nhân viên báo cáo");
    }

    const rental = await Rental.findById(doc.rentalId).session(session);
    if (!rental || rental.supplierId.toString() !== supplierId.toString()) {
      throw new Error("Không có quyền cập nhật báo cáo này");
    }

    if (!["OPEN", "PROCESSING", "WAITING_EVIDENCE", "AWAITING_ADMIN_GX"].includes(doc.status)) {
      throw new Error("Không thể tạo giao bổ sung với trạng thái báo cáo hiện tại");
    }

    // Fetch existing recent Delivery Tasks to assign missing devices
    // Or just create a new DELIVERY task for all missing items (if tracked) or all devices.
    // For simplicity, create a generic Delivery task for the same rental
    const existingStaffId = rental.assignedOperationStaffId;
    
    // Đảm bảo update trạng thái Rental về PENDING_RESOLUTION thay vì DELIVERING 
    // vì đơn đang gặp "sự cố" phải để PENDING_RESOLUTION để getDeliveringRentals() load
    if (rental.status !== "PENDING_RESOLUTION") {
      rental.status = "PENDING_RESOLUTION";
      await rental.save({ session });
    }

    const newTask = await DeliveryTask.create([{
      rentalId: rental._id,
      type: "DELIVERY",
      status: "PENDING",
      deliveryStaffId: existingStaffId || null,
      isAdditional: true,
      issueNotes: notes || "",
      issueImages: images || [],
    }], { session });

    // Update Issue
    doc.status = "RESOLVED";
    doc.resolutionNote = "NCC xác nhận giao bổ sung cho khách hàng: " + (notes || "");
    if (!doc.statusHistory) doc.statusHistory = [];
    doc.statusHistory.push({
      status: "RESOLVED",
      changedBy: supplierId,
      note: doc.resolutionNote,
      createdAt: new Date(),
    });
    await doc.save({ session });

    await session.commitTransaction();
    session.endSession();

    if (existingStaffId) {
      emitOperationStaffUpdate({
        actorId: supplierId,
        message: `Đơn ${rental._id.toString().slice(-6)} có cập nhật giao bổ sung!`,
      });
    }

    res.json({ success: true, message: "Đã tạo chuyến giao hàng bổ sung", issue: doc, task: newTask });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error("supplierAdditionalDelivery error:", err);
    res.status(500).json({ message: err.message || "Lỗi tạo giao bổ sung" });
  }
};

exports.supplierSubmitCompensationProposal = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { issueId } = req.params;

    if (String(issueId).startsWith("return-failed-")) {
      return res.status(400).json({
        message:
          "Không thể gửi đề xuất cho bản ghi tổng hợp. Vui lòng xử lý trên bản ghi sự cố gốc.",
      });
    }

    let doc = await DeliveryIssueReport.findById(issueId);
    let modelName = "DeliveryIssueReport";
    if (!doc) {
      doc = await DamageReport.findById(issueId);
      modelName = "DamageReport";
    }
    if (!doc) {
      return res.status(404).json({ message: "Không tìm thấy báo cáo" });
    }

    const rental = await Rental.findById(doc.rentalId).select("supplierId customerId");
    if (!rental || String(rental.supplierId) !== String(supplierId)) {
      return res.status(403).json({ message: "Không có quyền gửi đề xuất cho báo cáo này" });
    }

    if (doc.status === "AWAITING_ADMIN_GX") {
      return res.status(400).json({
        message:
          "Sự cố đang chờ Admin GearXpert xử lý. Không gửi thêm đề xuất NCC cho đến khi luồng hiện tại kết thúc hoặc admin đưa ra phương án.",
      });
    }

    const {
      amount,
      reason,
      explanation,
      suggestedResolution,
      forwardedMessagePreview,
      forwardedToCustomer,
      directGearXpertReview,
    } = req.body || {};

    const cleanAmount = Number(amount ?? 0);
    const cleanReason = String(reason || "").trim();
    const cleanExplanation = String(explanation || "").trim();
    const cleanResolution = String(suggestedResolution || "").trim();
    const cleanForwardMessage = String(forwardedMessagePreview || "").trim();
    const shouldMarkForwarded =
      forwardedToCustomer === true || forwardedToCustomer === "true";

    const isDirectGx =
      directGearXpertReview === true ||
      directGearXpertReview === "true" ||
      String(directGearXpertReview || "").toLowerCase() === "yes";

    if (!Number.isFinite(cleanAmount) || cleanAmount < 0) {
      return res.status(400).json({ message: "Số tiền bồi thường không hợp lệ" });
    }
    if (!cleanReason) {
      return res.status(400).json({ message: "Vui lòng nhập lý do đề xuất bồi thường" });
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

    const terminalProposal = new Set([
      "ADMIN_APPROVED",
      "ADMIN_REJECTED",
      "CUSTOMER_REJECTED",
      "SUPPLIER_REJECTED",
    ]);
    const existingOpen = await CompensationProposal.findOne({
      referenceModel: modelName,
      referenceId: doc._id,
    }).sort({ submittedAt: -1, createdAt: -1 });
    if (existingOpen && !terminalProposal.has(existingOpen.flowStatus)) {
      return res.status(409).json({
        message:
          "Đang có đề xuất bồi thường chưa kết thúc. Hoàn tất hoặc hủy luồng hiện tại trước khi gửi đề xuất mới.",
      });
    }

    const uploadedImages = Array.isArray(req.files)
      ? req.files.map((file) => file?.path).filter(Boolean)
      : [];

    const submittedAtNow = new Date();
    let proposalDataBase = {
      referenceModel: modelName,
      referenceId: doc._id,
      rentalId: doc.rentalId,
      supplierId,
      customerId: rental.customerId || undefined,
      proposedBy: supplierId,
      origin: "SUPPLIER",
      amount: cleanAmount,
      currency: "VND",
      reason: cleanReason,
      explanation: cleanExplanation,
      suggestedResolution: cleanResolution,
      images: uploadedImages,
      submittedAt: submittedAtNow,
      forwardedToCustomerAt:
        shouldMarkForwarded && !isDirectGx ? submittedAtNow : undefined,
      forwardedMessagePreview:
        shouldMarkForwarded && !isDirectGx ? cleanForwardMessage || undefined : undefined,
      supplierDecision: "ACCEPTED",
      supplierDecidedAt: submittedAtNow,
      supplierDecidedBy: supplierId,
      adminDecision: "PENDING",
      directGearXpertReview: isDirectGx,
    };

    let proposalTail;
    if (isDirectGx) {
      proposalTail = {
        flowStatus: "PENDING_ADMIN_REVIEW",
        customerDecision: "ACCEPTED",
        customerDecidedAt: submittedAtNow,
        customerDecisionNote:
          "Luồng nộp thẳng GearXpert: chờ GX xét và quyết định cuối theo đề xuất NCC (không chờ khách nhấn xác nhận trước trên luồng thường).",
      };
    } else {
      proposalTail = {
        flowStatus: "PROPOSED",
        customerDecision: "PENDING",
      };
    }

    const proposalData = { ...proposalDataBase, ...proposalTail };

    if (!doc.statusHistory) doc.statusHistory = [];
    doc.statusHistory.push({
      status: doc.status,
      changedBy: supplierId,
      note: isDirectGx
        ? `Supplier nộp đề xuất bồi — chuyển thẳng GearXpert duyệt (${cleanResolution})`
        : `Supplier gửi đề xuất bồi thường (${cleanResolution})`,
      createdAt: new Date(),
    });

    if (doc.status === "OPEN") {
      doc.status = "PROCESSING";
    }

    const createdProposal = await CompensationProposal.create(proposalData);
    await doc.save();

    const populated =
      modelName === "DeliveryIssueReport"
        ? await DeliveryIssueReport.findById(doc._id)
            .populate({
              path: "rentalId",
              select: "customerId phoneNumber status inspectedContext",
              populate: { path: "customerId", select: "fullName email phone image" },
            })
            .populate({ path: "staffId", select: "fullName" })
            .populate({ path: "deviceIds", select: "name images" })
            .lean()
        : await DamageReport.findById(doc._id)
            .populate({
              path: "rentalId",
              select: "customerId phoneNumber status",
              populate: { path: "customerId", select: "fullName email phone image" },
            })
            .populate({ path: "deviceId", select: "name images" })
            .lean();

    const proposalDto = toCompensationProposalDto(createdProposal.toObject());

    if (shouldMarkForwarded && rental.customerId && !isDirectGx) {
      try {
        const payload = buildCompensationProposalChatPayload(proposalDto, doc._id, doc.rentalId);
        if (payload) {
          const customerName =
            populated?.rentalId?.customerId?.fullName ||
            populated?.rentalId?.customerId?.username ||
            "bạn";
          const text = buildSupplierToCustomerProposalText({
            customerName,
            issueId: doc._id,
            rentalId: doc.rentalId,
            amount: proposalDto.amount,
            reason: proposalDto.reason,
            explanation: proposalDto.explanation,
            suggestedResolution: proposalDto.suggestedResolution,
          });
          const firstImg =
            Array.isArray(proposalDto.images) && proposalDto.images[0]
              ? String(proposalDto.images[0])
              : "";
          await sendCompensationProposalChatMessage(req, {
            senderId: supplierId,
            receiverId: rental.customerId,
            text,
            image: firstImg,
            payload,
          });
        }
      } catch (chatErr) {
        console.error("supplierSubmitCompensationProposal chat:", chatErr);
      }
    }

    if (isDirectGx) {
      try {
        const adminUsers = await User.find({ role: "ADMIN" }).select("_id");
        await Promise.all(
          adminUsers.map((adminUser) =>
            NotificationConfig.sendNotification({
              senderId: supplierId,
              receiverId: adminUser._id,
              title: "Đề xuất chờ GX duyệt (nộp thẳng)",
              message: `Case #${String(doc._id).slice(-6)}: NCC đã nộp thẳng — chờ admin xét và quyết định bồi thường.`,
              link: "/admin/compensation-proposals",
              type: "COMPENSATION_PROPOSAL_REVIEW",
            })
          )
        );
      } catch (e) {
        console.error("supplierSubmitCompensationProposal admin notify:", e);
      }
      if (rental.customerId) {
        try {
          await NotificationConfig.sendNotification({
            senderId: supplierId,
            receiverId: rental.customerId,
            title: "Hồ sơ chờ GearXpert xử lý",
            message: `Sự cố #${String(doc._id).slice(-6)}: shop đã chuyển hồ sơ chờ GX xét. Bạn sẽ được thông báo kết quả.`,
            link: "/my-rentals",
            type: "COMPENSATION_PROPOSAL",
          });
        } catch (e) {
          console.error("supplierSubmitCompensationProposal customer notify:", e);
        }
      }
    }

    return res.json({
      success: true,
      message: isDirectGx
        ? "Đã nộp đề xuất thẳng GearXpert — chờ admin duyệt và quyết định bồi thường"
        : "Đã lưu đề xuất bồi thường",
      issue: {
        ...populated,
        compensationProposal: proposalDto,
      },
    });
  } catch (err) {
    console.error("supplierSubmitCompensationProposal:", err);
    return res.status(500).json({ message: err.message || "Lỗi server" });
  }
};

exports.customerConfirmCompensationProposal = async (req, res) => {
  try {
    const userId = req.user.id;
    const { issueId } = req.params;
    const { decision = "ACCEPTED", note = "" } = req.body || {};
    const cleanDecision = String(decision || "ACCEPTED").trim();
    const cleanNote = String(note || "").trim();

    if (!["ACCEPTED", "REJECTED"].includes(cleanDecision)) {
      return res.status(400).json({
        message: "decision phải là ACCEPTED hoặc REJECTED",
      });
    }

    let issueDoc = await DeliveryIssueReport.findById(issueId).select("_id rentalId status statusHistory");
    let referenceModel = "DeliveryIssueReport";
    if (!issueDoc) {
      issueDoc = await DamageReport.findById(issueId).select("_id rentalId status statusHistory");
      referenceModel = "DamageReport";
    }
    if (!issueDoc) {
      return res.status(404).json({ message: "Không tìm thấy báo cáo sự cố" });
    }

    const rental = await Rental.findById(issueDoc.rentalId).select("customerId supplierId");
    if (!rental || String(rental.customerId) !== String(userId)) {
      return res.status(403).json({
        message: "Bạn không có quyền xác nhận đề xuất này",
      });
    }

    const proposal = await CompensationProposal.findOne({
      referenceModel,
      referenceId: issueDoc._id,
    }).sort({ submittedAt: -1, createdAt: -1 });

    if (!proposal) {
      return res.status(404).json({
        message: "Chưa có đề xuất bồi thường cho sự cố này",
      });
    }

    if (proposal.customerDecision === cleanDecision) {
      return res.json({
        success: true,
        noChange: true,
        message: "Đề xuất đã được xác nhận trước đó",
        proposal: toCompensationProposalDto(proposal.toObject()),
      });
    }

    const origin = proposal.origin || "SUPPLIER";
    const fs = proposal.flowStatus;
    if (
      ["PENDING_ADMIN_REVIEW", "PENDING_WALLET", "ADMIN_APPROVED", "ADMIN_REJECTED"].includes(fs)
    ) {
      return res.status(409).json({
        message: "Đề xuất đã qua giai đoạn xác nhận phía khách hàng.",
      });
    }
    if (fs === "CUSTOMER_REJECTED" || fs === "SUPPLIER_REJECTED") {
      return res.status(409).json({ message: "Đề xuất đã kết thúc ở nhánh từ chối." });
    }
    if (origin === "ADMIN_GX") {
      if (!["PENDING_PARTY_REVIEW", "SUPPLIER_ACCEPTED"].includes(fs)) {
        return res.status(409).json({
          message: "Chỉ xác nhận được đề xuất trung gian GearXpert khi đang chờ phản hồi hai bên.",
        });
      }
    } else if (fs !== "PROPOSED") {
      return res.status(409).json({
        message: "Không thể cập nhật xác nhận khách ở trạng thái luồng hiện tại.",
      });
    }

    if (
      fs === "CUSTOMER_ACCEPTED" &&
      proposal.customerDecision === "ACCEPTED" &&
      cleanDecision === "REJECTED"
    ) {
      return res.status(409).json({ message: "Không thể đổi quyết định sau khi đã chấp nhận." });
    }

    proposal.customerDecision = cleanDecision;
    proposal.customerDecidedAt = new Date();
    proposal.customerDecidedBy = userId;
    proposal.customerDecisionNote = cleanNote || undefined;

    let shouldAutoForwardToAdmin = false;
    if (cleanDecision === "ACCEPTED") {
      if (origin === "ADMIN_GX") {
        if (proposal.supplierDecision === "ACCEPTED") {
          shouldAutoForwardToAdmin = true;
          proposal.flowStatus = "PENDING_ADMIN_REVIEW";
          proposal.adminDecision = "PENDING";
        } else {
          proposal.flowStatus = "CUSTOMER_ACCEPTED";
        }
      } else {
        shouldAutoForwardToAdmin = proposal.supplierDecision === "ACCEPTED";
        proposal.flowStatus = shouldAutoForwardToAdmin
          ? "PENDING_ADMIN_REVIEW"
          : "CUSTOMER_ACCEPTED";
        if (shouldAutoForwardToAdmin) proposal.adminDecision = "PENDING";
      }
    } else {
      proposal.flowStatus = "CUSTOMER_REJECTED";
      proposal.adminDecision = "REJECTED";
      proposal.approvedCompensationAmount = 0;
    }
    await proposal.save();

    const prevIssueStatus = issueDoc.status;
    if (!issueDoc.statusHistory) issueDoc.statusHistory = [];
    issueDoc.statusHistory.push({
      status: prevIssueStatus,
      changedBy: userId,
      note:
        shouldAutoForwardToAdmin
          ? "Khách hàng đã xác nhận đề xuất bồi thường, hệ thống tự chuyển sang chờ admin duyệt"
          : cleanDecision === "ACCEPTED"
          ? "Khách hàng đã xác nhận đề xuất bồi thường"
          : "Khách hàng đã từ chối đề xuất bồi thường",
      createdAt: new Date(),
    });
    if (shouldAutoForwardToAdmin && issueDoc.status === "AWAITING_ADMIN_GX") {
      issueDoc.status = "PROCESSING";
    }
    await issueDoc.save();

    if (rental?.supplierId) {
      await NotificationConfig.sendNotification({
        senderId: userId,
        receiverId: rental.supplierId,
        title:
          cleanDecision === "ACCEPTED"
            ? "Khách hàng đã xác nhận đề xuất bồi thường"
            : "Khách hàng đã từ chối đề xuất bồi thường",
        message: `Case #${String(issueDoc._id).slice(-6)} vừa được khách hàng ${
          cleanDecision === "ACCEPTED" ? "xác nhận" : "từ chối"
        }.`,
        link: `/supplier/issues/${issueDoc._id}`,
        type: "COMPENSATION_PROPOSAL",
      });
    }

    if (shouldAutoForwardToAdmin) {
      const adminUsers = await User.find({ role: "ADMIN" }).select("_id");
      await Promise.all(
        adminUsers.map((adminUser) =>
          NotificationConfig.sendNotification({
            senderId: userId,
            receiverId: adminUser._id,
            title: "Có đề xuất bồi thường chờ duyệt",
            message: `Case #${String(issueDoc._id).slice(-6)} đã đủ xác nhận, chờ admin duyệt.`,
            link: `/admin/compensation-proposals`,
            type: "COMPENSATION_PROPOSAL_REVIEW",
          })
        )
      );
    }

    try {
      if (rental?.supplierId) {
        await sendCustomerCompensationProposalCardToSupplier(req, {
          customerId: userId,
          supplierId: rental.supplierId,
          issueId: issueDoc._id,
          rentalId: issueDoc.rentalId,
          proposalDto: toCompensationProposalDto(proposal.toObject()),
          decision: cleanDecision,
        });
      }
    } catch (chatErr) {
      console.error("customerConfirmCompensationProposal chat card:", chatErr);
    }

    return res.json({
      success: true,
      message:
        shouldAutoForwardToAdmin
          ? "Đã xác nhận đề xuất bồi thường và chuyển admin duyệt"
          : cleanDecision === "ACCEPTED"
          ? "Đã xác nhận đề xuất bồi thường"
          : "Đã từ chối đề xuất bồi thường",
      proposal: toCompensationProposalDto(proposal.toObject()),
    });
  } catch (err) {
    console.error("customerConfirmCompensationProposal:", err);
    return res.status(500).json({ message: err.message || "Lỗi server" });
  }
};

exports.supplierConfirmCompensationProposal = async (req, res) => {
  try {
    const supplierId = req.user.id;
    const { issueId } = req.params;
    const { decision = "ACCEPTED", note = "" } = req.body || {};
    const cleanDecision = String(decision || "ACCEPTED").trim();
    const cleanNote = String(note || "").trim();

    if (!["ACCEPTED", "REJECTED"].includes(cleanDecision)) {
      return res.status(400).json({
        message: "decision phải là ACCEPTED hoặc REJECTED",
      });
    }

    let issueDoc = await DeliveryIssueReport.findById(issueId).select("_id rentalId status statusHistory");
    let referenceModel = "DeliveryIssueReport";
    if (!issueDoc) {
      issueDoc = await DamageReport.findById(issueId).select("_id rentalId status statusHistory");
      referenceModel = "DamageReport";
    }
    if (!issueDoc) {
      return res.status(404).json({ message: "Không tìm thấy báo cáo sự cố" });
    }

    const rental = await Rental.findById(issueDoc.rentalId).select("supplierId customerId");
    if (!rental || String(rental.supplierId) !== String(supplierId)) {
      return res.status(403).json({
        message: "Bạn không có quyền xác nhận đề xuất này",
      });
    }

    const proposal = await CompensationProposal.findOne({
      referenceModel,
      referenceId: issueDoc._id,
    }).sort({ submittedAt: -1, createdAt: -1 });

    if (!proposal) {
      return res.status(404).json({
        message: "Chưa có đề xuất bồi thường cho sự cố này",
      });
    }

    if (proposal.supplierDecision === cleanDecision) {
      return res.json({
        success: true,
        noChange: true,
        message: "Đề xuất đã được xác nhận trước đó",
        proposal: toCompensationProposalDto(proposal.toObject()),
      });
    }

    const origin = proposal.origin || "SUPPLIER";
    const ggxSupplierFirst =
      origin === "ADMIN_GX" &&
      proposal.flowStatus === "PENDING_PARTY_REVIEW" &&
      proposal.customerDecision === "PENDING";
    const gxSupplierFirstPath = ggxSupplierFirst;

    if (!ggxSupplierFirst && proposal.customerDecision !== "ACCEPTED") {
      return res.status(409).json({
        message: "Khách hàng chưa chấp nhận đề xuất, chưa thể chuyển admin duyệt",
      });
    }

    proposal.supplierDecision = cleanDecision;
    proposal.supplierDecidedAt = new Date();
    proposal.supplierDecidedBy = supplierId;
    proposal.supplierDecisionNote = cleanNote || undefined;

    let notifyAdmins = false;
    let notifyCustomerForAdminQueue = false;

    if (cleanDecision === "ACCEPTED") {
      if (origin === "ADMIN_GX") {
        if (proposal.customerDecision === "ACCEPTED") {
          proposal.flowStatus = "PENDING_ADMIN_REVIEW";
          proposal.adminDecision = "PENDING";
          proposal.approvedCompensationAmount = 0;
          notifyAdmins = true;
          notifyCustomerForAdminQueue = true;
        } else {
          proposal.flowStatus = "SUPPLIER_ACCEPTED";
          proposal.adminDecision = "PENDING";
          proposal.approvedCompensationAmount = 0;
        }
      } else {
        proposal.flowStatus = "PENDING_ADMIN_REVIEW";
        proposal.adminDecision = "PENDING";
        proposal.approvedCompensationAmount = 0;
        notifyAdmins = true;
        notifyCustomerForAdminQueue = true;
      }
    } else {
      proposal.flowStatus = "SUPPLIER_REJECTED";
      proposal.adminDecision = "REJECTED";
      proposal.approvedCompensationAmount = 0;
    }

    await proposal.save();

    const prevIssueStatus = issueDoc.status;
    if (!issueDoc.statusHistory) issueDoc.statusHistory = [];
    issueDoc.statusHistory.push({
      status: prevIssueStatus,
      changedBy: supplierId,
      note:
        cleanDecision === "ACCEPTED"
          ? proposal.flowStatus === "SUPPLIER_ACCEPTED"
            ? "Supplier đã đồng ý phương án GearXpert — chờ khách xác nhận"
            : "Supplier đã xác nhận, chuyển đề xuất bồi thường sang admin duyệt"
          : gxSupplierFirstPath
          ? "Supplier đã từ chối đề xuất trung gian GearXpert"
          : "Supplier đã hủy đề xuất bồi thường sau khi khách xác nhận",
      createdAt: new Date(),
    });
    if (notifyAdmins && issueDoc.status === "AWAITING_ADMIN_GX") {
      issueDoc.status = "PROCESSING";
    }
    await issueDoc.save();

    if (notifyAdmins) {
      const adminUsers = await User.find({ role: "ADMIN" }).select("_id");
      await Promise.all(
        adminUsers.map((adminUser) =>
          NotificationConfig.sendNotification({
            senderId: supplierId,
            receiverId: adminUser._id,
            title: "Có đề xuất bồi thường chờ duyệt",
            message: `Case #${String(issueDoc._id).slice(-6)} đã đủ xác nhận 2 bên, chờ admin duyệt.`,
            link: "/admin/compensation-proposals",
            type: "COMPENSATION_PROPOSAL_REVIEW",
          })
        )
      );
    }
    if (notifyCustomerForAdminQueue && rental?.customerId) {
      await NotificationConfig.sendNotification({
        senderId: supplierId,
        receiverId: rental.customerId,
        title: "Đề xuất bồi thường đã lên admin duyệt",
        message: `Case #${String(issueDoc._id).slice(-6)}: shop vừa xác nhận — hệ thống chờ quản trị duyệt mức bồi thường. Bạn sẽ nhận thông báo khi có kết quả.`,
        link: `/customer/rentals/${issueDoc.rentalId}`,
        type: "COMPENSATION_PROPOSAL",
      });
    }
    if (
      cleanDecision === "ACCEPTED" &&
      proposal.flowStatus === "SUPPLIER_ACCEPTED" &&
      rental?.customerId
    ) {
      await NotificationConfig.sendNotification({
        senderId: supplierId,
        receiverId: rental.customerId,
        title: "GearXpert đề xuất phương án — chờ bạn xác nhận",
        message: `Case #${String(issueDoc._id).slice(-6)}: shop đã đồng ý phương án trung gian. Vui lòng xác nhận hoặc từ chối trên đơn thuê.`,
        link: `/customer/rentals/${issueDoc.rentalId}`,
        type: "COMPENSATION_PROPOSAL",
      });
    }

    return res.json({
      success: true,
      message:
        cleanDecision === "ACCEPTED"
          ? proposal.flowStatus === "SUPPLIER_ACCEPTED"
            ? "Đã xác nhận — chờ khách đồng ý phương án GearXpert"
            : "Đã chuyển đề xuất sang admin duyệt"
          : "Đã hủy chuyển duyệt đề xuất bồi thường",
      proposal: toCompensationProposalDto(proposal.toObject()),
    });
  } catch (err) {
    console.error("supplierConfirmCompensationProposal:", err);
    return res.status(500).json({ message: err.message || "Lỗi server" });
  }
};

exports.adminGetCompensationProposals = async (req, res) => {
  try {
    const {
      flowStatus = "",
      page = 1,
      limit = 20,
      search = "",
    } = req.query || {};

    const cleanPage = Math.max(1, Number(page) || 1);
    const cleanLimit = Math.min(100, Math.max(1, Number(limit) || 20));
    const skip = (cleanPage - 1) * cleanLimit;

    const filter = {};
    const cleanFlowStatus = String(flowStatus || "").trim();
    if (cleanFlowStatus && cleanFlowStatus !== "ALL") {
      filter.flowStatus = cleanFlowStatus;
    }
    const cleanSearch = String(search || "").trim();
    if (cleanSearch) {
      filter.$or = [
        { reason: { $regex: cleanSearch, $options: "i" } },
        { explanation: { $regex: cleanSearch, $options: "i" } },
        { forwardedMessagePreview: { $regex: cleanSearch, $options: "i" } },
      ];
    }

    const [proposals, total] = await Promise.all([
      CompensationProposal.find(filter)
        .sort({ submittedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(cleanLimit)
        .populate({ path: "supplierId", select: "fullName email phone avatar" })
        .populate({ path: "customerId", select: "fullName email phone avatar" })
        .populate({ path: "rentalId", select: "_id status rentPriceTotal depositAmount" })
        .populate({ path: "handledByAdminId", select: "fullName email" })
        .lean(),
      CompensationProposal.countDocuments(filter),
    ]);

    const deliveryIssueIds = proposals
      .filter((p) => p?.referenceModel === "DeliveryIssueReport" && p?.referenceId)
      .map((p) => p.referenceId);
    const damageIssueIds = proposals
      .filter((p) => p?.referenceModel === "DamageReport" && p?.referenceId)
      .map((p) => p.referenceId);

    const [deliveryIssues, damageIssues] = await Promise.all([
      deliveryIssueIds.length
        ? DeliveryIssueReport.find({ _id: { $in: deliveryIssueIds } })
            .select("_id status issueType description reportContext createdAt")
            .lean()
        : [],
      damageIssueIds.length
        ? DamageReport.find({ _id: { $in: damageIssueIds } })
            .select("_id status issueType description reportContext createdAt")
            .lean()
        : [],
    ]);

    const issueMap = new Map();
    deliveryIssues.forEach((it) => issueMap.set(`DeliveryIssueReport:${String(it._id)}`, it));
    damageIssues.forEach((it) => issueMap.set(`DamageReport:${String(it._id)}`, it));

    const mergedRows = proposals.map((proposal) => {
      const issue = issueMap.get(`${proposal.referenceModel}:${String(proposal.referenceId)}`) || null;
      return {
        ...toCompensationProposalDto(proposal),
        referenceModel: proposal.referenceModel,
        referenceId: proposal.referenceId,
        issue: issue
          ? {
              _id: issue._id,
              status: issue.status,
              issueType: issue.issueType,
              description: issue.description || "",
              reportContext: issue.reportContext || "",
              createdAt: issue.createdAt,
            }
          : null,
        supplier: proposal.supplierId || null,
        customer: proposal.customerId || null,
        rental: proposal.rentalId || null,
      };
    });
    const totalPages = Math.max(1, Math.ceil(total / cleanLimit));

    return res.json({
      success: true,
      proposals: mergedRows,
      pagination: {
        page: cleanPage,
        limit: cleanLimit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    console.error("adminGetCompensationProposals:", err);
    return res.status(500).json({ message: err.message || "Lỗi server" });
  }
};

const TERMINAL_COMPENSATION_FLOW = new Set([
  "ADMIN_APPROVED",
  "ADMIN_REJECTED",
  "CUSTOMER_REJECTED",
  "SUPPLIER_REJECTED",
]);

async function issueHasOpenCompensationProposal(referenceModel, referenceId) {
  const latest = await CompensationProposal.findOne({
    referenceModel,
    referenceId,
  })
    .sort({ submittedAt: -1, createdAt: -1 })
    .select("flowStatus")
    .lean();
  return Boolean(latest && !TERMINAL_COMPENSATION_FLOW.has(latest.flowStatus));
}

/**
 * Admin: đầy đủ ngữ cảnh issue + đơn thuê + hợp đồng + lịch sử đề xuất (điều tra / phán quyết).
 * Query: referenceModel = DeliveryIssueReport | DamageReport (bắt buộc)
 */
exports.adminGetIssueInvestigationBundle = async (req, res) => {
  try {
    const { issueId } = req.params;
    const referenceModel = String(req.query.referenceModel || req.query.type || "").trim();
    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({ message: "issueId không hợp lệ" });
    }
    if (!["DeliveryIssueReport", "DamageReport"].includes(referenceModel)) {
      return res.status(400).json({
        message: "Thiếu hoặc sai referenceModel — dùng DeliveryIssueReport hoặc DamageReport",
      });
    }

    const oid = new mongoose.Types.ObjectId(issueId);

    let issueDoc = null;
    if (referenceModel === "DeliveryIssueReport") {
      issueDoc = await DeliveryIssueReport.findById(oid)
        .populate({ path: "customerId", select: "fullName email phone avatar" })
        .populate({ path: "staffId", select: "fullName email phone" })
        .populate({ path: "assignedAdminId", select: "fullName email phone" })
        .populate({ path: "deviceIds", select: "name slug images rentPrice depositAmount" })
        .populate({
          path: "rentalItemIds",
          populate: [
            { path: "deviceId", select: "name slug images rentPrice depositAmount supplierId" },
            {
              path: "deviceItemIds",
              select: "serialNumber internalCode condition status location images",
            },
          ],
        })
        .populate({
          path: "deviceItemIds",
          select: "serialNumber internalCode condition status location images",
        })
        .lean();
    } else {
      issueDoc = await DamageReport.findById(oid)
        .populate({ path: "customerId", select: "fullName email phone avatar" })
        .populate({ path: "assignedAdminId", select: "fullName email phone" })
        .populate({ path: "deviceId", select: "name slug images rentPrice depositAmount" })
        .populate({
          path: "rentalItemId",
          populate: [
            { path: "deviceId", select: "name slug images rentPrice depositAmount supplierId" },
            {
              path: "deviceItemIds",
              select: "serialNumber internalCode condition status location images",
            },
          ],
        })
        .populate({
          path: "deviceItemIds",
          select: "serialNumber internalCode condition status location images",
        })
        .lean();
    }

    if (!issueDoc) {
      return res.status(404).json({ message: "Không tìm thấy báo cáo sự cố" });
    }

    const rentalId = issueDoc.rentalId;
    if (!rentalId) {
      return res.status(404).json({ message: "Báo cáo không gắn đơn thuê" });
    }

    const [compensationProposals, rental, rentalItems, contractRow, extensionRequests] = await Promise.all([
      CompensationProposal.find({ referenceModel, referenceId: oid })
        .sort({ submittedAt: -1, createdAt: -1 })
        .populate({ path: "proposedBy", select: "fullName email role" })
        .populate({ path: "handledByAdminId", select: "fullName email" })
        .populate({ path: "supplierId", select: "fullName email phone avatar" })
        .populate({ path: "customerId", select: "fullName email phone avatar" })
        .lean(),
      Rental.findById(rentalId)
        .populate("customerId", "fullName email phone avatar")
        .populate("supplierId", "fullName email phone avatar")
        .populate("assignedOperationStaffId", "fullName email phone role")
        .lean(),
      RentalItem.find({ rentalId })
        .populate([
          {
            path: "deviceId",
            select: "name slug images supplierId rentPrice depositAmount",
            populate: { path: "supplierId", select: "fullName phone email" },
          },
          {
            path: "deviceItemIds",
            select: "serialNumber internalCode condition status location images",
          },
        ])
        .lean(),
      Contract.findOne({ rentalId }).lean(),
      ExtensionRequest.find({ rentalId })
        .sort({ createdAt: -1 })
        .limit(30)
        .select("requestedEndDate requestedDays proposedExtraAmount status note createdAt updatedAt")
        .lean(),
    ]);

    if (!rental) {
      return res.status(404).json({ message: "Không tìm thấy đơn thuê" });
    }

    let contractUrl = null;
    if (contractRow?._id) {
      const contractFile = await ContractFile.findOne({ contractId: contractRow._id }).lean();
      if (contractFile?.fileUrl) contractUrl = contractFile.fileUrl;
    }

    const [otherDelivery, otherDamage] = await Promise.all([
      DeliveryIssueReport.find({ rentalId, _id: { $ne: oid } })
        .sort({ updatedAt: -1 })
        .limit(40)
        .select("issueType description status reportContext compensationAmount createdAt updatedAt")
        .lean(),
      DamageReport.find({ rentalId, _id: { $ne: oid } })
        .sort({ updatedAt: -1 })
        .limit(40)
        .select("description severity status compensationAmount createdAt updatedAt")
        .lean(),
    ]);

    return res.json({
      success: true,
      referenceModel,
      issue: issueDoc,
      compensationProposals,
      rental: { ...rental, items: rentalItems },
      contract: contractRow ? { ...contractRow, contractUrl } : null,
      extensionRequests: extensionRequests || [],
      relatedIssues: {
        deliveryIssueReports: otherDelivery,
        damageReports: otherDamage,
      },
    });
  } catch (err) {
    console.error("adminGetIssueInvestigationBundle:", err);
    return res.status(500).json({ message: err.message || "Lỗi server" });
  }
};

/** Admin: case NCC đã escalate (AWAITING_ADMIN_GX) chưa có đề xuất mở — hiển thị trang duyệt bồi thường */
exports.adminGetIssuesAwaitingGx = async (req, res) => {
  try {
    const [deliveryList, damageList] = await Promise.all([
      DeliveryIssueReport.find({ status: "AWAITING_ADMIN_GX" })
        .sort({ updatedAt: -1 })
        .limit(200)
        .lean(),
      DamageReport.find({ status: "AWAITING_ADMIN_GX" })
        .sort({ updatedAt: -1 })
        .limit(200)
        .lean(),
    ]);

    const candidates = [];
    for (const doc of deliveryList) {
      if (await issueHasOpenCompensationProposal("DeliveryIssueReport", doc._id)) continue;
      candidates.push({ referenceModel: "DeliveryIssueReport", doc });
    }
    for (const doc of damageList) {
      if (await issueHasOpenCompensationProposal("DamageReport", doc._id)) continue;
      candidates.push({ referenceModel: "DamageReport", doc });
    }

    const rentalIds = [
      ...new Set(candidates.map((c) => c.doc.rentalId).filter(Boolean).map((id) => String(id))),
    ];
    const rentals = rentalIds.length
      ? await Rental.find({ _id: { $in: rentalIds } })
          .select("_id status supplierId customerId")
          .populate({ path: "supplierId", select: "fullName email phone" })
          .populate({ path: "customerId", select: "fullName email phone" })
          .lean()
      : [];
    const rentalMap = new Map(rentals.map((r) => [String(r._id), r]));

    const issues = candidates
      .map(({ referenceModel, doc }) => {
        const r = doc.rentalId ? rentalMap.get(String(doc.rentalId)) : null;
        return {
          referenceModel,
          issueId: doc._id,
          status: doc.status,
          issueType: doc.issueType || null,
          severity: doc.severity || null,
          description: (doc.description || "").slice(0, 400),
          reportContext: doc.reportContext || null,
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
          assignedAdminId: doc.assignedAdminId || null,
          rentalId: doc.rentalId,
          rental: r
            ? {
                _id: r._id,
                status: r.status,
                supplier: r.supplierId || null,
                customer: r.customerId || null,
              }
            : null,
        };
      })
      .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));

    return res.json({ success: true, issues });
  } catch (err) {
    console.error("adminGetIssuesAwaitingGx:", err);
    return res.status(500).json({ message: err.message || "Lỗi server" });
  }
};

module.exports = {
  createDeliveryIssue: exports.createDeliveryIssue,
  getDeliveryIssueByRental: exports.getDeliveryIssueByRental,
  createStaffDeliveryIssue: exports.createStaffDeliveryIssue,
  getStaffDeliveryIssues: exports.getStaffDeliveryIssues,
  createStaffReturnIssue: exports.createStaffReturnIssue,
  getStaffReturnIssues: exports.getStaffReturnIssues,
  getSupplierIssues: exports.getSupplierIssues,
  supplierUpdateIssueStatus: exports.supplierUpdateIssueStatus,
  supplierSubmitCompensationProposal: exports.supplierSubmitCompensationProposal,
  customerConfirmCompensationProposal: exports.customerConfirmCompensationProposal,
  supplierConfirmCompensationProposal: exports.supplierConfirmCompensationProposal,
  adminGetCompensationProposals: exports.adminGetCompensationProposals,
  adminGetIssueInvestigationBundle: exports.adminGetIssueInvestigationBundle,
  adminGetIssuesAwaitingGx: exports.adminGetIssuesAwaitingGx,
  supplierEscalateIssue: exports.supplierEscalateIssue,
  supplierCloseIssueNoCompensation: exports.supplierCloseIssueNoCompensation,
  supplierCancelAndRefund: exports.supplierCancelAndRefund,
  supplierAdditionalDelivery: exports.supplierAdditionalDelivery,
};
