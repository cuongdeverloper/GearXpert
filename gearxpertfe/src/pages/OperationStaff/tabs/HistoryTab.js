import React from 'react';
import { X, History } from 'lucide-react';

const MOCK_HISTORY = [
  { id: 'H001', time: '14:30 - Hôm nay', action: 'Hoàn thành nhiệm vụ', detail: 'T003 - Vệ sinh sensor rễ tre', status: 'success' },
  { id: 'H002', time: '11:15 - Hôm nay', action: 'Báo cáo sự cố', detail: 'REP-001 - Hư hỏng vật lý', status: 'warning' },
  { id: 'H003', time: '09:00 - Hôm nay', action: 'Đăng nhập', detail: 'Ca làm việc sáng', status: 'info' },
];

export default function HistoryTab({ setActiveMenu }) {
  return (
    <div className="p-4 md:p-8 flex-1">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setActiveMenu('profile')}
            className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full"
          >
            <X size={20} />
          </button>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
            <History className="text-primary hidden md:block" /> Lịch sử hoạt động
          </h2>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="relative border-l-2 border-slate-100 ml-3 md:ml-4 space-y-8">
            {MOCK_HISTORY.map((item) => (
              <div key={item.id} className="relative pl-6 md:pl-8">
                <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${
                  item.status === 'success' ? 'bg-emerald-500' :
                  item.status === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                }`}></div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-4 mb-1">
                  <h3 className="font-bold text-slate-900">{item.action}</h3>
                  <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md w-fit">
                    {item.time}
                  </span>
                </div>
                <p className="text-sm text-slate-600">{item.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
