// modals/ExtendConfirmModal.jsx
import React from "react";
import { Clock, AlertCircle } from "lucide-react";

export default function ExtendConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  extensionDays,
  extraAmount,
  newEndDate,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
        onClick={onClose}
      />
      
      <div className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 text-white flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="font-bold text-lg">Xác nhận gia hạn thuê</h3>
            <p className="text-indigo-100 text-sm">Vui lòng kiểm tra thông tin trước khi gửi</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-amber-600 mt-0.5" size={22} />
              <div className="text-sm">
                <p className="font-semibold text-amber-800">Thông tin gia hạn:</p>
                <ul className="mt-2 space-y-1 text-amber-700">
                  <li>• Gia hạn thêm <span className="font-bold">{extensionDays} ngày</span></li>
                  <li>• Ngày trả mới: <span className="font-bold">{new Date(newEndDate).toLocaleDateString("vi-VN")}</span></li>
                  <li>• Phí phát sinh: <span className="font-bold text-red-600">{extraAmount.toLocaleString()} ₫</span></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-center text-gray-500 text-xs">
            Yêu cầu sẽ được gửi đến nhà cung cấp.<br />
            Họ sẽ xem xét và phản hồi trong thời gian sớm nhất.
          </div>
        </div>

        {/* Buttons */}
        <div className="border-t border-gray-100 p-4 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 font-semibold text-gray-700 transition-all"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 font-semibold text-white transition-all shadow-lg shadow-indigo-200"
          >
            Xác nhận gửi yêu cầu
          </button>
        </div>
      </div>
    </div>
  );
}