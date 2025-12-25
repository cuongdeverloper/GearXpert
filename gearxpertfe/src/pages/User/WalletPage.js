import { useMemo, useState } from "react";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

/* ================= MOCK WALLET ================= */
const mockWallet = {
  balance: 2350000,
  currency: "VND",
  updatedAt: "2025-12-20"
};

/* ================= MOCK TRANSACTIONS ================= */
const mockTransactions = [
  {
    id: "tx-001",
    type: "TOP_UP",
    amount: 1000000,
    description: "Nạp tiền qua MoMo",
    createdAt: "2025-12-18 10:12",
    status: "SUCCESS"
  },
  {
    id: "tx-002",
    type: "PAYMENT",
    amount: -850000,
    description: "Thanh toán đơn thuê Canon EOS R5",
    createdAt: "2025-12-19 14:30",
    status: "SUCCESS"
  },
  {
    id: "tx-003",
    type: "REFUND",
    amount: 200000,
    description: "Hoàn tiền trả sớm DJI Mini 3",
    createdAt: "2025-12-20 09:15",
    status: "SUCCESS"
  },
  {
    id: "tx-004",
    type: "PAYMENT",
    amount: -420000,
    description: "Thanh toán đơn thuê Bosch GSB 13 RE",
    createdAt: "2025-12-20 15:40",
    status: "SUCCESS"
  }
];

/* ================= CASH FLOW ================= */
const cashFlowData = {
  DAY: [
    { label: "18/12", in: 1000000, out: 0 },
    { label: "19/12", in: 0, out: 850000 },
    { label: "20/12", in: 200000, out: 420000 }
  ],
  MONTH: [
    { label: "10/2025", in: 3200000, out: 2100000 },
    { label: "11/2025", in: 4500000, out: 3800000 },
    { label: "12/2025", in: 5200000, out: 2850000 }
  ],
  YEAR: [
    { label: "2023", in: 18000000, out: 14200000 },
    { label: "2024", in: 24500000, out: 19800000 },
    { label: "2025", in: 31200000, out: 22100000 }
  ]
};

const PAGE_SIZE = 3;

export default function WalletPage() {
  const [range, setRange] = useState("DAY");
  const [filterType, setFilterType] = useState("ALL");
  const [page, setPage] = useState(1);

  /* ================= FILTER ================= */
  const filteredTransactions = useMemo(() => {
    return filterType === "ALL"
      ? mockTransactions
      : mockTransactions.filter((t) => t.type === filterType);
  }, [filterType]);

  /* ================= PAGINATION ================= */
  const totalPages = Math.ceil(filteredTransactions.length / PAGE_SIZE);

  const paginatedTransactions = filteredTransactions.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  /* ================= CHART DATA (FIX) ================= */
  const chartData = useMemo(() => ({
    labels: cashFlowData[range].map((i) => i.label),
    datasets: [
      {
        label: "Tiền vào",
        data: cashFlowData[range].map((i) => i.in),
        backgroundColor: "#22c55e",
        borderRadius: 8,
        barThickness: 22
      },
      {
        label: "Tiền ra",
        data: cashFlowData[range].map((i) => i.out),
        backgroundColor: "#ef4444",
        borderRadius: 8,
        barThickness: 22
      }
    ]
  }), [range]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) =>
            `${ctx.dataset.label}: ${ctx.raw.toLocaleString("vi-VN")} ₫`
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        ticks: {
          callback: (v) => v.toLocaleString("vi-VN") + " ₫"
        }
      }
    }
  }), []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <h1 className="text-2xl font-semibold mb-6">Ví của tôi</h1>

        {/* BALANCE */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl p-6 mb-8 flex justify-between items-center">
          <div>
            <p className="text-sm opacity-80">Số dư hiện tại</p>
            <h2 className="text-3xl font-bold mt-1">
              {mockWallet.balance.toLocaleString("vi-VN")} ₫
            </h2>
            <p className="text-xs opacity-70 mt-1">
              Cập nhật: {mockWallet.updatedAt}
            </p>
          </div>
          <Wallet size={48} />
        </div>

        {/* CASH FLOW */}
        <div className="bg-white rounded-2xl p-6 mb-10">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold">Dòng tiền</h2>
            <div className="flex bg-gray-100 rounded-full p-1">
              {["DAY", "MONTH", "YEAR"].map((k) => (
                <button
                  key={k}
                  onClick={() => setRange(k)}
                  className={`px-4 py-1.5 text-sm rounded-full ${
                    range === k ? "bg-black text-white" : "hover:bg-gray-200"
                  }`}
                >
                  {k === "DAY" ? "Ngày" : k === "MONTH" ? "Tháng" : "Năm"}
                </button>
              ))}
            </div>
          </div>

          {/* FIXED CHART */}
          <div className="relative h-[260px]">
            <Bar data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* TRANSACTIONS */}
        <div className="bg-white rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">Lịch sử giao dịch</h2>

          <div className="flex gap-2 mb-4">
            <FilterButton label="Tất cả" value="ALL" active={filterType} onClick={setFilterType} />
            <FilterButton label="Nạp tiền" value="TOP_UP" active={filterType} onClick={setFilterType} />
            <FilterButton label="Thanh toán" value="PAYMENT" active={filterType} onClick={setFilterType} />
            <FilterButton label="Hoàn tiền" value="REFUND" active={filterType} onClick={setFilterType} />
          </div>

          <div className="space-y-4">
            {paginatedTransactions.map((tx) => (
              <div key={tx.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                <div className="flex gap-4 items-center">
                  {tx.amount > 0 ? (
                    <ArrowDownCircle className="text-green-600" />
                  ) : (
                    <ArrowUpCircle className="text-red-600" />
                  )}
                  <div>
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-xs text-gray-500">{tx.createdAt}</p>
                  </div>
                </div>
                <p className={`font-semibold ${tx.amount > 0 ? "text-green-600" : "text-red-600"}`}>
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount.toLocaleString("vi-VN")} ₫
                </p>
              </div>
            ))}
          </div>

          {/* PAGINATION */}
          <div className="flex justify-end gap-3 mt-6">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 border rounded disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            <span className="text-sm text-gray-500 flex items-center">
              {page} / {totalPages}
            </span>

            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 border rounded disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= COMPONENT ================= */
function FilterButton({ label, value, active, onClick }) {
  return (
    <button
      onClick={() => onClick(value)}
      className={`px-4 py-2 rounded-lg text-sm border ${
        active === value ? "bg-black text-white" : "hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}
