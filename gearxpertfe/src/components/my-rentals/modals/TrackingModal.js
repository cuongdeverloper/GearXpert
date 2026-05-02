// modals/TrackingModal.jsx
import React from "react";
import { XCircle, CheckCircle2 } from "lucide-react";

export default function TrackingModal({ trackingModal, setTrackingModal }) {
  if (!trackingModal?.isOpen) return null;

  const order = trackingModal.order;
  const pickedUpAt = order?.pickedUpAt;

  const steps = [
    {
      label: "Đơn hàng đã đặt",
      time: order?.createdAt
        ? new Date(order.createdAt).toLocaleString("vi-VN")
        : "",
      done: true,
    },
    {
      label: "Đã xác nhận & Đóng gói",
      time: order?.updatedAt
        ? new Date(order.updatedAt).toLocaleString("vi-VN")
        : "",
      done: true,
    },
    ...(pickedUpAt
      ? [
        {
          label: "Đang trên đường giao đến bạn",
          time: new Date(pickedUpAt).toLocaleString("vi-VN"),
          done: true,
          active: true,
        },
      ]
      : []),
    { label: "Giao hàng thành công", time: "Dự kiến sớm nhất", done: false },
  ];

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
        onClick={() => setTrackingModal({ isOpen: false, order: null })}
      />
      <div className="relative bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black italic uppercase">Tracking</h2>
          <button
            onClick={() => setTrackingModal({ isOpen: false, order: null })}
            className="text-gray-400 hover:text-gray-900"
          >
            <XCircle size={24} />
          </button>
        </div>

        <div className="space-y-8">
          {steps.map((step, idx, arr) => (
            <div key={idx} className="flex gap-4 relative">
              {idx !== arr.length - 1 && (
                <div
                  className={`absolute left-[11px] top-6 w-[2px] h-12 ${step.done ? "bg-indigo-600" : "bg-gray-100"
                    }`}
                />
              )}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center z-10 ${step.active
                    ? "bg-indigo-600 ring-4 ring-indigo-100"
                    : step.done
                      ? "bg-indigo-600"
                      : "bg-gray-100"
                  }`}
              >
                <CheckCircle2 size={14} className="text-white" />
              </div>
              <div>
                <p
                  className={`text-[12px] font-black uppercase italic ${step.active ? "text-indigo-600" : "text-gray-900"
                    }`}
                >
                  {step.label}
                </p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  {step.time}
                </p>
              </div>
            </div>
          ))}
        </div>

        <button
          className="w-full mt-10 py-4 bg-gray-900 text-white rounded-2xl text-[11px] font-black uppercase italic"
          onClick={() => setTrackingModal({ isOpen: false, order: null })}
        >
          Đóng
        </button>
      </div>
    </div>
  );
}
