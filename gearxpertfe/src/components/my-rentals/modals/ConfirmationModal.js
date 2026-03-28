// modals/ConfirmationModal.jsx
import React from "react";

export default function ConfirmationModal({ modalConfig, onClose, onConfirm }) {
  if (!modalConfig.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in fade-in zoom-in-95 text-center">
        <h3 className="text-lg font-black text-gray-900 uppercase italic mb-2">
          {modalConfig.title}
        </h3>
        <p className="text-gray-500 text-sm mb-6">{modalConfig.description}</p>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs uppercase hover:bg-gray-200"
          >
            Quay lại
          </button>
          <button
            onClick={onConfirm}
            className={`py-3 rounded-xl text-white font-bold text-xs uppercase shadow-lg ${
              modalConfig.type === "CANCEL"
                ? "bg-red-500 shadow-red-200"
                : "bg-indigo-600 shadow-indigo-200"
            }`}
          >
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
