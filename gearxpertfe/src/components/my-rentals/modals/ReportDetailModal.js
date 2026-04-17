import React from "react";
import { X, Package, AlertTriangle, Clock, Calendar, FileText, Image as ImageIcon, CheckCircle, XCircle, Clock3 } from "lucide-react";

const STATUS_MAP = {
  PENDING: { label: "Chờ xử lý", color: "bg-amber-100 text-amber-700", icon: Clock3 },
  PROCESSING: { label: "Đang xử lý", color: "bg-blue-100 text-blue-700", icon: Clock },
  RESOLVED: { label: "Đã giải quyết", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle },
  REJECTED: { label: "Từ chối", color: "bg-rose-100 text-rose-700", icon: XCircle },
};

const SEVERITY_MAP = {
  LOW: { label: "Nhẹ", color: "bg-green-100 text-green-700" },
  MEDIUM: { label: "Trung bình", color: "bg-amber-100 text-amber-700" },
  HIGH: { label: "Nghiêm trọng", color: "bg-orange-100 text-orange-700" },
  CRITICAL: { label: "Rất nghiêm trọng", color: "bg-rose-100 text-rose-700" },
};

const REPORT_TYPE_MAP = {
  DELIVERY: { label: "Báo cáo giao hàng", color: "bg-indigo-100 text-indigo-700", icon: Package },
  DAMAGE: { label: "Báo cáo hư hỏng", color: "bg-rose-100 text-rose-700", icon: AlertTriangle },
  EXTEND: { label: "Gia hạn thuê", color: "bg-emerald-100 text-emerald-700", icon: Calendar },
};

export default function ReportDetailModal({ isOpen, onClose, report }) {
  if (!isOpen || !report) return null;

  // Debug: log the actual report data
  console.log("[ReportDetailModal] Report:", report);
  console.log("[ReportDetailModal] deviceItemIds:", report.deviceItemIds);
  console.log("[ReportDetailModal] deviceItemIds type:", typeof report.deviceItemIds);
  console.log("[ReportDetailModal] deviceItemIds length:", report.deviceItemIds?.length);

  const status = STATUS_MAP[report.status] || STATUS_MAP.PENDING;
  const type = REPORT_TYPE_MAP[report.type] || { label: "Không xác định", color: "bg-gray-100", icon: FileText };
  const StatusIcon = status.icon;
  const TypeIcon = type.icon;

  const formatDate = (date) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${type.color}`}>
                <TypeIcon size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">{type.label}</h3>
                <p className="text-xs text-gray-500">Mã: #{report.id?.slice(-6) || "N/A"}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Status Section */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl">
            <div className={`p-3 rounded-xl ${status.color}`}>
              <StatusIcon size={24} />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Trạng thái xử lý</p>
              <p className="text-lg font-black text-gray-900">{status.label}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ngày gửi</p>
              <p className="text-sm font-bold text-gray-700">{formatDate(report.createdAt)}</p>
            </div>
          </div>

          {/* Report Content - Delivery */}
          {report.type === "DELIVERY" && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Package size={16} className="text-indigo-600" />
                Chi tiết báo cáo giao hàng
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase">Loại vấn đề</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{report.issueType || "N/A"}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase">Sản phẩm bị ảnh hưởng</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{report.deviceItemIds?.length || 0} sản phẩm</p>
                </div>
              </div>

              {/* Affected Products List - Delivery */}
              {report.deviceItemIds?.length > 0 ? (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-3">Danh sách sản phẩm bị ảnh hưởng ({report.deviceItemIds.length} sản phẩm)</p>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {report.deviceItemIds.map((deviceItem, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                        {/* Product Image */}
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                          {deviceItem.deviceId?.images?.[0] ? (
                            <img 
                              src={deviceItem.deviceId.images[0]} 
                              alt={deviceItem.deviceId?.name || "Product"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={20} className="text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{deviceItem.deviceId?.name || report.itemName || "Sản phẩm"}</p>
                          <p className="text-xs text-gray-500 font-mono">Serial: {deviceItem.serialNumber || "N/A"}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                          report.issueType === "MISSING" ? "bg-orange-100 text-orange-700" :
                          report.issueType === "DAMAGED" ? "bg-red-100 text-red-700" :
                          "bg-amber-100 text-amber-700"
                        }`}>
                          {report.issueType === "MISSING" ? "Thiếu" :
                           report.issueType === "DAMAGED" ? "Hư hỏng" : "Lỗi"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Sản phẩm bị ảnh hưởng</p>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package size={20} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{report.itemName || "Sản phẩm"}</p>
                      <p className="text-xs text-gray-500">{report.rentalCode ? `Đơn #${report.rentalCode}` : ""}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                      report.issueType === "MISSING" ? "bg-orange-100 text-orange-700" :
                      report.issueType === "DAMAGED" ? "bg-red-100 text-red-700" :
                      "bg-amber-100 text-amber-700"
                    }`}>
                      {report.issueType === "MISSING" ? "Thiếu" :
                       report.issueType === "DAMAGED" ? "Hư hỏng" : "Lỗi"}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Mô tả chi tiết</p>
                <p className="text-sm text-gray-700 leading-relaxed">{report.description || "Không có mô tả"}</p>
              </div>

              {report.images?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase">Hình ảnh đính kèm</p>
                  <div className="grid grid-cols-4 gap-2">
                    {report.images.map((img, idx) => (
                      <div key={idx} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                        <ImageIcon size={24} className="text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Report Content - Damage */}
          {report.type === "DAMAGE" && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle size={16} className="text-rose-600" />
                Chi tiết báo cáo hư hỏng
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase">Mức độ hư hỏng</p>
                  <div className="mt-1">
                    <span className={`inline-block px-2 py-1 rounded-lg text-xs font-bold ${SEVERITY_MAP[report.severity]?.color || SEVERITY_MAP.MEDIUM.color}`}>
                      {SEVERITY_MAP[report.severity]?.label || report.severity || "Trung bình"}
                    </span>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase">Số sản phẩm bị ảnh hưởng</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{report.deviceItemIds?.length || 0} sản phẩm</p>
                </div>
              </div>

              {/* Affected Products List - Damage */}
              {report.deviceItemIds?.length > 0 ? (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-3">Danh sách sản phẩm bị hư hỏng ({report.deviceItemIds.length} sản phẩm)</p>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {report.deviceItemIds.map((deviceItem, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                        {/* Product Image */}
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
                          {deviceItem.deviceId?.images?.[0] ? (
                            <img 
                              src={deviceItem.deviceId.images[0]} 
                              alt={deviceItem.deviceId?.name || "Product"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={20} className="text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{deviceItem.deviceId?.name || report.itemName || "Sản phẩm"}</p>
                          <p className="text-xs text-gray-500 font-mono">Serial: {deviceItem.serialNumber || "N/A"}</p>
                        </div>
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-100 text-red-700">
                          Hư hỏng
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Sản phẩm bị hư hỏng</p>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package size={20} className="text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{report.itemName || "Sản phẩm"}</p>
                      <p className="text-xs text-gray-500">{report.rentalCode ? `Đơn #${report.rentalCode}` : ""}</p>
                    </div>
                    <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-red-100 text-red-700">
                      Hư hỏng
                    </span>
                  </div>
                </div>
              )}

              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Mô tả hư hỏng</p>
                <p className="text-sm text-gray-700 leading-relaxed">{report.description || "Không có mô tả"}</p>
              </div>

              {report.images?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-gray-400 uppercase">Hình ảnh chứng minh</p>
                  <div className="grid grid-cols-4 gap-2">
                    {report.images.map((img, idx) => (
                      <div key={idx} className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                        <ImageIcon size={24} className="text-gray-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Report Content - Extension */}
          {report.type === "EXTEND" && (
            <div className="space-y-4">
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar size={16} className="text-emerald-600" />
                Chi tiết gia hạn thuê
              </h4>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase">Ngày kết thúc hiện tại</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{formatDate(report.currentEndDate)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase">Ngày kết thúc mới</p>
                  <p className="text-sm font-bold text-emerald-600 mt-1">{formatDate(report.newEndDate)}</p>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-xs font-bold text-gray-400 uppercase mb-2">Lý do gia hạn</p>
                <p className="text-sm text-gray-700 leading-relaxed">{report.reason || "Không có lý do"}</p>
              </div>

              {report.extraAmount > 0 && (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xs font-bold text-emerald-600 uppercase">Phí gia hạn thêm</p>
                  <p className="text-2xl font-black text-emerald-700 mt-1">
                    {report.extraAmount?.toLocaleString()} ₫
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Resolution Section */}
          {(report.resolution || report.resolvedAt || report.resolvedBy) && (
            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <h4 className="text-sm font-black text-emerald-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <CheckCircle size={16} className="text-emerald-600" />
                Thông tin xử lý
              </h4>
              
              {report.resolution && (
                <div className="mb-3">
                  <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Cách xử lý</p>
                  <p className="text-sm text-emerald-800 leading-relaxed">{report.resolution}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {report.resolvedAt && (
                  <div>
                    <p className="text-xs font-bold text-emerald-600 uppercase">Ngày xử lý</p>
                    <p className="text-sm font-bold text-emerald-800">{formatDate(report.resolvedAt)}</p>
                  </div>
                )}
                {report.resolvedBy && (
                  <div>
                    <p className="text-xs font-bold text-emerald-600 uppercase">Người xử lý</p>
                    <p className="text-sm font-bold text-emerald-800">{report.resolvedBy}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rejection Section */}
          {report.rejectionReason && (
            <div className="p-4 bg-rose-50 rounded-xl border border-rose-100">
              <h4 className="text-sm font-black text-rose-900 uppercase tracking-wider mb-2 flex items-center gap-2">
                <XCircle size={16} className="text-rose-600" />
                Lý do từ chối
              </h4>
              <p className="text-sm text-rose-800 leading-relaxed">{report.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
