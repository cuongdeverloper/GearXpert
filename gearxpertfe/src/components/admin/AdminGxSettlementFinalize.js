import { useCallback, useEffect, useState } from "react";
import { FiCheckCircle, FiRefreshCw } from "react-icons/fi";
import { toast } from "react-toastify";
import {
  adminApproveCompensationProposal,
  adminGetCompensationSettlementPreview,
} from "../../service/ApiService/ReportApi";

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

function SettlementRow({ row }) {
  const isNarrative = row.kind === "narrative";
  const amt = row.amount;
  const hasAmount = amt !== undefined && amt !== null && Number.isFinite(Number(amt));
  const right = hasAmount ? formatVnd(amt) : row.valueText || "—";

  if (isNarrative) {
    return (
      <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs text-slate-700 leading-relaxed">
        <p className="font-semibold text-slate-800">{row.label}</p>
        {row.valueText ? <p className="mt-1 text-slate-600">{row.valueText}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-2 py-1.5 border-b border-slate-100/90 last:border-0 text-xs">
      <span className="text-slate-600 max-w-[72%]">{row.label}</span>
      <span
        className={`font-semibold tabular-nums text-right shrink-0 ${
          row.kind === "warning" ? "text-amber-800" : row.kind === "out" ? "text-rose-800" : "text-slate-900"
        }`}
      >
        {right}
      </span>
    </div>
  );
}

/**
 * Tạm tính + nút duyệt quyết toán khi đề xuất ADMIN_GX ở PENDING_ADMIN_REVIEW.
 */
export default function AdminGxSettlementFinalize({ issueId, proposal, onSettled, className = "" }) {
  const proposalId = proposal?._id ? String(proposal._id) : "";
  const defaultAmt = proposal?.amount != null ? String(proposal.amount) : "0";
  const [approvedAmount, setApprovedAmount] = useState(defaultAmt);
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setApprovedAmount(defaultAmt);
  }, [defaultAmt, proposalId]);

  const loadPreview = useCallback(async () => {
    if (!proposalId || !issueId) return;
    const n = Number(approvedAmount);
    if (!Number.isFinite(n) || n < 0) {
      setPreview(null);
      setPreviewError("Số tiền duyệt không hợp lệ");
      return;
    }
    try {
      setPreviewLoading(true);
      setPreviewError(null);
      const res = await adminGetCompensationSettlementPreview(proposalId, { approvedAmount: n });
      const data = res?.data ?? res;
      if (!data?.success) {
        setPreview(null);
        setPreviewError(data?.message || "Không lấy được tạm tính");
        return;
      }
      setPreview(data);
    } catch (err) {
      setPreview(null);
      setPreviewError(getApiErrorMessage(err, "Không tải được tạm tính"));
    } finally {
      setPreviewLoading(false);
    }
  }, [proposalId, issueId, approvedAmount]);

  useEffect(() => {
    const t = setTimeout(() => {
      loadPreview();
    }, 320);
    return () => clearTimeout(t);
  }, [loadPreview]);

  const handleApprove = async () => {
    if (!issueId || submitting) return;
    const n = Number(approvedAmount);
    if (!Number.isFinite(n) || n < 0) {
      toast.warning("Nhập số tiền duyệt hợp lệ (≥ 0)");
      return;
    }
    try {
      setSubmitting(true);
      const res = await adminApproveCompensationProposal(issueId, {
        approvedAmount: n,
        note: note.trim() || undefined,
      });
      const data = res?.data ?? res;
      toast.success(data?.message || "Đã duyệt quyết toán");
      onSettled?.(data);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể duyệt quyết toán"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!proposalId || !proposal) return null;

  return (
    <div
      className={`rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-white to-white shadow-sm overflow-hidden ${className}`}
    >
      <div className="border-b border-emerald-100 bg-emerald-50/70 px-5 py-4">
        <h3 className="text-base font-bold text-emerald-950">Tạm tính &amp; quyết toán (GX admin)</h3>
        <p className="text-xs text-emerald-900/85 mt-1">
          Đề xuất đang chờ admin duyệt. Điều chỉnh số tiền duyệt nếu cần — xem bảng tạm tính rồi bấm xác nhận để ghi ví và đóng case.
        </p>
      </div>
      <div className="p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="text-xs font-medium text-slate-600">Số tiền admin duyệt (VND)</span>
            <input
              type="number"
              min="0"
              value={approvedAmount}
              onChange={(e) => setApprovedAmount(e.target.value)}
              className="mt-1 w-full rounded-xl border border-emerald-200/80 px-3 py-2 text-sm bg-white"
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="text-xs font-medium text-slate-600">Ghi chú duyệt (tùy chọn)</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="mt-1 w-full rounded-xl border border-emerald-200/80 px-3 py-2 text-sm bg-white"
              placeholder="Ví dụ: đã đối chiếu cọc…"
            />
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => loadPreview()}
            disabled={previewLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-50 disabled:opacity-50"
          >
            <FiRefreshCw size={14} className={previewLoading ? "animate-spin" : ""} />
            Làm mới tạm tính
          </button>
          {preview?.suggestedResolutionLabel ? (
            <span className="text-xs text-slate-600">
              Phương án: <strong className="text-slate-800">{preview.suggestedResolutionLabel}</strong>
            </span>
          ) : null}
        </div>

        {previewError ? (
          <p className="text-sm text-rose-700 rounded-xl bg-rose-50 border border-rose-100 px-3 py-2">{previewError}</p>
        ) : null}

        {previewLoading && !preview ? (
          <div className="text-sm text-slate-500 py-6 text-center">Đang tính tạm…</div>
        ) : null}

        {preview?.summary ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
            <p className="text-xs font-bold text-slate-800 uppercase tracking-wide">Tóm tắt ba bên (minh họa)</p>
            <div className="grid sm:grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
                <span className="text-slate-500">Nền tảng</span>
                <p className="font-semibold tabular-nums text-slate-900 mt-0.5">{formatVnd(preview.summary.platformReceives)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
                <span className="text-slate-500">Khách</span>
                <p className="font-semibold tabular-nums text-slate-900 mt-0.5">{formatVnd(preview.summary.customerReceives)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 border border-slate-100">
                <span className="text-slate-500">NCC</span>
                <p className="font-semibold tabular-nums text-slate-900 mt-0.5">{formatVnd(preview.summary.supplierReceives)}</p>
              </div>
            </div>
            {preview.summary.customerExtraPayIfOverDeposit > 0 ? (
              <p className="text-[11px] text-amber-800">
                Phần bồi thường vượt cọc (minh họa): {formatVnd(preview.summary.customerExtraPayIfOverDeposit)}
              </p>
            ) : null}
          </div>
        ) : null}

        {Array.isArray(preview?.rows) && preview.rows.length > 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-4 max-h-[420px] overflow-y-auto">
            <p className="text-xs font-bold text-slate-800 mb-2">Chi tiết dòng tiền (tạm tính)</p>
            <div className="space-y-0.5">
              {preview.rows.map((row, idx) => (
                <SettlementRow key={`${row.key}-${idx}`} row={row} />
              ))}
            </div>
          </div>
        ) : null}

        {Array.isArray(preview?.footNotes) && preview.footNotes.length > 0 ? (
          <ul className="text-[11px] text-slate-500 space-y-1 list-disc pl-4">
            {preview.footNotes.map((fn, i) => (
              <li key={i}>{fn}</li>
            ))}
          </ul>
        ) : null}

        <button
          type="button"
          onClick={handleApprove}
          disabled={submitting || previewLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white px-5 py-3 text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 shadow-md"
        >
          <FiCheckCircle size={18} />
          {submitting ? "Đang xử lý…" : "Xác nhận quyết toán & đóng case"}
        </button>
      </div>
    </div>
  );
}
