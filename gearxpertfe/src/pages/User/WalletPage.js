import React, { useEffect, useMemo, useState } from "react";
import {
  Wallet,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  Banknote,
  X,
  CheckCircle2,
  Clock,
  TrendingUp,
  TrendingDown,
  CreditCard,
  History,
  ChevronDown,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  getMyWallet,
  getWalletTransactions,
  getMyWithdrawRequests,
  topUpWallet,
  requestWithdraw,
} from "../../service/ApiService/WalletApi";
import { toast } from "react-toastify";
import Header from "../../components/navigation/Header";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const formatWalletTxDateTime = (dateValue) =>
  new Date(dateValue).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const PAGE_SIZE = 5;

export default function WalletPage({ embeddedInSupplier = false } = {}) {
  const profilePath = embeddedInSupplier ? "/supplier/profile/edit" : "/profile";
  const [isEkycVerified, setIsEkycVerified] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [withdrawRequests, setWithdrawRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [range, setRange] = useState("DAY");
  const [filterType, setFilterType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [chartOffset, setChartOffset] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [bankInfo, setBankInfo] = useState({
    bankName: "",
    bankCode: "",
    accountNumber: "",
    accountName: "",
  });
  const [banks, setBanks] = useState([]);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const res = await fetch("https://api.vietqr.io/v2/banks");
        const data = await res.json();
        if (data.code === "00") {
          setBanks(data.data);
        }
      } catch (err) {
        console.error("Error fetching banks:", err);
      }
    };
    fetchBanks();
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    setChartOffset(0);
  }, [range]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [walletRes, transRes, withdrawRes] = await Promise.all([
        getMyWallet(),
        getWalletTransactions(),
        getMyWithdrawRequests(),
      ]);
      setWallet(walletRes);
      setTransactions(transRes?.data || transRes);
      setWithdrawRequests(withdrawRes?.data || []);
      setIsEkycVerified(walletRes?.user?.isVerifiedEkyc);
    } catch (error) {
      toast.error("Không thể lấy thông tin ví");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setIsTopUpOpen(false);
    setIsWithdrawOpen(false);
    setAmountInput("");
    setBankInfo({ bankName: "", accountNumber: "", accountName: "" });
  };

  /* ================= CHẶN CÁC THAO TÁC TĂNG GIẢM SỐ TỰ ĐỘNG ================= */
  const handleKeyDown = (e) => {
    // Chặn phím e (khoa học), phím +, -, và quan trọng nhất là ArrowUp, ArrowDown
    if (["e", "E", "+", "-", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleWheel = (e) => {
    // Chặn việc cuộn chuột làm thay đổi số
    e.target.blur();
  };

  /* ================= XỬ LÝ NẠP TIỀN ================= */
  const handleTopUpSubmit = async () => {
    const val = parseInt(amountInput);
    if (!val || val < 10000) return toast.warning("Số tiền nạp tối thiểu là 10,000đ");

    try {
      setBtnLoading(true);
      const res = await topUpWallet(val);
      const checkoutUrl = res?.checkoutUrl || res?.data?.checkoutUrl; // hỗ trợ cả 2 trường hợp

      if (checkoutUrl) {
        toast.info("Đang chuyển hướng tới trang thanh toán PayOS...", {
          autoClose: 2000,
          pauseOnHover: false,
        });
        setTimeout(() => {
          window.location.href = checkoutUrl;
        }, 1200);
      } else {
        toast.error("Không tìm thấy link thanh toán. Vui lòng thử lại!");
      }
    } catch (error) {
      const errData = error.response?.data;
      if (errData?.code === "EKYC_REQUIRED") {
        toast.error(errData.message || "Vui lòng hoàn tất eKYC trước khi nạp tiền");
        setTimeout(() => {
          window.location.href = profilePath;
        }, 2500);
      } else {
        toast.error(errData?.message || "Lỗi tạo link thanh toán");
      }
    } finally {
      setBtnLoading(false);
    }
  };

  /* ================= XỬ LÝ RÚT TIỀN ================= */
  const handleWithdrawSubmit = async () => {
    const amount = parseInt(amountInput);
    const { bankName, accountNumber, accountName } = bankInfo;

    if (!amount || isNaN(amount))
      return toast.error("Vui lòng nhập số tiền hợp lệ");
    if (amount < 10000) return toast.error("Số tiền rút tối thiểu là 10,000đ");
    if (amount > (wallet?.balance || 0))
      return toast.error("Số dư ví không đủ");

    if (!bankName.trim()) return toast.error("Vui lòng nhập tên ngân hàng");
    if (!/^[0-9]{8,15}$/.test(accountNumber.trim()))
      return toast.error("Số tài khoản không hợp lệ");
    if (!/^[A-Z ]+$/.test(accountName.trim()))
      return toast.error("Tên tài khoản phải viết HOA KHÔNG DẤU");

    try {
      setBtnLoading(true);
      await requestWithdraw({
        amount,
        bankInfo: {
          bankName: bankInfo.bankName,
          bankCode: bankInfo.bankCode,
          accountNumber: accountNumber.trim(),
          accountName: accountName.trim().toUpperCase(),
        },
      });
      toast.success("Yêu cầu rút tiền đã được gửi!");
      closeModal();
      fetchInitialData();
    } catch (error) {
      const errData = error.response?.data; // ← sửa ở đây (không phải error.response)

      if (errData?.code === "EKYC_REQUIRED") {
        toast.error(errData.message || "Vui lòng hoàn tất eKYC trước khi rút tiền");
        setTimeout(() => {
          window.location.href = profilePath;
        }, 2500);
      } else {
        toast.error(errData?.message || "Lỗi hệ thống");
      }
    } finally {
      setBtnLoading(false);
    }
  };

  /* ================= LOGIC BIỂU ĐỒ ================= */
  const chartData = useMemo(() => {
    let labels = [];
    let incomeData = [];
    let outcomeData = [];
    const now = new Date();

    if (range === "DAY") {
      labels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
      incomeData = new Array(7).fill(0);
      outcomeData = new Array(7).fill(0);
      const currentDay = now.getDay();
      const diffToMonday = currentDay === 0 ? 6 : currentDay - 1;
      const targetMonday = new Date(now);
      targetMonday.setDate(now.getDate() - diffToMonday - chartOffset * 7);
      targetMonday.setHours(0, 0, 0, 0);
      const targetSunday = new Date(targetMonday);
      targetSunday.setDate(targetMonday.getDate() + 6);
      targetSunday.setHours(23, 59, 59, 999);
      transactions.forEach((tx) => {
        const txDate = new Date(tx.createdAt);
        if (txDate >= targetMonday && txDate <= targetSunday) {
          const day = txDate.getDay();
          const index = day === 0 ? 6 : day - 1;
          // Chỉ tính TOP_UP là tiền nạp, không tính DEPOSIT_REFUND, REFUND, BONUS
          if (tx.amount > 0 && tx.type === 'TOP_UP') incomeData[index] += tx.amount;
          else if (tx.amount < 0) outcomeData[index] += Math.abs(tx.amount);
        }
      });
    } else if (range === "MONTH") {
      labels = [
        "T1",
        "T2",
        "T3",
        "T4",
        "T5",
        "T6",
        "T7",
        "T8",
        "T9",
        "T10",
        "T11",
        "T12",
      ];
      incomeData = new Array(12).fill(0);
      outcomeData = new Array(12).fill(0);
      const targetYear = now.getFullYear() - chartOffset;
      transactions.forEach((tx) => {
        const d = new Date(tx.createdAt);
        if (d.getFullYear() === targetYear) {
          const month = d.getMonth();
          // Chỉ tính TOP_UP là tiền nạp, không tính DEPOSIT_REFUND, REFUND, BONUS
          if (tx.amount > 0 && tx.type === 'TOP_UP') incomeData[month] += tx.amount;
          else if (tx.amount < 0) outcomeData[month] += Math.abs(tx.amount);
        }
      });
    } else if (range === "YEAR") {
      const currentYear = now.getFullYear() - chartOffset * 3;
      labels = [currentYear - 2, currentYear - 1, currentYear];
      incomeData = new Array(3).fill(0);
      outcomeData = new Array(3).fill(0);
      transactions.forEach((tx) => {
        const year = new Date(tx.createdAt).getFullYear();
        const idx = labels.indexOf(year);
        if (idx !== -1) {
          // Chỉ tính TOP_UP là tiền nạp, không tính DEPOSIT_REFUND, REFUND, BONUS
          if (tx.amount > 0 && tx.type === 'TOP_UP') incomeData[idx] += tx.amount;
          else if (tx.amount < 0) outcomeData[idx] += Math.abs(tx.amount);
        }
      });
    }
    return {
      labels,
      datasets: [
        {
          label: "Tiền vào (Nạp)",
          data: incomeData,
          backgroundColor: "#10b981",
          borderRadius: 6,
        },
        {
          label: "Tiền ra (Chi)",
          data: outcomeData,
          backgroundColor: "#ef4444",
          borderRadius: 6,
        },
      ],
    };
  }, [transactions, range, chartOffset]);

  // Statistics calculations
  const stats = useMemo(() => {
    // Tổng tiền nạp: chỉ tính TOP_UP, không tính DEPOSIT_REFUND, REFUND, BONUS
    const totalTopUp = transactions
      .filter(t => t.amount > 0 && t.type === 'TOP_UP')
      .reduce((sum, t) => sum + t.amount, 0);

    // Tổng tiền vào: bao gồm TOP_UP, REFUND, DEPOSIT_REFUND, BONUS (nhận tiền)
    const totalIn = transactions
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    // Tổng tiền chi: bao gồm PAYMENT, WITHDRAW (trừ tiền)
    const totalOut = transactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const topUpCount = transactions.filter(t => t.type === 'TOP_UP').length;
    const withdrawCount = transactions.filter(t => t.type === 'WITHDRAW').length;
    const pendingWithdraw = withdrawRequests.filter(r => r.status === 'PENDING').length;

    return { totalTopUp, totalIn, totalOut, topUpCount, withdrawCount, pendingWithdraw };
  }, [transactions, withdrawRequests]);

  /* ================= RENDER MODAL ================= */
  const renderModal = (type) => {
    const isTopUp = type === "TOP_UP";
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* CSS INJECTION: Ẩn mũi tên input number trên mọi trình duyệt */}
        <style>
          {`
            input::-webkit-outer-spin-button,
            input::-webkit-inner-spin-button {
              -webkit-appearance: none;
              margin: 0;
            }
            input[type=number] {
              -moz-appearance: textfield;
            }
          `}
        </style>
        <div
          className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
          onClick={closeModal}
        ></div>
        <div className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md p-8">
          <button
            onClick={closeModal}
            className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
          <div
            className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center ${isTopUp
                ? "bg-emerald-50 text-emerald-600"
                : "bg-indigo-50 text-indigo-600"
              }`}
          >
            {isTopUp ? <Plus size={28} /> : <Banknote size={28} />}
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">
            {isTopUp ? "Nạp tiền vào ví" : "Rút tiền về ngân hàng"}
          </h3>
          <p className="text-sm text-gray-500 mb-6 font-medium">
            {isTopUp ? "Nhập số tiền nạp." : "Tiền sẽ được duyệt và chuyển về."}
          </p>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-400 ml-1">
                {isTopUp ? "Số dư hiện tại: " : "Số dư khả dụng: "}{" "}
                {wallet?.balance?.toLocaleString()} đ
              </label>
              <div className="relative mt-2">
                <input
                  type="number"
                  value={amountInput}
                  onKeyDown={handleKeyDown}
                  onWheel={handleWheel}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder={isTopUp ? "10,000" : "50,000"}
                  className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xl font-bold text-gray-900 focus:bg-white outline-none transition-all"
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 font-bold uppercase text-xs">
                  VND
                </span>
              </div>
            </div>
            {!isTopUp && (
              <div className="space-y-3">
                <div className="relative">
                  <select
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm appearance-none outline-none focus:bg-white focus:border-indigo-200 transition-all"
                    value={bankInfo.bankCode}
                    onChange={(e) => {
                      const selectedBank = banks.find(b => b.bin === e.target.value);
                      setBankInfo({
                        ...bankInfo,
                        bankCode: e.target.value,
                        bankName: selectedBank ? selectedBank.shortName : ""
                      });
                    }}
                  >
                    <option value="">Chọn ngân hàng</option>
                    {banks.map((bank) => (
                      <option key={bank.bin} value={bank.bin}>
                        {bank.shortName} - {bank.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <ChevronDown size={14} />
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Số tài khoản"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm"
                  value={bankInfo.accountNumber}
                  onChange={(e) =>
                    setBankInfo({ ...bankInfo, accountNumber: e.target.value })
                  }
                />
                <input
                  type="text"
                  placeholder="Tên chủ tài khoản (VIET HOA)"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm"
                  value={bankInfo.accountName}
                  onChange={(e) =>
                    setBankInfo({
                      ...bankInfo,
                      accountName: e.target.value.toUpperCase(),
                    })
                  }
                />
              </div>
            )}
            <div className="flex gap-2">
              {[50000, 100000, 500000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmountInput(val.toString())}
                  className="text-[10px] font-bold px-3 py-1 bg-gray-100 rounded-lg hover:bg-gray-200 text-gray-600 transition-all"
                >
                  +{val.toLocaleString()}
                </button>
              ))}
            </div>
            <button
              onClick={isTopUp ? handleTopUpSubmit : handleWithdrawSubmit}
              disabled={btnLoading}
              className={`w-full py-4 rounded-2xl font-bold text-sm text-white transition-all ${isTopUp
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
                }`}
            >
              {btnLoading ? (
                <Loader2 className="animate-spin mx-auto" />
              ) : isTopUp ? (
                "Tiếp tục thanh toán"
              ) : (
                "Xác nhận yêu cầu"
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ================= PHẦN CÒN LẠI GIỮ NGUYÊN ================= */
  const filteredTransactions = useMemo(() => {
    if (filterType === "ALL") return transactions;
    return transactions.filter((t) => t.type === filterType);
  }, [filterType, transactions]);

  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE) || 1;
  const paginatedTransactions = useMemo(() => {
    const startIndex = (page - 1) * PAGE_SIZE;
    return filteredTransactions.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredTransactions, page]);

  if (loading)
    return embeddedInSupplier ? (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="font-bold text-xs uppercase tracking-widest text-gray-400">
          Đang tải dữ liệu...
        </p>
      </div>
    ) : (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="font-bold text-xs uppercase tracking-widest text-gray-400">
          Đang tải dữ liệu...
        </p>
      </div>
    );

  return (
    <div
      className={
        embeddedInSupplier
          ? "w-full text-gray-800 font-sans pb-6"
          : "min-h-screen bg-gray-50 text-gray-800 font-sans pb-20"
      }
    >
      {!embeddedInSupplier && <Header />}

      <div className={embeddedInSupplier ? "max-w-full mx-auto w-full" : "max-w-7xl mx-auto px-6 pt-32"}>
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase italic">
              Quản lý <span className="text-indigo-600 not-italic">Ví</span>
            </h1>
            <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mt-1">
              GearXpert Wallet Management
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchInitialData}
              className="p-3 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all hover:border-indigo-200"
            >
              <RefreshCw size={20} className="text-gray-500" />
            </button>
            <button
              onClick={() => {
                if (!isEkycVerified) {
                  toast.warning(
                    <div>
                      <p>Bạn cần hoàn tất eKYC để rút tiền</p>
                      <button
                        className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm"
                        onClick={() => (window.location.href = profilePath)}
                      >
                        Đi đến trang Profile
                      </button>
                    </div>,
                    { autoClose: false }
                  );
                  return;
                }
                setIsWithdrawOpen(true);
              }}
              className={`px-5 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${isEkycVerified
                  ? "bg-white border-2 border-gray-200 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
            >
              <ArrowUpCircle size={18} />
              Rút tiền
            </button>
            <button
              onClick={() => {
                if (!isEkycVerified) {
                  toast.warning(
                    <div>
                      <p>Bạn cần hoàn tất eKYC để nạp tiền</p>
                      <button
                        className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm"
                        onClick={() => (window.location.href = profilePath)}
                      >
                        Đi đến trang Profile
                      </button>
                    </div>,
                    { autoClose: false }
                  );
                  return;
                }
                setIsTopUpOpen(true);
              }}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all flex items-center gap-2 ${isEkycVerified
                  ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                  : "bg-indigo-400 text-white/70 cursor-not-allowed"
                }`}
            >
              <Plus size={18} />
              Nạp tiền
            </button>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Balance Card & Stats */}
          <div className="lg:col-span-1 space-y-6">
            {/* Balance Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 text-white shadow-xl shadow-indigo-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-white/70">
                  <Wallet size={20} />
                  <span className="text-sm font-medium">Số dư hiện tại</span>
                </div>
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">VND</span>
              </div>
              <div className="text-4xl font-black mb-2">
                {wallet?.balance?.toLocaleString("vi-VN")}
                <span className="text-lg font-medium text-white/60 ml-1">đ</span>
              </div>
              <div className="flex items-center gap-2 mt-4 text-sm text-white/70">
                <Clock size={14} />
                <span>Cập nhật: {new Date().toLocaleTimeString('vi-VN')}</span>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <TrendingUp size={16} className="text-emerald-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500">Tổng nạp</span>
                </div>
                <p className="text-lg font-bold text-gray-800">
                  {stats.totalTopUp.toLocaleString('vi-VN')}đ
                </p>
                <p className="text-xs text-gray-400 mt-1">{stats.topUpCount} giao dịch</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <TrendingDown size={16} className="text-red-600" />
                  </div>
                  <span className="text-xs font-medium text-gray-500">Tổng chi</span>
                </div>
                <p className="text-lg font-bold text-gray-800">
                  {stats.totalOut.toLocaleString('vi-VN')}đ
                </p>
                <p className="text-xs text-gray-400 mt-1">{stats.withdrawCount} giao dịch</p>
              </div>
            </div>

            {/* Withdraw Status Summary */}
            {withdrawRequests.length > 0 && (
              <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
                <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <History size={16} className="text-indigo-500" />
                  Yêu cầu rút tiền
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Đang chờ duyệt</span>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                      {stats.pendingWithdraw}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Đã hoàn thành</span>
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                      {withdrawRequests.filter(r => r.status === 'COMPLETED').length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Tổng yêu cầu</span>
                    <span className="text-sm font-bold text-gray-800">{withdrawRequests.length}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Tabs Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tab Navigation */}
            <div className="bg-white rounded-xl p-1 border border-gray-200 flex gap-1">
              {[
                { id: "overview", label: "Tổng quan", icon: Wallet },
                { id: "history", label: "Lịch sử giao dịch", icon: History },
                { id: "withdraw", label: "Yêu cầu rút tiền", icon: ArrowUpCircle },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id
                      ? "bg-indigo-600 text-white shadow-md"
                      : "text-gray-500 hover:bg-gray-50"
                    }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[500px]">
              {activeTab === "overview" && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">Biểu đồ thu chi</h3>
                      <p className="text-sm text-gray-500">Phân tích dòng tiền theo thời gian</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setChartOffset((prev) => prev + 1)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-all"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <button
                        disabled={chartOffset === 0}
                        onClick={() => setChartOffset((prev) => Math.max(0, prev - 1))}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-all disabled:opacity-30"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 mb-4">
                    {["DAY", "MONTH", "YEAR"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setRange(t)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${range === t
                            ? "bg-indigo-100 text-indigo-700"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                      >
                        {t === "DAY" ? "7 ngày" : t === "MONTH" ? "12 tháng" : "5 năm"}
                      </button>
                    ))}
                  </div>

                  <div className="h-[350px]">
                    <Bar
                      data={chartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { position: "bottom", labels: { usePointStyle: true } } },
                        scales: {
                          y: {
                            border: { display: false },
                            grid: { color: "#f1f5f9" },
                            ticks: { font: { size: 10 }, color: "#94a3b8" },
                          },
                          x: {
                            border: { display: false },
                            grid: { display: false },
                            ticks: { font: { size: 10 }, color: "#94a3b8" },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              )}

              {activeTab === "history" && (
                <div>
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <History size={20} className="text-indigo-500" />
                        Lịch sử giao dịch
                      </h3>
                      <div className="flex gap-2 flex-wrap">
                        {["ALL", "TOP_UP", "WITHDRAW", "PAYMENT", "REFUND", "DEPOSIT_REFUND"].map((f) => (
                          <button
                            key={f}
                            onClick={() => { setFilterType(f); setPage(1); }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filterType === f
                                ? "bg-gray-800 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                          >
                            {f === "ALL" ? "Tất cả" : f === "TOP_UP" ? "Nạp" : f === "WITHDRAW" ? "Rút" : f === "PAYMENT" ? "Chi" : f === "REFUND" ? "Hoàn tiền" : "Hoàn cọc"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {paginatedTransactions.length > 0 ? (
                      paginatedTransactions.map((tx) => (
                        <div key={tx._id} className="p-4 hover:bg-gray-50 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`p-2.5 rounded-xl ${tx.amount > 0 ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"
                                }`}>
                                {tx.amount > 0 ? <ArrowDownCircle size={18} /> : <ArrowUpCircle size={18} />}
                              </div>
                              <div>
                                <p className="font-bold text-gray-800 text-sm">
                                  {tx.type === 'TOP_UP'
                                    ? (tx.metadata?.transferType
                                      ? { TRANSFER: 'Nhận chuyển tiền', SUPPLIER_PAYOUT: 'Trả tiền NCC', CUSTOMER_REFUND: 'Hoàn tiền', BONUS: 'Thưởng' }[tx.metadata.transferType] || 'Nạp tiền'
                                      : 'Nạp tiền')
                                    : tx.type === 'WITHDRAW'
                                      ? 'Rút tiền'
                                      : tx.type === 'REFUND'
                                        ? 'Hoàn tiền đơn hủy'
                                        : tx.type === 'DEPOSIT_REFUND'
                                          ? 'Hoàn tiền cọc'
                                          : tx.type === 'PAYMENT'
                                            ? 'Thanh toán thuê'
                                            : tx.type}
                                </p>
                                <p className="text-xs text-gray-500">{tx.description || tx.referenceType}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={`font-bold ${tx.amount > 0 ? "text-emerald-600" : "text-red-600"}`}>
                                {tx.amount > 0 ? "+" : ""}{tx.amount.toLocaleString('vi-VN')}đ
                              </p>
                              <p className="text-xs text-gray-400">
                                {formatWalletTxDateTime(tx.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-500">
                        Không có giao dịch nào
                      </div>
                    )}
                  </div>

                  {totalPages > 1 && (
                    <div className="p-4 border-t border-gray-100 flex items-center justify-between">
                      <button
                        disabled={page === 1}
                        onClick={() => setPage((p) => p - 1)}
                        className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-all"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <span className="text-sm text-gray-500">
                        Trang {page} / {totalPages}
                      </span>
                      <button
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                        className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-30 transition-all"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {activeTab === "withdraw" && (
                <div>
                  <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                      <ArrowUpCircle size={20} className="text-amber-500" />
                      Yêu cầu rút tiền
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Theo dõi trạng thái các yêu cầu rút tiền</p>
                  </div>

                  <div className="divide-y divide-gray-50">
                    {withdrawRequests.length > 0 ? (
                      withdrawRequests.map((req) => (
                        <div key={req._id} className="p-5 hover:bg-gray-50 transition-all">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-4">
                              <div className={`p-3 rounded-xl ${req.status === 'PENDING' ? 'bg-amber-100 text-amber-600' :
                                  req.status === 'APPROVED' ? 'bg-blue-100 text-blue-600' :
                                    req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' :
                                      'bg-red-100 text-red-600'
                                }`}>
                                {req.status === 'PENDING' && <Clock size={20} />}
                                {req.status === 'APPROVED' && <CheckCircle2 size={20} />}
                                {req.status === 'COMPLETED' && <CheckCircle2 size={20} />}
                                {req.status === 'REJECTED' && <X size={20} />}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-gray-800">{req.amount.toLocaleString('vi-VN')}đ</p>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${req.status === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                      req.status === 'APPROVED' ? 'bg-blue-100 text-blue-700' :
                                        req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' :
                                          'bg-red-100 text-red-700'
                                    }`}>
                                    {req.status === 'PENDING' ? 'Đang chờ' :
                                      req.status === 'APPROVED' ? 'Đã duyệt' :
                                        req.status === 'COMPLETED' ? 'Hoàn thành' : 'Từ chối'}
                                  </span>
                                </div>
                                <div className="mt-2 space-y-1">
                                  <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <CreditCard size={14} className="text-gray-400" />
                                    {req.bankInfo?.bankName}
                                  </p>
                                  <p className="text-sm text-gray-600 flex items-center gap-2">
                                    <Wallet size={14} className="text-gray-400" />
                                    ***{req.bankInfo?.accountNumber?.slice(-4)} - {req.bankInfo?.accountName}
                                  </p>
                                </div>
                                {req.adminNote && (
                                  <div className="mt-3 p-3 bg-gray-100 rounded-lg text-sm text-gray-700">
                                    <span className="font-semibold">Ghi chú từ Admin:</span> {req.adminNote}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-400">
                                {new Date(req.createdAt).toLocaleDateString('vi-VN', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <History size={24} className="text-gray-400" />
                        </div>
                        <p className="text-gray-500">Chưa có yêu cầu rút tiền nào</p>
                        <button
                          onClick={() => setIsWithdrawOpen(true)}
                          className="mt-4 text-indigo-600 font-bold text-sm hover:underline"
                        >
                          Tạo yêu cầu rút tiền →
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      {isTopUpOpen && renderModal("TOP_UP")}
      {isWithdrawOpen && renderModal("WITHDRAW")}
    </div>
  );
}
