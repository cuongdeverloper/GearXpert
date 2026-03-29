import React, { useRef } from "react";
import { CircleCheck, ShieldCheck, Upload, X } from "lucide-react";

export default function SuccessConfirmCard({
  confirmForm,
  setConfirmForm,
  onConfirmSuccess,
  working,
  activeAttempt,
  canProcessHandover,
  contextType = "DELIVERY",
}) {
  const fileInputRef = useRef(null);

  const toDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Không thể đọc file ảnh"));
      reader.readAsDataURL(file);
    });

  const handleFileSelect = async (e) => {
    const files = e.target.files;
    if (!files) return;

    const selectedFiles = Array.from(files);
    let newUrls = [];
    try {
      newUrls = await Promise.all(selectedFiles.map((file) => toDataUrl(file)));
    } catch (error) {
      alert("Không thể xem trước ảnh, vui lòng thử lại.");
      return;
    }

    setConfirmForm((prev) => ({
      ...prev,
      signatureUrls: [...(prev.signatureUrls || []), ...newUrls],
      signatureFiles: [...(prev.signatureFiles || []), ...selectedFiles],
    }));

    e.target.value = "";
  };

  const removeSignatureUrl = (index) => {
    setConfirmForm((prev) => ({
      ...prev,
      signatureUrls: prev.signatureUrls.filter((_, i) => i !== index),
      signatureFiles: (prev.signatureFiles || []).filter((_, i) => i !== index),
    }));
  };

  const handleConfirmSuccess = () => {
    if (!confirmForm.operatorNote?.trim()) {
      alert("Vui lòng ghi chú chi tiết kiểm tra thiết bị/phụ kiện.");
      return;
    }
    onConfirmSuccess();
  };

  const signatureList = Array.isArray(confirmForm.signatureUrls)
    ? confirmForm.signatureUrls
    : [];

  const isReturnFlow = contextType === "RETURN";

  return (
    <div className="border border-emerald-200 bg-emerald-50 rounded-2xl p-4 space-y-3">
      <p className="font-semibold text-emerald-800 flex items-center gap-2">
        <ShieldCheck size={16} />
        {isReturnFlow ? "Xác nhận thu hồi thành công" : "Xác nhận giao thành công"}
      </p>
      <input
        value={confirmForm.confirmerName}
        onChange={(e) =>
          setConfirmForm((prev) => ({ ...prev, confirmerName: e.target.value }))
        }
        className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm"
        placeholder="Tên người nhận xác nhận (mặc định lấy từ phía trên)"
      />
      <input
        value={confirmForm.confirmerPhone}
        onChange={(e) =>
          setConfirmForm((prev) => ({ ...prev, confirmerPhone: e.target.value }))
        }
        className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm"
        placeholder="SĐT người xác nhận (mặc định lấy từ phía trên)"
      />

      <div className="space-y-2">
        <label className="text-xs font-semibold text-emerald-800 uppercase">
          {isReturnFlow ? "Ghi chú kiểm tra thu hồi" : "Ghi chú kiểm tra thiết bị/phụ kiện"} <span className="text-emerald-600">*</span>
        </label>
        <textarea
          value={confirmForm.operatorNote}
          onChange={(e) =>
            setConfirmForm((prev) => ({ ...prev, operatorNote: e.target.value }))
          }
          rows={3}
          className={`w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
            confirmForm.operatorNote?.trim()
              ? "border-emerald-200 bg-white"
              : "border-emerald-300 bg-white"
          }`}
          placeholder={
            isReturnFlow
              ? "Ghi chú bắt buộc: Mô tả chi tiết kiểm tra khi thu hồi"
              : "Ghi chú bắt buộc: Mô tả chi tiết kiểm tra các thiết bị/phụ kiện"
          }
        />
        {!confirmForm.operatorNote?.trim() && (
          <p className="text-xs text-emerald-600 font-medium">
            ⚠️ Ghi chú là bắt buộc
          </p>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs font-semibold text-emerald-800 uppercase">
          Hình ảnh xác nhận
        </label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={working}
          className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-emerald-700 text-sm font-medium hover:bg-emerald-50 disabled:opacity-50 flex items-center justify-center gap-2"
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

        {signatureList.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {signatureList.map((url, idx) => (
              <div
                key={idx}
                className="relative group rounded-lg overflow-hidden border border-emerald-200 bg-emerald-100"
              >
                <img
                  src={url}
                  alt={`Signature ${idx + 1}`}
                  className="w-full h-20 object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeSignatureUrl(idx)}
                  className="absolute top-1 right-1 p-1 bg-emerald-600 text-white rounded opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <label className="text-sm text-emerald-900 flex items-center gap-2">
        <input
          type="checkbox"
          checked={confirmForm.otpVerified}
          onChange={(e) =>
            setConfirmForm((prev) => ({ ...prev, otpVerified: e.target.checked }))
          }
        />
        OTP đã xác minh
      </label>

      <button
        onClick={handleConfirmSuccess}
        disabled={working || !activeAttempt || !canProcessHandover || !confirmForm.operatorNote?.trim()}
        className="w-full px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition"
      >
        <span className="inline-flex items-center gap-2">
          <CircleCheck size={15} /> {isReturnFlow ? "Xác nhận thu hồi thành công" : "Xác nhận giao thành công"}
        </span>
      </button>
    </div>
  );
}
