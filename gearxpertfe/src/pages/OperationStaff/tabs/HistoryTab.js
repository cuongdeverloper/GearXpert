import React, { useState, useEffect, useCallback } from 'react';
import { X, History, RefreshCw, Truck, PackageCheck, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { getMyOperationLogs } from '../../../service/ApiService/OperationLogApi';

const ACTION_CONFIG = {
  CONFIRM_PICKUP: {
    label: 'Xác nhận lấy hàng để giao',
    status: 'info',
    Icon: Truck,
  },
  CONFIRM_DELIVERY: {
    label: 'Xác nhận giao hàng thành công',
    status: 'success',
    Icon: CheckCircle,
  },
  CONFIRM_RETURN: {
    label: 'Xác nhận thu hồi sản phẩm',
    status: 'success',
    Icon: PackageCheck,
  },
  LOG_DELIVERY_ISSUE: {
    label: 'Ghi biên bản sự cố giao hàng',
    status: 'warning',
    Icon: AlertTriangle,
  },
  LOG_RETURN_ISSUE: {
    label: 'Ghi biên bản sự cố thu hồi',
    status: 'warning',
    Icon: AlertTriangle,
  },
  HANDOVER_CONFIRM_SUCCESS: {
    label: 'Xác nhận bàn giao thành công',
    status: 'success',
    Icon: CheckCircle,
  },
  HANDOVER_CONFIRM_FAILED: {
    label: 'Xác nhận bàn giao thất bại',
    status: 'warning',
    Icon: AlertTriangle,
  },
};

const STATUS_CLASS = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
};

const HANDOVER_FAILURE_REASON_LABELS = {
  NO_SHOW: 'Khách không có mặt',
  CUSTOMER_REJECT: 'Khách từ chối nhận',
  MISSING_ACCESSORY: 'Thiếu phụ kiện',
  DEVICE_MISMATCH: 'Sai thiết bị / sai serial',
  DAMAGED_ITEM_AT_DELIVERY: 'Thiết bị hư hỏng khi giao',
  DELIVERY_BLOCKED: 'Bị chặn giao / không thể tiếp cận',
  OTHER: 'Khác',
};

const formatTime = (isoString) => {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / 86400000);

  const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  if (diffDays === 0) return `${timeStr} - Hôm nay`;
  if (diffDays === 1) return `${timeStr} - Hôm qua`;
  return `${timeStr} - ${date.toLocaleDateString('vi-VN')}`;
};

const buildDetail = (log) => {
  const d = log.details || {};
  const parts = [];
  const reasonLabel = d.reason ? (HANDOVER_FAILURE_REASON_LABELS[d.reason] || d.reason) : '';
  if (d.device) parts.push(d.device);
  if (d.customer) parts.push(`KH: ${d.customer}`);
  if (d.issueType) parts.push(`Loại: ${d.issueType}`);
  if (reasonLabel) parts.push(`Lý do: ${reasonLabel}`);
  return parts.join(' · ') || `#${String(log.targetId).slice(-6).toUpperCase()}`;
};

export default function HistoryTab({ setActiveMenu }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyOperationLogs(1, 50);
      setLogs(res?.logs || []);
    } catch (err) {
      console.error('Lỗi tải lịch sử:', err);
      setError('Không thể tải lịch sử hoạt động.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className="p-4 md:p-8 flex-1">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
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
          <button
            onClick={fetchLogs}
            title="Làm mới"
            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-3"></div>
              <p className="text-sm font-medium">Đang tải lịch sử...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Info size={36} className="mb-3 text-red-300" />
              <p className="text-sm font-medium text-red-500">{error}</p>
              <button
                onClick={fetchLogs}
                className="mt-3 px-4 py-2 text-sm font-semibold text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition-colors"
              >
                Thử lại
              </button>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <History size={40} className="mb-3 text-slate-300" />
              <p className="text-sm font-medium">Chưa có hoạt động nào được ghi lại.</p>
            </div>
          ) : (
            <div className="relative border-l-2 border-slate-100 ml-3 md:ml-4 space-y-8">
              {logs.map((log) => {
                const config = ACTION_CONFIG[log.action] || {
                  label: log.action,
                  status: 'info',
                  Icon: Info,
                };
                return (
                  <div key={log._id} className="relative pl-6 md:pl-8">
                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${STATUS_CLASS[config.status] || 'bg-blue-500'}`}></div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-4 mb-1">
                      <h3 className="font-bold text-slate-900 flex items-center gap-1.5">
                        <config.Icon size={15} className="shrink-0 opacity-70" />
                        {config.label}
                      </h3>
                      <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md w-fit whitespace-nowrap">
                        {formatTime(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{buildDetail(log)}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

