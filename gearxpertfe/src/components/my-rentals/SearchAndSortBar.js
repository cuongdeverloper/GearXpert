// SearchAndSortBar.jsx
import React, { useState } from "react";
import { Search } from "lucide-react";

const SORT_OPTIONS = [
  { value: "newest", label: "Mới nhất" },
  { value: "oldest", label: "Cũ nhất" },
  { value: "price-high", label: "Tiền thuê: Cao → Thấp" },
  { value: "price-low", label: "Tiền thuê: Thấp → Cao" },
  { value: "start-date", label: "Ngày bắt đầu thuê" },
];

export default function SearchAndSortBar({
  searchTerm,
  setSearchTerm,
  sortOption,
  setSortOption,
}) {
  const [isOpen, setIsOpen] = useState(false);

  const currentSort = SORT_OPTIONS.find((opt) => opt.value === sortOption) || SORT_OPTIONS[0];

  const handleSelect = (value) => {
    setSortOption(value);
    setIsOpen(false);
  };

  return (
    <div className="flex flex-col sm:flex-row gap-4 mb-10 items-center justify-between">
      {/* Search - Giữ nguyên */}
      <div className="relative w-full sm:flex-1 sm:max-w-xl">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Tìm mã đơn, tên thiết bị..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm bg-white"
        />
      </div>

      {/* Custom Sort Dropdown */}
      <div className="flex items-center gap-3 w-full sm:w-auto">
        <label className="text-sm font-bold text-slate-600 whitespace-nowrap">
          Sắp xếp:
        </label>

        <div className="relative w-full sm:w-64">
          {/* Trigger Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full bg-white border border-slate-200 rounded-2xl px-5 py-3.5 
                       text-sm font-medium text-gray-700 flex items-center justify-between
                       hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <span>{currentSort.label}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Dropdown Menu */}
          {isOpen && (
            <div className="absolute mt-2 w-full bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 overflow-hidden">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleSelect(option.value)}
                  className={`w-full px-5 py-3 text-left text-sm hover:bg-gray-50 transition-colors flex items-center justify-between
                    ${sortOption === option.value ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"}`}
                >
                  {option.label}
                  {sortOption === option.value && <span className="text-indigo-600">✓</span>}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}