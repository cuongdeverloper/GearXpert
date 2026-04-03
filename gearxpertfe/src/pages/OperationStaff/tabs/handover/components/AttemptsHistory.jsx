import React, { useMemo, useState } from "react";
import { Package } from "lucide-react";
import { STATUS_BADGE } from "../constants";
import ReturnFailureDetailDialog from "./ReturnFailureDetailDialog";

export default function AttemptsHistory({
  loadingAttempts,
  attempts,
  fallbackCustomerName = "Khách hàng",
  fallbackPhone = "-",
}) {
  const [selectedAttempt, setSelectedAttempt] = useState(null);

  const detail = useMemo(() => {
    if (!selectedAttempt) return null;
    return {
      title: `Chi tiết attempt #${selectedAttempt.attemptNo || "-"}`,
      customerName: selectedAttempt?.prefetchedSnapshot?.deliveryAddress?.receiverName || fallbackCustomerName,
      phone: selectedAttempt?.prefetchedSnapshot?.phoneNumber || fallbackPhone,
      reason: selectedAttempt?.failure?.reason || "",
      operatorNote: selectedAttempt?.failure?.operatorNote || selectedAttempt?.failure?.detail || "",
      images: selectedAttempt?.failure?.evidenceUrls || [],
    };
  }, [selectedAttempt, fallbackCustomerName, fallbackPhone]);

  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-slate-800">Lịch sử attempts</h4>
      {loadingAttempts ? (
        <p className="text-sm text-slate-500">Đang tải attempts...</p>
      ) : attempts.length === 0 ? (
        <p className="text-sm text-slate-500">Chưa có biên bản nào.</p>
      ) : (
        <div className="space-y-2">
          {attempts.map((attempt) => (
            <div
              key={attempt.id}
              className={`rounded-xl border p-3 flex items-start justify-between gap-3 ${
                attempt?.failure?.reason
                  ? "border-red-200 bg-red-50/40 cursor-pointer hover:bg-red-50"
                  : "border-slate-200"
              }`}
              onClick={() => {
                if (attempt?.failure?.reason) {
                  setSelectedAttempt(attempt);
                }
              }}
            >
              <div>
                <p className="font-semibold text-slate-800 flex items-center gap-2">
                  <Package size={15} /> Attempt #{attempt.attemptNo}
                </p>
                <p className="text-sm text-slate-600 mt-1">
                  Kết quả: {attempt.result || "-"}
                  {attempt.failure?.reason ? ` | Lý do: ${attempt.failure.reason}` : ""}
                </p>
              </div>
              <span
                className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                  STATUS_BADGE[attempt.status] || "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {attempt.status}
              </span>
            </div>
          ))}
        </div>
      )}
      <ReturnFailureDetailDialog
        open={Boolean(selectedAttempt)}
        onClose={() => setSelectedAttempt(null)}
        detail={detail}
      />
    </div>
  );
}
