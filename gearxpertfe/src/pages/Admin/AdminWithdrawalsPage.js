import React, { useEffect, useState } from "react";
import { FiDollarSign, FiCheck, FiX, FiClock, FiFilter, FiSearch, FiEye, FiUser } from "react-icons/fi";
import { getWithdrawalRequests, approveWithdrawal, rejectWithdrawal } from "../../service/ApiService/AdminApi";

export default function AdminWithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedWithdrawal, setSelectedWithdrawal] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  useEffect(() => {
    fetchWithdrawals();
  }, [filterStatus, searchTerm]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      console.log("Fetching withdrawals with params:", {
        status: filterStatus,
        search: searchTerm
      });
      
      const response = await getWithdrawalRequests({
        status: filterStatus,
        search: searchTerm
      });
      
      console.log("Withdrawals API response:", response);
      
      const withdrawals = response.withdrawals || [];
      console.log("Setting withdrawals:", withdrawals);
      setWithdrawals(withdrawals);
      
      // If no withdrawals, show a message
      if (withdrawals.length === 0) {
        console.log("No withdrawals found in response");
      }
    } catch (error) {
      console.error("Error fetching withdrawal requests:", error);
      console.error("Error response:", error.response);
      
      // If API error, show sample data for testing
      if (error.response?.status === 404 || error.response?.status === 500) {
        console.log("API error, showing sample data");
        setWithdrawals([
          {
            _id: 'sample1',
            amount: 1000000,
            status: 'PENDING',
            createdAt: new Date(),
            processedAt: null,
            notes: 'Sample withdrawal request',
            rejectionReason: null,
            supplierId: {
              fullName: 'Sample Supplier',
              email: 'supplier@example.com',
              phone: '0123456789'
            },
            bankInfo: {
              bankName: 'Vietcombank',
              accountNumber: '1234567890',
              accountName: 'Sample Supplier'
            },
            referenceId: 'WD000001'
          }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (withdrawalId) => {
    try {
      setActionLoading(prev => ({ ...prev, [withdrawalId]: true }));
      await approveWithdrawal(withdrawalId);
      
      setWithdrawals(prev => 
        prev.map(w => 
          w._id === withdrawalId 
            ? { ...w, status: "APPROVED", processedAt: new Date() }
            : w
        )
      );
      
      alert("Yêu cầu rút tiền đã được duyệt!");
    } catch (error) {
      console.error("Error approving withdrawal:", error);
      alert("Lỗi khi duyệt yêu cầu rút tiền");
    } finally {
      setActionLoading(prev => ({ ...prev, [withdrawalId]: false }));
    }
  };

  const handleReject = async (withdrawalId) => {
    const reason = prompt("Vui lòng nhập lý do từ chối:");
    if (!reason) return;

    try {
      setActionLoading(prev => ({ ...prev, [withdrawalId]: true }));
      await rejectWithdrawal(withdrawalId, { reason });
      
      setWithdrawals(prev => 
        prev.map(w => 
          w._id === withdrawalId 
            ? { ...w, status: "REJECTED", processedAt: new Date(), rejectionReason: reason }
            : w
        )
      );
      
      alert("Yêu cầu rút tiền đã bị từ chối!");
    } catch (error) {
      console.error("Error rejecting withdrawal:", error);
      alert("Lỗi khi từ chối yêu cầu rút tiền");
    } finally {
      setActionLoading(prev => ({ ...prev, [withdrawalId]: false }));
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Duyệt Yêu Cầu Rút Tiền</h1>
          <p className="text-gray-500">Quản lý và phê duyệt các yêu cầu rút tiền từ nhà cung cấp</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tổng yêu cầu</p>
              <p className="text-2xl font-bold text-gray-900">{withdrawals.length}</p>
            </div>
            <FiDollarSign className="text-3xl text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Chờ duyệt</p>
              <p className="text-2xl font-bold text-yellow-600">
                {withdrawals.filter(w => w.status === "PENDING").length}
              </p>
            </div>
            <FiClock className="text-3xl text-yellow-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Đã duyệt</p>
              <p className="text-2xl font-bold text-green-600">
                {withdrawals.filter(w => w.status === "APPROVED").length}
              </p>
            </div>
            <FiCheck className="text-3xl text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tổng tiền chờ duyệt</p>
              <p className="text-2xl font-bold text-orange-600">
                {formatCurrency(
                  withdrawals
                    .filter(w => w.status === "PENDING")
                    .reduce((sum, w) => sum + w.amount, 0)
                )}
              </p>
            </div>
            <FiDollarSign className="text-3xl text-orange-600" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <FiFilter className="text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Lọc:</span>
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Đã từ chối</option>
          </select>

          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Withdrawals Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Danh sách yêu cầu rút tiền</h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nhà cung cấp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số tiền
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ngày yêu cầu
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {withdrawals.map((withdrawal) => (
                <tr key={withdrawal._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <FiUser className="text-indigo-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {withdrawal.supplierId?.fullName || "N/A"}
                        </div>
                        <div className="text-xs text-gray-500">
                          {withdrawal.supplierId?.email || "N/A"}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {formatCurrency(withdrawal.amount)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(withdrawal.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(withdrawal.status)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(withdrawal.status)}`}>
                        {getStatusLabel(withdrawal.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => showDetail(withdrawal)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Xem chi tiết"
                      >
                        <FiEye size={16} />
                      </button>
                      
                      {withdrawal.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => handleApprove(withdrawal._id)}
                            disabled={actionLoading[withdrawal._id]}
                            className="px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading[withdrawal._id] ? "..." : "Duyệt"}
                          </button>
                          <button
                            onClick={() => handleReject(withdrawal._id)}
                            disabled={actionLoading[withdrawal._id]}
                            className="px-3 py-1 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading[withdrawal._id] ? "..." : "Từ chối"}
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
          <div className="text-center py-8">
            <FiDollarSign className="mx-auto text-4xl text-gray-300 mb-4" />
            <p className="text-gray-500">Không có yêu cầu rút tiền nào</p>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedWithdrawal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-gray-900/50" onClick={() => setShowDetailModal(false)} />
          <div className="relative bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Chi tiết yêu cầu rút tiền</h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Nhà cung cấp</label>
                    <p className="font-medium">{selectedWithdrawal.supplierId?.fullName}</p>
                    <p className="text-sm text-gray-500">{selectedWithdrawal.supplierId?.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-500">Số tiền</label>
                    <p className="font-medium text-lg">{formatCurrency(selectedWithdrawal.amount)}</p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-500">Ngân hàng</label>
                  <p className="font-medium">{selectedWithdrawal.bankInfo?.bankName}</p>
                  <p className="text-sm">{selectedWithdrawal.bankInfo?.accountNumber}</p>
                  <p className="text-sm">{selectedWithdrawal.bankInfo?.accountName}</p>
                </div>

                <div>
                  <label className="text-sm text-gray-500">Ghi chú</label>
                  <p className="text-sm">{selectedWithdrawal.notes || "Không có"}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-500">Ngày yêu cầu</label>
                    <p className="text-sm">{new Date(selectedWithdrawal.createdAt).toLocaleString("vi-VN")}</p>
                  </div>
                  {selectedWithdrawal.processedAt && (
                    <div>
                      <label className="text-sm text-gray-500">Ngày xử lý</label>
                      <p className="text-sm">{new Date(selectedWithdrawal.processedAt).toLocaleString("vi-VN")}</p>
                    </div>
                  )}
                </div>

                {selectedWithdrawal.rejectionReason && (
                  <div>
                    <label className="text-sm text-gray-500">Lý do từ chối</label>
                    <p className="text-sm text-red-600">{selectedWithdrawal.rejectionReason}</p>
                  </div>
                )}

                {selectedWithdrawal.status === "PENDING" && (
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => {
                        handleApprove(selectedWithdrawal._id);
                        setShowDetailModal(false);
                      }}
                      disabled={actionLoading[selectedWithdrawal._id]}
                      className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Duyệt yêu cầu
                    </button>
                    <button
                      onClick={() => {
                        handleReject(selectedWithdrawal._id);
                        setShowDetailModal(false);
                      }}
                      disabled={actionLoading[selectedWithdrawal._id]}
                      className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      Từ chối yêu cầu
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
