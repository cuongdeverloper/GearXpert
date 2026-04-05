import React, { useCallback, useEffect, useState } from "react";
import { FiCreditCard, FiTrendingUp, FiTrendingDown, FiArrowUpRight, FiArrowDownLeft, FiPieChart, FiActivity } from "react-icons/fi";
import { getAdminWallet, getAdminWalletTransactions } from "../../service/ApiService/AdminApi";
import { useSelector } from "react-redux";

export default function AdminWalletPage() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL");
  const [dateRange, setDateRange] = useState("7days");
  
  // Debug Redux state
  const userAccount = useSelector(state => state.user.account);
  console.log("AdminWalletPage - Redux userAccount:", userAccount);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      console.log("AdminWalletPage - Fetching data...");
      console.log("AdminWalletPage - User access_token:", userAccount?.access_token ? "exists" : "not found");
      console.log("AdminWalletPage - User role:", userAccount?.role);

      const [walletRes, transactionsRes] = await Promise.all([
        getAdminWallet(),
        getAdminWalletTransactions({ type: filterType, dateRange }),
      ]);

      setWallet(walletRes);
      setTransactions(transactionsRes.transactions || []);
    } catch (error) {
      console.error("Error fetching admin wallet data:", error);
      console.error("Error response:", error.response);
    } finally {
      setLoading(false);
    }
  }, [filterType, dateRange, userAccount]);

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
      case "REFUND":
        return "text-orange-600 bg-orange-50 border-orange-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getTransactionLabel = (type) => {
    switch (type) {
      case "PLATFORM_FEE":
        return "Phí nền tảng";
      case "ESCROW_HOLD":
        return "Tiền thuê tạm giữ";
      case "DEPOSIT_HOLD":
        return "Tiền đặt cọc";
      case "SUPPLIER_PAYOUT":
        return "Trả tiền nhà cung cấp";
      case "CUSTOMER_REFUND":
        return "Hoàn tiền khách hàng";
      case "SERVICE_FEE":
        return "Phí dịch vụ";
      case "PENALTY_FEE":
        return "Phí phạt";
      case "TOP_UP":
        return "Nạp tiền";
      case "WITHDRAW":
        return "Rút tiền";
      case "WITHDRAWAL_REQUEST":
        return "Yêu cầu rút tiền";
      case "PAYMENT":
        return "Thanh toán";
      case "REFUND":
        return "Hoàn tiền";
      default:
        return type;
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
          <h1 className="text-3xl font-bold text-gray-900">Tài Chính Hệ Thống</h1>
          <p className="text-gray-500">Tổng quan tài chính và các dòng tiền của nền tảng</p>
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
    </div>
  );
}
