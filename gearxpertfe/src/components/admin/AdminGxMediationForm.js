import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { adminCreateGxMediationProposal } from "../../service/ApiService/ReportApi";

const DEFAULT_FORM = {
  issueId: "",
  amount: "0",
  reason: "",
  explanation: "",
  suggestedResolution: "CUSTOMER_PAY",
};

function getApiErrorMessage(err, fallback) {
  if (!err) return fallback;
  const m =
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    (typeof err?.message === "string" && err.message !== "Network Error" ? err.message : null);
  const s = m != null ? String(m).trim() : "";
  return s || fallback;
}

/**
 * Form gửi đề xuất trung gian GX (multipart) — lưu CompensationProposal gắn issue (origin ADMIN_GX).
 */
export default function AdminGxMediationForm({
  formId = "admin-gx-mediation-form",
  initialIssueId = "",
  issueIdReadOnly = false,
  referenceModel = null,
  onSuccess,
  className = "",
  showHeader = true,
  title = "Tạo đề xuất trung gian GearXpert",
  description = 'Khi NCC đã nhờ can thiệp và case ở "Chờ Admin GearXpert", điền đề xuất. Luồng hiện tại: hệ thống chuyển thẳng sang bước tạm tính + chờ admin duyệt quyết toán (không bắt khách/shop bấm xác nhận trên app).',
  resetOnSuccess = true,
}) {
  const [gxForm, setGxForm] = useState(() => ({
    ...DEFAULT_FORM,
    issueId: initialIssueId || "",
  }));
  const [gxFiles, setGxFiles] = useState([]);
  const [gxSubmitting, setGxSubmitting] = useState(false);

  useEffect(() => {
    setGxForm((p) => ({ ...p, issueId: initialIssueId || "" }));
  }, [initialIssueId]);

  const resolveIssueId = () => {
    if (issueIdReadOnly && initialIssueId) return String(initialIssueId).trim();
    return String(gxForm.issueId || "").trim();
  };

  const submitGxMediation = async () => {
    if (gxSubmitting) return;
    const issueId = resolveIssueId();
    if (!issueId || !/^[a-fA-F0-9]{24}$/.test(issueId)) {
      toast.warning("Nhập mã sự cố (issueId) hợp lệ — 24 ký tự hex.");
      return;
    }
    const amountNum = Number(gxForm.amount || 0);
    if (!Number.isFinite(amountNum) || amountNum < 0) {
      toast.warning("Số tiền không hợp lệ");
      return;
    }
    if (!gxForm.reason.trim()) {
      toast.warning("Nhập lý do");
      return;
    }
    if (gxForm.explanation.trim().length < 10) {
      toast.warning("Giải thích tối thiểu 10 ký tự");
      return;
    }
    if (
      (gxForm.suggestedResolution === "CUSTOMER_PAY" ||
        gxForm.suggestedResolution === "PLATFORM_LIABILITY") &&
      amountNum <= 0
    ) {
      toast.warning("Phương án này cần số tiền bồi thường > 0");
      return;
    }
    try {
      setGxSubmitting(true);
      const fd = new FormData();
      fd.append("amount", String(amountNum));
      fd.append("reason", gxForm.reason.trim());
      fd.append("explanation", gxForm.explanation.trim());
      fd.append("suggestedResolution", gxForm.suggestedResolution);
      gxFiles.forEach((f) => fd.append("images", f));
      const res = await adminCreateGxMediationProposal(issueId, fd);
      const payload = res?.data ?? res;
      const msg = payload?.message || "Đã tạo đề xuất trung gian";
      toast.success(msg);
      setGxFiles([]);
      if (resetOnSuccess) {
        setGxForm({
          ...DEFAULT_FORM,
          issueId: issueIdReadOnly ? String(initialIssueId || "").trim() : "",
        });
      }
      onSuccess?.(payload);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không thể tạo đề xuất GX"));
    } finally {
      setGxSubmitting(false);
    }
  };

  return (
    <div id={formId} className={`bg-indigo-50/80 border border-indigo-200 rounded-2xl p-4 space-y-3 ${className}`}>
      {showHeader ? (
        <div>
          <h3 className="text-sm font-bold text-indigo-950">{title}</h3>
          <p className="text-xs text-indigo-900 mt-1">{description}</p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
        {issueIdReadOnly && initialIssueId ? (
          <div className="md:col-span-2 rounded-xl border border-indigo-200 bg-white px-3 py-2.5">
            <span className="text-xs text-indigo-900">Mã sự cố (issueId)</span>
            <p className="font-mono text-sm font-semibold text-slate-900 mt-0.5 break-all">{initialIssueId}</p>
            {referenceModel ? (
              <p className="text-[11px] text-slate-500 mt-1">
                Loại báo cáo: <span className="font-medium">{referenceModel}</span>
              </p>
            ) : null}
          </div>
        ) : (
          <label className="block md:col-span-2">
            <span className="text-xs text-indigo-900">Mã sự cố (issueId)</span>
            <input
              value={gxForm.issueId}
              onChange={(e) => setGxForm((p) => ({ ...p, issueId: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2 bg-white"
              placeholder="Ví dụ: 674a…"
            />
          </label>
        )}
        <label className="block">
          <span className="text-xs text-indigo-900">Số tiền (VND)</span>
          <input
            type="number"
            min="0"
            value={gxForm.amount}
            onChange={(e) => setGxForm((p) => ({ ...p, amount: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2 bg-white"
          />
        </label>
        <label className="block">
          <span className="text-xs text-indigo-900">Phương án</span>
          <select
            value={gxForm.suggestedResolution}
            onChange={(e) => setGxForm((p) => ({ ...p, suggestedResolution: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2 bg-white"
          >
            <option value="CUSTOMER_PAY">Khách đền bù</option>
            <option value="SUPPLIER_BEAR">NCC chịu trách nhiệm</option>
            <option value="PLATFORM_LIABILITY">Hệ thống đền bù thiệt hại</option>
          </select>
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs text-indigo-900">Lý do</span>
          <input
            value={gxForm.reason}
            onChange={(e) => setGxForm((p) => ({ ...p, reason: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-indigo-200 px-3 py-2 bg-white"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs text-indigo-900">Giải thích chi tiết</span>
          <textarea
            value={gxForm.explanation}
            onChange={(e) => setGxForm((p) => ({ ...p, explanation: e.target.value }))}
            className="mt-1 w-full min-h-[72px] rounded-xl border border-indigo-200 px-3 py-2 bg-white"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs text-indigo-900">Ảnh minh chứng (tùy chọn)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setGxFiles(Array.from(e.target.files || []).slice(0, 8))}
            className="mt-1 w-full text-xs"
          />
        </label>
      </div>
      <button
        type="button"
        onClick={submitGxMediation}
        disabled={gxSubmitting}
        className="rounded-xl bg-indigo-600 text-white px-4 py-2 text-sm font-semibold hover:bg-indigo-700 disabled:opacity-60"
      >
        {gxSubmitting ? "Đang gửi…" : "Gửi đề xuất trung gian"}
      </button>
    </div>
  );
}
