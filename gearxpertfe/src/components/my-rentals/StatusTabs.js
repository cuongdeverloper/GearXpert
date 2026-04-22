// StatusTabs.jsx - Clean professional design with expandable group
import React, { useState } from "react";

const IN_PROGRESS_STATUSES = ["DELIVERING", "RENTING", "RETURNING"];

const MAIN_TABS = [
  { id: "PENDING", label: "Chờ xác nhận" },
  { id: "IN_PROGRESS", label: "Đang thực hiện", expandable: true },
  { id: "COMPLETED", label: "Hoàn thành" },
  { id: "CANCELLED", label: "Đã hủy" },
];

const SUB_TABS = [
  { id: "DELIVERING", label: "Đang giao" },
  { id: "RENTING", label: "Đang thuê" },
  { id: "RETURNING", label: "Đang trả" },
];

export default function StatusTabs({ activeTab, setActiveTab, counts = {} }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate total for IN_PROGRESS group
  const inProgressCount = IN_PROGRESS_STATUSES.reduce((sum, status) => sum + (counts[status] || 0), 0);

  const handleMainTabClick = (tabId) => {
    if (tabId === "IN_PROGRESS") {
      setIsExpanded(!isExpanded);
      if (!isExpanded) {
        setActiveTab("DELIVERING"); // Default sub-tab when expanding
      }
    } else {
      setIsExpanded(false);
      setActiveTab(tabId);
    }
  };

  const handleSubTabClick = (subTabId) => {
    setActiveTab(subTabId);
  };

  const isInProgressActive = IN_PROGRESS_STATUSES.includes(activeTab);

  return (
    <div className="mb-6">
      {/* Main tabs - clean professional style */}
      <div className="flex gap-2">
        {MAIN_TABS.map((tab) => {
          const isActive = tab.id === "IN_PROGRESS" 
            ? isInProgressActive 
            : activeTab === tab.id;
          const count = tab.id === "IN_PROGRESS" 
            ? inProgressCount 
            : (counts[tab.id] || 0);

          return (
            <button
              key={tab.id}
              onClick={() => handleMainTabClick(tab.id)}
              className={`
                flex-shrink-0 px-4 py-2 rounded-xl font-semibold text-sm
                transition-all duration-200 whitespace-nowrap
                flex items-center gap-2
                ${isActive
                  ? "bg-slate-900 text-white shadow-lg"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
                }
              `}
            >
              <span>{tab.label}</span>
              {count > 0 && (
                <span className={`
                  px-1.5 py-0.5 rounded text-[10px] font-bold min-w-[18px] text-center
                  ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'}
                `}>
                  {count > 99 ? '99+' : count}
                </span>
              )}
              {tab.expandable && (
                <svg 
                  className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Expandable sub-tabs for IN_PROGRESS with beautiful animation */}
      <div 
        className={`
          overflow-hidden transition-all duration-500 ease-out
          ${isExpanded ? 'max-h-20 opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'}
        `}
      >
        <div className="flex gap-2 pl-1">
          {SUB_TABS.map((subTab, index) => {
            const isSubActive = activeTab === subTab.id;
            const subCount = counts[subTab.id] || 0;

            return (
              <button
                key={subTab.id}
                onClick={() => handleSubTabClick(subTab.id)}
                className={`
                  flex-shrink-0 px-3 py-1.5 rounded-lg font-medium text-xs
                  transition-all duration-300 whitespace-nowrap
                  flex items-center gap-1.5
                  ${isSubActive
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200"
                  }
                `}
                style={{
                  animationDelay: `${index * 50}ms`,
                  animation: isExpanded ? 'slideIn 0.3s ease-out forwards' : 'none',
                }}
              >
                <span className={`
                  w-2 h-2 rounded-full
                  ${subTab.id === "DELIVERING" ? "bg-blue-400" :
                    subTab.id === "RENTING" ? "bg-emerald-400" :
                    "bg-purple-400"}
                `} />
                <span>{subTab.label}</span>
                {subCount > 0 && (
                  <span className={`
                    px-1 py-0 rounded text-[9px] font-bold min-w-[16px] text-center
                    ${isSubActive ? 'bg-white/30' : 'bg-slate-100'}
                  `}>
                    {subCount > 99 ? '99+' : subCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}