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
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: easeOut }}
    >
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOut }}
      >
        <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
          Yêu cầu gia hạn
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Quản lý các yêu cầu gia hạn thuê thiết bị từ khách hàng
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="h-12 w-12 rounded-xl bg-amber-100 text-amber-600 inline-flex items-center justify-center">
              <FiClock size={24} />
            </span>
            <div>
              <p className="text-sm text-slate-500">Chờ xử lý</p>
              <p className="text-2xl font-bold text-slate-900">{stats.PENDING}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="h-12 w-12 rounded-xl bg-emerald-100 text-emerald-600 inline-flex items-center justify-center">
              <FiCheckCircle size={24} />
            </span>
            <div>
              <p className="text-sm text-slate-500">Đã chấp nhận</p>
              <p className="text-2xl font-bold text-slate-900">{stats.APPROVED}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="h-12 w-12 rounded-xl bg-rose-100 text-rose-600 inline-flex items-center justify-center">
              <FiXCircle size={24} />
            </span>
            <div>
              <p className="text-sm text-slate-500">Đã từ chối</p>
              <p className="text-2xl font-bold text-slate-900">{stats.REJECTED}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Tabs */}
          <div className="inline-flex flex-wrap gap-2 rounded-xl bg-slate-50 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border transition-all duration-200 ${
                  activeTab === tab.key
                    ? "bg-white text-slate-900 border-slate-200 shadow-sm ring-1 ring-slate-200/80"
                    : "bg-transparent text-slate-600 border-transparent hover:text-slate-900 hover:bg-white/70"
                }`}
              >
                {tab.label}
                <span className="ml-2 text-xs text-slate-500">
                  {tab.key === "ALL"
                    ? stats.PENDING + stats.APPROVED + stats.REJECTED
                    : stats[tab.key] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <FiSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo thiết bị, khách hàng..."
              className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/25 focus:border-primary transition-all duration-200 hover:border-slate-300 w-full lg:w-72"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 border-b border-slate-200 bg-slate-50/80">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Thông tin yêu cầu</th>
                <th className="px-4 py-3 font-semibold">Thiết bị</th>
                <th className="px-4 py-3 font-semibold">Khách hàng</th>
                <th className="px-4 py-3 font-semibold">Thời gian gia hạn</th>
                <th className="px-4 py-3 font-semibold">Đơn giá thuê</th>
                <th className="px-4 py-3 font-semibold">Phí gia hạn</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedRequests.map((request, index) => {
                const device = getPrimaryDevice(request);
                const item = getPrimaryItem(request);
                const statusConfig = STATUS_CONFIG[request.status];
                const StatusIcon = statusConfig.icon;
                const currentEndDate = item?.rentalEndDate;
                const newEndDate = request.requestedEndDate;

                return (
                  <motion.tr
                    key={request._id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group/row border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                  >
                    {/* Request Info */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <FiHash size={14} className="text-slate-400" />
                        <span className="text-xs text-slate-500">
                          {request._id.slice(-8).toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(request.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                      {request.note && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-slate-500">
                          <FiMessageSquare size={12} />
                          <span className="truncate max-w-[150px]">{request.note}</span>
                        </div>
                      )}
                    </td>

                    {/* Device */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        {device?.images?.[0] ? (
                          <img
                            src={device.images[0]}
                            alt={device.name}
                            className="w-10 h-10 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                            <FiPackage size={16} className="text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900 line-clamp-1 max-w-[150px]">
                            {device?.name || "Thiết bị"}
                          </p>
                          <p className="text-xs text-slate-500">
                            Đơn #{request.rentalId?._id?.slice(-6)}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {request.customerId?.avatar ? (
                          <img
                            src={request.customerId.avatar}
                            alt={request.customerId.fullName}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <FiUser size={14} className="text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-900 text-sm">
                            {request.customerId?.fullName || "Khách hàng"}
                          </p>
                          <p className="text-xs text-slate-500">
                            {request.customerId?.phoneNumber || "—"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Extension Duration */}
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-slate-500">Kết thúc hiện tại:</span>
                          <span className="text-slate-700">{formatDate(currentEndDate)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FiArrowRight size={14} className="text-primary" />
                          <span className="text-slate-500">Gia hạn đến:</span>
                          <span className="font-medium text-slate-900">
                            {formatDate(newEndDate)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-primary">
                          <FiCalendar size={12} />
                          <span>+{request.requestedDays} ngày</span>
                        </div>
                      </div>
                    </td>

                    {/* Rent Price */}
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">
                        {formatMoney(item?.rentPrice || device?.rentPrice?.perDay || 0)} ₫
                        <span className="text-xs text-slate-500">/ngày</span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Số lượng: {item?.quantity || 1} x {formatMoney(item?.rentPrice || device?.rentPrice?.perDay || 0)} ₫
                      </div>
                    </td>

                    {/* Fee */}
                    <td className="px-4 py-4">
                      <div className="font-semibold text-slate-900">
                        {formatMoney(request.proposedExtraAmount || 0)} ₫
                      </div>
                      {request.proposedExtraAmount > 0 && request.requestedDays > 0 && (
                        <div className="text-xs text-slate-500 mt-1">
                          {request.requestedDays} ngày × {formatMoney(Math.round(request.proposedExtraAmount / request.requestedDays))} ₫/ngày
                        </div>
                      )}
                      {request.approvedExtraAmount > 0 && (
                        <div className="text-xs text-emerald-600 mt-1">
                          Đã duyệt: {formatMoney(request.approvedExtraAmount)} ₫
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold border ${statusConfig.bgColor} ${statusConfig.textColor} ${statusConfig.borderColor}`}
                      >
                        <StatusIcon size={12} />
                        {statusConfig.label}
                      </span>
                      {request.status === "APPROVED" && request.approvedAt && (
                        <div className="text-xs text-slate-500 mt-1">
                          {formatDate(request.approvedAt)}
                        </div>
                      )}
                      {request.status === "REJECTED" && request.rejectedAt && (
                        <div className="text-xs text-slate-500 mt-1">
                          {formatDate(request.rejectedAt)}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            navigate(`/supplier/rental-requests/${request.rentalId?._id}`)
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                        >
                          Xem đơn
                          <FiChevronRight size={14} />
                        </button>

                        {request.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleApprove(request)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition-all"
                            >
                              <FiCheckCircle size={14} />
                              Chấp nhận
                            </button>
                            <button
                              onClick={() => handleReject(request)}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 transition-all"
                            >
                              <FiXCircle size={14} />
                              Từ chối
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}

              {!loading && filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                        <FiCalendar size={32} className="text-slate-300" />
                      </div>
                      <div>
                        <p className="text-slate-500 font-medium">Không có yêu cầu gia hạn nào</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Các yêu cầu gia hạn từ khách hàng sẽ xuất hiện ở đây
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                      <span className="text-slate-500">Đang tải...</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {filteredRequests.length > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-slate-100 text-sm text-slate-600">
            <span>
              Hiển thị {(page - 1) * pageSize + 1}-
              {Math.min(page * pageSize, filteredRequests.length)} /{" "}
              {filteredRequests.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-slate-50"
              >
                <FiChevronLeft size={16} />
              </button>
              <span className="text-slate-500">
                Trang {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-slate-50"
              >
                <FiChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
        <FiInfo className="text-blue-500 mt-0.5 flex-shrink-0" size={20} />
        <div className="text-sm text-blue-700">
          <p className="font-medium">Lưu ý về gia hạn:</p>
          <ul className="mt-1 space-y-1 text-blue-600 text-xs">
            <li>• Khi chấp nhận gia hạn, ngày kết thúc của đơn thuê sẽ được cập nhật tự động</li>
            <li>• Phí gia hạn sẽ được thu từ khách hàng khi trả thiết bị</li>
            <li>• Bạn có thể xem chi tiết đơn thuê bằng cách nhấn "Xem đơn"</li>
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
