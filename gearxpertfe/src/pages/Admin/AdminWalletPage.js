import React, { useCallback, useEffect, useState } from "react";
import { FiCreditCard, FiTrendingUp, FiTrendingDown, FiArrowUpRight, FiArrowDownLeft, FiPieChart, FiActivity, FiSettings, FiPlus, FiDownload, FiX, FiAlertCircle } from "react-icons/fi";
import { getAdminWallet, getAdminWalletTransactions, adjustWalletBalance, createManualTransaction, exportWalletTransactions } from "../../service/ApiService/AdminApi";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";

export default function AdminWalletPage() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL");
  const [dateRange, setDateRange] = useState("7days");
  
  // Debug Redux state
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [adjustForm, setAdjustForm] = useState({ amount: "", reason: "", type: "MANUAL" });
  const [transactionForm, setTransactionForm] = useState({
    type: "PLATFORM_FEE",
    amount: "",
    description: "",
    referenceType: "SYSTEM",
    referenceId: ""
  });
  
  const userAccount = useSelector(state => state.user.account);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [walletRes, transactionsRes] = await Promise.all([
        getAdminWallet(),
        getAdminWalletTransactions({ type: filterType, dateRange }),
      ]);

      setWallet(walletRes);
      setTransactions(transactionsRes.transactions || []);
    } catch (error) {
      console.error("Error fetching admin wallet data:", error);
      toast.error("Không thể tải dữ liệu ví");
    } finally {
      setLoading(false);
    }
  }, [filterType, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getTransactionIcon = (type) => {
    switch (type) {
      case "PLATFORM_FEE":
        return <FiTrendingUp className="text-green-600" />;
      case "ESCROW_HOLD":
        return <FiArrowDownLeft className="text-blue-600" />;
      case "DEPOSIT_HOLD":
        return <FiArrowDownLeft className="text-orange-600" />;
      case "SUPPLIER_PAYOUT":
        return <FiArrowUpRight className="text-red-600" />;
      case "CUSTOMER_REFUND":
        return <FiArrowUpRight className="text-red-600" />;
      case "SERVICE_FEE":
        return <FiActivity className="text-purple-600" />;
      case "PENALTY_FEE":
        return <FiTrendingDown className="text-red-600" />;
      case "TOP_UP":
        return <FiTrendingUp className="text-green-600" />;
      case "WITHDRAW":
        return <FiArrowUpRight className="text-red-600" />;
      case "PAYMENT":
        return <FiCreditCard className="text-blue-600" />;
      case "REFUND":
        return <FiArrowUpRight className="text-orange-600" />;
      case "ADJUSTMENT_IN":
      case "ADJUSTMENT_OUT":
        return <FiSettings className="text-gray-600" />;
      default:
        return <FiCreditCard className="text-gray-600" />;
    }
  };

  const getTransactionColor = (type) => {
    switch (type) {
      case "PLATFORM_FEE":
        return "text-green-600 bg-green-50 border-green-200";
      case "ESCROW_HOLD":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "DEPOSIT_HOLD":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "SUPPLIER_PAYOUT":
        return "text-red-600 bg-red-50 border-red-200";
      case "CUSTOMER_REFUND":
        return "text-red-600 bg-red-50 border-red-200";
      case "SERVICE_FEE":
        return "text-purple-600 bg-purple-50 border-purple-200";
      case "PENALTY_FEE":
        return "text-red-600 bg-red-50 border-red-200";
      case "TOP_UP":
        return "text-green-600 bg-green-50 border-green-200";
      case "WITHDRAW":
        return "text-red-600 bg-red-50 border-red-200";
      case "PAYMENT":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "ADJUSTMENT_IN":
        return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "ADJUSTMENT_OUT":
        return "text-rose-600 bg-rose-50 border-rose-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getTransactionLabel = (type) => {
    const labels = {
      "PLATFORM_FEE": "Phí nền tảng",
      "ESCROW_HOLD": "Tiền thuê tạm giữ",
      "DEPOSIT_HOLD": "Tiền đặt cọc",
      "SUPPLIER_PAYOUT": "Trả tiền nhà cung cấp",
      "CUSTOMER_REFUND": "Hoàn tiền khách hàng",
      "SERVICE_FEE": "Phí dịch vụ",
      "PENALTY_FEE": "Phí phạt",
      "TOP_UP": "Nạp tiền",
      "WITHDRAW": "Rút tiền",
      "PAYMENT": "Thanh toán",
      "REFUND": "Hoàn tiền",
      "ADJUSTMENT_IN": "Điều chỉnh tăng",
      "ADJUSTMENT_OUT": "Điều chỉnh giảm"
    };
    return labels[type] || type;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount || 0);
  };

  const handleExport = async () => {
    try {
      const response = await exportWalletTransactions({ type: filterType, dateRange });
      const blob = new Blob([response], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `wallet-transactions-${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Xuất dữ liệu thành công!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Lỗi khi xuất dữ liệu");
    }
  };

  const handleAdjustBalance = async (e) => {
    e.preventDefault();
    if (!adjustForm.amount || !adjustForm.reason) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    
    setSubmitting(true);
    try {
      await adjustWalletBalance({
        amount: parseFloat(adjustForm.amount),
        reason: adjustForm.reason,
        type: adjustForm.type
      });
      toast.success("Điều chỉnh số dư thành công!");
      setShowAdjustModal(false);
      setAdjustForm({ amount: "", reason: "", type: "MANUAL" });
      fetchData();
    } catch (error) {
      console.error("Adjust balance error:", error);
      toast.error(error?.response?.data?.message || "Lỗi khi điều chỉnh số dư");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    if (!transactionForm.amount || !transactionForm.description) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }
    
    setSubmitting(true);
    try {
      await createManualTransaction({
        type: transactionForm.type,
        amount: parseFloat(transactionForm.amount),
        description: transactionForm.description,
        referenceType: transactionForm.referenceType,
        referenceId: transactionForm.referenceId || undefined
      });
      toast.success("Tạo giao dịch thành công!");
      setShowTransactionModal(false);
      setTransactionForm({
        type: "PLATFORM_FEE",
        amount: "",
        description: "",
        referenceType: "SYSTEM",
        referenceId: ""
      });
      fetchData();
    } catch (error) {
      console.error("Create transaction error:", error);
      toast.error(error?.response?.data?.message || "Lỗi khi tạo giao dịch");
    } finally {
      setSubmitting(false);
    }
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
          <h1 className="text-3xl font-bold text-gray-900">Tài Chính Hệ Thống</h1>
          <p className="text-gray-500">Tổng quan tài chính và các dòng tiền của nền tảng</p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAdjustModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <FiSettings size={18} />
            Điều chỉnh số dư
          </button>
          <button
            onClick={() => setShowTransactionModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <FiPlus size={18} />
            Tạo giao dịch
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <FiDownload size={18} />
            Xuất CSV
          </button>
        </div>
      </div>

      {/* Main Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm">Tổng doanh thu</p>
              <p className="text-3xl font-bold">
                {formatCurrency(wallet?.totalRevenue || 0)}
              </p>
              <p className="text-indigo-100 text-xs mt-2">Từ đầu tháng</p>
            </div>
            <FiTrendingUp className="text-4xl text-indigo-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Lợi nhuận ròng</p>
              <p className="text-3xl font-bold">
                {formatCurrency(wallet?.netProfit || 0)}
              </p>
              <p className="text-green-100 text-xs mt-2">Sau khi trừ chi phí</p>
            </div>
            <FiPieChart className="text-4xl text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Số dư khả dụng</p>
              <p className="text-3xl font-bold">
                {formatCurrency(wallet?.availableBalance || 0)}
              </p>
              <p className="text-purple-100 text-xs mt-2">Có thể rút</p>
            </div>
            <FiCreditCard className="text-4xl text-purple-200" />
          </div>
        </div>
      </div>

      {/* Financial Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Phí Nền Tảng</h3>
            <FiTrendingUp className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(wallet?.totalPlatformFees || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {((wallet?.totalPlatformFees || 0) * 100 / (wallet?.totalRevenue || 1)).toFixed(1)}% tổng doanh thu
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Tiền Tạm Giữ</h3>
            <FiArrowDownLeft className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(wallet?.totalEscrow || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Đang chờ xử lý</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Tiền Đặt Cọc</h3>
            <FiArrowDownLeft className="text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(wallet?.totalDeposits || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Bảo đảm giao dịch</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Chi Phí Hệ Thống</h3>
            <FiTrendingDown className="text-red-600" />
          </div>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(wallet?.totalExpenses || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Vận hành & marketing</p>
        </div>
      </div>

      {/* Monthly Statistics */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Thống Kê Theo Tháng</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Doanh thu tháng này</span>
              <span className="text-xs text-green-600 font-medium">
                {wallet?.monthlyRevenue > 0 ? '+' : ''}
                {((wallet?.monthlyRevenue || 0) * 100 / (wallet?.totalRevenue || 1)).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full" 
                style={{ 
                  width: `${Math.min(100, Math.max(0, ((wallet?.monthlyRevenue || 0) * 100 / (wallet?.totalRevenue || 1))))}%` 
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(wallet?.monthlyRevenue || 0)} / {formatCurrency(wallet?.totalRevenue || 0)}
            </p>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Số giao dịch</span>
              <span className="text-xs text-blue-600 font-medium">
                {transactions.length} giao dịch
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full" 
                style={{ 
                  width: `${Math.min(100, Math.max(0, (transactions.length / 100) * 100))}%` 
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">{transactions.length} giao dịch</p>
          </div>
          
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Lợi nhuận</span>
              <span className="text-xs text-purple-600 font-medium">
                {wallet?.netProfit > 0 ? '+' : ''}
                {((wallet?.netProfit || 0) * 100 / (wallet?.totalRevenue || 1)).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full" 
                style={{ 
                  width: `${Math.min(100, Math.max(0, ((wallet?.netProfit || 0) * 100 / (wallet?.totalRevenue || 1))))}%` 
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(wallet?.netProfit || 0)} / {formatCurrency(wallet?.totalRevenue || 0)}
            </p>
          </div>
        </div>
      </div>

      {/* Transaction History with Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Lịch Sử Giao Dịch</h2>
            <div className="flex items-center gap-4">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Tất cả</option>
                <option value="PLATFORM_FEE">Phí nền tảng</option>
                <option value="SERVICE_FEE">Phí dịch vụ</option>
                <option value="PENALTY_FEE">Phí phạt</option>
                <option value="ESCROW_HOLD">Tiền thuê tạm giữ</option>
                <option value="DEPOSIT_HOLD">Tiền đặt cọc</option>
                <option value="SUPPLIER_PAYOUT">Trả tiền NCC</option>
                <option value="CUSTOMER_REFUND">Hoàn tiền khách</option>
                <option value="TOP_UP">Nạp tiền</option>
                <option value="WITHDRAW">Rút tiền</option>
                <option value="PAYMENT">Thanh toán</option>
                <option value="REFUND">Hoàn tiền</option>
                <option value="ADJUSTMENT_IN">Điều chỉnh tăng</option>
                <option value="ADJUSTMENT_OUT">Điều chỉnh giảm</option>
              </select>

              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="7days">7 ngày qua</option>
                <option value="30days">30 ngày qua</option>
                <option value="90days">90 ngày qua</option>
                <option value="all">Tất cả thời gian</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loại giao dịch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mô tả
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Số tiền
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Thời gian
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trạng thái
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(transaction.type)}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getTransactionColor(transaction.type)}`}>
                        {getTransactionLabel(transaction.type)}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{transaction.description}</div>
                    {transaction.referenceId && (
                      <div className="text-xs text-gray-500">
                        Ref: {transaction.referenceId}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${
                      transaction.amount > 0 ? "text-green-600" : "text-red-600"
                    }`}>
                      {transaction.amount > 0 ? "+" : ""}
                      {formatCurrency(transaction.amount)}
                    </div>
                    <div className="text-xs text-gray-400">
                      Số dư: {formatCurrency(transaction.balanceAfter)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(transaction.createdAt).toLocaleString("vi-VN")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      transaction.status === "SUCCESS"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}>
                      {transaction.status === "SUCCESS" ? "Thành công" : "Đang xử lý"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {transactions.length === 0 && (
          <div className="text-center py-8">
            <FiCreditCard className="mx-auto text-4xl text-gray-300 mb-4" />
            <p className="text-gray-500">Không có giao dịch nào</p>
          </div>
        )}
      </div>

      {/* Adjust Balance Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Điều chỉnh số dư</h2>
              <button onClick={() => setShowAdjustModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleAdjustBalance}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số tiền điều chỉnh (âm để giảm, dương để tăng)
                  </label>
                  <input
                    type="number"
                    value={adjustForm.amount}
                    onChange={(e) => setAdjustForm({...adjustForm, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ví dụ: 1000000 hoặc -500000"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lý do điều chỉnh</label>
                  <textarea
                    value={adjustForm.reason}
                    onChange={(e) => setAdjustForm({...adjustForm, reason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="3"
                    placeholder="Nhập lý do điều chỉnh..."
                    required
                  />
                </div>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
                  <FiAlertCircle className="text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-700">
                    Lưu ý: Thao tác này sẽ ảnh hưởng trực tiếp đến số dư ví hệ thống. Hãy đảm bảo lý do hợp lệ.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? "Đang xử lý..." : "Xác nhận điều chỉnh"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Transaction Modal */}
      {showTransactionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Tạo giao dịch thủ công</h2>
              <button onClick={() => setShowTransactionModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTransaction}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại giao dịch</label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm({...transactionForm, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="PLATFORM_FEE">Phí nền tảng</option>
                    <option value="SERVICE_FEE">Phí dịch vụ</option>
                    <option value="PENALTY_FEE">Phí phạt</option>
                    <option value="TOP_UP">Nạp tiền</option>
                    <option value="REFUND">Hoàn tiền</option>
                    <option value="ESCROW_HOLD">Tiền thuê tạm giữ</option>
                    <option value="DEPOSIT_HOLD">Tiền đặt cọc</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (dương để tăng, âm để giảm)</label>
                  <input
                    type="number"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ví dụ: 1000000"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    value={transactionForm.description}
                    onChange={(e) => setTransactionForm({...transactionForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    rows="3"
                    placeholder="Nhập mô tả giao dịch..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference Type (tùy chọn)</label>
                  <input
                    type="text"
                    value={transactionForm.referenceType}
                    onChange={(e) => setTransactionForm({...transactionForm, referenceType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ví dụ: RENTAL, USER..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reference ID (tùy chọn)</label>
                  <input
                    type="text"
                    value={transactionForm.referenceId}
                    onChange={(e) => setTransactionForm({...transactionForm, referenceId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="ID tham chiếu..."
                  />
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                  <FiAlertCircle className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700">
                    Giao dịch thủ công sẽ được ghi nhận vào hệ thống và ảnh hưởng đến số dư ví.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTransactionModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? "Đang xử lý..." : "Tạo giao dịch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
