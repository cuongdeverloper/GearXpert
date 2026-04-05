import React from "react";

export default function RecordContextSidebar({
  flowContext,
  loadingRentals,
  rentals,
  selectedRentalId,
  onSelectRental,
}) {
  return (
    <div className="xl:col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">
        {flowContext === "DELIVERY" ? "Đơn đang giao" : "Đơn đang thu hồi"}
      </div>
      <div className="max-h-[65vh] overflow-y-auto p-3 space-y-2">
        {loadingRentals ? (
          <p className="text-sm text-slate-500 p-2">Đang tải...</p>
        ) : rentals.length === 0 ? (
          <p className="text-sm text-slate-500 p-2">
            {flowContext === "DELIVERY"
              ? "Không có đơn DELIVERING."
              : "Không có đơn RETURNING."}
          </p>
        ) : (
          rentals.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelectRental(item.id)}
              className={`w-full text-left p-3 rounded-xl border transition ${
                selectedRentalId === item.id
                  ? "bg-primary/5 border-primary/30"
                  : "bg-white border-slate-200 hover:bg-slate-50"
              }`}
            >
              <p className="text-xs text-slate-500 mb-1">#{item.code}</p>
              <p className="font-semibold text-slate-800 line-clamp-1">{item.deviceLabel}</p>
              <p className="text-sm text-slate-600 mt-1 line-clamp-1">{item.customerName}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
