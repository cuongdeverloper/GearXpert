// modals/ExtendModal.jsx
import React from "react";
import { Clock, Wallet, AlertCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ExtendModal({
  extendModal,
  setExtendModal,
  handleSubmitExtend,
  handleDateChange,
  minExtendDate,
  walletBalance,
}) {
  const navigate = useNavigate();
  const hasEnoughBalance = walletBalance >= extendModal.extraAmount;
  const showWalletWarning = extendModal.extraAmount > 0 && !hasEnoughBalance;
  if (!extendModal?.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
        onClick={() => setExtendModal({ ...extendModal, isOpen: false })}
      />

      <div className="relative bg-white w-full max-w-2xl rounded-3xl p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900">Gia hạn thuê thiết bị</h3>
            <p className="text-xs text-gray-500">
              Ngày trả hiện tại:{" "}
              <span className="font-medium text-gray-700">
                {extendModal.currentEndDate && !isNaN(new Date(extendModal.currentEndDate).getTime())
                  ? new Date(extendModal.currentEndDate).toLocaleDateString("vi-VN")
                  : "—"}
              </span>
            </p>
          </div>
        </div>

        {/* Main Content - Horizontal Layout */}
        <div className="grid grid-cols-2 gap-6">
          {/* Left Column - Date & Note */}
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Chọn ngày trả mới
              </label>
              <input
                type="date"
                min={minExtendDate}
                value={extendModal.newEndDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
                Ghi chú (tùy chọn)
              </label>
              <textarea
                rows={3}
                placeholder="Lý do gia hạn..."
                className="w-full px-4 py-3 rounded-xl bg-gray-50 border border-gray-200 outline-none text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                value={extendModal.note}
                onChange={(e) => setExtendModal({ ...extendModal, note: e.target.value })}
              />
            </div>
          </div>

          {/* Right Column - Wallet & Fee Info */}
          <div className="space-y-4">
            {/* Wallet Balance */}
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-2 mb-2">
                <Wallet size={16} className="text-emerald-600" />
                <span className="text-xs font-semibold text-emerald-700 uppercase">Số dư ví</span>
              </div>
              <p className="text-xl font-bold text-emerald-800">
                {(walletBalance || 0).toLocaleString()} ₫
              </p>
            </div>

            {/* Fee Info */}
            {extendModal.extraAmount > 0 && (
              <div className={`p-4 rounded-xl ${hasEnoughBalance ? 'bg-indigo-600' : 'bg-gray-500'} text-white`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs opacity-80 uppercase font-medium">Số ngày gia hạn</span>
                  <span className="font-bold">
                    {Math.round(extendModal.extraAmount / extendModal.dailyPrice)} ngày
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs opacity-80 uppercase font-medium">Phí phát sinh</span>
                  <span className="text-xl font-bold">
                    {extendModal.extraAmount.toLocaleString()} ₫
                  </span>
                </div>
              </div>
            )}

            {/* Insufficient Balance Warning */}
            {showWalletWarning && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-rose-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-rose-700">Số dư không đủ</p>
                    <p className="text-xs text-rose-600 mt-1">
                      Cần thêm {(extendModal.extraAmount - walletBalance).toLocaleString()} đ
                    </p>
                    <button
                      onClick={() => navigate("/wallet")}
                      className="mt-2 w-full py-2 px-3 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-all flex items-center justify-center gap-1"
                    >
                      Nạp tiền ngay <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={() => setExtendModal({ ...extendModal, isOpen: false })}
            className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition-all"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmitExtend}
            disabled={extendModal.extraAmount <= 0 || !hasEnoughBalance}
            className={`flex-1 py-3 rounded-xl font-semibold text-sm shadow-lg transition-all ${
              extendModal.extraAmount > 0 && hasEnoughBalance
                ? "bg-indigo-600 text-white hover:bg-indigo-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {extendModal.extraAmount > 0 && !hasEnoughBalance
              ? "Số dư không đủ"
              : "Gửi yêu cầu gia hạn"}
          </button>
        </div>
      </div>
    </div>
  );
}
