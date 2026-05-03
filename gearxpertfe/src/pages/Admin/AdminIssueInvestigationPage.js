import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  FiAlertTriangle,
  FiArrowLeft,
  FiBriefcase,
  FiChevronDown,
  FiChevronUp,
  FiClipboard,
  FiCopy,
  FiCpu,
  FiEdit3,
  FiExternalLink,
  FiImage,
  FiLayers,
  FiPackage,
  FiRefreshCw,
  FiShield,
  FiUser,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { adminGetIssueInvestigationBundle } from "../../service/ApiService/ReportApi";
import AdminGxMediationForm from "../../components/admin/AdminGxMediationForm";
import AdminGxSettlementFinalize from "../../components/admin/AdminGxSettlementFinalize";

const DELIVERY_ISSUE_TYPE = {
  MISSING: "Thiếu / không giao đủ",
  WRONG_ITEM: "Sai thiết bị",
  DAMAGED: "Hư hỏng khi giao",
  OTHER: "Khác",
};

const RENTAL_STATUS_VI = {
  PENDING: "Chờ xác nhận",
  REJECTED: "Từ chối",
  DELIVERING: "Đang giao",
  DELIVERED: "Đã giao",
  RENTING: "Đang thuê",
  RETURNING: "Đang thu hồi",
  INSPECTING: "Kiểm tra",
  PENDING_RESOLUTION: "Chờ xử lý",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

const ISSUE_STATUS_META = {
  OPEN: { label: "Mở", className: "bg-amber-100 text-amber-900 border-amber-200" },
  PROCESSING: { label: "Đang xử lý", className: "bg-sky-100 text-sky-900 border-sky-200" },
  WAITING_EVIDENCE: { label: "Chờ bằng chứng", className: "bg-violet-100 text-violet-900 border-violet-200" },
  AWAITING_ADMIN_GX: { label: "Chờ Admin GX", className: "bg-indigo-100 text-indigo-900 border-indigo-200" },
  RESOLVED: { label: "Đã xử lý", className: "bg-emerald-100 text-emerald-900 border-emerald-200" },
  REJECTED: { label: "Từ chối", className: "bg-rose-100 text-rose-900 border-rose-200" },
};

const FLOW_STATUS_LABEL = {
  PROPOSED: "Mới tạo",
  PENDING_PARTY_REVIEW: "Chờ khách & shop",
  CUSTOMER_ACCEPTED: "Khách xác nhận",
  CUSTOMER_REJECTED: "Khách từ chối",
  SUPPLIER_ACCEPTED: "Shop OK",
  SUPPLIER_REJECTED: "Shop từ chối",
  PENDING_ADMIN_REVIEW: "Chờ admin duyệt",
  PENDING_WALLET: "Quyết toán ví",
  ADMIN_APPROVED: "Admin duyệt",
  ADMIN_REJECTED: "Admin từ chối",
};

const FLOW_STATUS_STYLE = {
  PROPOSED: "border-slate-200 bg-slate-50",
  PENDING_PARTY_REVIEW: "border-sky-200 bg-sky-50/80",
  PENDING_ADMIN_REVIEW: "border-amber-200 bg-amber-50/80",
  PENDING_WALLET: "border-violet-200 bg-violet-50/80",
  ADMIN_APPROVED: "border-emerald-200 bg-emerald-50/80",
  ADMIN_REJECTED: "border-rose-200 bg-rose-50/80",
  CUSTOMER_REJECTED: "border-rose-200 bg-rose-50/50",
  SUPPLIER_REJECTED: "border-rose-200 bg-rose-50/50",
};

const RESOLUTION_LABEL = {
  CUSTOMER_PAY: "Khách đền bù",
  SUPPLIER_BEAR: "NCC chịu trách nhiệm",
  REQUEST_GX_REVIEW: "Điều phối từ cọc (GX)",
  PLATFORM_LIABILITY: "Hệ thống đền bù thiệt hại",
};

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatVnd(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return `${Number(n).toLocaleString("vi-VN")} ₫`;
}

function getApiErrorMessage(err, fallback) {
  if (!err) return fallback;
  const m =
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    (typeof err?.message === "string" && err.message !== "Network Error" ? err.message : null);
  const s = m != null ? String(m).trim() : "";
  return s || fallback;
}

function copyText(text, msg = "Đã sao chép") {
  const t = String(text || "").trim();
  if (!t) return;
  navigator.clipboard.writeText(t).then(
    () => toast.success(msg),
    () => toast.error("Không thể sao chép")
  );
}

function IssueStatusBadge({ status }) {
  const meta = ISSUE_STATUS_META[status] || {
    label: status || "—",
    className: "bg-slate-100 text-slate-800 border-slate-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function CopyField({ label, value, mono }) {
  const v = value != null && value !== "" ? String(value) : "";
  if (!v) return null;
  return (
    <div className="flex items-start justify-between gap-2 py-1.5 border-b border-slate-100/90 last:border-0">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className={`text-xs text-slate-900 mt-0.5 break-all ${mono ? "font-mono" : ""}`}>{v}</p>
      </div>
      <button
        type="button"
        onClick={() => copyText(v)}
        className="shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600"
        title="Sao chép"
      >
        <FiCopy size={14} />
      </button>
    </div>
  );
}

function NavTab({ href, children }) {
  return (
    <a
      href={href}
      className="inline-flex items-center rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 scroll-smooth"
      onClick={(e) => {
        e.preventDefault();
        const id = href.replace("#", "");
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }}
    >
      {children}
    </a>
  );
}

export default function AdminIssueInvestigationPage() {
  const navigate = useNavigate();
  const { issueId } = useParams();
  const [searchParams] = useSearchParams();
  const referenceModel = (searchParams.get("referenceModel") || "").trim();

  const [loading, setLoading] = useState(true);
  const [bundle, setBundle] = useState(null);
  const [expandedProposalId, setExpandedProposalId] = useState(null);

  const load = useCallback(async () => {
    if (!issueId || !referenceModel) return;
    try {
      setLoading(true);
      const res = await adminGetIssueInvestigationBundle(issueId, { referenceModel });
      if (!res?.success) {
        toast.error("Không tải được dữ liệu");
        setBundle(null);
        return;
      }
      setBundle(res);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không tải được chi tiết sự cố"));
      setBundle(null);
    } finally {
      setLoading(false);
    }
  }, [issueId, referenceModel]);

  useEffect(() => {
    load();
  }, [load]);

  const issueImages = useMemo(() => {
    const imgs = bundle?.issue?.images;
    return Array.isArray(imgs) ? imgs.filter(Boolean) : [];
  }, [bundle?.issue?.images]);

  const scrollToGxForm = useCallback(() => {
    document.getElementById("admin-gx-mediation-form-investigation")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }, []);

  const investigationHints = useMemo(() => {
    const issue = bundle?.issue;
    if (!issue) return [];
    const hints = [];
    const proposals = bundle?.compensationProposals || [];
    const gxPending = proposals.some((p) => p.origin === "ADMIN_GX" && p.flowStatus === "PENDING_ADMIN_REVIEW");
    if (gxPending) {
      hints.push("Đề xuất GX đã nhập — cuộn tới mục «Tạm tính & quyết toán» để xem chia tiền và bấm xác nhận cuối.");
    }
    if (issue.status === "AWAITING_ADMIN_GX") {
      hints.push("Case đang chờ GearXpert soạn đề xuất trung gian — dùng nút Soạn đề xuất GX sau khi đối chiếu đơn & cọc.");
    }
    if (bundle?.rental?.escrowStatus === "RELEASED") {
      hints.push("Escrow đã giải phóng — kiểm tra kỹ luồng tiền khi duyệt bồi thường.");
    }
    if (bundle?.rental?.depositStatus === "REFUNDED") {
      hints.push("Cọc đã hoàn — xác nhận lại số dư khả dụng trước khi quyết toán.");
    }
    hints.push("Đối chiếu serial thiết bị trong báo cáo với dòng đơn và các sự cố khác trên cùng rental.");
    return hints;
  }, [bundle?.issue, bundle?.rental, bundle?.compensationProposals]);

  const gxAwaitingFinal = useMemo(() => {
    const list = bundle?.compensationProposals;
    if (!Array.isArray(list) || list.length === 0) return null;
    return (
      list.find((p) => p.origin === "ADMIN_GX" && p.flowStatus === "PENDING_ADMIN_REVIEW") || null
    );
  }, [bundle?.compensationProposals]);

  if (!referenceModel) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-50/50 p-8 shadow-sm">
        <div className="flex items-start gap-3">
          <FiAlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={22} />
          <div>
            <p className="font-semibold text-amber-950">Thiếu tham số referenceModel</p>
            <p className="mt-2 text-sm text-amber-900/90 leading-relaxed">
              Mở từ &quot;Sự cố chờ xử lý&quot; hoặc thêm{" "}
              <code className="rounded-md bg-white/80 px-1.5 py-0.5 text-xs">?referenceModel=DeliveryIssueReport</code> /{" "}
              <code className="rounded-md bg-white/80 px-1.5 py-0.5 text-xs">DamageReport</code>.
            </p>
            <Link
              to="/admin/pending-issue-reviews"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-700 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-800"
            >
              <FiArrowLeft size={16} /> Quay lại danh sách
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (loading && !bundle) {
    return (
      <div className="space-y-6">
        {referenceModel ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              <FiArrowLeft size={18} aria-hidden />
              Trang trước
            </button>
            <Link
              to="/admin/pending-issue-reviews"
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-900 shadow-sm hover:bg-indigo-100"
            >
              <FiArrowLeft size={18} aria-hidden />
              Sự cố chờ xử lý
            </Link>
          </div>
        ) : null}
        <div className="space-y-6 animate-pulse">
        <div className="h-36 rounded-2xl bg-slate-200/80" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100" />
          ))}
        </div>
        <div className="grid lg:grid-cols-[1fr_300px] gap-8">
          <div className="h-96 rounded-2xl bg-slate-100" />
          <div className="h-64 rounded-2xl bg-slate-100" />
        </div>
        </div>
      </div>
    );
  }

  if (!bundle?.issue) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            <FiArrowLeft size={18} aria-hidden />
            Trang trước
          </button>
          <Link
            to="/admin/pending-issue-reviews"
            className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-900 shadow-sm hover:bg-indigo-100"
          >
            <FiArrowLeft size={18} aria-hidden />
            Sự cố chờ xử lý
          </Link>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
          <FiShield className="mx-auto text-slate-300 mb-3" size={40} />
          <p className="text-slate-600 font-medium">Không có dữ liệu hồ sơ.</p>
        </div>
      </div>
    );
  }

  const { issue, rental, contract, compensationProposals = [], relatedIssues, extensionRequests = [] } = bundle;
  const rid = rental?._id;
  const relatedDeliveryCount = relatedIssues?.deliveryIssueReports?.length ?? 0;
  const relatedDamageCount = relatedIssues?.damageReports?.length ?? 0;

  const issueKindLabel =
    referenceModel === "DamageReport" ? "Hư hỏng trong thuê" : "Sự cố giao / thu hồi";

  return (
    <div className="pb-16 space-y-0">
      {/* Back bar — luôn thấy rõ trên nền admin */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-colors"
        >
          <FiArrowLeft size={18} aria-hidden />
          Trang trước
        </button>
        <Link
          to="/admin/pending-issue-reviews"
          className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-900 shadow-sm hover:bg-indigo-100 hover:border-indigo-300 transition-colors"
        >
          <FiArrowLeft size={18} aria-hidden />
          Sự cố chờ xử lý
        </Link>
      </div>

      {/* Command header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white shadow-lg shadow-slate-900/20 mb-6">
        <div className="absolute inset-0 opacity-[0.07] bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] pointer-events-none" />
        <div className="relative px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-mono text-indigo-100 border border-white/10">
                  {referenceModel === "DamageReport" ? "DamageReport" : "DeliveryIssueReport"}
                </span>
                <IssueStatusBadge status={issue.status} />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">Trung tâm điều tra sự cố</h1>
              <p className="mt-2 text-sm text-indigo-100/90 max-w-2xl leading-relaxed">
                {issueKindLabel} · Theo dõi đầy đủ báo cáo, đơn thuê, tài chính–cọc và lịch sử đề xuất để phán quyết nhất quán.
              </p>
              <div className="mt-4 flex flex-wrap gap-2 items-center text-xs text-slate-300">
                <span className="font-mono">case …{String(issueId || "").slice(-8)}</span>
                <span className="text-slate-500">|</span>
                <button
                  type="button"
                  onClick={() => copyText(String(issueId), "Đã copy mã sự cố")}
                  className="inline-flex items-center gap-1 text-indigo-200 hover:text-white"
                >
                  <FiCopy size={12} /> Copy issueId
                </button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row lg:flex-col gap-2 shrink-0">
              <button
                type="button"
                onClick={scrollToGxForm}
                className="inline-flex justify-center items-center gap-2 rounded-xl bg-white text-indigo-900 px-5 py-3 text-sm font-bold shadow-md hover:bg-indigo-50 transition-colors"
              >
                <FiEdit3 size={18} />
                Soạn đề xuất GX
              </button>
              <button
                type="button"
                onClick={() => load()}
                disabled={loading}
                className="inline-flex justify-center items-center gap-2 rounded-xl border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-50"
              >
                <FiRefreshCw size={18} className={loading ? "animate-spin" : ""} />
                Làm mới dữ liệu
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI strip */}
      <div id="sec-summary" className="scroll-mt-24 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Trạng thái đơn</p>
          <p className="mt-1 text-sm font-bold text-slate-900 leading-snug">
            {RENTAL_STATUS_VI[rental?.status] || rental?.status || "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Tổng thanh toán</p>
          <p className="mt-1 text-sm font-bold text-slate-900 tabular-nums">{formatVnd(rental?.totalAmount)}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Cọc</p>
          <p className="mt-1 text-sm font-bold text-slate-900 tabular-nums">{formatVnd(rental?.depositAmount)}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Escrow / Cọc TT</p>
          <p className="mt-1 text-xs font-semibold text-slate-800">
            {rental?.escrowStatus || "—"} · {rental?.depositStatus || "—"}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Đề xuất (case)</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{compensationProposals.length}</p>
        </div>
        <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Sự cố khác (đơn)</p>
          <p className="mt-1 text-sm font-bold text-slate-900">
            {relatedDeliveryCount + relatedDamageCount}
            <span className="text-xs font-normal text-slate-500"> giao {relatedDeliveryCount} · hư {relatedDamageCount}</span>
          </p>
        </div>
      </div>

      {/* Sticky section nav */}
      <div className="sticky top-0 z-20 -mx-1 px-1 mb-6 py-2 bg-[#f8fafc]/95 backdrop-blur-md border border-slate-200/80 rounded-xl shadow-sm">
        <div className="flex flex-wrap gap-1 justify-center sm:justify-start">
          <NavTab href="#sec-summary">Tóm tắt</NavTab>
          <NavTab href="#sec-issue">Báo cáo</NavTab>
          <NavTab href="#sec-rental">Đơn &amp; tài chính</NavTab>
          <NavTab href="#sec-contract">Hợp đồng</NavTab>
          <NavTab href="#sec-extension">Gia hạn</NavTab>
          <NavTab href="#sec-compose-gx">Soạn GX</NavTab>
          {gxAwaitingFinal ? <NavTab href="#sec-gx-settle">Quyết toán GX</NavTab> : null}
          <NavTab href="#sec-proposals">Đề xuất</NavTab>
          <NavTab href="#sec-related">Liên quan</NavTab>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-8 items-start">
        <div className="space-y-8 min-w-0">
          {/* Issue */}
          <section id="sec-issue" className="scroll-mt-28 rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <FiClipboard size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Báo cáo &amp; thiết bị liên quan</h2>
                  <p className="text-xs text-slate-500">Mô tả, ảnh, người liên quan và thiết bị/serial gắn case.</p>
                </div>
              </div>
              <IssueStatusBadge status={issue.status} />
            </div>
            <div className="p-5 sm:p-6 space-y-6">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <dt className="text-xs font-medium text-slate-500">Mức bồi thường ghi trên báo cáo</dt>
                  <dd className="mt-1 font-semibold text-slate-900 tabular-nums">{formatVnd(issue.compensationAmount)}</dd>
                </div>
                {referenceModel === "DeliveryIssueReport" && (
                  <>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Loại sự cố</dt>
                      <dd className="mt-1 font-medium text-slate-900">
                        {DELIVERY_ISSUE_TYPE[issue.issueType] || issue.issueType || "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Ngữ cảnh</dt>
                      <dd className="mt-1 font-medium text-slate-900">{issue.reportContext || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-medium text-slate-500">Nguồn báo cáo</dt>
                      <dd className="mt-1 font-medium text-slate-900">{issue.reportedBy || "—"}</dd>
                    </div>
                  </>
                )}
                {referenceModel === "DamageReport" && (
                  <div>
                    <dt className="text-xs font-medium text-slate-500">Mức độ</dt>
                    <dd className="mt-1 font-medium text-slate-900">{issue.severity || "—"}</dd>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <dt className="text-xs font-medium text-slate-500">Mô tả chi tiết</dt>
                  <dd className="mt-2 text-slate-800 whitespace-pre-wrap rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 leading-relaxed">
                    {issue.description || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-slate-500">Tạo / Cập nhật</dt>
                  <dd className="mt-1 text-slate-700">
                    {formatDate(issue.createdAt)}
                    <span className="text-slate-400"> → </span>
                    {formatDate(issue.updatedAt)}
                  </dd>
                </div>
              </dl>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {issue.customerId && typeof issue.customerId === "object" && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                    <p className="text-[11px] font-bold uppercase text-emerald-800 flex items-center gap-1">
                      <FiUser size={12} /> Khách (báo cáo)
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{issue.customerId.fullName || "—"}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{issue.customerId.email}</p>
                  </div>
                )}
                {issue.staffId && typeof issue.staffId === "object" && (
                  <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-4">
                    <p className="text-[11px] font-bold uppercase text-sky-900">Vận hành / Staff</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{issue.staffId.fullName}</p>
                    <p className="text-xs text-slate-600">{issue.staffId.email || issue.staffId.phone}</p>
                  </div>
                )}
                {issue.assignedAdminId && typeof issue.assignedAdminId === "object" && (
                  <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                    <p className="text-[11px] font-bold uppercase text-violet-900">Admin phụ trách</p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{issue.assignedAdminId.fullName}</p>
                    <p className="text-xs text-slate-600">{issue.assignedAdminId.email}</p>
                  </div>
                )}
              </div>

              {referenceModel === "DeliveryIssueReport" &&
                Array.isArray(issue.deviceIds) &&
                issue.deviceIds.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-2">
                      <FiPackage size={14} /> Thiết bị (theo báo cáo giao hàng)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {issue.deviceIds.map((d) => (
                        <span
                          key={String(d._id || d)}
                          className="inline-flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800"
                        >
                          {d.name || String(d)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {referenceModel === "DeliveryIssueReport" && Array.isArray(issue.rentalItemIds) && issue.rentalItemIds.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <FiLayers size={14} /> Dòng đơn &amp; serial liên quan
                  </p>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs text-left min-w-[520px]">
                      <thead>
                        <tr className="bg-slate-50 text-slate-600 font-semibold">
                          <th className="px-3 py-2.5">Thiết bị</th>
                          <th className="px-3 py-2.5">Serial / mã</th>
                          <th className="px-3 py-2.5">Tình trạng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {issue.rentalItemIds.map((ri) => {
                          const dev = ri.deviceId && typeof ri.deviceId === "object" ? ri.deviceId : {};
                          const units = ri.deviceItemIds || [];
                          return (
                            <tr key={String(ri._id)}>
                              <td className="px-3 py-2.5 font-medium text-slate-900">{dev.name || "—"}</td>
                              <td className="px-3 py-2.5 font-mono text-[11px] text-slate-700">
                                {units.length
                                  ? units.map((u) => u.serialNumber || u.internalCode).filter(Boolean).join(", ")
                                  : "—"}
                              </td>
                              <td className="px-3 py-2.5 text-slate-600">
                                {units.map((u) => u.condition).filter(Boolean).join(", ") || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {referenceModel === "DamageReport" && issue.rentalItemId && typeof issue.rentalItemId === "object" && (
                <div>
                  <p className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <FiCpu className="inline" size={14} /> Dòng đơn bị ảnh hưởng
                  </p>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm">
                    <p className="font-semibold text-slate-900">
                      {issue.rentalItemId.deviceId?.name || issue.deviceId?.name || "Thiết bị"}
                    </p>
                    <p className="text-xs text-slate-600 mt-2 font-mono">
                      Serial:{" "}
                      {(issue.deviceItemIds || [])
                        .map((u) => u.serialNumber)
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </p>
                  </div>
                </div>
              )}

              {issue.internalNotes?.length > 0 && (
                <div className="rounded-xl border border-amber-200/80 bg-amber-50/30 p-4">
                  <p className="text-xs font-bold text-amber-950 mb-3">Ghi chú nội bộ</p>
                  <ul className="space-y-3">
                    {issue.internalNotes.map((n, i) => (
                      <li key={i} className="text-sm text-slate-800 border-l-2 border-amber-300 pl-3">
                        {n.content || "—"}
                        <span className="block text-[11px] text-slate-500 mt-1">{formatDate(n.createdAt)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {issue.statusHistory?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-800 mb-2">Lịch sử trạng thái</p>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-left text-slate-600">
                          <th className="px-3 py-2 font-semibold">Trạng thái</th>
                          <th className="px-3 py-2 font-semibold">Ghi chú</th>
                          <th className="px-3 py-2 font-semibold">Thời điểm</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {issue.statusHistory.map((h, i) => (
                          <tr key={i} className="hover:bg-slate-50/50">
                            <td className="px-3 py-2 font-medium text-slate-900">{h.status}</td>
                            <td className="px-3 py-2 text-slate-700">{h.note || "—"}</td>
                            <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{formatDate(h.createdAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {issueImages.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <FiImage size={14} /> Minh chứng hình ảnh
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {issueImages.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative aspect-square rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shadow-sm hover:ring-2 hover:ring-indigo-400 transition-all"
                      >
                        <img src={url} alt="" className="h-full w-full object-cover group-hover:scale-[1.02] transition-transform" />
                        <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100">
                          Mở
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Rental */}
          {rental && (
            <section id="sec-rental" className="scroll-mt-28 rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <FiBriefcase size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Đơn thuê &amp; tài chính</h2>
                  <p className="text-xs text-slate-500">Khách, shop, tiền, cọc, phương thức và dòng thiết bị.</p>
                </div>
              </div>
              <div className="p-5 sm:p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 to-white p-5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-900 mb-3 flex items-center gap-2">
                      <FiUser size={14} /> Khách hàng
                    </p>
                    <p className="text-lg font-bold text-slate-900">{rental.customerId?.fullName || "—"}</p>
                    <p className="text-sm text-slate-600 mt-1">{rental.customerId?.email || "—"}</p>
                    <p className="text-sm text-slate-600">{rental.customerId?.phone || rental.phoneNumber || "—"}</p>
                  </div>
                  <div className="rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-5">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-violet-900 mb-3 flex items-center gap-2">
                      <FiUser size={14} /> Nhà cung cấp
                    </p>
                    <p className="text-lg font-bold text-slate-900">{rental.supplierId?.fullName || "—"}</p>
                    <p className="text-sm text-slate-600 mt-1">{rental.supplierId?.email || "—"}</p>
                    <p className="text-sm text-slate-600">{rental.supplierId?.phone || "—"}</p>
                  </div>
                </div>

                {rental.assignedOperationStaffId && typeof rental.assignedOperationStaffId === "object" && (
                  <div className="rounded-xl border border-sky-200 bg-sky-50/40 px-4 py-3 text-sm">
                    <span className="font-semibold text-sky-950">Vận hành được gán: </span>
                    <span className="text-slate-800">
                      {rental.assignedOperationStaffId.fullName}
                      {rental.assignedOperationStaffId.phone ? ` · ${rental.assignedOperationStaffId.phone}` : ""}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                  {[
                    ["Mã đơn (orderCode)", rental.orderCode != null ? String(rental.orderCode) : null],
                    ["Voucher", rental.voucherCode || null],
                    ["Giảm voucher", rental.voucherDiscount != null ? formatVnd(rental.voucherDiscount) : null],
                    ["Ghi chú đơn", rental.notes || null],
                    ["Thanh toán", `${rental.paymentMethod || "—"} · ${rental.paymentStatus || "—"}`],
                    ["Chi trả NCC", rental.supplierPayoutStatus || "—"],
                    ["Kiểm tra (context)", rental.inspectedContext || "—"],
                    ["Giao / Trả thực tế", [rental.pickedUpAt, rental.deliveredAt].some(Boolean) ? `${formatDate(rental.pickedUpAt)} — ${formatDate(rental.deliveredAt)}` : null],
                    ["Gia hạn", rental.isExtended ? `Có · đến ${formatDate(rental.extendedEndDate)}` : "Không"],
                  ]
                    .filter(([, v]) => v != null && v !== "")
                    .map(([k, v]) => (
                      <div key={k} className="rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase text-slate-500">{k}</p>
                        <p className="mt-0.5 font-medium text-slate-900 whitespace-pre-wrap">{v}</p>
                      </div>
                    ))}
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 text-sm border-t border-slate-100 pt-6">
                  <div>
                    <dt className="text-xs text-slate-500">Tiền thuê (tổng)</dt>
                    <dd className="font-bold text-slate-900 tabular-nums mt-0.5">{formatVnd(rental.rentPriceTotal)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Phí giao</dt>
                    <dd className="font-bold text-slate-900 tabular-nums mt-0.5">{formatVnd(rental.deliveryFee)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Thuê — Bắt đầu / Kết thúc</dt>
                    <dd className="text-slate-800 mt-0.5 text-xs leading-snug">
                      {formatDate(rental.rentalStartDate)}
                      <br />
                      {formatDate(rental.rentalEndDate)}
                    </dd>
                  </div>
                  <div className="sm:col-span-2 xl:col-span-4">
                    <dt className="text-xs text-slate-500">Địa chỉ giao</dt>
                    <dd className="text-slate-800 mt-1 leading-relaxed">
                      {rental.deliveryAddress?.fullAddress ||
                        [rental.deliveryAddress?.street, rental.deliveryAddress?.district, rental.deliveryAddress?.city]
                          .filter(Boolean)
                          .join(", ") ||
                        "—"}
                    </dd>
                  </div>
                </dl>

                {rental.paymentBreakdown && (
                  <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-5">
                    <p className="text-xs font-bold text-indigo-950 mb-4">Phân bổ thanh toán (theo hồ sơ)</p>
                    <div className="grid sm:grid-cols-2 gap-3 text-sm">
                      {[
                        ["Tiền thuê (net)", rental.paymentBreakdown.rentAmount],
                        ["Cọc (breakdown)", rental.paymentBreakdown.depositAmount],
                        ["Phí nền tảng", rental.paymentBreakdown.platformFee],
                        ["NCC nhận (dự kiến)", rental.paymentBreakdown.supplierReceive],
                      ].map(([label, amt]) => (
                        <div key={label} className="flex justify-between gap-4 border-b border-indigo-100/60 pb-2 last:border-0">
                          <span className="text-slate-700">{label}</span>
                          <span className="font-semibold tabular-nums text-slate-900">{formatVnd(amt)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Array.isArray(rental.compensationProposalIds) && rental.compensationProposalIds.length > 0 && (
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold text-slate-800">Đề xuất đã gắn đơn (đã duyệt / quyết toán): </span>
                    {rental.compensationProposalIds.length} mã — tra cứu chi tiết trong bảng đề xuất hoặc ví.
                  </p>
                )}

                {Array.isArray(rental.items) && rental.items.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-900 mb-3">Toàn bộ dòng thiết bị trên đơn</p>
                    <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-inner">
                      <table className="w-full text-xs text-left min-w-[640px]">
                        <thead>
                          <tr className="bg-slate-800 text-white">
                            <th className="px-4 py-3 font-semibold">Thiết bị</th>
                            <th className="px-4 py-3 font-semibold">SL</th>
                            <th className="px-4 py-3 font-semibold">Đơn giá thuê</th>
                            <th className="px-4 py-3 font-semibold">Serial</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {rental.items.map((it) => {
                            const dev = it.deviceId && typeof it.deviceId === "object" ? it.deviceId : {};
                            const serials = (it.deviceItemIds || []).map((d) => d?.serialNumber).filter(Boolean);
                            return (
                              <tr key={String(it._id)} className="hover:bg-slate-50/80">
                                <td className="px-4 py-3 font-semibold text-slate-900">
                                  {dev.name || it.deviceSnapshot?.name || "—"}
                                </td>
                                <td className="px-4 py-3">{it.quantity ?? 1}</td>
                                <td className="px-4 py-3 tabular-nums text-slate-700">{formatVnd(dev.rentPrice)}</td>
                                <td className="px-4 py-3 font-mono text-[11px] text-slate-600 max-w-[220px]">
                                  {serials.length ? serials.join(", ") : "—"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Contract */}
          <section id="sec-contract" className="scroll-mt-28 rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
                <FiShield size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Hợp đồng điện tử</h2>
                <p className="text-xs text-slate-500">Tham chiếu pháp lý và file đính kèm.</p>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              {contract ? (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-5">
                  <div>
                    <p className="font-semibold text-indigo-950">Hợp đồng đã lập cho đơn thuê</p>
                    <p className="text-xs text-indigo-900/80 mt-1">
                      {contract.contractUrl ? "File PDF sẵn sàng — nên mở và đối chiếu điều khoản trước khi quyết định bồi thường." : "Chưa có URL file trong hệ thống — kiểm tra kho lưu trữ hoặc hợp đồng giấy."}
                    </p>
                  </div>
                  {contract.contractUrl ? (
                    <a
                      href={contract.contractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 shadow-md"
                    >
                      Mở PDF <FiExternalLink size={16} />
                    </a>
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Không tìm thấy bản ghi hợp đồng điện tử cho đơn này.</p>
              )}
            </div>
          </section>

          {/* Extensions */}
          <section id="sec-extension" className="scroll-mt-28 rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Yêu cầu gia hạn</h2>
              <p className="text-xs text-slate-500">Ảnh hưởng thời gian thuê và tiền phát sinh.</p>
            </div>
            <div className="p-5 sm:p-6">
              {extensionRequests.length === 0 ? (
                <p className="text-sm text-slate-500">Không có yêu cầu gia hạn trên đơn.</p>
              ) : (
                <div className="space-y-3">
                  {extensionRequests.map((ex) => (
                    <div key={String(ex._id)} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-sm">
                      <div className="flex flex-wrap justify-between gap-2">
                        <span className="font-semibold text-slate-900">{ex.status || "—"}</span>
                        <span className="text-xs text-slate-500">{formatDate(ex.createdAt)}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-2">
                        Ngày kết thúc đề xuất: {formatDate(ex.requestedEndDate)} · +{ex.requestedDays ?? "—"} ngày ·{" "}
                        {formatVnd(ex.proposedExtraAmount)}
                      </p>
                      {ex.note ? <p className="text-xs text-slate-700 mt-2 whitespace-pre-wrap">{ex.note}</p> : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* Soạn đề xuất GX — cùng trang, lưu CompensationProposal qua API */}
          <section id="sec-compose-gx" className="scroll-mt-28 rounded-2xl border border-indigo-200/90 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-indigo-100 bg-indigo-50/60 px-5 py-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900">Soạn đề xuất trung gian (GearXpert)</h2>
                <p className="text-xs text-slate-600 mt-0.5">
                  Gửi tại đây — sau khi gửi, hệ thống mở bước <strong className="font-semibold text-slate-800">tạm tính</strong> ngay
                  bên dưới; admin xác nhận để quyết toán ví và đóng case (không cần khách/shop bấm xác nhận trên app).
                </p>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              <AdminGxMediationForm
                formId="admin-gx-mediation-form-investigation"
                initialIssueId={String(issueId || "")}
                issueIdReadOnly
                referenceModel={referenceModel}
                onSuccess={() => load()}
                showHeader={false}
                className="border-0 shadow-none bg-indigo-50/40"
              />
            </div>
          </section>

          {gxAwaitingFinal ? (
            <section id="sec-gx-settle" className="scroll-mt-28">
              <AdminGxSettlementFinalize issueId={String(issueId)} proposal={gxAwaitingFinal} onSettled={() => load()} />
            </section>
          ) : null}

          {/* Proposals */}
          <section id="sec-proposals" className="scroll-mt-28 rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Đề xuất bồi thường (lịch sử đầy đủ)</h2>
              <p className="text-xs text-slate-500">Mở rộng từng dòng để xem lý do, giải thích và quyết định các bên.</p>
            </div>
            <div className="p-5 sm:p-6 space-y-4">
              {compensationProposals.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-12 text-center">
                  <p className="text-slate-600 font-medium">Chưa có đề xuất nào trên case này.</p>
                  <p className="text-xs text-slate-500 mt-2">
                    Dùng mục <strong>Soạn đề xuất trung gian</strong> phía trên để tạo đề xuất đầu tiên.
                  </p>
                </div>
              ) : (
                compensationProposals.map((p) => {
                  const open = expandedProposalId === String(p._id);
                  const boxStyle = FLOW_STATUS_STYLE[p.flowStatus] || "border-slate-200 bg-slate-50/50";
                  return (
                    <div
                      key={String(p._id)}
                      className={`rounded-xl border-2 ${boxStyle} overflow-hidden transition-shadow ${open ? "shadow-md" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedProposalId(open ? null : String(p._id))}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white/40"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[11px] text-slate-500">{String(p._id).slice(-10)}</span>
                            <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-800">
                              {FLOW_STATUS_LABEL[p.flowStatus] || p.flowStatus}
                            </span>
                            {p.directGearXpertReview ? (
                              <span className="text-[10px] font-bold uppercase text-violet-700">Nộp thẳng GX</span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-sm font-bold text-slate-900 tabular-nums">{formatVnd(p.amount)}</p>
                        </div>
                        <div className="shrink-0 text-slate-500">{open ? <FiChevronUp size={20} /> : <FiChevronDown size={20} />}</div>
                      </button>
                      {open && (
                        <div className="border-t border-slate-200/80 bg-white/90 px-4 py-4 space-y-4 text-sm">
                          <div className="grid sm:grid-cols-2 gap-3 text-xs">
                            <div>
                              <span className="text-slate-500">Phương án</span>
                              <p className="font-medium text-slate-900">{RESOLUTION_LABEL[p.suggestedResolution] || p.suggestedResolution}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Nguồn</span>
                              <p className="font-medium text-slate-900">{p.origin === "ADMIN_GX" ? "Admin GX" : "NCC"}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Người gửi</span>
                              <p className="font-medium text-slate-900">{p.proposedBy?.fullName || "—"}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Admin xử lý</span>
                              <p className="font-medium text-slate-900">{p.handledByAdminId?.fullName || "—"}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Duyệt tiền (nếu có)</span>
                              <p className="font-semibold tabular-nums text-emerald-800">{formatVnd(p.approvedCompensationAmount)}</p>
                            </div>
                            <div>
                              <span className="text-slate-500">Gửi lúc</span>
                              <p>{formatDate(p.submittedAt)}</p>
                            </div>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-slate-600">Lý do</span>
                            <p className="mt-1 text-slate-800 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">{p.reason || "—"}</p>
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-slate-600">Giải thích</span>
                            <p className="mt-1 text-slate-800 whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">{p.explanation || "—"}</p>
                          </div>
                          <div className="grid sm:grid-cols-2 gap-2 text-xs text-slate-700">
                            <p>
                              <span className="text-slate-500">Khách: </span>
                              {p.customerDecision || "—"} {p.customerDecisionNote ? `— ${p.customerDecisionNote}` : ""}
                            </p>
                            <p>
                              <span className="text-slate-500">Shop: </span>
                              {p.supplierDecision || "—"} {p.supplierDecisionNote ? `— ${p.supplierDecisionNote}` : ""}
                            </p>
                            <p className="sm:col-span-2">
                              <span className="text-slate-500">Admin: </span>
                              {p.adminDecision || "—"} {p.adminDecisionNote ? `— ${p.adminDecisionNote}` : ""}
                            </p>
                          </div>
                          {Array.isArray(p.images) && p.images.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {p.images.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="h-16 w-16 overflow-hidden rounded-lg border border-slate-200">
                                  <img src={url} alt="" className="h-full w-full object-cover" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Related */}
          <section id="sec-related" className="scroll-mt-28 rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden mb-8">
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
              <h2 className="text-base font-bold text-slate-900">Sự cố khác trên cùng đơn</h2>
              <p className="text-xs text-slate-500">Tránh chồng chéo phán quyết — mở hồ sơ liên quan khi cần.</p>
            </div>
            <div className="p-5 sm:p-6 space-y-6">
              {relatedDeliveryCount === 0 && relatedDamageCount === 0 ? (
                <p className="text-sm text-slate-500">Không có báo cáo khác trên rental này.</p>
              ) : (
                <>
                  {relatedIssues?.deliveryIssueReports?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-800 mb-3">Giao hàng / thu hồi</p>
                      <div className="space-y-2">
                        {relatedIssues.deliveryIssueReports.map((d) => (
                          <div
                            key={String(d._id)}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <span className="font-mono text-[11px] text-slate-500">#{String(d._id).slice(-8)}</span>
                              <span className="mx-2 text-slate-300">·</span>
                              <span className="text-sm font-medium text-slate-900">
                                {DELIVERY_ISSUE_TYPE[d.issueType] || d.issueType} · {d.status}
                              </span>
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2">{d.description}</p>
                            </div>
                            <Link
                              to={`/admin/issue-investigation/${String(d._id)}?referenceModel=${encodeURIComponent("DeliveryIssueReport")}`}
                              className="shrink-0 text-xs font-bold text-indigo-600 hover:underline"
                            >
                              Mở hồ sơ →
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {relatedIssues?.damageReports?.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-slate-800 mb-3">Hư hỏng</p>
                      <div className="space-y-2">
                        {relatedIssues.damageReports.map((d) => (
                          <div
                            key={String(d._id)}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50/40 px-4 py-3"
                          >
                            <div className="min-w-0">
                              <span className="font-mono text-[11px] text-slate-500">#{String(d._id).slice(-8)}</span>
                              <span className="mx-2 text-slate-300">·</span>
                              <span className="text-sm font-medium text-slate-900">
                                {d.severity} · {d.status}
                              </span>
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2">{d.description}</p>
                            </div>
                            <Link
                              to={`/admin/issue-investigation/${String(d._id)}?referenceModel=${encodeURIComponent("DamageReport")}`}
                              className="shrink-0 text-xs font-bold text-indigo-600 hover:underline"
                            >
                              Mở hồ sơ →
                            </Link>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 xl:sticky xl:top-24">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-3">Mã &amp; tham chiếu</p>
            <CopyField label="issueId" value={issueId} mono />
            {rid ? <CopyField label="rentalId" value={String(rid)} mono /> : null}
            <CopyField label="referenceModel" value={referenceModel} mono />
          </div>

          <div className="rounded-2xl border border-indigo-200 bg-gradient-to-b from-indigo-50/90 to-white p-5 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wide text-indigo-900 mb-3 flex items-center gap-2">
              <FiAlertTriangle size={14} /> Gợi ý kiểm tra
            </p>
            <ul className="space-y-2 text-xs text-slate-700 leading-relaxed list-disc pl-4">
              {investigationHints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs text-slate-600 leading-relaxed">
            <p className="font-bold text-slate-900 mb-2">Quy trình gợi ý</p>
            <ol className="list-decimal pl-4 space-y-2">
              <li>Đối chiếu báo cáo với dòng đơn và serial.</li>
              <li>Xem cọc, escrow và phân bổ thanh toán.</li>
              <li>Đọc hợp đồng / gia hạn nếu có.</li>
              <li>Xem lịch sử đề xuất — tránh trùng mức hoặc luồng.</li>
              <li>Soạn đề xuất GX tại mục Soạn GX; sau đó dùng mục Tạm tính &amp; quyết toán (nếu có) để duyệt số tiền và đóng case.</li>
            </ol>
          </div>

          <Link
            to="/admin/compensation-proposals"
            className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 shadow-sm"
          >
            Danh sách duyệt bồi thường <FiExternalLink size={14} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
