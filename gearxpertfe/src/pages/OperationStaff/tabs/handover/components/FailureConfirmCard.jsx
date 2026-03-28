import React, { useRef } from "react";
import { CircleX, Upload, X } from "lucide-react";
import { FAILURE_OPTIONS } from "../constants";

export default function FailureConfirmCard({
  failureForm,
  setFailureForm,
  onFail,
  working,
  activeAttempt,
  canProcessHandover,
  contextType = "DELIVERY",
  failureOptions,
}) {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (!files) return;

    const newUrls = Array.from(files).map((file) => {
      return URL.createObjectURL(file);
    });

    setFailureForm((prev) => ({
      ...prev,
      evidenceUrls: [...(prev.evidenceUrls || []), ...newUrls],
    }));
  };

  const removeEvidenceUrl = (index) => {
    setFailureForm((prev) => ({
      ...prev,
      evidenceUrls: prev.evidenceUrls.filter((_, i) => i !== index),
    }));
  };

  const handleConfirmFail = () => {
    if (!failureForm.operatorNote?.trim()) {
      alert("Vui lòng ghi chú chi tiết lý do giao thất bại.");
      return;
    }
    onFail();
  };

  const evidenceList = Array.isArray(failureForm.evidenceUrls)
    ? failureForm.evidenceUrls
    : [];
  const isReturnFlow = contextType === "RETURN";
  const reasonOptions = failureOptions || FAILURE_OPTIONS;

  return (
    <div className="border border-red-200 bg-red-50 rounded-2xl p-4 space-y-3">
      <p className="font-semibold text-red-800">
        {isReturnFlow ? "Đánh dấu thu hồi thất bại" : "Đánh dấu giao thất bại"}
      </p>
      <select
        value={failureForm.reason}
        onChange={(e) =>
          setFailureForm((prev) => ({ ...prev, reason: e.target.value }))
        }
        className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm"
      >
        <option value="">{isReturnFlow ? "Chọn lý do thu hồi thất bại" : "Chọn lý do thất bại"}</option>
        {reasonOptions.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-red-800 uppercase">
          Ghi chú chi tiết <span className="text-red-600">*</span>
        </label>
        <textarea
          value={failureForm.operatorNote}
          onChange={(e) =>
            setFailureForm((prev) => ({ ...prev, operatorNote: e.target.value }))
          }
          rows={3}
          className={`w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent ${
            failureForm.operatorNote?.trim()
              ? "border-red-200 bg-white"
              : "border-red-300 bg-white"
          }`}
          placeholder={
            isReturnFlow
              ? "Ghi chú bắt buộc: Mô tả chi tiết tại sao thu hồi thất bại"
              : "Ghi chú bắt buộc: Mô tả chi tiết tại sao giao thất bại"
          }
        />
        {!failureForm.operatorNote?.trim() && (
          <p className="text-xs text-red-600 font-medium">
            ⚠️ Ghi chú là bắt buộc
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-red-800 uppercase">
          Hình ảnh chứng cứ
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={working}
          className="w-full px-3 py-2 rounded-xl border border-red-300 bg-white text-red-700 text-sm font-medium hover:bg-red-50 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          <Upload size={16} /> Chọn ảnh từ máy
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        
        {evidenceList.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {evidenceList.map((url, idx) => (
              <div
                key={idx}
                className="relative group rounded-lg overflow-hidden border border-red-200 bg-red-100"
              >
                <img
                  src={url}
                  alt={`Evidence ${idx + 1}`}
                  className="w-full h-20 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeEvidenceUrl(idx)}
                  className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleConfirmFail}
        disabled={working || !activeAttempt || !canProcessHandover || !failureForm.operatorNote?.trim()}
        className="w-full px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition"
      >
        <span className="inline-flex items-center gap-2">
          <CircleX size={15} /> {isReturnFlow ? "Xác nhận thu hồi thất bại" : "Xác nhận giao thất bại"}
        </span>
      </button>
    </div>
  );
}
