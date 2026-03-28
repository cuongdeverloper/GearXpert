import React from "react";
import { CircleX } from "lucide-react";
import { FAILURE_OPTIONS } from "../constants";

export default function FailureConfirmCard({
  failureForm,
  setFailureForm,
  onFail,
  working,
  activeAttempt,
  canProcessHandover,
}) {
  return (
    <div className="border border-red-200 bg-red-50 rounded-2xl p-4 space-y-3">
      <p className="font-semibold text-red-800">Đánh dấu giao thất bại</p>
      <select
        value={failureForm.reason}
        onChange={(e) =>
          setFailureForm((prev) => ({ ...prev, reason: e.target.value }))
        }
        className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm"
      >
        <option value="">Chọn lý do thất bại</option>
        {FAILURE_OPTIONS.map((op) => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>
      <textarea
        value={failureForm.detail}
        onChange={(e) =>
          setFailureForm((prev) => ({ ...prev, detail: e.target.value }))
        }
        rows={2}
        className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm"
        placeholder="Mô tả chi tiết"
      />
      <input
        value={failureForm.noShowWaitMinutes}
        onChange={(e) =>
          setFailureForm((prev) => ({ ...prev, noShowWaitMinutes: e.target.value }))
        }
        className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm"
        placeholder="No-show chờ bao nhiêu phút"
      />
      <input
        value={failureForm.missingAccessories}
        onChange={(e) =>
          setFailureForm((prev) => ({ ...prev, missingAccessories: e.target.value }))
        }
        className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm"
        placeholder="Thiếu phụ kiện (ngăn cách dấu phẩy)"
      />
      <input
        value={failureForm.mismatchedSerials}
        onChange={(e) =>
          setFailureForm((prev) => ({ ...prev, mismatchedSerials: e.target.value }))
        }
        className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm"
        placeholder="Serial sai (ngăn cách dấu phẩy)"
      />
      <textarea
        value={failureForm.evidenceUrls}
        onChange={(e) =>
          setFailureForm((prev) => ({ ...prev, evidenceUrls: e.target.value }))
        }
        rows={2}
        className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm"
        placeholder="Evidence URL (mỗi dòng 1 link)"
      />
      <button
        onClick={onFail}
        disabled={working || !activeAttempt || !canProcessHandover}
        className="w-full px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
      >
        <span className="inline-flex items-center gap-2">
          <CircleX size={15} /> Confirm Failed
        </span>
      </button>
    </div>
  );
}
