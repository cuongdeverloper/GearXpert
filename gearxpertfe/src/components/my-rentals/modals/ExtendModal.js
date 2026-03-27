// modals/ExtendModal.jsx
import React from "react";
import { Clock, XCircle } from "lucide-react";
import { toast } from "react-toastify";

export default function ExtendModal({
  extendModal,
  setExtendModal,
  handleSubmitExtend,
  handleDateChange,
  minExtendDate,
}) {
  if (!extendModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
        onClick={() => setExtendModal({ ...extendModal, isOpen: false })}
      />

      <div className="relative bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
            <Clock size={28} />
          </div>
          <h3 className="text-xl font-black text-gray-900 uppercase italic">
            Gia hạn thời gian thuê
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Ngày trả hiện tại:{" "}
            {new Date(extendModal.currentEndDate).toLocaleDateString("vi-VN")}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-500 ml-3 mb-1 block uppercase">
              Ngày trả dự kiến mới
            </label>
            <input
              type="date"
              min={minExtendDate}
              value={extendModal.newEndDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-200 outline-none text-sm font-bold"
            />
          </div>

          {extendModal.extraAmount > 0 && (
            <div className="p-5 rounded-[2rem] bg-indigo-600 text-white space-y-2 shadow-inner">
              <div className="flex justify-between text-xs opacity-80 uppercase font-bold">
                <span>Số ngày gia hạn:</span>
                <span>
                  {Math.round(extendModal.extraAmount / extendModal.dailyPrice)}{" "}
                  ngày
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs opacity-80 uppercase font-bold">
                  Phí phát sinh:
                </span>
                <span className="text-lg font-black italic">
                  {extendModal.extraAmount.toLocaleString()} ₫
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-gray-500 ml-3 mb-1 block uppercase">
              Ghi chú (tùy chọn)
            </label>
            <textarea
              rows={2}
              placeholder="Lý do gia hạn..."
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none text-sm"
              value={extendModal.note}
              onChange={(e) =>
                setExtendModal({ ...extendModal, note: e.target.value })
              }
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-8">
          <button
            onClick={() => setExtendModal({ ...extendModal, isOpen: false })}
            className="py-4 rounded-2xl bg-gray-100 text-gray-600 font-bold uppercase text-[11px] hover:bg-gray-200"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmitExtend}
            disabled={extendModal.extraAmount <= 0}
            className={`py-4 rounded-2xl font-black uppercase italic text-[11px] shadow-lg transition-all ${
              extendModal.extraAmount > 0
                ? "bg-indigo-600 text-white hover:scale-105"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Gửi yêu cầu gia hạn
          </button>
        </div>
      </div>
    </div>
  );
}
