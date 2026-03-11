import React, { useState, useEffect, useCallback } from 'react';
import { ShieldAlert, RefreshCw, AlertCircle } from 'lucide-react';
import { getStaffDeliveryIssues } from '../../../service/ApiService/ReportApi';

const ISSUE_TYPE_LABELS = {
  MISSING: 'Mất / Thiếu phụ kiện',
  DAMAGED: 'Trầy xước / Rơi vỡ / Cấn móp',
  OTHER: 'Lỗi kỹ thuật / Không lên nguồn',
  WRONG_ITEM: 'Khách từ chối nhận',
};

const STATUS_STYLES = {
  OPEN:       'bg-amber-100 text-amber-700',
  PROCESSING: 'bg-blue-100 text-blue-700',
  RESOLVED:   'bg-emerald-100 text-emerald-700',
  REJECTED:   'bg-rose-100 text-rose-700',
};

const STATUS_LABELS = {
  OPEN:       'Chờ xử lý',
  PROCESSING: 'Đang xử lý',
  RESOLVED:   'Đã giải quyết',
  REJECTED:   'Đã từ chối',
};

const formatDate = (iso) =>
  iso ? new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

export default function ReportsTab() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStaffDeliveryIssues();
      setReports(res?.data?.reports || res?.reports || []);
    } catch (err) {
      console.error('Lỗi tải sự cố:', err);
      setError('Không thể tải danh sách sự cố.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return (
    <div className="p-4 md:p-8">
      <div className="hidden md:flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
          <ShieldAlert className="text-red-500" /> Lịch sử sự cố
        </h2>
        <button
          onClick={fetchReports}
          title="Làm mới"
          className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-red-500 mb-3"></div>
          <p className="text-sm font-medium">Đang tải sự cố...</p>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-48 text-red-400">
          <AlertCircle className="w-10 h-10 mb-3" />
          <p className="text-sm font-medium">{error}</p>
          <button onClick={fetchReports} className="mt-3 px-4 py-2 text-sm font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50">Thử lại</button>
        </div>
      ) : reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
          <ShieldAlert className="w-12 h-12 mb-3 text-slate-300" />
          <p className="text-sm font-medium">Chưa có sự cố nào được ghi nhận</p>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6">
          {reports.map((report) => {
            const deviceName = report.deviceIds?.[0]?.name || 'Thiết bị';
            const extraDevices = (report.deviceIds?.length || 1) - 1;
            const deviceLabel = extraDevices > 0 ? `${deviceName} (+${extraDevices} khác)` : deviceName;
            const customerName = report.rentalId?.customerId?.fullName || '—';
            const issueLabel = ISSUE_TYPE_LABELS[report.issueType] || report.issueType;
            const statusLabel = STATUS_LABELS[report.status] || report.status;
            const statusStyle = STATUS_STYLES[report.status] || 'bg-slate-100 text-slate-700';
            const previewImg = report.images?.[0];

            return (
              <div key={report._id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow">
                {/* Ảnh preview nếu có */}
                {previewImg && (
                  <div className="h-36 bg-slate-100 overflow-hidden">
                    <img src={previewImg} alt="sự cố" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="p-4 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-3">
                    <span className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-lg">{issueLabel}</span>
                    <span className="text-xs font-medium text-slate-400">{formatDate(report.createdAt)}</span>
                  </div>

                  <h3 className="font-bold text-slate-900 mb-1 line-clamp-1">{deviceLabel}</h3>
                  <p className="text-xs text-slate-500 mb-1">Khách: {customerName}</p>
                  <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-1">{report.description}</p>

                  {/* Ảnh bổ sung nhỏ */}
                  {report.images?.length > 1 && (
                    <div className="flex gap-1.5 mb-3">
                      {report.images.slice(1, 4).map((img, i) => (
                        <img key={i} src={img} alt="" className="w-10 h-10 rounded-lg object-cover border border-slate-100" />
                      ))}
                      {report.images.length > 4 && (
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                          +{report.images.length - 4}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${statusStyle}`}>{statusLabel}</span>
                    <span className="text-xs font-semibold text-primary">#{String(report._id).slice(-6).toUpperCase()}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

