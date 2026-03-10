import React from 'react';
import { ShieldAlert } from 'lucide-react';

const MOCK_REPORTS = [
  { id: 'REP-001', date: '23/02/2026', taskId: 'T099', device: 'DJI Mavic 3 Pro', customer: 'Lê Văn C', type: 'Hư hỏng vật lý', issue: 'Gãy cánh quạt sau, xước body', status: 'Chờ định giá' },
  { id: 'REP-002', date: '21/02/2026', taskId: 'T085', device: 'Sony A7IV', customer: 'Phạm Thị D', type: 'Thiếu phụ kiện', issue: 'Khách làm mất 1 pin dự phòng', status: 'Đã trừ cọc' },
  { id: 'REP-003', date: '18/02/2026', taskId: 'T072', device: 'Canon Lens 70-200mm', customer: 'Hoàng Văn E', type: 'Từ chối nhận', issue: 'Khách chê lens bụi, không nhận hàng', status: 'Đã hủy đơn' },
];

export default function ReportsTab() {
  return (
    <div className="p-4 md:p-8">
      <h2 className="hidden md:flex text-2xl font-bold mb-6 items-center gap-2 text-slate-900">
        <ShieldAlert className="text-red-500" /> Lịch sử sự cố
      </h2>

      <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6">
        {MOCK_REPORTS.map((report) => (
          <div key={report.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
            <div className="flex justify-between items-start mb-3">
              <span className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-lg">{report.type}</span>
              <span className="text-xs font-medium text-slate-400">{report.date}</span>
            </div>
            <h3 className="font-bold text-slate-900 mb-1">{report.device}</h3>
            <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-1">{report.issue}</p>
            <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
              <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                report.status === 'Chờ định giá' ? 'bg-amber-100 text-amber-700' :
                report.status === 'Đã trừ cọc' ? 'bg-emerald-100 text-emerald-700' :
                'bg-slate-100 text-slate-700'
              }`}>
                {report.status}
              </span>
              <span className="text-xs font-semibold text-primary">#{report.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
