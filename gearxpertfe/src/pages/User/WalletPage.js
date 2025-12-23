import { useState } from "react";
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  RefreshCcw,
  TrendingUp,
  TrendingDown,
  PackageCheck,
  RotateCcw
} from "lucide-react";

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

export default function WalletPage() {
  const [wallet] = useState(mockWallet);
  const [transactions] = useState(mockTransactions);

  /* ================= STATISTICS ================= */
  const totalTopUp = transactions
    .filter((t) => t.type === "TOP_UP")
    .reduce((s, t) => s + t.amount, 0);

  const totalSpent = transactions
    .filter((t) => t.type === "PAYMENT")
    .reduce((s, t) => s + Math.abs(t.amount), 0);

  const totalRefund = transactions
    .filter((t) => t.type === "REFUND")
    .reduce((s, t) => s + t.amount, 0);

  const totalOrders = transactions.filter(
    (t) => t.type === "PAYMENT"
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-8 py-8">
        <h1 className="text-2xl font-semibold mb-6">Ví của tôi</h1>

        {/* ================= BALANCE ================= */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-2xl p-6 mb-8 flex justify-between items-center">
          <div>
            <p className="text-sm opacity-80">Số dư hiện tại</p>
            <h2 className="text-3xl font-bold mt-1">
              {wallet.balance.toLocaleString("vi-VN")} ₫
            </h2>
            <p className="text-xs opacity-70 mt-1">
              Cập nhật: {wallet.updatedAt}
            </p>
          </div>
          <Wallet size={48} className="opacity-80" />
        </div>

        {/* ================= STAT CARDS ================= */}
        <div className="grid md:grid-cols-4 gap-6 mb-10">
          <StatCard
            title="Đã nạp"
            value={totalTopUp}
            icon={TrendingUp}
            color="green"
          />
          <StatCard
            title="Đã chi"
            value={totalSpent}
            icon={TrendingDown}
            color="red"
          />
          <StatCard
            title="Hoàn tiền"
            value={totalRefund}
            icon={RotateCcw}
            color="blue"
          />
          <StatCard
            title="Đơn thuê"
            value={totalOrders}
            icon={PackageCheck}
            color="purple"
            suffix="đơn"
          />
        </div>

        {/* ================= ACTION ================= */}
        <div className="flex gap-4 mb-8">
          <button className="px-5 py-3 bg-blue-600 text-white rounded-xl">
            Nạp tiền
          </button>

          <button className="px-5 py-3 border rounded-xl flex items-center gap-2">
            <RefreshCcw size={16} />
            Làm mới
          </button>
        </div>

        {/* ================= TRANSACTIONS ================= */}
        <div className="bg-white rounded-2xl p-6">
          <h2 className="text-lg font-semibold mb-4">
            Lịch sử giao dịch
          </h2>

          <div className="space-y-4">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex justify-between items-center p-4 bg-gray-50 rounded-xl"
              >
                <div className="flex gap-4 items-center">
                  {tx.amount > 0 ? (
                    <ArrowDownCircle className="text-green-600" />
                  ) : (
                    <ArrowUpCircle className="text-red-600" />
                  )}

                  <div>
                    <p className="font-medium">{tx.description}</p>
                    <p className="text-xs text-gray-500">
                      {tx.createdAt}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p
                    className={`font-semibold ${
                      tx.amount > 0
                        ? "text-green-600"
                        : "text-red-600"
                    }`}
                  >
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount.toLocaleString("vi-VN")} ₫
                  </p>
                  <p className="text-xs text-gray-500">
                    {tx.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= STAT CARD ================= */
function StatCard({ title, value, icon: Icon, color, suffix }) {
  const colorMap = {
    green: "text-green-600 bg-green-50",
    red: "text-red-600 bg-red-50",
    blue: "text-blue-600 bg-blue-50",
    purple: "text-purple-600 bg-purple-50"
  };

  return (
    <div className="bg-white rounded-xl p-5 flex items-center gap-4">
      <div
        className={`p-3 rounded-xl ${
          colorMap[color] || "bg-gray-100"
        }`}
      >
        <Icon size={22} />
      </div>

      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <p className="font-semibold text-lg">
          {suffix
            ? `${value} ${suffix}`
            : `${value.toLocaleString("vi-VN")} ₫`}
        </p>
      </div>
    </div>
  );
}
