import React, { useState } from "react";
import { Check, Package } from "lucide-react";

export default function DeviceChecklist({ items = [] }) {
  const [checkedItems, setCheckedItems] = useState({});

  const toggleCheck = (itemId) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  if (!items || items.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 flex items-center gap-2">
        <Package size={16} /> Không có thiết bị nào trong đơn hàng này.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="font-semibold text-slate-800 flex items-center gap-2">
        <Package size={16} /> Danh sách thiết bị giao ({items.length})
      </h4>
      <div className="space-y-2 bg-white rounded-xl border border-slate-200 divide-y divide-slate-200">
        {items.map((item) => (
          <div
            key={item.rentalItemId}
            className="flex items-center justify-between p-3 hover:bg-slate-50 transition group cursor-pointer"
            onClick={() => toggleCheck(item.rentalItemId)}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCheck(item.rentalItemId);
                }}
                className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                  checkedItems[item.rentalItemId]
                    ? "bg-emerald-500 border-emerald-500"
                    : "border-slate-300 bg-white hover:border-emerald-400"
                }`}
              >
                {checkedItems[item.rentalItemId] && (
                  <Check size={14} className="text-white" />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={`font-medium text-sm truncate transition-colors ${
                    checkedItems[item.rentalItemId]
                      ? "text-emerald-700 line-through"
                      : "text-slate-800"
                  }`}
                >
                  {item.deviceName}
                </p>
                {item.expectedSerialNumbers?.length > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Serial: {item.expectedSerialNumbers.join(", ")}
                  </p>
                )}
              </div>
            </div>
            <div className="flex-shrink-0 ml-3 px-3 py-1 rounded-lg bg-blue-50 border border-blue-200">
              <p className="text-sm font-semibold text-blue-700">x{item.expectedQuantity}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
