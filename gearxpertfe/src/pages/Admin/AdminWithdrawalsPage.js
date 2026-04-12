import React, { useCallback, useEffect, useState } from "react";
import { FiDollarSign, FiCheck, FiX, FiClock, FiFilter, FiSearch, FiEye, FiUser, FiAlertCircle, FiLoader } from "react-icons/fi";
import { getWithdrawalRequests, approveWithdrawal, rejectWithdrawal } from "../../service/ApiService/AdminApi";

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [notification, setNotification] = useState({ show: false, type: "", message: "" });

  const fetchWithdrawals = useCallback(async () => {
    try {
      setLoading(true);
      const response = await getWithdrawalRequests({
        status: filterStatus,
        search: searchTerm,
      });
      const list = response.withdrawals || [];
      setWithdrawals(list);
    } catch (error) {
      console.error("Error fetching withdrawal requests:", error);
      console.error("Error response:", error.response);

      if (error.response?.status === 404 || error.response?.status === 500) {
        setWithdrawals([
          {
            _id: "sample1",
            amount: 1000000,
            status: "PENDING",
            createdAt: new Date(),
            processedAt: null,
            notes: "Sample withdrawal request",
            rejectionReason: null,
            supplierId: {
              fullName: "Sample Supplier",
              email: "supplier@example.com",
              phone: "0123456789",
            },
            bankInfo: {
              bankName: "Vietcombank",
              accountNumber: "1234567890",
              accountName: "Sample Supplier",
            },
            referenceId: "WD000001",
          },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [filterStatus, searchTerm]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const showNotification = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: "", message: "" }), 3000);
  };

  const handleApprove = async (withdrawalId) => {
    setSelectedWithdrawal(withdrawals.find(w => w._id === withdrawalId));
    setShowApproveModal(true);
  };

  const confirmApprove = async () => {
    if (!selectedWithdrawal) return;

    try {
      setActionLoading(prev => ({ ...prev, [selectedWithdrawal._id]: true }));
      const response = await approveWithdrawal(selectedWithdrawal._id);

      // Backend doesn't return success field, check if response exists
      if (response.data) {
        setWithdrawals(prev =>
          prev.map(w =>
            w._id === selectedWithdrawal._id
              ? { ...w, status: "APPROVED", processedAt: new Date() }
              : w
          )
        );
        showNotification("success", "Yêu cầu rút tiền đã được duyệt và chuyển tiền thành công!");
        setShowApproveModal(false);
        // Auto-refresh data after 1 second
        setTimeout(() => fetchWithdrawals(), 1000);
      } else {
        showNotification("error", "Lỗi khi duyệt yêu cầu rút tiền");
      }
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      const errorMessage = error.response?.data?.message || error.message || "Lỗi khi duyệt yêu cầu rút tiền";
      showNotification("error", errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedWithdrawal._id]: false }));
    }
  };

  const handleReject = (withdrawalId) => {
    setSelectedWithdrawal(withdrawals.find(w => w._id === withdrawalId));
    setRejectReason("");
    setShowRejectModal(true);
  };

  const confirmReject = async () => {
    if (!selectedWithdrawal || !rejectReason.trim()) {
      showNotification("error", "Vui lòng nhập lý do từ chối");
      return;
    }

    try {
      setActionLoading(prev => ({ ...prev, [selectedWithdrawal._id]: true }));
      const response = await rejectWithdrawal(selectedWithdrawal._id, { reason: rejectReason.trim() });

      // Backend doesn't return success field, check if response exists
      if (response.data) {
        setWithdrawals(prev =>
          prev.map(w =>
            w._id === selectedWithdrawal._id
              ? { ...w, status: "REJECTED", processedAt: new Date(), rejectionReason: rejectReason.trim() }
              : w
          )
        );
        showNotification("success", "Yêu cầu rút tiền đã bị từ chối!");
        setShowRejectModal(false);
        // Auto-refresh data after 1 second
        setTimeout(() => fetchWithdrawals(), 1000);
      } else {
        showNotification("error", "Lỗi khi từ chối yêu cầu rút tiền");
      }
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      const errorMessage = error.response?.data?.message || error.message || "Lỗi khi từ chối yêu cầu rút tiền";
      showNotification("error", errorMessage);
    } finally {
      setActionLoading(prev => ({ ...prev, [selectedWithdrawal._id]: false }));
    }
  };

  const showDetail = (withdrawal) => {
    setSelectedWithdrawal(withdrawal);
    setShowDetailModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "APPROVED":
        return "bg-green-100 text-green-800 border-green-200";
      case "REJECTED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "PENDING":
        return <FiClock className="text-yellow-600" />;
      case "APPROVED":
        return <FiCheck className="text-green-600" />;
      case "REJECTED":
        return <FiX className="text-red-600" />;
      default:
        return <FiClock className="text-gray-600" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "PENDING":
        return "Chờ duyệt";
      case "APPROVED":
        return "Đã duyệt";
      case "REJECTED":
        return "Đã từ chối";
      default:
        return status;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
                <FiDollarSign className="text-white text-xl" />
              </div>
              Quản Lý Rút Tiền
            </h1>
            <p className="text-gray-600 mt-2">Phê duyệt và quản lý các yêu cầu rút tiền từ nhà cung cấp</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl p-6 border border-indigo-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-indigo-600 font-medium">Tổng yêu cầu</p>
              <p className="text-3xl font-bold text-indigo-900 mt-1">{withdrawals.length}</p>
            </div>
            <div className="w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
              <FiDollarSign className="text-white text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-yellow-100 rounded-2xl p-6 border border-yellow-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">Chờ duyệt</p>
              <p className="text-3xl font-bold text-yellow-900 mt-1">
                {withdrawals.filter(w => w.status === "PENDING").length}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center shadow-lg">
              <FiClock className="text-white text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-2xl p-6 border border-green-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Đã duyệt</p>
              <p className="text-3xl font-bold text-green-900 mt-1">
                {withdrawals.filter(w => w.status === "APPROVED").length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
              <FiCheck className="text-white text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-red-100 rounded-2xl p-6 border border-orange-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-orange-600 font-medium">Tổng tiền chờ</p>
              <p className="text-2xl font-bold text-orange-900 mt-1">
                {formatCurrency(
                  withdrawals
                    .filter(w => w.status === "PENDING")
                    .reduce((sum, w) => sum + w.amount, 0)
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <FiDollarSign className="text-white text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm mb-8">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FiFilter className="text-indigo-600" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Bộ lọc</span>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Trạng thái:</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Đã từ chối</option>
            </select>
          </div>

          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-indigo-50">
          <h2 className="text-xl font-bold text-gray-900">Danh sách yêu cầu rút tiền</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Nhà cung cấp
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Số tiền
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Ngày yêu cầu
                </th>
                <th className="px-8 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-8 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {withdrawals.map((withdrawal) => (
                <tr key={withdrawal._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                        <FiUser className="text-indigo-600 text-lg" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">
                          {withdrawal.supplierId?.fullName || "N/A"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {withdrawal.supplierId?.email || "N/A"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="text-sm font-bold text-gray-900">
                      {formatCurrency(withdrawal.amount)}
                    </div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap text-sm text-gray-600">
                    {new Date(withdrawal.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(withdrawal.status)}
                      <span className={`px-3 py-1.5 text-xs font-semibold rounded-full border ${getStatusColor(withdrawal.status)}`}>
                        {getStatusLabel(withdrawal.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-5 whitespace-nowrap">
                    <div className="flex items-center justify-center gap-3">
                      <button
                        onClick={() => showDetail(withdrawal)}
                        className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all duration-200 hover:scale-105"
                        title="Xem chi tiết"
                      >
                        <FiEye size={18} />
                      </button>

                      {withdrawal.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleApprove(withdrawal._id)}
                            disabled={actionLoading[withdrawal._id]}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-xs font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
                          >
                            {actionLoading[withdrawal._id] ? (
                              <FiLoader className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FiCheck className="w-3.5 h-3.5" />
                            )}
                            {actionLoading[withdrawal._id] ? "Đang xử lý..." : "Duyệt"}
                          </button>
                          <button
                            onClick={() => handleReject(withdrawal._id)}
                            disabled={actionLoading[withdrawal._id]}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-pink-600 text-white text-xs font-semibold rounded-xl hover:from-red-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105"
                          >
                            {actionLoading[withdrawal._id] ? (
                              <FiLoader className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <FiX className="w-3.5 h-3.5" />
                            )}
                            {actionLoading[withdrawal._id] ? "Đang xử lý..." : "Từ chối"}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {withdrawals.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FiDollarSign className="text-4xl text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg font-medium">Không có yêu cầu rút tiền nào</p>
            <p className="text-gray-400 text-sm mt-2">Các yêu cầu rút tiền sẽ xuất hiện ở đây</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-8 py-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                    <FiEye className="text-white text-xl" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Chi tiết yêu cầu rút tiền</h3>
                    <p className="text-indigo-100 text-sm">Mã: #{selectedWithdrawal.referenceId}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                  <FiX className="text-white" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-8 max-h-[60vh] overflow-y-auto">
              <div className="space-y-6">
                {/* Supplier Info */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-indigo-100">
                  <h4 className="text-sm font-semibold text-indigo-700 mb-4 flex items-center gap-2">
                    <FiUser className="text-indigo-600" />
                    Thông tin nhà cung cấp
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Họ tên</p>
                      <p className="font-semibold text-gray-900">{selectedWithdrawal.supplierId?.fullName}</p>
                      <p className="text-sm text-gray-600">{selectedWithdrawal.supplierId?.email}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Số điện thoại</p>
                      <p className="font-semibold text-gray-900">{selectedWithdrawal.supplierId?.phone || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Amount Info */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
                  <h4 className="text-sm font-semibold text-green-700 mb-4 flex items-center gap-2">
                    <FiDollarSign className="text-green-600" />
                    Thông tin số tiền
                  </h4>
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-2">Số tiền yêu cầu</p>
                    <p className="text-3xl font-bold text-green-600">{formatCurrency(selectedWithdrawal.amount)}</p>
                  </div>
                </div>

                {/* Bank Info */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100">
                  <h4 className="text-sm font-semibold text-orange-700 mb-4 flex items-center gap-2">
                    <FiDollarSign className="text-orange-600" />
                    Thông tin ngân hàng
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Ngân hàng</p>
                      <p className="font-semibold text-gray-900">{selectedWithdrawal.bankInfo?.bankName || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Số tài khoản</p>
                      <p className="font-semibold text-gray-900 font-mono">{selectedWithdrawal.bankInfo?.accountNumber || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Chủ tài khoản</p>
                      <p className="font-semibold text-gray-900">{selectedWithdrawal.bankInfo?.accountName || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Ghi chú</h4>
                  <p className="text-sm text-gray-600">{selectedWithdrawal.notes || "Không có ghi chú"}</p>
                </div>

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                    <p className="text-xs text-blue-600 mb-1">Ngày yêu cầu</p>
                    <p className="text-sm font-semibold text-blue-900">
                      {new Date(selectedWithdrawal.createdAt).toLocaleString("vi-VN")}
                    </p>
                  </div>
                  {selectedWithdrawal.processedAt && (
                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                      <p className="text-xs text-purple-600 mb-1">Ngày xử lý</p>
                      <p className="text-sm font-semibold text-purple-900">
                        {new Date(selectedWithdrawal.processedAt).toLocaleString("vi-VN")}
                      </p>
                    </div>
                  )}
                </div>

                {/* Rejection Reason */}
                {selectedWithdrawal.rejectionReason && (
                  <div className="bg-red-50 rounded-2xl p-6 border border-red-100">
                    <h4 className="text-sm font-semibold text-red-700 mb-3">Lý do từ chối</h4>
                    <p className="text-sm text-red-600">{selectedWithdrawal.rejectionReason}</p>
                  </div>
                )}

                {/* Status Badge */}
                <div className="flex justify-center">
                  <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border ${getStatusColor(selectedWithdrawal.status)}`}>
                    {getStatusIcon(selectedWithdrawal.status)}
                    <span className="text-sm font-semibold">{getStatusLabel(selectedWithdrawal.status)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            {selectedWithdrawal.status === "PENDING" && (
              <div className="bg-gray-50 px-8 py-6 border-t border-gray-200">
                <div className="flex gap-4">
                  <button
                    onClick={() => {
                      handleApprove(selectedWithdrawal._id);
                      setShowDetailModal(false);
                    }}
                    disabled={actionLoading[selectedWithdrawal._id]}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    {actionLoading[selectedWithdrawal._id] && (
                      <FiLoader className="w-4 h-4 animate-spin" />
                    )}
                    {actionLoading[selectedWithdrawal._id] ? "Đang xử lý..." : "Duyệt yêu cầu"}
                  </button>
                  <button
                    onClick={() => {
                      handleReject(selectedWithdrawal._id);
                      setShowDetailModal(false);
                    }}
                    disabled={actionLoading[selectedWithdrawal._id]}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white font-semibold rounded-xl hover:from-red-600 hover:to-pink-700 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                  >
                    {actionLoading[selectedWithdrawal._id] && (
                      <FiLoader className="w-4 h-4 animate-spin" />
                    )}
                    {actionLoading[selectedWithdrawal._id] ? "Đang xử lý..." : "Từ chối yêu cầu"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notification Toast */}
      {notification.show && (
        <div className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg shadow-lg border transform transition-all duration-300 ${notification.type === "success"
          ? "bg-green-50 border-green-200 text-green-800"
          : "bg-red-50 border-red-200 text-red-800"
          }`}>
          <div className="flex items-center gap-3">
            {notification.type === "success" ? (
              <FiCheck className="w-5 h-5 text-green-600" />
            ) : (
              <FiAlertCircle className="w-5 h-5 text-red-600" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
            <button
              onClick={() => setNotification({ show: false, type: "", message: "" })}
              className="text-gray-400 hover:text-gray-600"
            >
              <FiX className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Approve Confirmation Modal */}
      {showApproveModal && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50" onClick={() => setShowApproveModal(false)} />
          <div className="relative bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <FiCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Xác nhận duyệt rút tiền</h3>
                <p className="text-sm text-gray-500">Thao tác này sẽ chuyển tiền ngay lập tức</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg space-y-2 mb-6">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Số tiền:</span>
                <span className="font-medium">{formatCurrency(selectedWithdrawal.amount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Người yêu cầu:</span>
                <span className="font-medium">{selectedWithdrawal.supplierId?.fullName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Tài khoản:</span>
                <span className="font-medium">{selectedWithdrawal.bankInfo?.accountNumber}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={actionLoading[selectedWithdrawal._id]}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={confirmApprove}
                disabled={actionLoading[selectedWithdrawal._id]}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading[selectedWithdrawal._id] && (
                  <FiLoader className="w-4 h-4 animate-spin" />
                )}
                {actionLoading[selectedWithdrawal._id] ? "Đang xử lý..." : "Xác nhận duyệt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Confirmation Modal */}
      {showRejectModal && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50" onClick={() => setShowRejectModal(false)} />
          <div className="relative bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <FiX className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Xác nhận từ chối rút tiền</h3>
                <p className="text-sm text-gray-500">Vui lòng nhập lý do từ chối</p>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do từ chối <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRejectModal(false)}
                disabled={actionLoading[selectedWithdrawal._id]}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={confirmReject}
                disabled={actionLoading[selectedWithdrawal._id] || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {actionLoading[selectedWithdrawal._id] && (
                  <FiLoader className="w-4 h-4 animate-spin" />
                )}
                {actionLoading[selectedWithdrawal._id] ? "Đang xử lý..." : "Xác nhận từ chối"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
