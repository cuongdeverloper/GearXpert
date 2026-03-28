import React from "react";
import { CircleCheck, ShieldCheck } from "lucide-react";

export default function SuccessConfirmCard({
  confirmForm,
  setConfirmForm,
  onConfirmSuccess,
  working,
  activeAttempt,
  canProcessHandover,
}) {
  return (
    <div className="border border-emerald-200 bg-emerald-50 rounded-2xl p-4 space-y-3">
      <p className="font-semibold text-emerald-800 flex items-center gap-2">
        <ShieldCheck size={16} /> Xác nhận giao thành công
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
      <input
        value={confirmForm.signatureUrl}
        onChange={(e) =>
          setConfirmForm((prev) => ({ ...prev, signatureUrl: e.target.value }))
        }
        className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm"
        placeholder="URL chữ ký / ảnh xác nhận"
      />
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
        onClick={onConfirmSuccess}
        disabled={working || !activeAttempt || !canProcessHandover}
        className="w-full px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
      >
        <span className="inline-flex items-center gap-2">
          <CircleCheck size={15} /> Confirm Success
        </span>
      </button>
    </div>
  );
}
