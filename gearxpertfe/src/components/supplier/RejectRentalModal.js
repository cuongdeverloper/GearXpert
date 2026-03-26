import { useEffect, useState } from "react";
import { FiAlertTriangle, FiSend, FiX } from "react-icons/fi";

const REJECT_REASONS = [
  "Hết hàng",
  "Trùng lịch",
  "Không thể giao hàng",
  "Vấn đề xác thực khách hàng",
  "Khác",
];

const getBookingCode = (rental) => {
  if (!rental) return "-";
  if (rental.orderCode) return `BK${String(rental.orderCode).padStart(4, "0")}`;
  if (rental._id) return `BK${rental._id.slice(-4).toUpperCase()}`;
  return "-";
};

const getPrimaryDeviceName = (rental) => {
  const firstItem = rental?.rentalItems?.[0];
  return firstItem?.deviceId?.name || "Thiết bị";
};

export default function RejectRentalModal({
  open,
  rental,
  onClose,
  onSubmit,
  isSubmitting,
}) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [customerMessage, setCustomerMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setReason("");
    setDetails("");
    setCustomerMessage("");
    setError("");
  }, [open, rental?._id]);

  if (!open) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!reason) {
      setError("Vui lòng chọn lý do từ chối.");
      return;
    }
    setError("");
    onSubmit({
      reason,
      details: details.trim(),
      customerMessage: customerMessage.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-xl border border-slate-100">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <FiAlertTriangle size={16} />
              </span>
              Từ chối đơn hàng
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Đơn hàng {getBookingCode(rental)} · {getPrimaryDeviceName(rental)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            <FiX size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-600">
            <div className="font-medium text-slate-700">Khách hàng</div>
            <div>{rental?.customerId?.fullName || "Khách hàng"}</div>
            <div className="text-slate-500">{rental?.phoneNumber || "-"}</div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Lý do từ chối
            </label>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            >
              <option value="">Chọn một lý do</option>
              {REJECT_REASONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Chi tiết (tùy chọn)
            </label>
            <textarea
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              rows={3}
              placeholder="Thêm ghi chú nội bộ về việc từ chối này..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Tin nhắn gửi khách hàng
            </label>
            <textarea
              value={customerMessage}
              onChange={(event) => setCustomerMessage(event.target.value)}
              rows={3}
              placeholder="Chúng tôi rất tiếc, đơn hàng này không thể thực hiện được. Vui lòng liên hệ bộ phận hỗ trợ nếu cần thiết."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary"
            />
          </div>

          {error && (
            <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-600">
              {error}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800"
              disabled={isSubmitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              <FiSend size={16} />
              {isSubmitting ? "Đang gửi..." : "Gửi từ chối"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
