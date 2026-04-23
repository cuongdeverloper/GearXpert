import React, { useCallback, useEffect, useState } from "react";
import { FiCreditCard, FiTrendingUp, FiTrendingDown, FiArrowUpRight, FiArrowDownLeft, FiPieChart, FiActivity, FiPlus, FiDownload, FiX, FiAlertCircle, FiUpload, FiDollarSign, FiSend ,FiSettings} from "react-icons/fi";
import { getAdminWallet, getAdminWalletTransactions, exportWalletTransactions, topUpAdminWallet, withdrawAdminWallet, createManualTransaction, transferToWallet } from "../../service/ApiService/AdminApi";
import axiosInstance from "../../service/AxiosCustomize";
import { toast } from "react-toastify";

export default function AdminWalletPage() {
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("ALL");
  const [dateRange, setDateRange] = useState("7days");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [showTopUpModal, setShowTopUpModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Form states
  const [topUpAmount, setTopUpAmount] = useState("");
  const [withdrawForm, setWithdrawForm] = useState({
    amount: "",
    accountNumber: "",
    accountName: "",
    bankCode: "",
    bankName: ""
  });
  const [transactionForm, setTransactionForm] = useState({
    type: "PLATFORM_FEE",
    amount: "",
    description: "",
    referenceType: "SYSTEM",
    referenceId: ""
  });
  const [transferForm, setTransferForm] = useState({
    walletId: "",
    userEmail: "",
    amount: "",
    description: "",
    type: "TRANSFER"
  });
  const [transferUserInfo, setTransferUserInfo] = useState(null);
  const [loadingUserInfo, setLoadingUserInfo] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [walletRes, transactionsRes] = await Promise.all([
        getAdminWallet(),
        getAdminWalletTransactions({ type: filterType, dateRange, search: searchQuery }),
      ]);

      setWallet(walletRes);
      setTransactions(transactionsRes.transactions || []);
    } catch (error) {
      console.error("Error fetching admin wallet data:", error);
      toast.error("Không thể tải dữ liệu ví");
    } finally {
      setLoading(false);
    }
  }, [filterType, dateRange, searchQuery]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getTransactionIcon = (type) => {
    switch (type) {
      case "PLATFORM_FEE":
        return <FiTrendingUp className="text-green-600" />;
      case "PLATFORM_FEE_REFUND":
        return <FiArrowUpRight className="text-rose-600" />;
      case "ESCROW_HOLD":
        return <FiArrowDownLeft className="text-blue-600" />;
      case "ESCROW_RELEASE":
        return <FiArrowUpRight className="text-blue-400" />;
      case "DEPOSIT_HOLD":
        return <FiArrowDownLeft className="text-orange-600" />;
      case "DEPOSIT_RELEASE":
        return <FiArrowUpRight className="text-orange-400" />;
      case "DEPOSIT_REFUND":
        return <FiArrowUpRight className="text-orange-500" />;
      case "SHIPPING_FEE":
        return <FiTrendingUp className="text-teal-600" />;
      case "SHIPPING_FEE_REFUND":
        return <FiArrowUpRight className="text-teal-400" />;
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
      case "PAYOUT":
        return <FiArrowUpRight className="text-indigo-600" />;
      case "PAYOUT_REFUND":
        return <FiArrowUpRight className="text-indigo-400" />;
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
      case "PLATFORM_FEE_REFUND":
        return "text-rose-600 bg-rose-50 border-rose-200";
      case "ESCROW_HOLD":
        return "text-blue-600 bg-blue-50 border-blue-200";
      case "ESCROW_RELEASE":
        return "text-blue-400 bg-blue-50 border-blue-100";
      case "DEPOSIT_HOLD":
        return "text-orange-600 bg-orange-50 border-orange-200";
      case "DEPOSIT_RELEASE":
        return "text-orange-400 bg-orange-50 border-orange-100";
      case "DEPOSIT_REFUND":
        return "text-orange-500 bg-orange-50 border-orange-200";
      case "SHIPPING_FEE":
        return "text-teal-600 bg-teal-50 border-teal-200";
      case "SHIPPING_FEE_REFUND":
        return "text-teal-400 bg-teal-50 border-teal-100";
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
      case "ADJUSTMENT":
        return "text-purple-600 bg-purple-50 border-purple-200";
      case "ADJUSTMENT_IN":
        return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "ADJUSTMENT_OUT":
        return "text-rose-600 bg-rose-50 border-rose-200";
      case "PAYOUT":
        return "text-indigo-600 bg-indigo-50 border-indigo-200";
      case "PAYOUT_REFUND":
        return "text-indigo-400 bg-indigo-50 border-indigo-100";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getTransactionLabel = (type, metadata) => {
    // Check if this is a transfer transaction
    if (metadata?.transferType) {
      const transferLabels = {
        "TRANSFER": "Chuyển tiền",
        "SUPPLIER_PAYOUT": "Trả tiền NCC",
        "CUSTOMER_REFUND": "Hoàn tiền KH",
        "BONUS": "Thưởng"
      };
      return transferLabels[metadata.transferType] || metadata.transferType;
    }

    const labels = {
      "PLATFORM_FEE": "Phí nền tảng",
      "PLATFORM_FEE_REFUND": "Hoàn phí nền tảng",
      "ESCROW_HOLD": "Tiền thuê tạm giữ",
      "ESCROW_RELEASE": "Giải phóng tiền thuê",
      "DEPOSIT_HOLD": "Tiền đặt cọc",
      "DEPOSIT_RELEASE": "Giải phóng tiền cọc",
      "DEPOSIT_REFUND": "Hoàn tiền cọc",
      "SHIPPING_FEE": "Phí vận chuyển",
      "SHIPPING_FEE_REFUND": "Hoàn phí vận chuyển",
      "SUPPLIER_PAYOUT": "Trả tiền nhà cung cấp",
      "CUSTOMER_REFUND": "Hoàn tiền khách hàng",
      "SERVICE_FEE": "Phí dịch vụ",
      "PENALTY_FEE": "Phí phạt",
      "TOP_UP": "Nạp tiền",
      "WITHDRAW": "Rút tiền",
      "PAYMENT": "Thanh toán",
      "REFUND": "Hoàn tiền",
      "ADJUSTMENT_IN": "Điều chỉnh tăng",
      "ADJUSTMENT_OUT": "Điều chỉnh giảm",
      "ADJUSTMENT": "Điều chỉnh",
      "PAYOUT": "Chi trả",
      "PAYOUT_REFUND": "Hoàn tác chi trả",
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

  const handleTopUp = async (e) => {
    e.preventDefault();
    const amount = parseInt(topUpAmount, 10);
    if (!amount || amount < 10000) {
      toast.error("Số tiền tối thiểu 10.000đ");
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await topUpAdminWallet(amount);
      const checkoutUrl = res?.checkoutUrl || res?.data?.checkoutUrl;
      
      if (checkoutUrl) {
        toast.info("Đang chuyển hướng đến trang thanh toán PayOS...");
        window.open(checkoutUrl, "_blank");
        setShowTopUpModal(false);
        setTopUpAmount("");
      } else {
        toast.error("Không thể tạo link thanh toán");
      }
    } catch (error) {
      console.error("Top up error:", error);
      toast.error(error?.response?.data?.message || "Lỗi khi nạp tiền");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseInt(withdrawForm.amount, 10);
    if (!amount || amount < 10000) {
      toast.error("Số tiền tối thiểu 10.000đ");
      return;
    }
    if (!withdrawForm.accountNumber || !withdrawForm.accountName || !withdrawForm.bankCode) {
      toast.error("Vui lòng điền đầy đủ thông tin ngân hàng");
      return;
    }
    
    setSubmitting(true);
    try {
      await withdrawAdminWallet({
        amount,
        bankInfo: {
          accountNumber: withdrawForm.accountNumber,
          accountName: withdrawForm.accountName,
          bankCode: withdrawForm.bankCode,
          bankName: withdrawForm.bankName || withdrawForm.bankCode
        }
      });
      toast.success("Yêu cầu rút tiền đã được gửi!");
      setShowWithdrawModal(false);
      setWithdrawForm({
        amount: "",
        accountNumber: "",
        accountName: "",
        bankCode: "",
        bankName: ""
      });
      fetchData();
    } catch (error) {
      console.error("Withdraw error:", error);
      toast.error(error?.response?.data?.message || "Lỗi khi rút tiền");
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

  const lookupUserInfo = useCallback(async () => {
    const walletId = transferForm.walletId?.trim();
    const email = transferForm.userEmail?.trim();
    
    if (!walletId && !email) {
      setTransferUserInfo(null);
      return;
    }
    
    setLoadingUserInfo(true);
    try {
      const params = new URLSearchParams();
      if (walletId) params.append('walletId', walletId);
      if (email) params.append('email', email);
      
      console.log('[LOOKUP] Searching with:', { walletId, email });
      const res = await axiosInstance.get(`/api/admin/wallet/lookup-user?${params.toString()}`);
      console.log('[LOOKUP] Response:', res);
      
      if (res?.success) {
        setTransferUserInfo(res.data);
      } else {
        setTransferUserInfo(null);
      }
    } catch (error) {
      console.error('[LOOKUP] Error:', error.response?.data || error.message);
      setTransferUserInfo(null);
    } finally {
      setLoadingUserInfo(false);
    }
  }, [transferForm.walletId, transferForm.userEmail]);

  // Auto lookup when walletId or email changes (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      lookupUserInfo();
    }, 500);
    return () => clearTimeout(timer);
  }, [lookupUserInfo]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferForm.amount || (!transferForm.walletId && !transferForm.userEmail)) {
      toast.error("Vui lòng điền số tiền và thông tin ví đích");
      return;
    }

    setSubmitting(true);
    try {
      await transferToWallet({
        walletId: transferForm.walletId || undefined,
        userEmail: transferForm.userEmail || undefined,
        amount: parseFloat(transferForm.amount),
        description: transferForm.description,
        type: transferForm.type
      });
      toast.success("Chuyển tiền thành công!");
      setShowTransferModal(false);
      setTransferForm({
        walletId: "",
        userEmail: "",
        amount: "",
        description: "",
        type: "TRANSFER"
      });
      setTransferUserInfo(null);
      fetchData();
    } catch (error) {
      console.error("Transfer error:", error);
      toast.error(error?.response?.data?.message || "Lỗi khi chuyển tiền");
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
            onClick={() => setShowTopUpModal(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <FiUpload size={18} />
            Nạp tiền PayOS
          </button>
          <button
            onClick={() => setShowWithdrawModal(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
          >
            <FiDollarSign size={18} />
            Rút tiền
          </button>
          <button
            onClick={() => setShowTransactionModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <FiPlus size={18} />
            Tạo giao dịch
          </button>
          <button
            onClick={() => setShowTransferModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <FiSend size={18} />
            Chuyển tiền
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
              <p className="text-indigo-100 text-sm">Tổng số dư</p>
              <p className="text-3xl font-bold">
                {formatCurrency(wallet?.totalBalance || 0)}
              </p>
              <p className="text-indigo-100 text-xs mt-2">Tất cả tiền trong ví</p>
            </div>
            <FiCreditCard className="text-4xl text-indigo-200" />
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
            <FiPieChart className="text-4xl text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm">Chờ hoàn thành</p>
              <p className="text-3xl font-bold">
                {formatCurrency(wallet?.pendingCompletionBalance || 0)}
              </p>
              <p className="text-orange-100 text-xs mt-2">Tiền thuê tạm giữ</p>
            </div>
            <FiArrowDownLeft className="text-4xl text-orange-200" />
          </div>
        </div>
      </div>

      {/* Financial Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Phí Đã Kiếm</h3>
            <FiTrendingUp className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(wallet?.earnedFeeBalance || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Từ đơn đã hoàn thành</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Phí Chờ Hoàn Thành</h3>
            <FiTrendingUp className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(wallet?.pendingFeeBalance || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Phí đơn chưa hoàn thành</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Phí Vận Chuyển Đã Kiếm</h3>
            <FiTrendingUp className="text-cyan-600" />
          </div>
          <p className="text-2xl font-bold text-cyan-600">
            {formatCurrency(wallet?.earnedShippingBalance || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Từ đơn đã hoàn thành</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Phí Vận Chuyển Chờ</h3>
            <FiTrendingUp className="text-teal-600" />
          </div>
          <p className="text-2xl font-bold text-teal-600">
            {formatCurrency(wallet?.pendingShippingBalance || 0)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Phí đơn chưa hoàn thành</p>
        </div>

        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Tiền Cọc Tạm Giữ</h3>
            <FiArrowDownLeft className="text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(wallet?.pendingDepositBalance || 0)}
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
              <input
                type="text"
                placeholder="Tìm ID đơn, ID user, mã đơn..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Tất cả loại</option>
                <optgroup label="── Phí nền tảng">
                  <option value="PLATFORM_FEE">Phí nền tảng</option>
                  <option value="PLATFORM_FEE_REFUND">Hoàn phí nền tảng</option>
                </optgroup>
                <optgroup label="── Vận chuyển">
                  <option value="SHIPPING_FEE">Phí vận chuyển</option>
                  <option value="SHIPPING_FEE_REFUND">Hoàn phí vận chuyển</option>
                </optgroup>
                <optgroup label="── Tiền thuê">
                  <option value="ESCROW_HOLD">Tiền thuê tạm giữ</option>
                  <option value="ESCROW_RELEASE">Giải phóng tiền thuê</option>
                </optgroup>
                <optgroup label="── Tiền cọc">
                  <option value="DEPOSIT_HOLD">Tiền đặt cọc</option>
                  <option value="DEPOSIT_RELEASE">Giải phóng tiền cọc</option>
                  <option value="DEPOSIT_REFUND">Hoàn tiền cọc</option>
                </optgroup>
                <optgroup label="── Chi trả">
                  <option value="SUPPLIER_PAYOUT">Chi trả NCC</option>
                  <option value="CUSTOMER_REFUND">Hoàn tiền khách</option>
                  <option value="REFUND">Hoàn tiền</option>
                  <option value="PAYOUT">Chi trả</option>
                  <option value="PAYOUT_REFUND">Hoàn tác chi trả</option>
                </optgroup>
                <optgroup label="── Khác">
                  <option value="TOP_UP">Nạp tiền</option>
                  <option value="WITHDRAW">Rút tiền</option>
                  <option value="PAYMENT">Thanh toán</option>
                  <option value="ADJUSTMENT">Điều chỉnh</option>
                </optgroup>
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
                        {getTransactionLabel(transaction.type, transaction.metadata)}
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

      {/* Top Up Modal */}
      {showTopUpModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Nạp tiền vào ví hệ thống</h2>
              <button onClick={() => setShowTopUpModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleTopUp}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số tiền nạp (VNĐ)
                  </label>
                  <input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ví dụ: 1000000"
                    min="10000"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Tối thiểu 10.000đ</p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                  <FiAlertCircle className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-700">
                    Bạn sẽ được chuyển đến trang thanh toán PayOS để hoàn tất giao dịch. Số dư sẽ được cập nhật sau khi thanh toán thành công.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTopUpModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? "Đang xử lý..." : "Tiếp tục thanh toán"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Rút tiền từ ví hệ thống</h2>
              <button onClick={() => setShowWithdrawModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleWithdraw}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền rút (VNĐ)</label>
                  <input
                    type="number"
                    value={withdrawForm.amount}
                    onChange={(e) => setWithdrawForm({...withdrawForm, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Ví dụ: 1000000"
                    min="10000"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Số dư khả dụng: {formatCurrency(wallet?.availableBalance || 0)}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản ngân hàng</label>
                  <input
                    type="text"
                    value={withdrawForm.accountNumber}
                    onChange={(e) => setWithdrawForm({...withdrawForm, accountNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Ví dụ: 123456789"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên chủ tài khoản</label>
                  <input
                    type="text"
                    value={withdrawForm.accountName}
                    onChange={(e) => setWithdrawForm({...withdrawForm, accountName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Ví dụ: NGUYEN VAN A"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã ngân hàng</label>
                  <input
                    type="text"
                    value={withdrawForm.bankCode}
                    onChange={(e) => setWithdrawForm({...withdrawForm, bankCode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Ví dụ: VCB, TCB, BIDV..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên ngân hàng (tùy chọn)</label>
                  <input
                    type="text"
                    value={withdrawForm.bankName}
                    onChange={(e) => setWithdrawForm({...withdrawForm, bankName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Ví dụ: Vietcombank"
                  />
                </div>
                
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2">
                  <FiAlertCircle className="text-orange-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-orange-700">
                    Tiền sẽ được chuyển qua PayOS đến tài khoản ngân hàng của bạn. Thời gian xử lý có thể từ vài phút đến 24 giờ.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowWithdrawModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {submitting ? "Đang xử lý..." : "Xác nhận rút tiền"}
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

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Chuyển tiền đến ví</h2>
              <button onClick={() => setShowTransferModal(false)} className="text-gray-400 hover:text-gray-600">
                <FiX size={24} />
              </button>
            </div>
            
            <form onSubmit={handleTransfer}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Wallet ID (tùy chọn)</label>
                  <input
                    type="text"
                    value={transferForm.walletId}
                    onChange={(e) => setTransferForm({...transferForm, walletId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="ID ví đích..."
                  />
                </div>
                
                <div className="text-center text-gray-500">- hoặc -</div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email người dùng (tùy chọn)</label>
                  <input
                    type="email"
                    value={transferForm.userEmail}
                    onChange={(e) => setTransferForm({...transferForm, userEmail: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="email@example.com"
                  />
                </div>
                
                {/* User Info Display */}
                {loadingUserInfo && (
                  <div className="flex items-center justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  </div>
                )}
                
                {transferUserInfo && !loadingUserInfo && (
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <p className="text-xs text-purple-600 font-medium mb-2">Thông tin người nhận</p>
                    <div className="flex items-center gap-3">
                      <img 
                        src={transferUserInfo.avatar || "/default-avatar.png"} 
                        alt={transferUserInfo.fullName}
                        className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                        onError={(e) => { e.target.src = "/default-avatar.png"; }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{transferUserInfo.fullName}</p>
                        <p className="text-sm text-gray-500 truncate">{transferUserInfo.email}</p>
                        {transferUserInfo.walletBalance !== undefined && (
                          <p className="text-sm text-purple-600">
                            Số dư: {transferUserInfo.walletBalance?.toLocaleString()}đ
                          </p>
                        )}
                      </div>
                      <div className="text-green-500">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
                
                {!transferUserInfo && !loadingUserInfo && (transferForm.walletId || transferForm.userEmail) && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                    <p className="text-sm text-red-600">Không tìm thấy thông tin người dùng</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VNĐ)</label>
                  <input
                    type="number"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({...transferForm, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Ví dụ: 1000000"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mô tả</label>
                  <textarea
                    value={transferForm.description}
                    onChange={(e) => setTransferForm({...transferForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    rows="3"
                    placeholder="Nhập mô tả chuyển tiền..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loại chuyển tiền</label>
                  <select
                    value={transferForm.type}
                    onChange={(e) => setTransferForm({...transferForm, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="TRANSFER">Chuyển tiền thông thường</option>
                    <option value="SUPPLIER_PAYOUT">Trả tiền nhà cung cấp</option>
                    <option value="CUSTOMER_REFUND">Hoàn tiền khách hàng</option>
                    <option value="BONUS">Thưởng</option>
                  </select>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 flex items-start gap-2">
                  <FiAlertCircle className="text-purple-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-purple-700">
                    Chuyển tiền sẽ trừ từ ví hệ thống và cộng vào ví đích ngay lập tức.
                  </p>
                </div>
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {submitting ? "Đang xử lý..." : "Xác nhận chuyển"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
