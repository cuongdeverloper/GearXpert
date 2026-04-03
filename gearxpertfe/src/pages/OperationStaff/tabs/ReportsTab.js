import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  RefreshCw,
  AlertCircle,
  Truck,
  PackageCheck,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { getStaffDeliveryIssues, getStaffReturnIssues } from '../../../service/ApiService/ReportApi';
import ReturnFailureDetailDialog from './handover/components/ReturnFailureDetailDialog';

const DELIVERY_ISSUE_TYPE_LABELS = {
  MISSING: 'Mất / Thiếu phụ kiện',
  DAMAGED: 'Trầy xước / Rơi vỡ / Cấn móp',
  OTHER: 'Lỗi kỹ thuật / Không lên nguồn',
  WRONG_ITEM: 'Khách từ chối nhận',
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

const RETURN_ISSUE_TYPE_LABELS = {
  DAMAGED: 'Trầy xước / Hư hỏng / Cấn móp',
  MISSING: 'Mất / Thiếu phụ kiện',
  OTHER: 'Hỏng hoàn toàn / Lỗi kỹ thuật',
  WRONG_ITEM: 'Khách từ chối trả hàng',
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

const parseReturnFailDescription = (description = '') => {
  const text = String(description || '');
  const [first = '', ...rest] = text.split('|').map((x) => x.trim()).filter(Boolean);
  const reason = first.replace(/^Thu hồi thất bại:\s*/i, '').trim();
  const operatorNote = rest[rest.length - 1] || '';
  return { reason, operatorNote };
};

const parseDeliveryFailDescription = (description = '') => {
  const text = String(description || '');
  const codeMatch = text.match(/Handover thất bại:\s*([A-Z_]+)/i);
  const labelMatch = text.match(/Đơn hàng không thành công vì lý do:\s*([^|.]+)/i);
  const segments = text.split('|').map((x) => x.trim()).filter(Boolean);
  const operatorNote = segments[segments.length - 1] || '';

  return {
    reason:
      labelMatch?.[1]?.trim() ||
      (codeMatch?.[1] ? HANDOVER_FAILURE_REASON_LABELS[codeMatch[1].toUpperCase()] : '') ||
      '',
    operatorNote,
  };
};

function ReportCard({ report, issueTypeLabels, contextColor, onOpenDetail }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const deviceName = report.deviceIds?.[0]?.name || 'Thiết bị';
  const extraDevices = (report.deviceIds?.length || 1) - 1;
  const deviceLabel = extraDevices > 0 ? `${deviceName} (+${extraDevices} khác)` : deviceName;
  const customerName = report.rentalId?.customerId?.fullName || '—';
  const handoverCodeMatch = report.description?.match(/Handover thất bại:\s*([A-Z_]+)/i);
  const handoverLabelMatch = report.description?.match(/Đơn hàng không thành công vì lý do:\s*([^|.]+)/i);
  const handoverReasonLabel = handoverLabelMatch?.[1]?.trim()
    || (handoverCodeMatch?.[1] ? HANDOVER_FAILURE_REASON_LABELS[handoverCodeMatch[1].toUpperCase()] : null);

  const issueLabel = handoverReasonLabel || issueTypeLabels[report.issueType] || report.issueType;
  const descriptionText = handoverCodeMatch && handoverReasonLabel
    ? `Đơn hàng không thành công vì lý do: ${handoverReasonLabel}`
    : report.description;
  const statusLabel = STATUS_LABELS[report.status] || report.status;
  const statusStyle = STATUS_STYLES[report.status] || 'bg-slate-100 text-slate-700';
  const images = Array.isArray(report.images) ? report.images.filter(Boolean) : [];
  const previewImages = images.slice(0, 3);
  const extraImageCount = Math.max(images.length - previewImages.length, 0);

  const closeLightbox = () => setLightboxIndex(null);
  const openImageAt = (index) => setLightboxIndex(index);
  const showPrevImage = () => {
    if (!images.length || lightboxIndex === null) return;
    setLightboxIndex((prev) => (prev - 1 + images.length) % images.length);
  };
  const showNextImage = () => {
    if (!images.length || lightboxIndex === null) return;
    setLightboxIndex((prev) => (prev + 1) % images.length);
  };

  return (
    <>
      <div
        className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm flex flex-col hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onOpenDetail?.(report)}
      >
        <div className="p-4 flex flex-col flex-1">
          <div className="flex justify-between items-start mb-3">
            <span className={`px-2.5 py-1 text-xs font-bold rounded-lg ${contextColor.badge}`}>{issueLabel}</span>
            <span className="text-xs font-medium text-slate-400">{formatDate(report.createdAt)}</span>
          </div>

          <h3 className="font-bold text-slate-900 mb-1 line-clamp-1">{deviceLabel}</h3>
          <p className="text-xs text-slate-500 mb-1">Khách: {customerName}</p>
          <p className="text-sm text-slate-600 mb-4 flex-1">{descriptionText}</p>

          {images.length > 0 && (
            <div className="flex items-center gap-1 mb-3">
              {previewImages.map((img, i) => (
                <button
                  key={`${report._id}-img-${i}`}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openImageAt(i);
                  }}
                  className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                >
                  <img src={img} alt={`Bằng chứng ${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
              {extraImageCount > 0 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openImageAt(3);
                  }}
                  className="w-10 h-10 rounded-2xl bg-slate-100/80 text-slate-500 text-2xl font-semibold leading-none hover:bg-slate-200/80 transition-colors"
                >
                  +{extraImageCount}
                </button>
              )}
            </div>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-md ${statusStyle}`}>{statusLabel}</span>
          </div>
        </div>
      </div>

      {lightboxIndex !== null && images[lightboxIndex] && (
        <div
          className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <button
            className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
            onClick={closeLightbox}
          >
            <X size={24} />
          </button>

          {images.length > 1 && (
            <button
              type="button"
              className="absolute left-4 md:left-8 text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                showPrevImage();
              }}
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <img
            src={images[lightboxIndex]}
            alt="full"
            className="max-w-full max-h-full rounded-2xl object-contain"
            onClick={e => e.stopPropagation()}
          />

          {images.length > 1 && (
            <button
              type="button"
              className="absolute right-4 md:right-8 text-white bg-white/10 hover:bg-white/20 p-2 rounded-full transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                showNextImage();
              }}
            >
              <ChevronRight size={24} />
            </button>
          )}

          {images.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold text-white bg-black/40">
              {lightboxIndex + 1}/{images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default function ReportsTab() {
  const [activeTab, setActiveTab] = useState('delivery');
  const [deliveryReports, setDeliveryReports] = useState([]);
  const [returnReports, setReturnReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dialogDetail, setDialogDetail] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [deliveryRes, returnRes] = await Promise.all([
        getStaffDeliveryIssues(),
        getStaffReturnIssues(),
      ]);
      setDeliveryReports(deliveryRes?.data?.reports || deliveryRes?.reports || []);
      setReturnReports(returnRes?.data?.reports || returnRes?.reports || []);
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

  const currentReports = activeTab === 'delivery' ? deliveryReports : returnReports;
  const deliveryContext = {
    badge: 'bg-red-50 text-red-600',
  };
  const returnContext = {
    badge: 'bg-orange-50 text-orange-600',
  };
  const currentContext = activeTab === 'delivery' ? deliveryContext : returnContext;
  const currentIssueLabels = activeTab === 'delivery' ? DELIVERY_ISSUE_TYPE_LABELS : RETURN_ISSUE_TYPE_LABELS;

  const openIssueDetail = (report) => {
    const isReturn = activeTab === 'return';
    const parsed = isReturn
      ? parseReturnFailDescription(report?.description || '')
      : parseDeliveryFailDescription(report?.description || '');

    setDialogDetail({
      title: isReturn ? 'Chi tiết sự cố thu hồi' : 'Chi tiết sự cố giao hàng',
      customerName: report?.rentalId?.customerId?.fullName || 'Khách hàng',
      phone: report?.rentalId?.phoneNumber || '-',
      reason: parsed.reason || report?.issueType || 'Khác',
      operatorNote: parsed.operatorNote || report?.description || '',
      images: Array.isArray(report?.images) ? report.images : [],
      reasonLabel: isReturn ? 'Lý do thu hồi thất bại' : 'Lý do giao hàng thất bại',
    });
  };

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

      {/* Tab Switcher */}
      <div className="flex p-1 bg-slate-100/80 rounded-xl mb-6 w-full max-w-xs">
        <button
          onClick={() => setActiveTab('delivery')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'delivery'
              ? 'bg-white text-red-600 shadow-sm ring-1 ring-slate-200/50'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Truck size={15} />
          Giao hàng
          {deliveryReports.length > 0 && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ml-0.5 ${activeTab === 'delivery' ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-500'}`}>
              {deliveryReports.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('return')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'return'
              ? 'bg-white text-orange-600 shadow-sm ring-1 ring-slate-200/50'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <PackageCheck size={15} />
          Thu hồi
          {returnReports.length > 0 && (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ml-0.5 ${activeTab === 'return' ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-500'}`}>
              {returnReports.length}
            </span>
          )}
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
      ) : currentReports.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-slate-400">
          <ShieldAlert className="w-12 h-12 mb-3 text-slate-300" />
          <p className="text-sm font-medium">
            {activeTab === 'delivery' ? 'Chưa có sự cố giao hàng nào được ghi nhận' : 'Chưa có sự cố thu hồi nào được ghi nhận'}
          </p>
        </div>
      ) : (
        <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6">
          {currentReports.map((report) => (
            <ReportCard
              key={report._id}
              report={report}
              issueTypeLabels={currentIssueLabels}
              contextColor={currentContext}
              onOpenDetail={openIssueDetail}
            />
          ))}
        </div>
      )}
      <ReturnFailureDetailDialog
        open={Boolean(dialogDetail)}
        onClose={() => setDialogDetail(null)}
        detail={dialogDetail}
      />
    </div>
  );
}
