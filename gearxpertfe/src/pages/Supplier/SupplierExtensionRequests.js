/* eslint-disable no-unused-vars */
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import {
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiCalendar,
  FiDollarSign,
  FiPackage,
  FiUser,
  FiMessageSquare,
  FiSearch,
  FiChevronRight,
  FiChevronLeft,
  FiArrowRight,
  FiHash,
  FiInfo,
} from "react-icons/fi";
import {
  getExtensionRequests,
  approveExtension,
  rejectExtension,
} from "../../service/ApiService/ExtensionRequestApi";
import { confirmDialog } from "../../utils/confirmDialog";

const STATUS_CONFIG = {
  PENDING: {
    label: "Chờ xử lý",
    color: "amber",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    borderColor: "border-amber-200",
    icon: FiClock,
  },
  APPROVED: {
    label: "Đã chấp nhận",
    color: "emerald",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    borderColor: "border-emerald-200",
    icon: FiCheckCircle,
  },
  REJECTED: {
    label: "Đã từ chối",
    color: "rose",
    bgColor: "bg-rose-50",
    textColor: "text-rose-700",
    borderColor: "border-rose-200",
    icon: FiXCircle,
  },
};

const TABS = [
  { key: "ALL", label: "Tất cả", status: null },
  { key: "PENDING", label: "Chờ xử lý", status: "PENDING" },
  { key: "APPROVED", label: "Đã chấp nhận", status: "APPROVED" },
  { key: "REJECTED", label: "Đã từ chối", status: "REJECTED" },
];

const easeOut = [0.22, 1, 0.36, 1];

const formatDate = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatMoney = (value) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);

const getDaysDiff = (start, end) => {
  const s = new Date(start);
  const e = new Date(end);
  return Math.ceil((e - s) / (1000 * 60 * 60 * 24));
};

export default function SupplierExtensionRequests() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user.account);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ PENDING: 0, APPROVED: 0, REJECTED: 0 });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [selectedRequest, setSelectedRequest] = useState(null);

  const fetchRequests = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const status = TABS.find((t) => t.key === activeTab)?.status;
      const res = await getExtensionRequests(user.id, status);
      if (res.success) {
        setRequests(res.extensionRequests || []);
        setStats(res.stats || { PENDING: 0, APPROVED: 0, REJECTED: 0 });
      }
    } catch (error) {
      toast.error(error?.message || "Không tải được yêu cầu gia hạn");
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeTab]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm]);

  const filteredRequests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return requests;
    return requests.filter((r) => {
      const deviceName = r.rentalId?.items?.[0]?.deviceId?.name || "";
      const customerName = r.customerId?.fullName || "";
      const rentalCode = r.rentalId?._id?.slice(-6) || "";
      return (
        deviceName.toLowerCase().includes(term) ||
        customerName.toLowerCase().includes(term) ||
        rentalCode.toLowerCase().includes(term)
      );
    });
  }, [requests, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));
  const pagedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, page, pageSize]);

  const handleApprove = async (request) => {
    const result = await confirmDialog({
      title: "Chấp nhận gia hạn?",
      text: `Bạn sẽ chấp nhận gia hạn thêm ${request.requestedDays} ngày cho đơn thuê này.`,
      icon: "question",
      confirmText: "Chấp nhận",
      cancelText: "Hủy",
      confirmColor: "#10b981",
    });

    if (!result.isConfirmed) return;

    try {
      console.log("Approving extension request:", request._id);
      const res = await approveExtension(request._id);
      console.log("Approve response:", res);
      toast.success(res?.data?.message || "Đã chấp nhận gia hạn thành công!");
      fetchRequests();
    } catch (err) {
      console.error("Approve extension error:", err);
      console.error("Error response:", err?.response);
      toast.error(err?.response?.data?.message || err?.message || "Lỗi khi chấp nhận gia hạn");
    }
  };

  const handleReject = async (request) => {
    const result = await confirmDialog({
      title: "Từ chối gia hạn?",
      text: "Bạn có chắc muốn từ chối yêu cầu gia hạn này?",
      icon: "warning",
      confirmText: "Từ chối",
      cancelText: "Hủy",
      confirmColor: "#ef4444",
    });

    if (!result.isConfirmed) return;

    try {
      console.log("Rejecting extension request:", request._id);
      const res = await rejectExtension(request._id, "Không được chấp nhận bởi nhà cung cấp");
      console.log("Reject response:", res);
      toast.success(res?.data?.message || "Đã từ chối gia hạn");
      fetchRequests();
    } catch (err) {
      console.error("Reject extension error:", err);
      console.error("Error response:", err?.response);
      toast.error(err?.response?.data?.message || err?.message || "Lỗi khi từ chối gia hạn");
    }
  };

  const getPrimaryDevice = (request) => {
    return request.rentalId?.items?.[0]?.deviceId;
  };

  const getPrimaryItem = (request) => {
    return request.rentalId?.items?.[0];
  };

  return (
    <motion.div 
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 min-h-screen bg-slate-50/50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1"
        >
          <div className="flex items-center gap-2 text-primary font-bold text-sm tracking-widest uppercase">
            <div className="h-1 w-8 bg-primary rounded-full" />
            Quản lý vận hành
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Yêu cầu <span className="text-primary italic">Gia hạn</span>
          </h1>
          <p className="text-slate-500 font-medium">
            Theo dõi và phê duyệt các yêu cầu gia hạn từ khách hàng
          </p>
        </motion.div>

        <div className="flex items-center gap-3">
          <div className="relative group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm nhanh..."
              className="pl-12 pr-6 py-3.5 bg-white border-none shadow-sm shadow-slate-200/60 rounded-2xl text-sm w-full md:w-80 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
            />
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Tổng yêu cầu", value: stats.PENDING + stats.APPROVED + stats.REJECTED, color: "text-slate-900", bg: "bg-slate-100", icon: FiHash },
          { label: "Chờ xử lý", value: stats.PENDING, color: "text-amber-600", bg: "bg-amber-100/50", icon: FiClock },
          { label: "Đã duyệt", value: stats.APPROVED, color: "text-emerald-600", bg: "bg-emerald-100/50", icon: FiCheckCircle },
          { label: "Từ chối", value: stats.REJECTED, color: "text-rose-600", bg: "bg-rose-100/50", icon: FiXCircle },
        ].map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4"
          >
            <div className={`h-12 w-12 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center`}>
              <s.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className={`text-xl font-black ${s.color}`}>{s.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="space-y-6">
        {/* Tabs Filter */}
        <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl border border-slate-100 shadow-sm w-fit">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-300 ${
                activeTab === tab.key
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                  : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dynamic Card Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
            {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-slate-200/50 rounded-3xl" />)}
          </div>
        ) : pagedRequests.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">
            {pagedRequests.map((request, idx) => {
              const device = getPrimaryDevice(request);
              const item = getPrimaryItem(request);
              const statusConfig = STATUS_CONFIG[request.status];
              const StatusIcon = statusConfig.icon;
              
              return (
                <motion.div
                  key={request._id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-white rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden flex flex-col"
                >
                  {/* Card Header */}
                  <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center gap-1.5 ${statusConfig.bgColor} ${statusConfig.textColor} border ${statusConfig.borderColor}`}>
                        <StatusIcon size={12} />
                        {statusConfig.label}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        #{request._id.slice(-8).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {new Date(request.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {formatDate(request.createdAt)}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6 flex-1">
                    {/* Left: Device & Customer */}
                    <div className="space-y-4 border-r border-slate-50 pr-2">
                      <div className="flex gap-4">
                        <div className="relative h-16 w-16 flex-shrink-0 group-hover:scale-105 transition-transform duration-500">
                          {device?.images?.[0] ? (
                            <img src={device.images[0]} alt="" className="h-full w-full object-cover rounded-2xl shadow-md" />
                          ) : (
                            <div className="h-full w-full bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                              <FiPackage size={24} />
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-white rounded-full shadow-sm flex items-center justify-center border border-slate-50">
                            <FiPackage size={12} className="text-primary" />
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-slate-800 truncate leading-tight">
                            {device?.name || "Thiết bị không xác định"}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Đơn hàng #{request.rentalId?._id?.slice(-6)}</p>
                          <div className="mt-2 flex items-center gap-1.5">
                            <img
                              src={request.customerId?.avatar || "https://ui-avatars.com/api/?name=User"}
                              alt=""
                              className="h-5 w-5 rounded-full ring-2 ring-white"
                            />
                            <span className="text-xs font-bold text-slate-600 truncate">{request.customerId?.fullName}</span>
                          </div>
                        </div>
                      </div>

                      {request.note && (
                        <div className="bg-slate-50 p-3 rounded-2xl relative">
                          <FiMessageSquare size={12} className="text-slate-300 absolute top-2 right-2" />
                          <p className="text-[11px] text-slate-500 italic leading-relaxed line-clamp-2 pr-4 italic">
                            "{request.note}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right: Duration & Financials */}
                    <div className="space-y-4">
                      {/* Timeline */}
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <div className="h-2 w-2 rounded-full bg-slate-300" />
                          <div className="h-4 w-px bg-slate-200 my-1" />
                          <div className="h-2 w-2 rounded-full bg-primary" />
                        </div>
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold text-slate-400 leading-none">THỜI HẠN GIA HẠN</p>
                          <div className="text-xs font-black text-slate-800 tracking-tight">
                            <span className="text-slate-400 font-medium">{formatDate(item?.rentalEndDate)}</span>
                            <FiChevronRight className="inline mx-1 text-slate-300" />
                            <span>{formatDate(request.requestedEndDate)}</span>
                            <div className="mt-1 text-primary text-[10px] tracking-widest font-black uppercase">
                              +{request.requestedDays} ngày thêm
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Financial Detail Card */}
                      <div className="bg-slate-900 rounded-2xl p-4 text-white shadow-lg shadow-slate-200">
                        <div className="flex justify-between items-center mb-1 opacity-70">
                          <span className="text-[9px] font-bold uppercase tracking-widest">Phí gia hạn dự kiến</span>
                          <span className="text-[9px] font-bold">{formatMoney(Math.round(request.proposedExtraAmount / (request.requestedDays || 1)))} ₫ / ngày</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xl font-black">{formatMoney(request.proposedExtraAmount)} ₫</span>
                          <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center">
                            <FiDollarSign size={16} className="text-emerald-400" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Actions */}
                  <div className="px-6 py-4 bg-slate-50/50 flex items-center justify-between gap-3">
                    <button 
                      onClick={() => navigate(`/supplier/rental-requests/${request.rentalId?._id}`)}
                      className="text-[10px] font-black uppercase text-slate-400 hover:text-primary transition-colors flex items-center gap-1.5"
                    >
                      Chi tiết đơn <FiArrowRight size={14} />
                    </button>

                    {request.status === "PENDING" && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => handleReject(request)}
                          className="h-10 px-5 rounded-xl text-xs font-black text-rose-600 hover:bg-rose-50 transition-all active:scale-95"
                        >
                          Từ chối
                        </button>
                        <button
                          onClick={() => handleApprove(request)}
                          className="h-10 px-8 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800 shadow-xl shadow-slate-200 active:scale-95 flex items-center gap-2"
                        >
                          <FiCheckCircle size={14} />
                          Chấp nhận
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 bg-white rounded-[3rem] border border-slate-100 text-center flex flex-col items-center">
            <div className="h-24 w-24 rounded-full bg-slate-50 flex items-center justify-center mb-4">
              <FiCalendar size={48} className="text-slate-200" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Không có dữ liệu</h3>
            <p className="text-slate-400 mt-1 max-w-xs text-sm">Hiện tại không có yêu cầu gia hạn nào khớp với bộ lọc của bạn.</p>
          </div>
        )}

        {/* Pagination Section */}
        {filteredRequests.length > pageSize && (
          <div className="flex items-center justify-between pt-8 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              Hiển thị {pagedRequests.length} / {filteredRequests.length} yêu cầu
            </span>
            <div className="flex items-center gap-3">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary disabled:opacity-30 disabled:hover:border-slate-200 transition-all font-bold"
              >
                <FiChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={`h-10 w-10 rounded-xl text-xs font-black transition-all ${
                      page === i + 1 ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="h-10 w-10 rounded-xl border border-slate-200 flex items-center justify-center text-slate-400 hover:border-primary hover:text-primary disabled:opacity-30 disabled:hover:border-slate-200 transition-all font-bold"
              >
                <FiChevronRight size={20} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Guide Note - Floating Style */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl shadow-indigo-200">
        <div className="absolute top-0 right-0 h-48 w-48 bg-white/10 rounded-full -translate-y-24 translate-x-12 blur-3xl" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <h4 className="text-2xl font-black tracking-tight flex items-center gap-2">
              <FiInfo className="text-indigo-300" /> Lưu ý vận hành
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-indigo-100 text-sm">
              <div className="flex gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-300 mt-1.5 flex-shrink-0" />
                <p>Khi <b>Chấp nhận</b>, ngày kết thúc đơn thuê sẽ tự động lùi lại theo số ngày gia hạn.</p>
              </div>
              <div className="flex gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-300 mt-1.5 flex-shrink-0" />
                <p>Phí gia hạn sẽ được hệ thống thanh toán cho bạn sau khi đơn hàng hoàn tất.</p>
              </div>
            </div>
          </div>
          <button 
            onClick={() => window.open('/help/extension', '_blank')}
            className="px-6 py-3 bg-white text-indigo-600 rounded-2xl font-black text-xs hover:bg-indigo-50 transition-all shrink-0"
          >
            Tìm hiểu thêm
          </button>
        </div>
      </div>
    </motion.div>
  );
}
