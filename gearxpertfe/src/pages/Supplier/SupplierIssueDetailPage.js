import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiArrowLeft,
  FiCalendar,
  FiCheck,
  FiCheckCircle,
  FiClock,
  FiCopy,
  FiFileText,
  FiImage,
  FiMail,
  FiMessageSquare,
  FiPackage,
  FiRotateCw,
  FiShare2,
  FiShield,
  FiTruck,
  FiUser,
  FiXCircle,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { ApiCreateConversation, ApiGetUserByUserId } from "../../components/Message Socket/ApiMessage";
import { openChatWindow } from "../../redux/reducer/chatWindowReducer";
import {
  getSupplierIssues,
  patchSupplierIssueStatus,
  supplierCloseIssueNoCompensation,
  supplierIssueCancelRefund,
  supplierConfirmCompensationProposal,
  supplierSubmitCompensationProposal,
} from "../../service/ApiService/ReportApi";
import { getHandoverAttemptsByRental } from "../../service/ApiService/HandoverApi";
import { confirmDialog } from "../../utils/confirmDialog";
import AdditionalDeliveryDialog from "../../components/supplier/AdditionalDeliveryDialog";
import EscalateIssueDialog from "../../components/supplier/EscalateIssueDialog";
import CompensationProposalCollapsible from "../../components/supplier/CompensationProposalCollapsible";

const STATUS_LABELS = {
  OPEN: "Mở",
  PROCESSING: "Đang xử lý",
  WAITING_EVIDENCE: "Chờ bằng chứng",
  AWAITING_ADMIN_GX: "Chờ Admin GearXpert",
  RESOLVED: "Đã xử lý",
  REJECTED: "Từ chối",
  VERIFIED: "Đã xác nhận",
};

const STATUS_STYLES = {
  OPEN: "bg-red-50 text-red-700 border-red-200",
  PROCESSING: "bg-amber-50 text-amber-700 border-amber-200",
  WAITING_EVIDENCE: "bg-violet-50 text-violet-700 border-violet-200",
  AWAITING_ADMIN_GX: "bg-sky-50 text-sky-800 border-sky-200",
  RESOLVED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-slate-50 text-slate-700 border-slate-200",
  VERIFIED: "bg-blue-50 text-blue-700 border-blue-200",
};

const ISSUE_TYPE_LABELS = {
  MISSING: "Thiếu thiết bị",
  WRONG_ITEM: "Sai thiết bị",
  DAMAGED: "Hư hỏng",
  OTHER: "Khác",
};

const REPORTED_BY_LABELS = {
  CUSTOMER: "Khách hàng",
  STAFF: "Nhân viên vận hành",
};

const SEVERITY_LABELS = {
  LOW: "Nhẹ",
  MEDIUM: "Trung bình",
  HIGH: "Nghiêm trọng",
};

const HANDOVER_STATUS_LABELS = {
  DRAFT: "Nháp",
  IN_PROGRESS: "Đang xử lý",
  COMPLETED: "Hoàn tất",
  FAILED: "Thất bại",
  VOID: "Hủy",
};

const HANDOVER_RESULT_LABELS = {
  SUCCESS: "Giao thành công",
  FAILED: "Giao thất bại",
  VOID: "Biên bản hủy",
};

const SUGGESTED_RESOLUTION_OPTIONS = [
  { value: "CUSTOMER_PAY", label: "Khách đền bù" },
  { value: "SUPPLIER_BEAR", label: "NCC chịu trách nhiệm" },
  { value: "REQUEST_GX_REVIEW", label: "Điều phối từ cọc (GX)" },
  { value: "PLATFORM_LIABILITY", label: "Hệ thống đền bù thiệt hại" },
];

const COMPENSATION_FLOW_LABELS = {
  PROPOSED: "Mới tạo đề xuất",
  PENDING_PARTY_REVIEW: "Chờ khách & shop xác nhận (GX)",
  CUSTOMER_ACCEPTED: "Khách đã xác nhận",
  CUSTOMER_REJECTED: "Khách đã từ chối",
  SUPPLIER_ACCEPTED: "Shop đã xác nhận — chờ khách",
  SUPPLIER_REJECTED: "Supplier đã hủy chuyển duyệt",
  PENDING_ADMIN_REVIEW: "Đang chờ admin duyệt",
  ADMIN_APPROVED: "Admin đã duyệt",
  ADMIN_REJECTED: "Admin đã từ chối",
};

/** Cùng dòng backend escalate: `Supplier nhờ GearXpert can thiệp` */
function isEscalatedToGearXpert(issue) {
  return (issue?.statusHistory || []).some((h) =>
    /nhờ GearXpert can thiệp|GearXpert can thiệp/i.test(String(h?.note || ""))
  );
}

const ISSUE_RESOLUTION_STEPS = [
  { key: "record", label: "Ghi nhận sự cố", Icon: FiFileText },
  { key: "work", label: "Đang xử lý", Icon: FiAlertCircle },
  { key: "ncc", label: "Hướng NCC", Icon: FiShare2 },
  { key: "customer", label: "Khách phản hồi", Icon: FiUser },
  { key: "admin", label: "Admin xét duyệt", Icon: FiShield },
  { key: "close", label: "Hoàn tất sự cố", Icon: FiCheck },
];

/**
 * Một bước: done | current | upcoming | skipped (không áp dụng theo nhánh)
 */
function buildIssueResolutionFlow(issue) {
  if (!issue) {
    return {
      variant: "default",
      allComplete: false,
      issueStatusCode: "—",
      banner: "Đang tải tiến trình sự cố…",
      steps: [],
    };
  }

  const is = String(issue.status || "");
  const reportLabel = STATUS_LABELS[issue?.status] || is || "—";
  const r = issue?.rentalId?.status;
  const p = issue?.compensationProposal;
  const hasProp = Boolean(p?.submittedAt);
  const fs_ = p?.flowStatus;
  const escalated = isEscalatedToGearXpert(issue);

  const byReport = {
    OPEN: "Báo cáo mở — cần bắt đầu / tiếp tục xử lý.",
    PROCESSING: "Báo cáo đang được NCC / đối chiếu hồ sơ xử lý.",
    WAITING_EVIDENCE: "Đang chờ bổ sung bằng chứng từ các bên.",
    AWAITING_ADMIN_GX: "Báo cáo đang chờ Admin GearXpert xem hồ sơ và đưa phương án.",
    RESOLVED: "Báo cáo đã đóng theo hồ sơ.",
    REJECTED: "Báo cáo kết thúc ở trạng thái từ chối / không áp dụng.",
    VERIFIED: "Đã ghi nhận xác minh, tiếp tục theo mã báo cáo.",
  };

  const inProgress = new Set([
    "PROCESSING",
    "WAITING_EVIDENCE",
    "AWAITING_ADMIN_GX",
    "VERIFIED",
  ]);

  const noCompClosed = is === "RESOLVED" && !hasProp;
  const adminEngaged =
    fs_ === "PENDING_ADMIN_REVIEW" ||
    fs_ === "ADMIN_APPROVED" ||
    fs_ === "ADMIN_REJECTED";

  if (r === "CANCELLED" || r === "REJECTED") {
    return {
      variant: "fail",
      allComplete: false,
      issueStatusCode: reportLabel,
      banner:
        "Đơn thuê đã hủy hoặc bị từ chối. Tiến trình sự cố bên dưới mang tính tham chiếu.",
      steps: ISSUE_RESOLUTION_STEPS.map((s, i) => ({
        ...s,
        sublabel: null,
        state: i < 2 ? "done" : "upcoming",
      })),
    };
  }
  if (is === "REJECTED") {
    return {
      variant: "fail",
      allComplete: true,
      issueStatusCode: reportLabel,
      banner: `Báo cáo ở trạng thái từ chối. ${byReport.REJECTED}`,
      steps: ISSUE_RESOLUTION_STEPS.map((s, i) => ({
        ...s,
        sublabel: i === 2 ? "Hồ sơ dừng" : i === 5 ? "Kết thúc" : null,
        state: i < 3 ? "done" : i === 5 ? "done" : "skipped",
      })),
    };
  }

  const steps = ISSUE_RESOLUTION_STEPS.map((def) => ({
    ...def,
    sublabel: null,
    state: "upcoming",
  }));

  if (is === "RESOLVED") {
    steps[0] = { ...steps[0], state: "done" };
    steps[1] = { ...steps[1], state: "done" };
    if (noCompClosed) {
      steps[2] = { ...steps[2], state: "done", sublabel: "Đóng, không bồi thường" };
      steps[3] = { ...steps[3], state: "skipped" };
      steps[4] = { ...steps[4], state: "skipped" };
    } else {
      steps[2] = { ...steps[2], state: "done", sublabel: "Đã có đề xuất / hướng xử lý" };
      const cd = p?.customerDecision;
      steps[3] = {
        ...steps[3],
        state: cd && cd !== "PENDING" ? "done" : "skipped",
        sublabel:
          cd === "ACCEPTED" ? "Khách chấp nhận" : cd === "REJECTED" ? "Khách từ chối" : null,
      };
      if (
        ["CUSTOMER_REJECTED", "SUPPLIER_REJECTED"].includes(fs_ || "") ||
        (cd === "REJECTED" && !adminEngaged)
      ) {
        steps[4] = { ...steps[4], state: "skipped" };
      } else {
        steps[4] = {
          ...steps[4],
          state: "done",
          sublabel:
            fs_ === "ADMIN_APPROVED"
              ? "Admin duyệt"
              : fs_ === "ADMIN_REJECTED"
                ? "Admin từ chối"
                : "Đã xét",
        };
      }
    }
    steps[5] = { ...steps[5], state: "done", sublabel: "Báo cáo đóng" };
  } else if (is === "OPEN") {
    steps[0] = { ...steps[0], state: "current", sublabel: "Mới ghi nhận" };
  } else if (inProgress.has(is)) {
    steps[0] = { ...steps[0], state: "done" };
    if (escalated && !hasProp) {
      steps[1] = { ...steps[1], state: "done" };
      steps[2] = { ...steps[2], state: "current", sublabel: "Nhờ GearXpert can thiệp" };
    } else if (!hasProp) {
      const hint = is === "VERIFIED" ? byReport.VERIFIED : (byReport[is] || "Đang xử lý");
      steps[1] = { ...steps[1], state: "current", sublabel: hint.slice(0, 100) };
      steps[2] = {
        ...steps[2],
        state: "upcoming",
        sublabel: "Đóng không bồi thường, đề xuất, hoặc can thiệp",
      };
    } else {
      steps[1] = { ...steps[1], state: "done" };
      steps[2] = { ...steps[2], state: "done", sublabel: "Đã tạo đề xuất" };
      if (p?.origin === "ADMIN_GX" && fs_ === "PENDING_PARTY_REVIEW") {
        steps[3] = {
          ...steps[3],
          state: "current",
          sublabel: "Chờ khách & shop xác nhận phương án GearXpert",
        };
        steps[4] = { ...steps[4], state: "upcoming" };
      } else if (
        p?.origin === "ADMIN_GX" &&
        fs_ === "SUPPLIER_ACCEPTED" &&
        p?.customerDecision === "PENDING"
      ) {
        steps[3] = { ...steps[3], state: "current", sublabel: "Chờ khách xác nhận phương án" };
        steps[4] = { ...steps[4], state: "upcoming" };
      } else if (p?.customerDecision === "PENDING") {
        steps[3] = {
          ...steps[3],
          state: "current",
          sublabel: p.forwardedToCustomerAt ? "Chờ khách phản hồi" : "Có thể gửi cho khách",
        };
        steps[4] = { ...steps[4], state: "upcoming" };
      } else if (
        p?.customerDecision === "ACCEPTED" &&
        fs_ === "CUSTOMER_ACCEPTED" &&
        p?.supplierDecision === "PENDING"
      ) {
        steps[3] = { ...steps[3], state: "done", sublabel: "Khách chấp nhận" };
        steps[4] = { ...steps[4], state: "current", sublabel: "Chờ gửi admin duyệt" };
      } else if (fs_ === "PENDING_ADMIN_REVIEW") {
        if (p?.customerDecision === "ACCEPTED") {
          steps[3] = { ...steps[3], state: "done", sublabel: "Khách chấp nhận" };
        } else {
          steps[3] = {
            ...steps[3],
            state: p?.customerDecision && p.customerDecision !== "PENDING" ? "done" : "current",
          };
        }
        steps[4] = { ...steps[4], state: "current", sublabel: "Hàng chờ admin" };
      } else if (p?.customerDecision === "REJECTED") {
        steps[3] = { ...steps[3], state: "done", sublabel: "Khách từ chối" };
        steps[4] = { ...steps[4], state: "skipped" };
        steps[5] = { ...steps[5], state: "upcoming" };
      } else {
        steps[3] = { ...steps[3], state: "current" };
      }
    }
  } else {
    steps[0] = { ...steps[0], state: "done" };
    steps[1] = {
      ...steps[1],
      state: "current",
      sublabel: (byReport[is] || "Theo mã báo cáo").slice(0, 100),
    };
  }

  const anyCurrent = steps.some((st) => st.state === "current");
  const allComplete = is === "RESOLVED" && !anyCurrent;

  let variant = "default";
  if (is === "RESOLVED" && allComplete) variant = "success";
  if (r === "COMPLETED" && is === "RESOLVED") variant = "success";

  let banner = `Báo cáo: ${reportLabel}. ${byReport[is] || "Đang xử lý theo mã sự cố."}`;
  if (is === "OPEN") {
    banner = `Báo cáo: ${reportLabel}. ${byReport.OPEN} Đợi NCC cập nhật.`;
  }
  if (inProgress.has(is) && escalated && !hasProp) {
    banner =
      "Đã ghi nhận yêu cầu can thiệp GearXpert. Có thể bổ sung bằng chứng thêm trên hồ sơ.";
  }
  if (is === "AWAITING_ADMIN_GX" && hasProp && fs_ === "PENDING_PARTY_REVIEW") {
    banner =
      "Admin GearXpert đã đưa phương án trung gian. Vui lòng xác nhận cùng khách; sau đó hồ sơ lên admin duyệt bồi thường.";
  }
  if (is === "AWAITING_ADMIN_GX" && hasProp && fs_ === "SUPPLIER_ACCEPTED") {
    banner = "Bạn đã đồng ý phương án GearXpert — đang chờ khách xác nhận.";
  }
  if (fs_ === "PENDING_ADMIN_REVIEW" && is !== "RESOLVED") {
    banner =
      "Đề xuất bồi thường đang nằm trong hàng chờ admin. Quyết định sẽ gửi tới bạn và khách.";
  }
  if (
    p?.customerDecision === "PENDING" &&
    hasProp &&
    is !== "RESOLVED" &&
    !(p?.origin === "ADMIN_GX" && ["PENDING_PARTY_REVIEW", "SUPPLIER_ACCEPTED"].includes(fs_ || ""))
  ) {
    banner = p.forwardedToCustomerAt
      ? "Chờ khách hàng chấp nhận / từ chối đề xuất bồi thường."
      : "Đề xuất đã tạo — gửi tin nhắn cho khách nếu cần xác nhận.";
  }
  if (p?.customerDecision === "ACCEPTED" && p?.supplierDecision === "PENDING" && fs_ === "CUSTOMER_ACCEPTED") {
    banner =
      "Khách đã chấp nhận. Hãy chuyển hồ sơ lên admin duyệt khi sẵn sàng (nếu thấy nút bên dưới).";
  }
  if (noCompClosed) {
    banner = "Sự cố đã đóng (không bồi thường / chỉ thông tin). Khách và admin đã / sẽ nhận thông báo.";
  }
  if (r === "COMPLETED" && is === "RESOLVED") {
    banner = "Hồ sơ sự cố đã đóng. Đơn thuê hoàn tất — cảm ơn bạn đã xử lý.";
  }

  return { variant, allComplete, issueStatusCode: reportLabel, banner, steps };
}

const RETURN_FAIL_REGEX = /^Thu hồi thất bại:/i;
const HANDOVER_FAIL_REGEX = /^(Handover thất bại:|Đơn hàng không thành công vì lý do:)/i;

function isReturnReport(report) {
  const desc = report?.description || "";
  if (HANDOVER_FAIL_REGEX.test(desc)) return false;
  if (report?.reportContext === "RETURN" || RETURN_FAIL_REGEX.test(desc)) return true;
  return false;
}

function normalizeIssue(issue) {
  if (!issue) return null;

  const type = issue?.deviceId ? "DAMAGE" : isReturnReport(issue) ? "RETURN" : "DELIVERY";
  const deviceNames = issue?.deviceId
    ? [issue?.deviceId?.name].filter(Boolean)
    : (issue?.deviceIds || []).map((d) => d?.name).filter(Boolean);

  return {
    ...issue,
    _type: type,
    _customerName: issue?.rentalId?.customerId?.fullName || "—",
    _customerPhone: issue?.rentalId?.phoneNumber || issue?.rentalId?.customerId?.phone || "—",
    _staffName: issue?.staffId?.fullName || "—",
    _devices: deviceNames,
    _rentalId: issue?.rentalId?._id || issue?.rentalId || null,
  };
}

function formatDateTime(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SupplierIssueDetailPage() {
  const { issueId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.user?.isAuthenticated);

  const initialIssue = useMemo(() => normalizeIssue(location?.state?.issue), [location?.state?.issue]);
  const [issue, setIssue] = useState(initialIssue);
  const [loading, setLoading] = useState(!initialIssue);
  const [submitting, setSubmitting] = useState(false);
  const [additionalDeliveryDialog, setAdditionalDeliveryDialog] = useState(null);
  const [showEscalateDialog, setShowEscalateDialog] = useState(false);
  const [handoverLoading, setHandoverLoading] = useState(false);
  const [handoverAttempts, setHandoverAttempts] = useState([]);
  const [activeHandoverId, setActiveHandoverId] = useState(null);
  const [proposalSubmitting, setProposalSubmitting] = useState(false);
  const [proposalImages, setProposalImages] = useState([]);
  const [proposalForm, setProposalForm] = useState({
    amount: "",
    reason: "",
    explanation: "",
    suggestedResolution: "CUSTOMER_PAY",
    sendToCustomer: true,
    directGearXpertReview: false,
  });

  const loadIssue = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const res = await getSupplierIssues();
      const deliveryIssues = res?.deliveryIssues ?? res?.data?.deliveryIssues ?? [];
      const damageReports = res?.damageReports ?? res?.data?.damageReports ?? [];
      const all = [...deliveryIssues, ...damageReports].map(normalizeIssue);
      const found = all.find((item) => String(item?._id) === String(issueId));
      setIssue(found || null);
    } catch {
      toast.error("Không thể tải chi tiết sự cố");
      setIssue(null);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [issueId]);

  useEffect(() => {
    if (initialIssue?._id === issueId) {
      setIssue(initialIssue);
      setLoading(false);
      return;
    }
    loadIssue();
  }, [issueId, initialIssue, loadIssue]);

  const loadHandoverAttempts = useCallback(async (rentalId) => {
    if (!rentalId) {
      setHandoverAttempts([]);
      setActiveHandoverId(null);
      return;
    }
    try {
      setHandoverLoading(true);
      const res = await getHandoverAttemptsByRental(rentalId);
      const list = res?.handovers ?? res?.data?.handovers ?? [];
      const sorted = [...list].sort((a, b) => (b?.attemptNo || 0) - (a?.attemptNo || 0));
      setHandoverAttempts(sorted);
      setActiveHandoverId((prev) => prev || sorted?.[0]?.id || sorted?.[0]?._id || null);
    } catch {
      setHandoverAttempts([]);
      setActiveHandoverId(null);
    } finally {
      setHandoverLoading(false);
    }
  }, []);

  useEffect(() => {
    const rentalId = issue?._rentalId;
    if (!rentalId) {
      setHandoverAttempts([]);
      setActiveHandoverId(null);
      return;
    }
    loadHandoverAttempts(rentalId);
  }, [issue?._rentalId, loadHandoverAttempts]);

  useEffect(() => {
    const proposal = issue?.compensationProposal;
    if (!proposal) return;
    setProposalForm((prev) => ({
      ...prev,
      amount:
        typeof proposal.amount === "number" && Number.isFinite(proposal.amount)
          ? String(proposal.amount)
          : "",
      reason: proposal.reason || "",
      explanation: proposal.explanation || "",
      suggestedResolution: proposal.suggestedResolution || prev.suggestedResolution,
      sendToCustomer: false,
      directGearXpertReview: Boolean(proposal.directGearXpertReview),
    }));
  }, [issue?.compensationProposal]);

  const issueTypeLabel =
    issue?._type === "RETURN"
      ? "Sự cố thu hồi"
      : issue?._type === "DELIVERY"
      ? "Sự cố giao hàng"
      : "Hư hỏng khi thuê";
  const issueTypeIcon = issue?._type === "RETURN" ? FiRotateCw : issue?._type === "DELIVERY" ? FiTruck : FiShield;

  const rentalStatus = issue?.rentalId?.status;
  const isRejectedRental = rentalStatus === "REJECTED";
  const isSyntheticReturnIssue = String(issue?._id || "").startsWith("return-failed-");

  const canMarkProcessing =
    issue &&
    !isSyntheticReturnIssue &&
    (!isRejectedRental ? issue.status === "OPEN" : ["OPEN", "PROCESSING"].includes(issue.status));

  const canCancelRefund =
    issue &&
    issue._type === "DELIVERY" &&
    issue.reportedBy === "STAFF" &&
    ["OPEN", "PROCESSING", "WAITING_EVIDENCE", "AWAITING_ADMIN_GX"].includes(issue.status);

  const canAdditionalDelivery = canCancelRefund;
  const canEscalateIssue =
    issue &&
    !isSyntheticReturnIssue &&
    ["OPEN", "PROCESSING", "WAITING_EVIDENCE"].includes(issue.status);

  const proposal = issue?.compensationProposal || null;

  /** Đóng sự cố, không bồi thường (chỉ thông báo) — không dùng khi đang có đề xuất bồi thường mở */
  const canCloseNoCompensation =
    issue &&
    !isSyntheticReturnIssue &&
    ["OPEN", "PROCESSING", "WAITING_EVIDENCE", "AWAITING_ADMIN_GX"].includes(issue.status) &&
    (!proposal ||
      (proposal?.flowStatus &&
        ["ADMIN_APPROVED", "ADMIN_REJECTED", "CUSTOMER_REJECTED", "SUPPLIER_REJECTED"].includes(
          proposal.flowStatus
        )));

  const parsedOperationalHint = useMemo(() => {
    if (!issue?.description || !issue.description.includes("|")) return null;
    const parts = issue.description.split("|").map((x) => x.trim()).filter(Boolean);
    if (parts.length <= 1) return null;
    return {
      reason: parts[0],
      operatorNote: parts.slice(1).join(" | "),
    };
  }, [issue?.description]);

  const timeline = useMemo(() => {
    if (!issue) return [];
    const events = [
      {
        key: "created",
        title: "Sự cố được tạo",
        description: "Tiếp nhận ban đầu từ báo cáo",
        time: issue.createdAt,
      },
    ];
    if (issue.updatedAt && issue.updatedAt !== issue.createdAt) {
      events.push({
        key: "updated",
        title: "Cập nhật gần nhất",
        description: `Trạng thái hiện tại: ${STATUS_LABELS[issue.status] || issue.status}`,
        time: issue.updatedAt,
      });
    }
    if (issue?.compensationProposal?.submittedAt) {
      events.push({
        key: "compensation-proposal",
        title: "Supplier gửi đề xuất bồi thường",
        description: `Số tiền đề xuất: ${Number(issue.compensationProposal.amount || 0).toLocaleString("vi-VN")} VND`,
        time: issue.compensationProposal.submittedAt,
      });
    }
    if (issue?.compensationProposal?.customerDecidedAt) {
      events.push({
        key: "compensation-customer-decision",
        title:
          issue.compensationProposal.customerDecision === "ACCEPTED"
            ? "Khách hàng đã xác nhận đề xuất"
            : "Khách hàng đã từ chối đề xuất",
        description: `Trạng thái khách: ${issue.compensationProposal.customerDecision || "PENDING"}`,
        time: issue.compensationProposal.customerDecidedAt,
      });
    }
    if (issue?.compensationProposal?.supplierDecidedAt) {
      events.push({
        key: "compensation-supplier-decision",
        title:
          issue.compensationProposal.supplierDecision === "ACCEPTED"
            ? "Supplier đã chuyển admin duyệt"
            : "Supplier đã hủy chuyển admin duyệt",
        description: `Trạng thái supplier: ${issue.compensationProposal.supplierDecision || "PENDING"}`,
        time: issue.compensationProposal.supplierDecidedAt,
      });
    }
    if (issue?.compensationProposal?.adminDecidedAt) {
      events.push({
        key: "compensation-admin-decision",
        title:
          issue.compensationProposal.adminDecision === "APPROVED"
            ? "Admin đã duyệt đề xuất bồi thường"
            : "Admin đã từ chối đề xuất bồi thường",
        description:
          issue.compensationProposal.adminDecision === "APPROVED"
            ? `Mức duyệt: ${Number(issue.compensationProposal.approvedCompensationAmount || 0).toLocaleString(
                "vi-VN"
              )} VND`
            : "Đề xuất không được chấp thuận.",
        time: issue.compensationProposal.adminDecidedAt,
      });
    }
    events.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
    return events;
  }, [issue]);

  const issueUrgency = useMemo(() => {
    if (!issue) return "—";
    if (issue.status === "OPEN") return "Cao - cần xử lý sớm";
    if (issue.status === "PROCESSING") return "Trung bình - đang theo dõi";
    if (issue.status === "AWAITING_ADMIN_GX") return "Cao - chờ Admin GearXpert";
    return "Ổn định";
  }, [issue]);

  /**
   * Tiến trình theo sự cố (không lẫn với từng bước giao hàng/đơn hàng):
   * Ghi nhận → Đang xử lý → Hướng NCC (đóng / đề xuất / can thiệp) → [Khách] → [Admin] → Hoàn tất
   */
  const issueJourney = useMemo(() => buildIssueResolutionFlow(issue), [issue]);

  const canGxSupplierAcceptFirst =
    Boolean(proposal) &&
    proposal.origin === "ADMIN_GX" &&
    proposal.flowStatus === "PENDING_PARTY_REVIEW" &&
    proposal.customerDecision === "PENDING" &&
    proposal.supplierDecision === "PENDING";

  const canForwardProposalToAdmin =
    Boolean(proposal) &&
    proposal.supplierDecision !== "ACCEPTED" &&
    proposal.flowStatus !== "PENDING_ADMIN_REVIEW" &&
    proposal.flowStatus !== "ADMIN_APPROVED" &&
    (proposal.customerDecision === "ACCEPTED" || canGxSupplierAcceptFirst);

  const activeHandover = useMemo(() => {
    return handoverAttempts.find(
      (item) => String(item?.id || item?._id) === String(activeHandoverId)
    );
  }, [handoverAttempts, activeHandoverId]);

  const handleCopyIssueId = async () => {
    if (!issue?._id || !navigator?.clipboard) return;
    try {
      await navigator.clipboard.writeText(String(issue._id));
      toast.success("Đã copy mã sự cố");
    } catch {
      toast.error("Không thể copy mã sự cố");
    }
  };

  const handleUpdateStatus = async () => {
    if (!issue?._id || !canMarkProcessing || submitting) return;
    const targetStatus = isRejectedRental ? "RESOLVED" : "PROCESSING";
    try {
      setSubmitting(true);
      await patchSupplierIssueStatus(issue._id, { status: targetStatus });
      toast.success(
        isRejectedRental
          ? "Đã xác nhận sự cố và chuyển trạng thái Đã xử lý"
          : "Đã cập nhật trạng thái Đang xử lý"
      );
      await loadIssue({ silent: true });
      if (issue?._rentalId) {
        await loadHandoverAttempts(issue._rentalId);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể cập nhật trạng thái");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelRefund = async () => {
    if (!issue?._id || !canCancelRefund || submitting) return;
    try {
      setSubmitting(true);
      await supplierIssueCancelRefund(issue._id);
      toast.success("Đã hủy đơn và gửi yêu cầu hoàn tiền cho khách");
      await loadIssue({ silent: true });
      if (issue?._rentalId) {
        await loadHandoverAttempts(issue._rentalId);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể hủy đơn");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEscalateIssue = async () => {
    if (!issue?._id || !canEscalateIssue || submitting) return;
    setShowEscalateDialog(true);
  };

  const handleContactCustomerChat = async () => {
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập để nhắn tin");
      navigate("/signin");
      return;
    }
    const customerId = issue?.rentalId?.customerId?._id || issue?.rentalId?.customerId;
    if (!customerId) {
      toast.error("Không tìm thấy tài khoản khách hàng");
      return;
    }
    try {
      const conversation = await ApiCreateConversation(customerId);
      const friendInfo = await ApiGetUserByUserId(customerId);
      dispatch(openChatWindow({ ...conversation, friendInfo }));
      toast.success("Đã mở cửa sổ chat với khách hàng");
    } catch {
      toast.error("Không thể mở cuộc trò chuyện");
    }
  };

  const handleProposalImagesChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setProposalImages((prev) => [...prev, ...files].slice(0, 8));
    event.target.value = null;
  };

  const removeProposalImage = (index) => {
    setProposalImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const buildCustomerProposalMessage = (payload) => {
    const amountText = payload.amount > 0 ? `${payload.amount.toLocaleString("vi-VN")} VND` : "0 VND";
    const resolutionLabel =
      SUGGESTED_RESOLUTION_OPTIONS.find((item) => item.value === payload.suggestedResolution)?.label ||
      payload.suggestedResolution;
    return [
      `Chào ${issue?._customerName || "bạn"},`,
      "",
      "Shop đã kiểm tra sự cố và gửi đề xuất xử lý như sau:",
      `- Mã sự cố: ${issue?._id || "—"}`,
      `- Mã đơn thuê: ${issue?._rentalId || "—"}`,
      `- Phương án đề xuất: ${resolutionLabel}`,
      `- Mức bồi thường đề xuất: ${amountText}`,
      `- Lý do: ${payload.reason}`,
      `- Giải thích: ${payload.explanation}`,
      "",
      "Nếu bạn cần thêm thông tin, vui lòng phản hồi trực tiếp tại cuộc trò chuyện này. Cảm ơn bạn!",
    ].join("\n");
  };

  const handleSubmitCompensationProposal = async () => {
    if (!issue?._id || proposalSubmitting) return;
    const amountValue = Number(proposalForm.amount || 0);
    const reason = proposalForm.reason.trim();
    const explanation = proposalForm.explanation.trim();
    const suggestedResolution = proposalForm.suggestedResolution;

    if (!Number.isFinite(amountValue) || amountValue < 0) {
      toast.warning("Số tiền đề xuất không hợp lệ");
      return;
    }
    if (
      (suggestedResolution === "CUSTOMER_PAY" || suggestedResolution === "PLATFORM_LIABILITY") &&
      amountValue <= 0
    ) {
      toast.warning("Phương án này cần số tiền đề xuất lớn hơn 0");
      return;
    }
    if (!reason) {
      toast.warning("Vui lòng nhập lý do đề xuất");
      return;
    }
    if (explanation.length < 10) {
      toast.warning("Vui lòng nhập giải thích chi tiết hơn (tối thiểu 10 ký tự)");
      return;
    }

    const messageText = buildCustomerProposalMessage({
      amount: amountValue,
      reason,
      explanation,
      suggestedResolution,
    });

    const formData = new FormData();
    formData.append("amount", String(amountValue));
    formData.append("reason", reason);
    formData.append("explanation", explanation);
    formData.append("suggestedResolution", suggestedResolution);
    const directGx = proposalForm.directGearXpertReview === true;
    formData.append("forwardedToCustomer", directGx ? "false" : proposalForm.sendToCustomer ? "true" : "false");
    formData.append("forwardedMessagePreview", directGx ? "" : proposalForm.sendToCustomer ? messageText : "");
    if (directGx) {
      formData.append("directGearXpertReview", "true");
    }
    proposalImages.forEach((file) => {
      formData.append("images", file);
    });

    try {
      setProposalSubmitting(true);
      await supplierSubmitCompensationProposal(issue._id, formData);

      toast.success(
        proposalForm.directGearXpertReview
          ? "Đã nộp đề xuất thẳng GearXpert — chờ admin duyệt và quyết toán."
          : proposalForm.sendToCustomer
          ? "Đã lưu đề xuất bồi thường và gửi tin nhắn cho khách"
          : "Đã lưu đề xuất bồi thường"
      );
      setProposalImages([]);
      await loadIssue({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Không thể gửi đề xuất bồi thường");
    } finally {
      setProposalSubmitting(false);
    }
  };

  const handleSupplierForwardToAdmin = async () => {
    if (!issue?._id || !proposal || proposalSubmitting) return;
    const gxFirst =
      proposal.origin === "ADMIN_GX" &&
      proposal.flowStatus === "PENDING_PARTY_REVIEW" &&
      proposal.customerDecision === "PENDING";
    if (proposal.customerDecision !== "ACCEPTED" && !gxFirst) {
      toast.warning("Khách hàng cần xác nhận trước khi chuyển admin duyệt");
      return;
    }
    if (proposal.supplierDecision === "ACCEPTED" || proposal.flowStatus === "PENDING_ADMIN_REVIEW") {
      toast.info("Đề xuất đã được chuyển admin duyệt");
      return;
    }

    try {
      setProposalSubmitting(true);
      await supplierConfirmCompensationProposal(issue._id, { decision: "ACCEPTED" });
      toast.success("Đã chuyển đề xuất bồi thường cho admin duyệt");
      await loadIssue({ silent: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể chuyển đề xuất cho admin");
    } finally {
      setProposalSubmitting(false);
    }
  };

  const handleCloseNoCompensation = async () => {
    if (!issue?._id || !canCloseNoCompensation || submitting) return;
    const result = await confirmDialog({
      title: "Đóng sự cố, không bồi thường?",
      text: "Bạn chấp nhận mức hư hỏng và không yêu cầu bồi thường. Khách hàng và admin sẽ nhận thông báo.",
      icon: "question",
      confirmText: "Xác nhận đóng",
      cancelText: "Hủy",
      confirmColor: "#0f766e",
      cancelColor: "#64748b",
    });
    if (!result.isConfirmed) return;
    try {
      setSubmitting(true);
      await supplierCloseIssueNoCompensation(issue._id, {});
      toast.success("Đã đóng sự cố. Khách hàng và admin đã nhận thông báo.");
      await loadIssue({ silent: true });
      if (issue?._rentalId) {
        await loadHandoverAttempts(issue._rentalId);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể đóng sự cố");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => navigate("/supplier/issues")}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <FiArrowLeft size={16} />
          Quay lại danh sách sự cố
        </button>
        {!loading && issue && (
          <button
            onClick={loadIssue}
            className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
          >
            <FiRotateCw size={14} />
            Làm mới dữ liệu
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : !issue ? (
        <div className="text-center py-20 text-slate-400">
          <FiAlertTriangle size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">Không tìm thấy sự cố</p>
          <p className="text-sm mt-1">Sự cố có thể đã được cập nhật hoặc không còn tồn tại.</p>
        </div>
      ) : (
        <>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">Chi tiết sự cố</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Mã sự cố: <span className="font-medium text-slate-700">{issue._id}</span>
                  <button
                    onClick={handleCopyIssueId}
                    className="ml-2 inline-flex items-center text-slate-500 hover:text-slate-800"
                    title="Copy mã sự cố"
                  >
                    <FiCopy size={13} />
                  </button>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-medium border bg-indigo-50 text-indigo-700 border-indigo-200 inline-flex items-center gap-1.5">
                  {issueTypeIcon && <issueTypeIcon size={12} />}
                  {issueTypeLabel}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    STATUS_STYLES[issue.status] || "bg-slate-50 text-slate-700 border-slate-200"
                  }`}
                >
                  {STATUS_LABELS[issue.status] || issue.status || "—"}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-5">
              <InfoCard icon={FiUser} label="Khách hàng" value={issue._customerName} />
              <InfoCard
                icon={FiCalendar}
                label="Người báo cáo"
                value={REPORTED_BY_LABELS[issue.reportedBy] || issue.reportedBy || "—"}
              />
              <InfoCard icon={FiClock} label="Thời gian tạo" value={formatDateTime(issue.createdAt)} />
              <InfoCard icon={FiPackage} label="Trạng thái đơn" value={issue?.rentalId?.status || "—"} />
              <InfoCard icon={FiShield} label="Mức ưu tiên" value={issueUrgency} />
            </div>
          </div>

          <IssueResolutionJourneyStepper journey={issueJourney} />

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <section className="xl:col-span-2 space-y-6">
              <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <h2 className="text-base font-semibold text-slate-900">Thông tin nghiệp vụ</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <Field label="Mã đơn thuê" value={issue?._rentalId || "—"} />
                  <Field
                    label="Loại sự cố"
                    value={ISSUE_TYPE_LABELS[issue.issueType] || issue.issueType || "—"}
                  />
                  <Field label="Nhân viên phụ trách" value={issue._staffName || "—"} />
                  <Field
                    label="Mức độ hư hỏng"
                    value={issue._type === "DAMAGE" ? SEVERITY_LABELS[issue.severity] || issue.severity || "—" : "—"}
                  />
                  <Field label="Số điện thoại khách" value={issue._customerPhone || "—"} />
                  <Field
                    label="Email khách"
                    value={issue?.rentalId?.customerId?.email || "—"}
                    icon={FiMail}
                  />
                  <div className="md:col-span-2">
                    <p className="text-slate-500 mb-1">Mô tả sự cố</p>
                    <p className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 whitespace-pre-wrap">
                      {issue.description || "Không có mô tả"}
                    </p>
                  </div>
                  {parsedOperationalHint?.operatorNote && (
                    <div className="md:col-span-2">
                      <p className="text-slate-500 mb-1">Ghi chú vận hành tách từ biên bản</p>
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                        <p className="text-sm text-amber-900 font-medium">{parsedOperationalHint.reason}</p>
                        <p className="text-sm text-amber-800 whitespace-pre-wrap">{parsedOperationalHint.operatorNote}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <h2 className="text-base font-semibold text-slate-900">Thiết bị liên quan</h2>
                {issue._devices?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {issue._devices.map((device) => (
                      <span
                        key={`${issue._id}-${device}`}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium"
                      >
                        {device}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Không có thông tin thiết bị.</p>
                )}
              </section>

              <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-semibold text-slate-900">
                    Biên bản giao nhận ban đầu (để đối chiếu)
                  </h2>
                  {issue?._rentalId && (
                    <button
                      onClick={() => loadHandoverAttempts(issue._rentalId)}
                      className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                    >
                      Tải lại biên bản
                    </button>
                  )}
                </div>

                {handoverLoading ? (
                  <div className="py-8 text-sm text-slate-500">Đang tải biên bản...</div>
                ) : handoverAttempts.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    Chưa có biên bản bàn giao nào cho đơn này.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {handoverAttempts.map((attempt) => {
                        const attemptId = attempt?.id || attempt?._id;
                        const isActive = String(attemptId) === String(activeHandoverId);
                        return (
                          <button
                            key={String(attemptId)}
                            onClick={() => setActiveHandoverId(attemptId)}
                            className={`w-full text-left rounded-xl border p-3 transition-all ${
                              isActive
                                ? "border-indigo-300 bg-indigo-50/60"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-slate-800">
                                Lần giao #{attempt?.attemptNo || "—"}
                              </p>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-700">
                                  {HANDOVER_STATUS_LABELS[attempt?.status] || attempt?.status || "—"}
                                </span>
                                <span className="px-2 py-0.5 rounded-full border border-indigo-200 bg-indigo-50 text-indigo-700">
                                  {HANDOVER_RESULT_LABELS[attempt?.result] || attempt?.result || "—"}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-1">
                              Hoàn tất: {formatDateTime(attempt?.finishedAt || attempt?.updatedAt)}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    {activeHandover && (
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Chi tiết biên bản lần #{activeHandover?.attemptNo || "—"}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                          <Field
                            label="Người nhận"
                            value={activeHandover?.customerConfirmation?.confirmerName || issue?._customerName || "—"}
                          />
                          <Field
                            label="SĐT người nhận"
                            value={activeHandover?.customerConfirmation?.confirmerPhone || issue?._customerPhone || "—"}
                          />
                          <Field
                            label="Xác nhận khách"
                            value={activeHandover?.customerConfirmation?.confirmed ? "Đã xác nhận" : "Chưa xác nhận"}
                          />
                          <Field
                            label="Thời gian xác nhận"
                            value={formatDateTime(activeHandover?.customerConfirmation?.confirmedAt)}
                          />
                        </div>

                        {activeHandover?.inspection?.checklist && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                              Checklist bàn giao
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                              <ChecklistItem
                                checked={Boolean(activeHandover.inspection.checklist.customerPresent)}
                                text="Khách có mặt"
                              />
                              <ChecklistItem
                                checked={Boolean(activeHandover.inspection.checklist.customerIdentityVerified)}
                                text="Đã xác minh danh tính"
                              />
                              <ChecklistItem
                                checked={Boolean(activeHandover.inspection.checklist.deliveryAddressMatched)}
                                text="Khớp địa chỉ giao"
                              />
                            </div>
                          </div>
                        )}

                        {Array.isArray(activeHandover?.inspection?.items) &&
                          activeHandover.inspection.items.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                                Thiết bị/serial đã bàn giao
                              </p>
                              <div className="space-y-2">
                                {activeHandover.inspection.items.map((item, idx) => (
                                  <div
                                    key={`${activeHandover?.id || activeHandover?._id}-item-${idx}`}
                                    className="rounded-lg border border-slate-200 bg-white p-3"
                                  >
                                    <p className="text-sm font-medium text-slate-800">
                                      {item?.deviceName || "Thiết bị"}
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">
                                      Serial giao:{" "}
                                      {Array.isArray(item?.deliveredSerialNumbers) &&
                                      item.deliveredSerialNumbers.length > 0
                                        ? item.deliveredSerialNumbers.join(", ")
                                        : "—"}
                                    </p>
                                    {item?.operatorNote ? (
                                      <p className="text-xs text-slate-600 mt-1">
                                        Ghi chú: {item.operatorNote}
                                      </p>
                                    ) : null}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                        {activeHandover?.customerConfirmation?.operatorNote && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                              Ghi chú xác nhận giao nhận
                            </p>
                            <p className="text-sm text-slate-700 bg-white border border-slate-200 rounded-lg p-3 whitespace-pre-wrap">
                              {activeHandover.customerConfirmation.operatorNote}
                            </p>
                          </div>
                        )}

                        {activeHandover?.customerConfirmation?.signatureUrl && (
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                              Chữ ký / ảnh xác nhận
                            </p>
                            <button
                              onClick={() =>
                                window.open(
                                  activeHandover.customerConfirmation.signatureUrl,
                                  "_blank",
                                  "noopener,noreferrer"
                                )
                              }
                              className="group relative rounded-xl overflow-hidden border border-slate-200 bg-white"
                            >
                              <img
                                src={activeHandover.customerConfirmation.signatureUrl}
                                alt="signature"
                                className="w-full max-w-xs h-36 object-cover"
                              />
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {Array.isArray(issue.images) && issue.images.length > 0 && (
                <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4">
                  <h2 className="text-base font-semibold text-slate-900">Bằng chứng sự cố</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {issue.images.map((image, index) => (
                      <button
                        key={`${issue._id}-image-${index}`}
                        onClick={() => window.open(image, "_blank", "noopener,noreferrer")}
                        className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50"
                      >
                        <img src={image} alt={`issue-${index + 1}`} className="w-full h-28 object-cover" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                          <FiImage className="text-white opacity-0 group-hover:opacity-100 transition-opacity" size={18} />
                        </div>
                      </button>
                    ))}
                  </div>
                </section>
              )}
            </section>

            <aside className="space-y-6">
              <CompensationProposalCollapsible
                issue={issue}
                proposalForm={proposalForm}
                setProposalForm={setProposalForm}
                proposalImages={proposalImages}
                isSyntheticReturnIssue={isSyntheticReturnIssue}
                proposalSubmitting={proposalSubmitting}
                onSubmit={handleSubmitCompensationProposal}
                onProposalImagesChange={handleProposalImagesChange}
                onRemoveProposalImage={removeProposalImage}
                formatDateTime={formatDateTime}
                suggestedResolutionOptions={SUGGESTED_RESOLUTION_OPTIONS}
                compensationFlowLabels={COMPENSATION_FLOW_LABELS}
              />

              <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <h2 className="text-base font-semibold text-slate-900">Hành động xử lý</h2>
                <p className="text-xs text-slate-500">
                  Chọn hành động phù hợp theo trạng thái hiện tại. Các thao tác sẽ ghi nhận trực tiếp vào hệ thống.
                </p>
                {isSyntheticReturnIssue && (
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                    Bản ghi này được tổng hợp từ biên bản thu hồi, không hỗ trợ đổi trạng thái trực tiếp.
                  </div>
                )}

                <button
                  onClick={handleUpdateStatus}
                  disabled={!canMarkProcessing || submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiCheckCircle size={15} />
                  {isRejectedRental ? "Xác nhận đã nắm thông tin" : "Đánh dấu đang xử lý"}
                </button>

                <button
                  onClick={handleCloseNoCompensation}
                  disabled={!canCloseNoCompensation || submitting || proposalSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-800 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiCheckCircle size={15} />
                  {submitting ? "Đang đóng..." : "Đóng sự cố, không bồi thường (thông báo khách & admin)"}
                </button>

                {issue?._type !== "RETURN" && (
                  <button
                    onClick={handleSupplierForwardToAdmin}
                    disabled={!canForwardProposalToAdmin || proposalSubmitting || isSyntheticReturnIssue}
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FiCheckCircle size={15} />
                    {proposalSubmitting
                      ? "Đang chuyển..."
                      : canGxSupplierAcceptFirst
                      ? "Xác nhận đồng ý phương án GearXpert"
                      : "Chuyển admin duyệt bồi thường"}
                  </button>
                )}

                <button
                  onClick={handleContactCustomerChat}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
                >
                  <FiMessageSquare size={15} />
                  Nhắn tin khách hàng
                </button>

                <button
                  onClick={handleEscalateIssue}
                  disabled={!canEscalateIssue || submitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FiShield size={15} />
                  Nhờ GearXpert can thiệp
                </button>

                {issue?._type !== "RETURN" && (
                  <>
                    <button
                      onClick={handleCancelRefund}
                      disabled={!canCancelRefund || submitting}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiXCircle size={15} />
                      Hủy đơn và hoàn tiền
                    </button>

                    <button
                      onClick={() => setAdditionalDeliveryDialog(issue)}
                      disabled={!canAdditionalDelivery || submitting}
                      className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <FiTruck size={15} />
                      Tạo giao bổ sung
                    </button>
                  </>
                )}
              </section>

              <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <h2 className="text-base font-semibold text-slate-900">Mốc thời gian</h2>
                <div className="space-y-3">
                  {timeline.map((item) => (
                    <div key={item.key} className="relative pl-5">
                      <span className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-indigo-500" />
                      <p className="text-sm font-medium text-slate-800">{item.title}</p>
                      <p className="text-xs text-slate-500">{item.description}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(item.time)}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                <h2 className="text-base font-semibold text-slate-900">Checklist xử lý nhanh</h2>
                <ul className="space-y-2 text-sm text-slate-700">
                  <ChecklistItem checked={issue.status !== "OPEN"} text="Đã nhận sự cố và cập nhật trạng thái" />
                  <ChecklistItem checked={Boolean(issue.images?.length)} text="Đã có bằng chứng ảnh đính kèm" />
                  <ChecklistItem checked={issue.status === "RESOLVED"} text="Sự cố đã hoàn tất xử lý" />
                </ul>
              </section>
            </aside>
          </div>

          {additionalDeliveryDialog && (
            <AdditionalDeliveryDialog
              issue={additionalDeliveryDialog}
              onClose={() => setAdditionalDeliveryDialog(null)}
              onSuccess={async () => {
                await loadIssue({ silent: true });
              }}
            />
          )}

          {showEscalateDialog && (
            <EscalateIssueDialog
              issue={issue}
              onClose={() => setShowEscalateDialog(false)}
              onSuccess={async () => {
                await loadIssue({ silent: true });
              }}
            />
          )}
        </>
      )}
    </div>
  );
}

function segmentPastState(state) {
  return state === "done" || state === "skipped";
}

function IssueResolutionJourneyStepper({ journey }) {
  if (!journey) return null;
  const { steps = [], allComplete, variant, banner, issueStatusCode } = journey;
  const fail = variant === "fail";
  const success = variant === "success";
  const n = steps.length;

  return (
    <div
      className={`bg-white border rounded-2xl p-4 sm:p-5 shadow-sm ${
        fail ? "border-rose-200" : "border-slate-200"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
        <h2 className="text-sm font-semibold text-slate-800">Tiến trình xử lý sự cố</h2>
        {issueStatusCode && issueStatusCode !== "—" ? (
          <p className="text-xs text-slate-600 sm:text-right">
            Trạng thái báo cáo:{" "}
            <span className="font-semibold text-slate-800 tabular-nums">{issueStatusCode}</span>
          </p>
        ) : null}
      </div>
      <div className="w-full overflow-x-auto pb-1">
        <div className="min-w-[720px] flex items-start justify-between gap-0">
          {steps.map((step, i) => {
            const { Icon, label, state, sublabel } = step;
            const done = state === "done" || (allComplete && state !== "skipped");
            const skipped = state === "skipped";
            const current = state === "current";
            const leftLineDone = !fail && i > 0 && segmentPastState(steps[i - 1]?.state);
            const rightLineDone = !fail && i < n - 1 && segmentPastState(state);
            return (
              <div key={step.key || step.label} className="flex-1 flex flex-col items-center min-w-0">
                <div className="flex w-full items-center">
                  {i > 0 ? (
                    <div
                      className={`h-0.5 flex-1 min-w-[8px] rounded ${
                        leftLineDone
                          ? skipped
                            ? "bg-slate-300 border-dashed"
                            : "bg-indigo-500"
                          : "bg-slate-200"
                      } ${skipped && i > 0 && steps[i - 1]?.state === "skipped" ? "opacity-60" : ""}`}
                    />
                  ) : (
                    <div className="flex-1" />
                  )}
                  <div
                    className={`shrink-0 flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full border-2 transition-colors ${
                      fail && !done
                        ? "border-slate-200 bg-slate-100 text-slate-400"
                        : skipped
                        ? "border-slate-300 border-dashed bg-slate-50 text-slate-400"
                        : success || (done && !skipped) || (allComplete && !skipped)
                        ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                        : current
                        ? "border-indigo-500 bg-indigo-50 text-indigo-600 ring-2 ring-indigo-200"
                        : "border-slate-200 bg-slate-50 text-slate-300"
                    }`}
                    title={sublabel || label}
                  >
                    {skipped ? (
                      <span className="text-sm font-light text-slate-400" aria-hidden>
                        —
                      </span>
                    ) : (
                      <Icon size={18} className="shrink-0" />
                    )}
                  </div>
                  {i < n - 1 ? (
                    <div
                      className={`h-0.5 flex-1 min-w-[8px] rounded ${
                        rightLineDone
                          ? steps[i + 1]?.state === "skipped"
                            ? "bg-slate-300"
                            : "bg-indigo-500"
                          : "bg-slate-200"
                      }`}
                    />
                  ) : (
                    <div className="flex-1" />
                  )}
                </div>
                <p
                  className={`mt-1 text-center text-[9px] sm:text-[10px] font-medium leading-tight px-0.5 ${
                    fail
                      ? "text-slate-500"
                      : current && !allComplete
                      ? "text-indigo-700"
                      : done || (allComplete && !skipped)
                      ? "text-slate-800"
                      : skipped
                      ? "text-slate-400"
                      : "text-slate-400"
                  }`}
                >
                  {label}
                </p>
                {sublabel && !skipped ? (
                  <p className="text-[8px] sm:text-[9px] text-slate-500 text-center leading-tight px-0.5 line-clamp-2">
                    {sublabel}
                  </p>
                ) : skipped ? (
                  <p className="text-[8px] sm:text-[9px] text-slate-400 text-center">Không áp dụng</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
      <div
        className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${
          success
            ? "bg-emerald-50 border-emerald-200 text-emerald-900"
            : fail
            ? "bg-rose-50 border-rose-200 text-rose-900"
            : "bg-amber-50 border-amber-200 text-amber-900"
        }`}
      >
        {banner}
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="border border-slate-200 rounded-xl p-3 bg-slate-50">
      <p className="text-xs text-slate-500 flex items-center gap-1.5">
        <Icon size={13} />
        {label}
      </p>
      <p className="text-sm font-semibold text-slate-800 mt-1 break-all">{value || "—"}</p>
    </div>
  );
}

function Field({ label, value, icon: Icon }) {
  return (
    <div>
      <p className="text-slate-500 mb-1 flex items-center gap-1.5">
        {Icon ? <Icon size={13} /> : null}
        {label}
      </p>
      <p className="font-medium text-slate-800 break-all">{value || "—"}</p>
    </div>
  );
}

function ChecklistItem({ checked, text }) {
  return (
    <li className="flex items-start gap-2">
      <span
        className={`mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center ${
          checked ? "border-green-500 bg-green-50 text-green-600" : "border-slate-300 text-transparent"
        }`}
      >
        •
      </span>
      <span className={checked ? "text-slate-800" : "text-slate-500"}>{text}</span>
    </li>
  );
}
