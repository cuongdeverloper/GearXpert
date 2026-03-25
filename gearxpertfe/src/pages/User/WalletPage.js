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
  AlertCircle,
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
  topUpWallet,
  requestWithdraw,
} from "../../service/ApiService/WalletApi";
import { toast } from "react-toastify";
import Header from "../../components/navigation/Header";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const PAGE_SIZE = 5;

export default function WalletPage() {
  const [isEkycVerified, setIsEkycVerified] = useState(false);
  const [wallet, setWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [btnLoading, setBtnLoading] = useState(false);
  const [range, setRange] = useState("DAY");
  const [filterType, setFilterType] = useState("ALL");
  const [page, setPage] = useState(1);
  const [chartOffset, setChartOffset] = useState(0);

  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);
  const [isTopUpOpen, setIsTopUpOpen] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [bankInfo, setBankInfo] = useState({
    bankName: "",
    accountNumber: "",
    accountName: "",
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    setChartOffset(0);
  }, [range]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [walletRes, transRes] = await Promise.all([
        getMyWallet(),
        getWalletTransactions(),
      ]);
      console.log(walletRes);
      setWallet(walletRes);
      setTransactions(transRes?.data || transRes);
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
          window.location.href = "/profile";
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
    if (amount < 50000) return toast.error("Số tiền rút tối thiểu là 50,000đ");
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
          bankName: bankName.trim(),
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
          window.location.href = "/profile";
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
          if (tx.amount > 0) incomeData[index] += tx.amount;
          else outcomeData[index] += Math.abs(tx.amount);
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
          if (tx.amount > 0) incomeData[month] += tx.amount;
          else outcomeData[month] += Math.abs(tx.amount);
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
          if (tx.amount > 0) incomeData[idx] += tx.amount;
          else outcomeData[idx] += Math.abs(tx.amount);
        }
      });
    }
    return {
      labels,
      datasets: [
        {
          label: "Tiền vào",
          data: incomeData,
          backgroundColor: "#10b981",
          borderRadius: 6,
        },
        {
          label: "Tiền ra",
          data: outcomeData,
          backgroundColor: "#ef4444",
          borderRadius: 6,
        },
      ],
    };
  }, [transactions, range, chartOffset]);

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
            className={`w-14 h-14 rounded-2xl mb-6 flex items-center justify-center ${
              isTopUp
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
                <input
                  type="text"
                  placeholder="Tên ngân hàng"
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-sm"
                  value={bankInfo.bankName}
                  onChange={(e) =>
                    setBankInfo({ ...bankInfo, bankName: e.target.value })
                  }
                />
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
              className={`w-full py-4 rounded-2xl font-bold text-sm text-white transition-all ${
                isTopUp
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
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={40} />
        <p className="font-bold text-xs uppercase tracking-widest text-gray-400">
          Đang tải dữ liệu...
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans pb-20">
      <Header />
      <div className="max-w-6xl mx-auto px-6 pt-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight uppercase italic">
              Wallet <span className="text-indigo-600 not-italic">Pro</span>
            </h1>
            <p className="text-gray-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">
              GearXpert Financial Management
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchInitialData}
              className="p-3 bg-white border border-gray-100 rounded-2xl hover:shadow-md transition-all"
            >
              <RefreshCw size={20} className="text-gray-400" />
            </button>

            {/* Nút Rút tiền */}
            <button
              onClick={() => {
                if (!isEkycVerified) {
                  toast.warning(
                    <div>
                      <p>Bạn cần hoàn tất eKYC để rút tiền</p>
                      <button
                        className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm"
                        onClick={() => (window.location.href = "/profile")}
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
              className={`px-6 py-4 rounded-2xl font-bold text-xs uppercase shadow-sm transition-all italic ${
                isEkycVerified
                  ? "bg-white border border-gray-100 text-gray-700 hover:bg-gray-50"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed opacity-70"
              }`}
            >
              Rút tiền
            </button>

            {/* Nút Nạp tiền */}
            <button
              onClick={() => {
                if (!isEkycVerified) {
                  toast.warning(
                    <div>
                      <p>Bạn cần hoàn tất eKYC để nạp tiền</p>
                      <button
                        className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm"
                        onClick={() => (window.location.href = "/profile")}
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
              className={`px-8 py-4 rounded-2xl font-black text-xs uppercase shadow-xl transition-all flex items-center gap-2 italic ${
                isEkycVerified
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-indigo-400 text-white/70 cursor-not-allowed opacity-70"
              }`}
            >
              <Plus size={18} strokeWidth={3} /> Nạp tiền
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="relative bg-indigo-600 rounded-[2.5rem] p-10 overflow-hidden shadow-2xl shadow-indigo-200">
              <div className="relative z-10">
                <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">
                  Available Balance
                </p>
                <div className="flex items-baseline gap-3 mt-2">
                  <h2 className="text-6xl font-black text-white tracking-tighter">
                    {wallet?.balance?.toLocaleString("vi-VN")}
                  </h2>
                  <span className="text-xl font-bold text-white/40 italic uppercase">
                    VND
                  </span>
                </div>
                <div className="mt-12 flex items-center justify-between">
                  <Wallet size={40} className="text-white/20" />
                </div>
              </div>
              <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-20 -mt-20 blur-3xl"></div>
            </div>

            <div className="bg-white rounded-[2.5rem] p-8 border border-gray-100 shadow-sm">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
                <div>
                  <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest italic">
                    Cash Flow Analytics
                  </h3>
                  <p className="text-[11px] font-bold text-indigo-600 mt-1 uppercase">
                    {range === "DAY"
                      ? chartOffset === 0
                        ? "Tuần này"
                        : `Cách đây ${chartOffset} tuần`
                      : range === "MONTH"
                      ? `Năm ${new Date().getFullYear() - chartOffset}`
                      : "Lịch sử giao dịch"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex bg-gray-100 p-1 rounded-xl items-center">
                    <button
                      onClick={() => setChartOffset((prev) => prev + 1)}
                      className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-500 hover:text-indigo-600"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      disabled={chartOffset === 0}
                      onClick={() =>
                        setChartOffset((prev) => Math.max(0, prev - 1))
                      }
                      className="p-1.5 hover:bg-white rounded-lg transition-all text-gray-500 hover:text-indigo-600 disabled:opacity-20"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
                    {["DAY", "MONTH", "YEAR"].map((t) => (
                      <button
                        key={t}
                        onClick={() => setRange(t)}
                        className={`px-5 py-2 text-[10px] font-black rounded-xl transition-all ${
                          range === t
                            ? "bg-white text-indigo-600 shadow-sm"
                            : "text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        {t === "DAY"
                          ? "Tuần"
                          : t === "MONTH"
                          ? "Năm"
                          : "Lịch sử"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="h-[320px]">
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        border: { display: false },
                        grid: { color: "#f8fafc" },
                        ticks: {
                          font: { size: 9, weight: "bold" },
                          color: "#94a3b8",
                        },
                      },
                      x: {
                        border: { display: false },
                        grid: { display: false },
                        ticks: {
                          font: { size: 9, weight: "bold" },
                          color: "#94a3b8",
                        },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
              <div className="p-8 border-b border-gray-50">
                <h3 className="text-[10px] font-black uppercase text-gray-400 tracking-widest italic mb-6">
                  Activity
                </h3>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  {["ALL", "TOP_UP", "WITHDRAW", "PAYMENT"].map((f) => (
                    <button
                      key={f}
                      onClick={() => {
                        setFilterType(f);
                        setPage(1);
                      }}
                      className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${
                        filterType === f
                          ? "bg-gray-900 text-white border-gray-900"
                          : "border-gray-100 text-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      {f === "ALL"
                        ? "Tất cả"
                        : f === "TOP_UP"
                        ? "Nạp"
                        : f === "WITHDRAW"
                        ? "Rút"
                        : "Chi"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex-grow p-4 space-y-3 min-h-[400px]">
                {paginatedTransactions.length > 0 ? (
                  paginatedTransactions.map((tx) => (
                    <div
                      key={tx._id}
                      className="p-4 hover:bg-gray-50 rounded-2xl border border-transparent hover:border-gray-100 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div
                          className={`p-2 rounded-xl ${
                            tx.amount > 0
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {tx.amount > 0 ? (
                            <ArrowDownCircle size={18} />
                          ) : (
                            <ArrowUpCircle size={18} />
                          )}
                        </div>
                        <div className="text-right">
                          <p
                            className={`font-black text-sm ${
                              tx.amount > 0
                                ? "text-emerald-600"
                                : "text-red-600"
                            }`}
                          >
                            {tx.amount > 0 ? "+" : ""}
                            {tx.amount.toLocaleString()} ₫
                          </p>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-tighter ${
                              tx.status === "COMPLETED"
                                ? "text-emerald-400"
                                : "text-amber-400"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] font-bold text-gray-500 line-clamp-1 italic">
                        {tx.description || "Giao dịch ví"}
                      </p>
                      <p className="text-[9px] text-gray-300 mt-1 font-mono">
                        {new Date(tx.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-300 py-20">
                    <AlertCircle size={40} strokeWidth={1} className="mb-2" />
                    <p className="text-[10px] font-bold uppercase">
                      Không có dữ liệu
                    </p>
                  </div>
                )}
              </div>
              <div className="p-6 border-t border-gray-50 flex justify-between items-center mt-auto">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-2 border border-gray-100 rounded-xl hover:bg-gray-50 disabled:opacity-20 transition-all active:scale-90"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-[10px] font-black text-gray-400">
                  Trang {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-2 border border-gray-100 rounded-xl hover:bg-gray-50 disabled:opacity-20 transition-all active:scale-90"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      {isTopUpOpen && renderModal("TOP_UP")}
      {isWithdrawOpen && renderModal("WITHDRAW")}
    </div>
  );
}
