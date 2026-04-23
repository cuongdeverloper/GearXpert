import { useCallback, useEffect, useMemo, useState } from "react";
import { FiCheckCircle, FiEye, FiSearch, FiXCircle } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  adminApproveCompensationProposal,
  adminGetCompensationProposals,
  adminRejectCompensationProposal,
} from "../../service/ApiService/ReportApi";

const FLOW_STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả luồng" },
  { value: "PENDING_ADMIN_REVIEW", label: "Chờ admin duyệt" },
  { value: "ADMIN_APPROVED", label: "Đã duyệt" },
  { value: "ADMIN_REJECTED", label: "Đã từ chối" },
  { value: "CUSTOMER_ACCEPTED", label: "Khách đã xác nhận" },
  { value: "CUSTOMER_REJECTED", label: "Khách đã từ chối" },
  { value: "SUPPLIER_REJECTED", label: "Supplier đã từ chối" },
  { value: "PROPOSED", label: "Mới tạo" },
];

const FLOW_STATUS_META = {
  PROPOSED: "bg-slate-100 text-slate-700 border-slate-200",
  CUSTOMER_ACCEPTED: "bg-blue-100 text-blue-700 border-blue-200",
  CUSTOMER_REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
  SUPPLIER_REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
  PENDING_ADMIN_REVIEW: "bg-amber-100 text-amber-700 border-amber-200",
  ADMIN_APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  ADMIN_REJECTED: "bg-red-100 text-red-700 border-red-200",
};

const FLOW_STATUS_LABEL = {
  PROPOSED: "Mới tạo",
  CUSTOMER_ACCEPTED: "Khách đã xác nhận",
  CUSTOMER_REJECTED: "Khách đã từ chối",
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

export default function AdminCompensationReviewsPage() {
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
        toast.error(err?.response?.data?.message || "Không thể tải danh sách đề xuất");
      } finally {
        setLoading(false);
      }
    },
    [flowStatus, search]
  );

  useEffect(() => {
    fetchProposals(1);
  }, [fetchProposals]);

  const pendingCount = useMemo(
    () => proposals.filter((item) => item?.flowStatus === "PENDING_ADMIN_REVIEW").length,
    [proposals]
  );

  const handleOpenReview = (proposal) => {
    setSelectedProposal(proposal);
    setReviewForm({
      approvedAmount: String(Number(proposal?.amount || 0)),
      note: "",
    });
  };

  const submitApprove = async () => {
    if (!selectedProposal || reviewSubmitting) return;
    const issueId = selectedProposal?.issue?._id || selectedProposal?.referenceId;
    if (!issueId) {
      toast.error("Không xác định được case để duyệt");
      return;
    }
    const parsed = Number(reviewForm.approvedAmount || 0);
    if (!Number.isFinite(parsed) || parsed < 0) {
      toast.warning("Số tiền duyệt không hợp lệ");
      return;
    }
    try {
      setReviewSubmitting(true);
      await adminApproveCompensationProposal(issueId, {
        approvedAmount: parsed,
        note: reviewForm.note.trim(),
      });
      toast.success("Đã duyệt đề xuất bồi thường");
      setSelectedProposal(null);
      await fetchProposals(page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể cập nhật kết quả duyệt");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const submitReject = async () => {
    if (!selectedProposal || reviewSubmitting) return;
    const issueId = selectedProposal?.issue?._id || selectedProposal?.referenceId;
    if (!issueId) {
      toast.error("Không xác định được case để từ chối");
      return;
    }
    try {
      setReviewSubmitting(true);
      await adminRejectCompensationProposal(issueId, { note: reviewForm.note.trim() });
      toast.success("Đã từ chối đề xuất bồi thường");
      setSelectedProposal(null);
      await fetchProposals(page);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể cập nhật kết quả từ chối");
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Duyệt đề xuất bồi thường</h2>
          <p className="text-sm text-slate-500 mt-1">
            {total.toLocaleString("vi-VN")} đề xuất, hiện có {pendingCount} đề xuất chờ duyệt.
          </p>
        </div>
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
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-4 py-3">
          <button
            onClick={() => fetchProposals(Math.max(1, page - 1))}
            disabled={page <= 1 || loading}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 disabled:opacity-50"
          >
            Trước
          </button>
          <span className="text-xs text-slate-500">
            Trang {page}/{totalPages}
          </span>
          <button
            onClick={() => fetchProposals(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || loading}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 disabled:opacity-50"
          >
            Sau
          </button>
        </div>
      </div>

      {selectedProposal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-xl">
            <div className="px-5 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Duyệt đề xuất bồi thường</h3>
              <p className="text-xs text-slate-500 mt-1">
                Case #{String(selectedProposal?.issue?._id || selectedProposal?.referenceId || "").slice(-8)}
              </p>
            </div>
            <div className="px-5 py-4 space-y-3 text-sm">
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
            <div className="px-5 py-4 border-t border-slate-200 flex flex-wrap justify-end gap-2">
              <button
                onClick={() => setSelectedProposal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={submitReject}
                disabled={reviewSubmitting}
                className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-60"
              >
                <FiXCircle size={14} />
                {reviewSubmitting ? "Đang lưu..." : "Từ chối"}
              </button>
              <button
                type="button"
                onClick={submitApprove}
                disabled={reviewSubmitting}
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
