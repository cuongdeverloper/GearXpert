// modals/DetailModal.jsx
import React from "react";
import { XCircle, MapPin, FileText } from "lucide-react";

export default function DetailModal({ detailModal, setDetailModal }) {
  if (!detailModal.isOpen || !detailModal.order) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
        onClick={() => setDetailModal({ isOpen: false, order: null })}
      />
      <div className="relative bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gray-900 p-8 text-white flex justify-between items-center">
          <h2 className="text-2xl font-black italic uppercase tracking-tighter">
            Order Details
          </h2>
          <button
            onClick={() => setDetailModal({ isOpen: false, order: null })}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20"
          >
            <XCircle size={20} />
          </button>
        </div>

        <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {/* Danh sách thiết bị */}
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Danh sách thiết bị
              </p>
              {detailModal.order.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-gray-100"
                >
                  <div className="flex items-center gap-4">
                    <img
                      src={item.deviceId?.images?.[0]}
                      className="w-12 h-12 rounded-lg object-cover bg-white border"
                      alt=""
                    />
                    <div>
                      <p className="text-sm font-bold text-gray-900">
                        {item.deviceId?.name}
                      </p>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">
                        x{item.quantity} thiết bị
                      </p>
                      {item.serialNumbers?.length > 0 && (
                        <p className="text-[9px] text-gray-600 mt-1">
                          Serial: {item.serialNumbers.join(", ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-black text-gray-900">
                      {(
                        item.rentPrice /
                        (item.totalDays * item.quantity)
                      ).toLocaleString()}{" "}
                      ₫ <span className="text-[9px] text-gray-400">/ngày</span>
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Thời gian & Thanh toán */}
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Thời gian thuê
                </p>
                <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-700 text-xs font-bold">
                  {new Date(
                    detailModal.order.items?.[0]?.rentalStartDate
                  ).toLocaleDateString("vi-VN")}{" "}
                  -{" "}
                  {new Date(
                    detailModal.order.items?.[0]?.rentalEndDate
                  ).toLocaleDateString("vi-VN")}
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Thanh toán
                </p>
                <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-700 text-xs font-bold uppercase">
                  {detailModal.order.paymentMethod} -{" "}
                  {detailModal.order.paymentStatus}
                </div>
              </div>
            </div>

            {/* Địa chỉ */}
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Địa chỉ nhận hàng
              </p>
              <div className="p-5 border border-gray-100 rounded-[2rem] flex items-start gap-3">
                <MapPin size={16} className="text-indigo-600 mt-1" />
                <div>
                  <p className="text-xs font-bold text-gray-800">
                    {detailModal.order.deliveryAddress?.fullAddress}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium mt-1">
                    Người nhận:{" "}
                    {detailModal.order.deliveryAddress?.receiverName} |{" "}
                    {detailModal.order?.phoneNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* Tổng tiền */}
            <div className="bg-gray-50 rounded-[2rem] p-6 space-y-3">
              <div className="flex justify-between text-xs font-bold text-gray-500">
                <span>Tổng tiền thuê</span>
                <span>
                  {detailModal.order.rentPriceTotal?.toLocaleString()} ₫
                </span>
              </div>
              <div className="flex justify-between text-xs font-bold text-gray-500">
                <span>Tiền đặt cọc</span>
                <span>
                  {detailModal.order.depositAmount?.toLocaleString()} ₫
                </span>
              </div>
              <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                <span className="text-sm font-black uppercase italic">
                  Tổng thanh toán
                </span>
                <span className="text-xl font-black text-indigo-600">
                  {detailModal.order.totalAmount?.toLocaleString()} ₫
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
