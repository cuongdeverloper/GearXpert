import React, { useState, useEffect, useCallback } from 'react';
import { X, History, RefreshCw, Truck, PackageCheck, CheckCircle, AlertTriangle, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { getMyOperationLogs } from '../../../service/ApiService/OperationLogApi';
import { getReturnRecordById } from '../../../service/ApiService/ReturnApi';
import { getHandoverById } from '../../../service/ApiService/HandoverApi';
import ReturnFailureDetailDialog from './handover/components/ReturnFailureDetailDialog';

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
  RETURN_CONFIRM_SUCCESS: {
    label: 'Xác nhận thu hồi thành công',
    status: 'success',
    Icon: CheckCircle,
  },
  RETURN_CONFIRM_FAILED: {
    label: 'Xác nhận thu hồi thất bại',
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

export default function HistoryTab({ setActiveMenu, realtimeTick = 0 }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogDetail, setDialogDetail] = useState(null);
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 8;

  const fetchLogs = useCallback(async (page = currentPage) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getMyOperationLogs(page, itemsPerPage);
      setLogs(res?.logs || []);
      const total = res?.total || 0;
      setTotalPages(Math.max(1, Math.ceil(total / itemsPerPage)));
    } catch (err) {
      console.error('Lỗi tải lịch sử:', err);
      setError('Không thể tải lịch sử hoạt động.');
    } finally {
      setLoading(false);
    }
  }, [currentPage, itemsPerPage]);

  useEffect(() => {
    fetchLogs(currentPage);
  }, [fetchLogs, realtimeTick, currentPage]);

  const openReturnFailDetail = async (log) => {
    if (log?.action !== 'RETURN_CONFIRM_FAILED') return;
    const details = log?.details || {};
    const returnRecordId = details?.returnRecordId;
    if (!returnRecordId) return;

    setDialogDetail({
      title: 'Chi tiết thu hồi thất bại',
      customerName: details?.customerName || 'Khách hàng',
      phone: details?.customerPhone || '-',
      reason: HANDOVER_FAILURE_REASON_LABELS[details?.reason] || details?.reason || '',
      operatorNote: details?.operatorNote || details?.detail || '',
      images: [],
    });

    try {
      const res = await getReturnRecordById(returnRecordId);
      const record = res?.returnRecord || res?.data?.returnRecord;
      if (!record) return;
      
      const mappedReason = record?.failure?.reason 
        ? (HANDOVER_FAILURE_REASON_LABELS[record.failure.reason] || record.failure.reason)
        : '';
        
      setDialogDetail((prev) => ({
        ...(prev || {}),
        customerName: record?.rentalId?.customerId?.fullName || record?.prefetchedSnapshot?.customerId?.fullName || record?.prefetchedSnapshot?.deliveryAddress?.receiverName || record?.customerConfirmation?.confirmerName || prev?.customerName || 'Khách hàng',
        phone: record?.rentalId?.customerId?.phoneNumber || record?.prefetchedSnapshot?.customerId?.phoneNumber || record?.prefetchedSnapshot?.phoneNumber || record?.customerConfirmation?.confirmerPhone || prev?.phone || '-',
        reason: mappedReason || prev?.reason || '',
        operatorNote: record?.failure?.operatorNote || prev?.operatorNote || '',
        images: Array.isArray(record?.failure?.evidenceUrls) ? record.failure.evidenceUrls : [],
      }));
    } catch (_) {
      // Keep fallback data from operation log if return record is unavailable.
    }
  };

  const openHandoverFailDetail = async (log) => {
    if (log?.action !== 'HANDOVER_CONFIRM_FAILED') return;
    const details = log?.details || {};
    const handoverId = details?.handoverId;
    if (!handoverId) return;

    setDialogDetail({
      title: 'Chi tiết bàn giao thất bại',
      customerName: details?.customerName || 'Khách hàng',
      phone: details?.customerPhone || '-',
      reason: HANDOVER_FAILURE_REASON_LABELS[details?.reason] || details?.reason || '',
      operatorNote: details?.operatorNote || details?.detail || '',
      images: [],
    });

    try {
      const res = await getHandoverById(handoverId);
      const record = res?.handover || res?.data?.handover;
      if (!record) return;
      
      const mappedReason = record?.failure?.reason 
        ? (HANDOVER_FAILURE_REASON_LABELS[record.failure.reason] || record.failure.reason)
        : '';

      setDialogDetail((prev) => ({
        ...(prev || {}),
        customerName: record?.rentalId?.customerId?.fullName || record?.prefetchedSnapshot?.customerId?.fullName || record?.prefetchedSnapshot?.deliveryAddress?.receiverName || record?.customerConfirmation?.confirmerName || prev?.customerName || 'Khách hàng',
        phone: record?.rentalId?.customerId?.phoneNumber || record?.prefetchedSnapshot?.customerId?.phoneNumber || record?.prefetchedSnapshot?.phoneNumber || record?.customerConfirmation?.confirmerPhone || prev?.phone || '-',
        reason: mappedReason || prev?.reason || '',
        operatorNote: record?.failure?.operatorNote || prev?.operatorNote || '',
        images: Array.isArray(record?.failure?.evidenceUrls) ? record.failure.evidenceUrls : [],
      }));
    } catch (_) {
      // Fallback data
    }
  };

  const handleLogClick = (log) => {
    if (log?.action === 'RETURN_CONFIRM_FAILED') {
      openReturnFailDetail(log);
    } else if (log?.action === 'HANDOVER_CONFIRM_FAILED') {
      openHandoverFailDetail(log);
    }
  };

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
            <h2 className="text-3xl font-bold flex items-center gap-2 text-slate-900">
              <History className="text-indigo-600 hidden md:block" /> Lịch sử hoạt động
            </h2>
          </div>
          <button
            onClick={fetchLogs}
            title="Làm mới"
            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600 mb-3"></div>
              <p className="text-sm font-medium">Đang tải lịch sử...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Info size={36} className="mb-3 text-red-300" />
              <p className="text-sm font-medium text-red-500">{error}</p>
              <button
                onClick={fetchLogs}
                className="mt-3 px-4 py-2 text-sm font-semibold text-indigo-600 border border-indigo-200 rounded-xl hover:bg-indigo-50 transition-colors"
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
                  <div
                    key={log._id}
                    className={`relative pl-6 md:pl-8 ${(log.action === 'RETURN_CONFIRM_FAILED' || log.action === 'HANDOVER_CONFIRM_FAILED') ? 'cursor-pointer' : ''}`}
                    onClick={() => handleLogClick(log)}
                  >
                    <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${STATUS_CLASS[config.status] || 'bg-blue-500'}`}></div>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-4 mb-1">
                      <h3 className="font-semibold text-slate-900 flex items-center gap-1.5">
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

          {totalPages > 1 && !loading && (
            <div className="flex justify-center items-center gap-2 mt-10">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className="flex items-center gap-1">
                {(() => {
                  const pages = [];
                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) pages.push(i);
                  } else {
                    if (currentPage <= 4) {
                      pages.push(1, 2, 3, 4, 5, '...', totalPages);
                    } else if (currentPage >= totalPages - 3) {
                      pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
                    } else {
                      pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
                    }
                  }
                  
                  return pages.map((page, index) => (
                    <button
                      key={index}
                      onClick={() => page !== '...' && setCurrentPage(page)}
                      disabled={page === '...'}
                      className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                        page === '...' 
                          ? 'text-slate-400 cursor-default'
                          : currentPage === page 
                            ? 'bg-indigo-600 text-white' 
                            : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {page}
                    </button>
                  ));
                })()}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
      <ReturnFailureDetailDialog
        open={Boolean(dialogDetail)}
        onClose={() => setDialogDetail(null)}
        detail={dialogDetail}
      />
    </div>
  );
}

