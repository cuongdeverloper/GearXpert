import { CheckCircle2, XCircle, ArrowRight, Shield } from "lucide-react";

const FLOW_STATUS_HINT = {
  PENDING_ADMIN_REVIEW: "Đề xuất đang chờ GearXpert duyệt.",
  CUSTOMER_ACCEPTED: "Chờ shop chuyển bước tiếp theo nếu cần.",
  CUSTOMER_REJECTED: "Các bên có thể thảo luận thêm trong chat.",
  ADMIN_APPROVED: "Admin đã xử lý theo mức duyệt.",
  ADMIN_REJECTED: "Admin đã từ chối theo từng trường hợp.",
};

/**
 * Thẻ chat khi **khách** vừa chấp nhận / từ chối đề xuất (khác hẳn thẻ "ĐỀ XUẤT BỒI THƯỜNG" của shop).
 */
export function CustomerCompensationDecisionChatCard({ payload, isOwn, maxWidth = 380 }) {
  const p = payload || {};
  const isAccepted = p.decision === "ACCEPTED";
  const amount = Number(p.amount || 0);
  const link = p.supplierLink || p.link;
  const note = p.customerDecisionNote;
  const flowHint = FLOW_STATUS_HINT[p.flowStatus] || null;

  return (
    <div
      className="rounded-2xl border-2 overflow-hidden shadow-sm"
      style={{
        maxWidth,
        width: "100%",
        borderColor: isAccepted ? "rgb(167 243 208)" : "rgb(254 202 202)",
        background: isAccepted
          ? "linear-gradient(180deg, rgb(240 253 244), rgb(255 255 255))"
          : "linear-gradient(180deg, rgb(255 241 242), rgb(255 255 255))",
      }}
    >
      <div
        className={`px-3 py-2 text-[10px] font-extrabold tracking-widest uppercase ${isAccepted ? "text-emerald-800" : "text-rose-800"}`}
      >
        Phản hồi từ khách hàng
      </div>
      <div className="px-3 pb-3">
        <div className="flex items-start gap-2">
          <div
            className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
              isAccepted ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}
          >
            {isAccepted ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 leading-snug">
              {isAccepted ? "Khách hàng đã chấp nhận đề xuất" : "Khách hàng đã từ chối đề xuất"}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Mức trong đề xuất:{" "}
              <span className="font-semibold text-slate-800">{amount.toLocaleString("vi-VN")} VND</span>
            </p>
          </div>
        </div>
        {note ? (
          <div className="mt-2 text-xs text-slate-700 bg-white/80 border border-slate-200/80 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap">
            <span className="font-semibold text-slate-600">Ghi chú: </span>
            {note}
          </div>
        ) : null}
        {flowHint ? (
          <p className="mt-2 text-[11px] text-slate-500 flex items-center gap-1">
            <Shield size={12} className="shrink-0 text-slate-400" />
            {flowHint}
          </p>
        ) : null}
        {link && (
          <a
            href={link}
            className="mt-2 inline-flex items-center justify-center gap-1.5 w-full rounded-xl bg-slate-900 text-white text-xs font-semibold py-2 hover:bg-slate-800 transition-colors"
          >
            {isOwn ? "Xem đơn thuê / sự cố" : "Mở chi tiết sự cố"}
            <ArrowRight size={14} />
          </a>
        )}
      </div>
    </div>
  );
}
