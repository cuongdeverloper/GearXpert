// StatusTabs.jsx
import React, { useState } from "react";

const STATUS_TABS = [
  { id: "ALL", label: "Tất cả đơn thuê" },
  { id: "PENDING", label: "Chờ xác nhận" },
  { id: "DELIVERING", label: "Đang giao hàng" },
  { id: "RENTING", label: "Đang thuê" },
  { id: "RETURNING", label: "Đang trả hàng" },
  { id: "COMPLETED", label: "Hoàn thành" },
  { id: "CANCELLED", label: "Đã hủy" },
];

export default function StatusTabs({ activeTab, setActiveTab }) {
  const [isOpen, setIsOpen] = useState(false);

  const currentTab = STATUS_TABS.find((tab) => tab.id === activeTab) || STATUS_TABS[0];

  const handleSelect = (id) => {
    setActiveTab(id);
    setIsOpen(false);
  };

  return (
    <div className="mb-8">
      <div className="relative w-full max-w-md">
        {/* Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full bg-white border border-gray-200 rounded-3xl px-6 py-4 
                     text-left text-base font-medium text-gray-800 
                     focus:outline-none focus:ring-2 focus:ring-indigo-500 
                     shadow-sm flex items-center justify-between hover:border-gray-300 transition-all"
        >
          <span className="flex items-center gap-3">
            {/* Pill hiển thị trạng thái */}
            <span
              className={`inline-flex items-center px-4 py-1 rounded-2xl text-sm font-semibold
                ${currentTab.id === "ALL" ? "bg-gray-100 text-gray-700" : ""}
                ${currentTab.id === "PENDING" ? "bg-amber-100 text-amber-700" : ""}
                ${currentTab.id === "DELIVERING" ? "bg-blue-100 text-blue-700" : ""}
                ${currentTab.id === "RENTING" ? "bg-emerald-100 text-emerald-700" : ""}
                ${currentTab.id === "RETURNING" ? "bg-purple-100 text-purple-700" : ""}
                ${currentTab.id === "COMPLETED" ? "bg-green-100 text-green-700" : ""}
                ${currentTab.id === "CANCELLED" ? "bg-red-100 text-red-700" : ""}
              `}
            >
              {currentTab.label}
            </span>
          </span>

          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute mt-2 w-full bg-white rounded-3xl shadow-xl border border-gray-100 py-2 z-50 max-h-80 overflow-auto">
            {STATUS_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleSelect(tab.id)}
                className={`w-full px-6 py-3.5 text-left text-base font-medium hover:bg-gray-50 transition-colors flex items-center gap-3
                  ${activeTab === tab.id ? "bg-indigo-50 text-indigo-700" : "text-gray-700"}`}
              >
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <span className="ml-auto text-indigo-600">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}