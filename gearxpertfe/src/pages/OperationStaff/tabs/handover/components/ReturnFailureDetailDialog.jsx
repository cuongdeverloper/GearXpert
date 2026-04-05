import React from "react";
import { X, Phone, UserRound, CircleAlert } from "lucide-react";
import { formatReturnFailureReason } from "../constants";

const resolveReasonLabel = (reason) => {
  if (!reason) return "-";
  const t = formatReturnFailureReason(reason);
  return t === "—" ? "-" : t;
};

export default function ReturnFailureDetailDialog({ open, onClose, detail }) {
  if (!open || !detail) return null;

  const {
    customerName = "-",
    phone = "-",
    reason = "",
    operatorNote = "",
    images = [],
    title = "Chi tiết thu hồi thất bại",
    reasonLabel = "Lý do thu hồi thất bại",
  } = detail;

  const imageList = Array.isArray(images) ? images.filter(Boolean) : [];

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-xl max-h-[90vh] overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(90vh-72px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Khách hàng</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 flex items-center gap-2">
                <UserRound size={14} /> {customerName}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Số điện thoại</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Phone size={14} /> {phone}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-700 font-semibold uppercase">{reasonLabel}</p>
            <p className="mt-1 text-sm font-semibold text-red-800 flex items-center gap-2">
              <CircleAlert size={14} /> {resolveReasonLabel(reason)}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase font-semibold">Ghi chú chi tiết</p>
            <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 whitespace-pre-wrap min-h-20">
              {operatorNote?.trim() || "Không có ghi chú."}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-slate-500 uppercase font-semibold">Hình ảnh đính kèm</p>
            {imageList.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                Không có hình ảnh đính kèm.
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {imageList.map((url, index) => (
                  <a
                    key={`${url}-${index}`}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl overflow-hidden border border-slate-200 bg-slate-50"
                  >
                    <img
                      src={url}
                      alt={`Ảnh chứng cứ ${index + 1}`}
                      className="w-full h-28 object-cover"
                    />
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
