import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FiArrowLeft, FiCheckCircle, FiEye, FiSearch, FiXCircle } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  adminApproveCompensationProposal,
  adminGetCompensationProposals,
  adminGetCompensationSettlementPreview,
  adminRejectCompensationProposal,
} from "../../service/ApiService/ReportApi";
import { confirmDialog } from "../../utils/confirmDialog";
import Pagination from "../../components/common/Pagination";
import AdminGxMediationForm from "../../components/admin/AdminGxMediationForm";

const FLOW_STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả luồng" },
  { value: "PENDING_ADMIN_REVIEW", label: "Chờ admin duyệt" },
  { value: "PENDING_PARTY_REVIEW", label: "Chờ 2 bên (GX)" },
  { value: "SUPPLIER_ACCEPTED", label: "Shop đã OK — chờ khách" },
  { value: "ADMIN_APPROVED", label: "Đã duyệt" },
  { value: "ADMIN_REJECTED", label: "Đã từ chối" },
  { value: "CUSTOMER_ACCEPTED", label: "Khách đã xác nhận" },
  { value: "CUSTOMER_REJECTED", label: "Khách đã từ chối" },
  { value: "SUPPLIER_REJECTED", label: "Supplier đã từ chối" },
  { value: "PROPOSED", label: "Mới tạo" },
];

const FLOW_STATUS_META = {
  PROPOSED: "bg-slate-100 text-slate-700 border-slate-200",
  PENDING_PARTY_REVIEW: "bg-sky-100 text-sky-800 border-sky-200",
  CUSTOMER_ACCEPTED: "bg-blue-100 text-blue-700 border-blue-200",
  CUSTOMER_REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
  SUPPLIER_ACCEPTED: "bg-violet-100 text-violet-800 border-violet-200",
  SUPPLIER_REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
  PENDING_ADMIN_REVIEW: "bg-amber-100 text-amber-700 border-amber-200",
  ADMIN_APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  ADMIN_REJECTED: "bg-red-100 text-red-700 border-red-200",
};

const FLOW_STATUS_LABEL = {
  PROPOSED: "Mới tạo",
  PENDING_PARTY_REVIEW: "Chờ khách & shop (GX)",
  CUSTOMER_ACCEPTED: "Khách đã xác nhận",
  CUSTOMER_REJECTED: "Khách đã từ chối",
  SUPPLIER_ACCEPTED: "Shop OK — chờ khách",
  SUPPLIER_REJECTED: "Supplier đã từ chối",
  PENDING_ADMIN_REVIEW: "Chờ admin duyệt",
  ADMIN_APPROVED: "Admin đã duyệt",
  ADMIN_REJECTED: "Admin đã từ chối",
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

function getApiErrorMessage(err, fallback) {
  if (!err) return fallback;
  const m =
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    (typeof err?.message === "string" && err.message !== "Network Error" ? err.message : null);
  const s = m != null ? String(m).trim() : "";
  return s || fallback;
}

export default function AdminCompensationReviewsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [proposals, setProposals] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [flowStatus, setFlowStatus] = useState("PENDING_ADMIN_REVIEW");
  const [search, setSearch] = useState("");
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    approvedAmount: "",
    note: "",
  });
  const [settlementPreview, setSettlementPreview] = useState(null);
  const [settlementLoading, setSettlementLoading] = useState(false);
  const gxFormCardRef = useRef(null);
  const [searchParams] = useSearchParams();

  const queryIssueIdEarly = searchParams.get("issueId")?.trim() || "";

  const fetchProposals = useCallback(
    async (targetPage = 1) => {
      try {
        setLoading(true);
        const res = await adminGetCompensationProposals({
          page: targetPage,
          limit: 20,
          flowStatus,
          search,
        });
        const rows = res?.proposals || res?.data?.proposals || [];
        const pagination = res?.pagination || res?.data?.pagination || {};
        setProposals(rows);
        setPage(pagination?.page || targetPage);
        setTotalPages(pagination?.totalPages || 1);
        setTotal(pagination?.total || rows.length || 0);
      } catch (err) {
        toast.error(getApiErrorMessage(err, "Không thể tải danh sách đề xuất"));
      } finally {
        setLoading(false);
      }
    },
    [flowStatus, search]
  );

  useEffect(() => {
    fetchProposals(1);
  }, [fetchProposals]);

  useEffect(() => {
    const q = searchParams.get("issueId");
    if (!q || !/^[a-fA-F0-9]{24}$/.test(q.trim())) return;
    requestAnimationFrame(() => {
      gxFormCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    toast.info("Đã điền mã sự cố — hoàn thành form và gửi đề xuất trung gian.");
  }, [searchParams]);

  const pendingCount = useMemo(
    () => proposals.filter((item) => item?.flowStatus === "PENDING_ADMIN_REVIEW").length,
    [proposals]
  );

  const queryIssueId = queryIssueIdEarly;
  const queryReferenceModel = searchParams.get("referenceModel")?.trim() || "";
  const investigationBackLink =
    queryIssueId && /^[a-fA-F0-9]{24}$/.test(queryIssueId) && ["DeliveryIssueReport", "DamageReport"].includes(queryReferenceModel)
      ? `/admin/issue-investigation/${encodeURIComponent(queryIssueId)}?referenceModel=${encodeURIComponent(queryReferenceModel)}`
      : null;

  const handleOpenReview = (proposal) => {
    setSelectedProposal(proposal);
    setSettlementPreview(null);
    setReviewForm({
      approvedAmount: String(Number(proposal?.amount || 0)),
      note: "",
    });
  };

  const loadSettlementPreview = useCallback(async () => {
    if (!selectedProposal?._id) {
      setSettlementPreview(null);
      return;
    }
    setSettlementLoading(true);
    try {
      const raw = String(reviewForm.approvedAmount ?? "").trim();
      const parsed = raw === "" ? undefined : Number(raw);
      const params = {};
      if (parsed !== undefined && Number.isFinite(parsed) && parsed >= 0) {
        params.approvedAmount = parsed;
      }
      const res = await adminGetCompensationSettlementPreview(selectedProposal._id, params);
      const payload = res?.data != null ? res.data : res;
      setSettlementPreview(payload);
    } catch {
      setSettlementPreview(null);
    } finally {
      setSettlementLoading(false);
    }
  }, [selectedProposal?._id, reviewForm.approvedAmount]);

  useEffect(() => {
    if (!selectedProposal?._id) {
      setSettlementPreview(null);
      return;
    }
    const t = setTimeout(() => {
      loadSettlementPreview();
    }, 280);
    return () => clearTimeout(t);
  }, [selectedProposal?._id, loadSettlementPreview]);

  const submitApprove = async () => {
    if (!selectedProposal || reviewSubmitting) return;
    const issueIdRaw = selectedProposal?.issue?._id || selectedProposal?.referenceId;
    if (issueIdRaw == null || issueIdRaw === "") {
      toast.error("Không xác định được case để duyệt");
      return;
    }
    const issueId = String(issueIdRaw);
    if (selectedProposal.flowStatus !== "PENDING_ADMIN_REVIEW") {
      toast.warning("Chỉ duyệt được khi đề xuất đang chờ admin");
      return;
    }
    const parsed = Number(reviewForm.approvedAmount || 0);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.warning("Số tiền duyệt không hợp lệ");
      return;
    }
    const caseShort = String(issueId).slice(-8);
    const result = await confirmDialog({
      title: "Xác nhận duyệt đề xuất bồi thường?",
      text: `Bạn sắp duyệt mức ${parsed.toLocaleString("vi-VN")} VND cho case #${caseShort}. Sự cố sẽ ghi nhận đã kết thúc, số bồi thường lưu hệ thống và thông báo tới khách cùng nhà cung cấp.${
        reviewForm.note.trim() ? ` Ghi chú kèm theo: ${reviewForm.note.trim()}` : ""
      }`,
      icon: "question",
      confirmText: "Duyệt",
      cancelText: "Hủy",
      confirmColor: "#059669",
    });
    if (!result.isConfirmed) return;
    try {
      setReviewSubmitting(true);
      const res = await adminApproveCompensationProposal(issueId, {
        approvedAmount: parsed,
        note: reviewForm.note.trim(),
      });
      const ws = res?.walletSettlement;
      let okMsg = res?.message || "Đã duyệt đề xuất bồi thường";
      if (ws?.applied && ws?.mode) {
        okMsg = `${okMsg} (quyết toán: ${ws.mode})`;
      }
      toast.success(okMsg);
      setSelectedProposal(null);
      await fetchProposals(page);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể cập nhật kết quả duyệt"));
    } finally {
      setReviewSubmitting(false);
    }
  };

  const submitReject = async () => {
    if (!selectedProposal || reviewSubmitting) return;
    const issueIdRaw = selectedProposal?.issue?._id || selectedProposal?.referenceId;
    if (issueIdRaw == null || issueIdRaw === "") {
      toast.error("Không xác định được case để từ chối");
      return;
    }
    const issueId = String(issueIdRaw);
    if (selectedProposal.flowStatus !== "PENDING_ADMIN_REVIEW") {
      toast.warning("Chỉ từ chối được khi đề xuất đang chờ admin");
      return;
    }
    const caseShort = String(issueId).slice(-8);
    const result = await confirmDialog({
      title: "Xác nhận từ chối đề xuất?",
      text: `Từ chối case #${caseShort} — sự cố sẽ mở lại cho nhà cung cấp có thể gửi đề xuất mới.${
        reviewForm.note.trim() ? ` Ghi chú: ${reviewForm.note.trim()}` : " Bạn nên thêm ghi chú lý do từ chối nếu chưa có."
      }`,
      icon: "warning",
      confirmText: "Từ chối",
      cancelText: "Hủy",
      confirmColor: "#e11d48",
    });
    if (!result.isConfirmed) return;
    try {
      setReviewSubmitting(true);
      await adminRejectCompensationProposal(issueId, { note: reviewForm.note.trim() });
      toast.success("Đã từ chối đề xuất bồi thường");
      setSelectedProposal(null);
      await fetchProposals(page);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể cập nhật kết quả từ chối"));
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
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
        {investigationBackLink ? (
          <Link
            to={investigationBackLink}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-100"
          >
            <FiArrowLeft size={18} aria-hidden />
            Hồ sơ điều tra
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Duyệt đề xuất bồi thường</h2>
          <p className="text-sm text-slate-500 mt-1">
            {total.toLocaleString("vi-VN")} đề xuất, hiện có {pendingCount} đề xuất chờ duyệt.
          </p>
        </div>
      </div>

      <div ref={gxFormCardRef}>
        <AdminGxMediationForm
          key={queryIssueId || "gx-manual"}
          initialIssueId={queryIssueId}
          referenceModel={queryReferenceModel || null}
          issueIdReadOnly={false}
          onSuccess={() => {
            setFlowStatus("PENDING_PARTY_REVIEW");
            fetchProposals(1);
          }}
        />
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-md">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo case, lý do, khách, supplier..."
            className="w-full rounded-xl border border-slate-200 pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={flowStatus}
            onChange={(e) => setFlowStatus(e.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            {FLOW_STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => fetchProposals(1)}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Làm mới
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Case</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Khách / Supplier</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Đề xuất</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Luồng</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-700">Thời gian</th>
                <th className="px-4 py-3 text-center font-semibold text-slate-700">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1, 2, 3, 4].map((idx) => (
                  <tr key={idx} className="animate-pulse">
                    <td colSpan={6} className="px-4 py-5">
                      <div className="h-4 w-full rounded bg-slate-100" />
                    </td>
                  </tr>
                ))
              ) : proposals.length > 0 ? (
                proposals.map((proposal) => (
                  <tr key={proposal._id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-slate-900">#{String(proposal?.issue?._id || proposal?.referenceId || "").slice(-8)}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {proposal?.issue?.description || proposal.reason || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="text-xs text-slate-500">Khách: <span className="font-medium text-slate-800">{proposal?.customer?.fullName || "—"}</span></p>
                      <p className="text-xs text-slate-500 mt-1">
                        Supplier: <span className="font-medium text-slate-800">{proposal?.supplier?.fullName || "—"}</span>
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-slate-900">
                        {Number(proposal?.amount || 0).toLocaleString("vi-VN")} VND
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Duyệt: {Number(proposal?.approvedCompensationAmount || 0).toLocaleString("vi-VN")} VND
                      </p>
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${
                          FLOW_STATUS_META[proposal.flowStatus] || "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        {FLOW_STATUS_LABEL[proposal.flowStatus] || proposal.flowStatus}
                      </span>
                      {proposal.origin === "ADMIN_GX" ? (
                        <p className="text-[11px] text-sky-800 font-medium mt-1">Đề xuất GX (admin)</p>
                      ) : null}
                      {proposal.directGearXpertReview ? (
                        <p className="text-[11px] text-violet-700 font-medium mt-1">Nộp thẳng GX</p>
                      ) : null}
                      {proposal.handledByAdmin?.fullName ? (
                        <p className="text-[11px] text-slate-600 mt-0.5">
                          Phụ trách: {proposal.handledByAdmin.fullName}
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-slate-500">
                      <p>Gửi: {formatDate(proposal.submittedAt)}</p>
                      <p className="mt-1">Khách: {formatDate(proposal.customerDecidedAt)}</p>
                      <p className="mt-1">Supplier: {formatDate(proposal.supplierDecidedAt)}</p>
                    </td>
                    <td className="px-4 py-3 text-center align-top">
                      <button
                        onClick={() => handleOpenReview(proposal)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        <FiEye size={13} />
                        Xem / Duyệt
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">
                    Không có đề xuất nào phù hợp bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {proposals.length > 0 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={fetchProposals}
          />
        )}
      </div>

      {selectedProposal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Duyệt đề xuất bồi thường</h3>
              <p className="text-xs text-slate-500 mt-1">
                Case #{String(selectedProposal?.issue?._id || selectedProposal?.referenceId || "").slice(-8)}
              </p>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm max-h-[min(70vh,560px)] overflow-y-auto">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p>
                  <span className="text-slate-500">Mức đề xuất:</span>{" "}
                  <span className="font-semibold text-slate-900">
                    {Number(selectedProposal?.amount || 0).toLocaleString("vi-VN")} VND
                  </span>
                </p>
                <p className="mt-1 text-slate-700 whitespace-pre-wrap">
                  <span className="font-medium">Lý do:</span> {selectedProposal?.reason || "—"}
                </p>
                {selectedProposal?.suggestedResolution && (
                  <p className="mt-2 text-xs text-slate-600">
                    Cách xử lý gợi ý:{" "}
                    <span className="font-medium text-slate-800">
                      {selectedProposal.suggestedResolution === "CUSTOMER_PAY" && "Khách đền bù"}
                      {selectedProposal.suggestedResolution === "SUPPLIER_BEAR" && "NCC chịu trách nhiệm"}
                      {selectedProposal.suggestedResolution === "REQUEST_GX_REVIEW" && "Điều phối từ cọc (GX)"}
                      {selectedProposal.suggestedResolution === "PLATFORM_LIABILITY" &&
                        "Hệ thống đền bù thiệt hại"}
                      {!["CUSTOMER_PAY", "SUPPLIER_BEAR", "REQUEST_GX_REVIEW", "PLATFORM_LIABILITY"].includes(
                        selectedProposal.suggestedResolution
                      ) && selectedProposal.suggestedResolution}
                    </span>
                  </p>
                )}
                {selectedProposal?.directGearXpertReview ? (
                  <p className="mt-2 text-xs text-violet-800 bg-violet-50 border border-violet-200 rounded-lg px-2 py-1.5">
                    Luồng nộp thẳng GearXpert: hai bên được coi chờ GX xử; admin duyệt &amp; quyết toán theo luồng hiện tại.
                  </p>
                ) : null}
                {selectedProposal?.handledByAdmin?.fullName ? (
                  <p className="mt-2 text-xs text-slate-600">
                    Admin phụ trách:{" "}
                    <span className="font-medium text-slate-800">{selectedProposal.handledByAdmin.fullName}</span>
                    {selectedProposal.handledByAdmin.email
                      ? ` · ${selectedProposal.handledByAdmin.email}`
                      : ""}
                  </p>
                ) : null}
              </div>

              <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
                <p className="text-xs font-semibold text-indigo-900">Tạm tính dòng tiền (tham khảo)</p>
                {settlementLoading && (
                  <p className="text-xs text-indigo-700 mt-2">Đang tính…</p>
                )}
                {!settlementLoading && settlementPreview?.rows?.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {settlementPreview.suggestedResolutionLabel && (
                      <p className="text-xs text-indigo-800 mb-2">
                        Luồng đề xuất: {settlementPreview.suggestedResolutionLabel}
                      </p>
                    )}
                    {settlementPreview.summary?.depositHeld != null && (
                      <p className="text-xs font-semibold text-amber-950 bg-amber-100/90 border border-amber-200 rounded-lg px-2 py-2 mb-2">
                        Cọc trên hồ sơ (mức tương ứng khoản tạm giữ nền tảng/escrow):{" "}
                        <span className="tabular-nums">
                          {Number(settlementPreview.summary.depositHeld).toLocaleString("vi-VN")} ₫
                        </span>
                        {(settlementPreview.rental?.depositStatus === "REFUNDED" ||
                          settlementPreview.rental?.escrowStatus === "RELEASED") && (
                          <span className="block font-normal text-amber-900 mt-1">
                            Lưu ý: trạng thái cọc/escrow gợi ý đã xử lý — số tạm giữ thực tế có thể khác.
                          </span>
                        )}
                      </p>
                    )}
                    <ul className="space-y-1.5 text-xs">
                      {settlementPreview.rows.map((row) => (
                        <li
                          key={row.key}
                          className={`rounded-lg px-2 py-1.5 ${
                            row.kind === "narrative"
                              ? "bg-white/90 border border-indigo-100"
                              : row.kind === "primary"
                                ? "bg-white border border-emerald-200 flex justify-between gap-2"
                                : row.kind === "warning"
                                  ? "bg-amber-50 border border-amber-200 flex justify-between gap-2"
                                  : "bg-white/80 border border-indigo-100/80 flex justify-between gap-2"
                          }`}
                        >
                          {row.kind === "narrative" ? (
                            <div>
                              <p className="text-slate-700 font-medium">{row.label}</p>
                              {row.valueText != null && (
                                <p className="text-slate-800 mt-0.5 leading-snug">{row.valueText}</p>
                              )}
                            </div>
                          ) : (
                            <>
                              <span className="text-slate-700 text-left flex-1">{row.label}</span>
                              {row.valueText != null && (
                                <span className="text-slate-900 font-medium shrink-0 max-w-[55%] text-right text-xs">
                                  {row.valueText}
                                </span>
                              )}
                              {row.amount != null && (
                                <span className="text-slate-900 font-semibold tabular-nums shrink-0">
                                  {Number(row.amount).toLocaleString("vi-VN")} ₫
                                </span>
                              )}
                            </>
                          )}
                        </li>
                      ))}
                    </ul>
                    {settlementPreview.footNotes?.length > 0 && (
                      <ul className="mt-2 list-disc pl-4 text-[11px] text-slate-600 space-y-1">
                        {settlementPreview.footNotes.map((n, i) => (
                          <li key={i}>{n}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                {!settlementLoading && !settlementPreview?.rows?.length && (
                  <p className="text-xs text-slate-500 mt-2">Chưa tải được tạm tính. Thử đồng bộ số duyệt hợp lệ (≥ 0).</p>
                )}
              </div>

              <label className="block">
                <span className="text-xs text-slate-600">Số tiền duyệt (VND) — khi bấm Duyệt</span>
                <input
                  type="number"
                  min="0"
                  value={reviewForm.approvedAmount}
                  onChange={(e) =>
                    setReviewForm((prev) => ({ ...prev, approvedAmount: e.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>

              <label className="block">
                <span className="text-xs text-slate-600">Ghi chú admin (tùy chọn)</span>
                <textarea
                  value={reviewForm.note}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, note: e.target.value }))}
                  className="mt-1 w-full min-h-[90px] rounded-xl border border-slate-200 px-3 py-2"
                  placeholder="Ghi chú khi duyệt hoặc từ chối..."
                />
              </label>
            </div>
            <div className="px-5 py-4 border-t border-slate-200 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              {selectedProposal.flowStatus !== "PENDING_ADMIN_REVIEW" && (
                <p className="w-full sm:mr-auto text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  {selectedProposal.flowStatus === "PENDING_PARTY_REVIEW"
                    ? "Đề xuất đang chờ khách và shop xác nhận — chưa thể Duyệt / Từ chối quyết toán ví tại đây."
                    : selectedProposal.flowStatus === "SUPPLIER_ACCEPTED"
                    ? "Shop đã đồng ý; chờ khách xác nhận trước khi vào bước admin duyệt ví."
                    : "Đề xuất này không còn chờ duyệt. Chỉ xem thông tin — không thể Duyệt / Từ chối lại ở đây."}
                </p>
              )}
              <button
                onClick={() => setSelectedProposal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={submitReject}
                disabled={
                  reviewSubmitting || selectedProposal.flowStatus !== "PENDING_ADMIN_REVIEW"
                }
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60"
              >
                <FiXCircle size={14} />
                {reviewSubmitting ? "Đang lưu..." : "Từ chối"}
              </button>
              <button
                type="button"
                onClick={submitApprove}
                disabled={
                  reviewSubmitting || selectedProposal.flowStatus !== "PENDING_ADMIN_REVIEW"
                }
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
              >
                <FiCheckCircle size={14} />
                {reviewSubmitting ? "Đang lưu..." : "Duyệt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
