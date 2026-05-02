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
                <span className="text-xs font-bold text-emerald-700 uppercase">Số dư ví hiện tại</span>
              </div>
              <p className="text-xl font-black text-emerald-800">
                {(walletBalance || 0).toLocaleString()} ₫
              </p>
            </div>

            {/* Fee Breakdown */}
            {extendModal.extraAmount > 0 && (
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                  Chi tiết phí gia hạn
                </label>
                <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="max-h-[160px] overflow-y-auto custom-scrollbar p-3 space-y-2">
                    {extendModal.order?.items?.map((item, idx) => {
                      const days = item.totalDays || 1;
                      const dailyRate = Math.round(item.rentPrice / days);
                      const extensionDays = Math.round(extendModal.extraAmount / extendModal.dailyPrice);
                      const itemExtra = dailyRate * extensionDays;
                      
                      return (
                        <div key={idx} className="flex justify-between items-center text-[11px] py-1">
                          <div className="flex-1 min-w-0 pr-2">
                            <p className="font-bold text-gray-800 truncate">{item.deviceId?.name}</p>
                            <p className="text-gray-400 text-[9px]">
                              {dailyRate.toLocaleString()} ₫/ngày x {extensionDays} ngày
                            </p>
                          </div>
                          <p className="font-black text-gray-900 flex-shrink-0">
                            {itemExtra.toLocaleString()} ₫
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className={`p-4 ${hasEnoughBalance ? 'bg-indigo-600' : 'bg-rose-600'} text-white`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">Tổng thanh toán thêm</span>
                      <span className="text-2xl font-black">
                        {Math.round(extendModal.extraAmount).toLocaleString()} ₫
                      </span>
                    </div>
                  </div>
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
                    <p className="text-xs text-rose-600 mt-1 uppercase font-bold tracking-tight">
                      Cần nạp thêm {(extendModal.extraAmount - walletBalance).toLocaleString()} ₫
                    </p>
                    <button
                      onClick={() => navigate("/wallet")}
                      className="mt-3 w-full py-2.5 px-3 bg-white text-rose-600 border border-rose-200 rounded-xl text-xs font-black hover:bg-rose-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      Nạp tiền ngay <ArrowRight size={14} />
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
