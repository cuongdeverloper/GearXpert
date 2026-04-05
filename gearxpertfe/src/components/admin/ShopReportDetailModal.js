import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    FiX, FiCalendar, FiHome, FiUser, FiInfo, FiImage, FiEye,
    FiAlertCircle, FiSettings, FiCheckCircle, FiXCircle, 
    FiFileText, FiPackage, FiClock
} from "react-icons/fi";
import { toast } from "react-toastify";
import { adminUpdateShopReportStatus } from "../../service/ApiService/ReportApi";

const statusOptions = [
  { value: "PENDING", label: "Đang chờ", color: "text-amber-500", bg: "bg-amber-50", border: "border-amber-100", icon: FiClock },
  { value: "RECEIVED", label: "Đã nhận", color: "text-blue-500", bg: "bg-blue-50", border: "border-blue-100", icon: FiCheckCircle },
  { value: "RESOLVED", label: "Đã xử lý", color: "text-emerald-500", bg: "bg-emerald-50", border: "border-emerald-100", icon: FiCheckCircle },
  { value: "REJECTED", label: "Bác bỏ", color: "text-rose-500", bg: "bg-rose-50", border: "border-rose-100", icon: FiXCircle },
];

const ShopReportDetailModal = ({ report, onClose, onSuccess }) => {
  const [status, setStatus] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (report) {
      setStatus(report.status);
      setAdminNotes(report.adminNotes || "");
    }
  }, [report]);

  const handleUpdate = async () => {
    if (!status) {
      toast.warning("Vui lòng chọn trạng thái");
      return;
    }
    setLoading(true);
    try {
      const res = await adminUpdateShopReportStatus(report._id, { status, adminNotes });
      if (res && res.success) {
        toast.success("Cập nhật báo cáo thành công");
        onSuccess && onSuccess();
        onClose();
      } else {
        toast.error(res.message || "Không thể cập nhật báo cáo");
      }
    } catch (error) {
      toast.error("Lỗi khi kết nối máy chủ");
    } finally {
      setLoading(false);
    }
  };

  if (!report) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-white/20"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-xl sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-100">
                <FiFileText size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 m-0">Chi tiết báo cáo</h3>
                <p className="text-xs font-bold text-slate-400 m-0 uppercase tracking-widest mt-1">ID: #{report._id.substring(report._id.length - 8)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-slate-100 text-slate-400 hover:text-slate-900 rounded-2xl transition-all active:scale-95 bg-slate-50 border border-slate-100"
            >
              <FiX size={20} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-8 space-y-8">
              {/* Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100 group hover:border-primary/30 transition-all">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-primary transition-colors">
                      <FiHome size={16} />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thông tin Shop</span>
                  </div>
                  <p className="text-sm font-black text-slate-800 m-0">{report.shop?.businessName || "N/A (Shop không tồn tại)"}</p>
                  <p className="text-xs text-slate-500 mt-1">ID: {report.shop?._id?.substring(0,8) || "N/A"}...</p>
                </div>

                <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100 group hover:border-blue-500/30 transition-all">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                      <FiUser size={16} />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Người gửi báo cáo</span>
                  </div>
                  <p className="text-sm font-black text-slate-800 m-0">{report.reporter?.fullName}</p>
                  <p className="text-xs text-slate-500 mt-1 truncate">{report.reporter?.email}</p>
                  <p className="text-xs text-slate-400">{report.reporter?.phone}</p>
                </div>

                <div className="bg-slate-50 p-5 rounded-[24px] border border-slate-100 group hover:border-amber-500/30 transition-all">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-amber-500 transition-colors">
                      <FiCalendar size={16} />
                    </div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thời gian gửi</span>
                  </div>
                  <p className="text-sm font-black text-slate-800 m-0">{new Date(report.createdAt).toLocaleDateString("vi-VN")}</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(report.createdAt).toLocaleTimeString("vi-VN")}</p>
                </div>
              </div>

              {/* Reason & Optional Product */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <FiAlertCircle className="text-rose-500" />
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest m-0">Lý do & Mô tả</h4>
                    </div>
                    <div className="bg-rose-50/50 p-6 rounded-[28px] border border-rose-100 shadow-sm">
                        <div className="inline-block px-3 py-1 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest mb-4">
                            {report.reason}
                        </div>
                        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap italic">
                            "{report.description}"
                        </p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2 px-2">
                        <FiPackage className="text-indigo-500" />
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest m-0">Sản phẩm liên quan</h4>
                    </div>
                    <div className="bg-indigo-50/50 p-6 rounded-[28px] border border-indigo-100 flex items-center gap-4 h-[120px] shadow-sm">
                        {report.purchasedProduct ? (
                            <>
                                <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm text-indigo-600 ring-2 ring-indigo-100">
                                    <FiPackage size={32} />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-black text-slate-800 m-0 mb-1">{report.purchasedProduct.deviceName}</p>
                                    <p className="text-[10px] text-indigo-500 font-bold uppercase tracking-widest">ID: #{report.purchasedProduct._id?.substring(0,8)}</p>
                                </div>
                            </>
                        ) : (
                            <div className="flex items-center gap-3 text-slate-400">
                                <FiInfo size={20} />
                                <span className="text-xs font-bold uppercase tracking-widest">Không có sản phẩm đính kèm</span>
                            </div>
                        )}
                    </div>
                </div>
              </div>

              {/* Evidence */}
              {report.evidence?.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-2 px-2">
                    <FiImage className="text-primary" />
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest m-0">Minh chứng bằng hình ảnh ({report.evidence.length})</h4>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 bg-slate-50 p-6 rounded-[32px] border border-slate-100">
                    {report.evidence.map((url, i) => (
                      <div key={url} className="group relative aspect-square rounded-2xl overflow-hidden shadow-sm border-2 border-white hover:border-primary transition-all cursor-zoom-in bg-white">
                        <img
                          src={url}
                          alt={`Evidence ${i + 1}`}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <a href={url} target="_blank" rel="noopener noreferrer" className="p-2 bg-white rounded-xl text-primary transform scale-0 group-hover:scale-100 transition-transform">
                                <FiEye size={20} />
                            </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Action */}
              <div className="pt-4 border-t border-slate-100">
                <div className="bg-slate-900 rounded-[40px] p-8 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 text-white/5 pointer-events-none group-hover:scale-110 transition-transform duration-700">
                        <FiSettings size={180} />
                    </div>
                    
                    <h3 className="text-lg font-black text-white mb-8 flex items-center gap-3 relative z-10">
                        <div className="p-2.5 bg-white/10 rounded-xl">
                            <FiSettings className="text-indigo-400 group-hover:rotate-180 transition-transform duration-1000" />
                        </div>
                        Xử lý báo cáo bởi Admin
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
                        <div className="lg:col-span-4 space-y-3">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Trạng thái mới</label>
                            <div className="grid grid-cols-1 gap-2">
                                {statusOptions
                                    .filter(opt => {
                                        // 1. Nếu đang chờ (PENDING) -> chỉ cho phép chuyển sang Đã nhận (RECEIVED)
                                        if (report.status === "PENDING") {
                                            return opt.value === "RECEIVED";
                                        }
                                        // 2. Nếu đã nhận (RECEIVED) -> cho phép chuyển sang Đã xử lý (RESOLVED) hoặc Bác bỏ (REJECTED)
                                        if (report.status === "RECEIVED") {
                                            return opt.value === "RESOLVED" || opt.value === "REJECTED";
                                        }
                                        // 3. Nếu đã Đã xử lý (RESOLVED) -> chỉ cho phép chuyển sang Bác bỏ (REJECTED) để sửa lỗi
                                        if (report.status === "RESOLVED") {
                                            return opt.value === "REJECTED";
                                        }
                                        // 4. Nếu đã Bác bỏ (REJECTED) -> chỉ cho phép chuyển sang Đã xử lý (RESOLVED) để sửa lỗi
                                        if (report.status === "REJECTED") {
                                            return opt.value === "RESOLVED";
                                        }
                                        return false;
                                    })
                                    .map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setStatus(opt.value)}
                                        className={`flex items-center gap-4 px-5 py-4 rounded-[20px] transition-all border-2 text-left ${
                                            status === opt.value 
                                            ? `${opt.color} ${opt.bg} ${opt.border} scale-105 shadow-xl` 
                                            : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20"
                                        }`}
                                    >
                                        <div className={`p-2 rounded-xl ${status === opt.value ? 'bg-white shadow-sm' : 'bg-white/10'}`}>
                                            <opt.icon size={18} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-black uppercase tracking-widest m-0Leading-none">{opt.label}</p>
                                        </div>
                                        {status === opt.value && <FiCheckCircle size={20} />}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="lg:col-span-8 flex flex-col space-y-3">
                             <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ghi chú phản hồi / Căn cứ xử lý</label>
                             <textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Nhập lý do bác bỏ hoặc các hành động đã thực hiện để giải quyết báo cáo này..."
                                rows={6}
                                className="w-full px-6 py-5 bg-white/5 border-2 border-white/10 rounded-[30px] text-white focus:border-indigo-500 outline-none transition-all resize-none font-medium placeholder:text-white/20"
                             />
                             <div className="flex justify-end pt-4">
                                <button
                                    disabled={loading}
                                    onClick={handleUpdate}
                                    className="px-10 py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-widest hover:bg-indigo-500 shadow-xl shadow-indigo-900/20 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3 lg:w-fit w-full justify-center group/btn"
                                >
                                    {loading ? (
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    ) : (
                                        <FiCheckCircle size={20} className="group-hover:scale-110 transition-transform" />
                                    )}
                                    <span>Cập nhật trạng thái</span>
                                </button>
                             </div>
                        </div>
                    </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShopReportDetailModal;
