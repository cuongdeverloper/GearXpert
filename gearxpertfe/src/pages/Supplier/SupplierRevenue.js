import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { FiTrendingUp, FiDollarSign, FiTarget, FiCalendar } from "react-icons/fi";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
} from "chart.js";
import { getSupplierRevenue } from "../../service/ApiService/SupplierRevenueApi";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

const EMPTY_DATA = {
  summary: {
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeRentals: 0,
    avgRating: 0
  },
  cashFlow: { DAY: [], MONTH: [], YEAR: [] },
  monthlyBreakdown: [],
  topDevices: [],
  transactions: []
};

const formatMoney = (value) =>
  (value || 0).toLocaleString("vi-VN");

const formatMillions = (value) =>
  `${((value || 0) / 1000000).toFixed(1)}M`;

export default function SupplierRevenue() {
  const user = useSelector((state) => state.user.account);
  const [range, setRange] = useState("DAY");
  const [data, setData] = useState(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRevenue = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const res = await getSupplierRevenue(user.id);
        setData(res || EMPTY_DATA);
      } catch (error) {
        console.error("Error fetching supplier revenue:", error);
        setData(EMPTY_DATA);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenue();
  }, [user?.id]);

  const revenueData = data?.summary || EMPTY_DATA.summary;
  const monthlyBreakdown = data?.monthlyBreakdown || [];
  const topDevices = data?.topDevices || [];
  const transactions = data?.transactions || [];
  const cashFlowData = data?.cashFlow || EMPTY_DATA.cashFlow;
  const maxMonthlyRevenue = Math.max(
    ...monthlyBreakdown.map((item) => item.revenue || 0),
    1
  );

  const chartData = useMemo(() => {
    const series = cashFlowData[range] || [];
    return {
      labels: series.map((item) => item.label),
      datasets: [
        {
          label: "Money In",
          data: series.map((item) => item.in),
          backgroundColor: "#22c55e",
          borderRadius: 8,
          barThickness: 22
        },
        {
          label: "Money Out",
          data: series.map((item) => item.out),
          backgroundColor: "#ef4444",
          borderRadius: 8,
          barThickness: 22
        }
      ]
    };
  }, [cashFlowData, range]);

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
            `${ctx.dataset.label}: ${formatMoney(ctx.raw)} ₫`
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        ticks: {
          callback: (v) => `${formatMoney(v)} ₫`
        }
      }
    }
  }), []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Revenue Analytics</h2>
        <p className="mt-1 text-sm text-slate-600">Monitor earnings and rental performance</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">Total Revenue</p>
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <FiDollarSign size={20} className="text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-primary">{formatMillions(revenueData.totalRevenue)}</p>
          <p className="text-xs text-primary/70 mt-2">All time earnings</p>
        </div>

        <div className="bg-gradient-to-br from-green-100/10 to-green-50/5 rounded-2xl border border-green-200/30 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">This Month</p>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <FiTrendingUp size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-green-600">{formatMillions(revenueData.monthlyRevenue)}</p>
          <p className="text-xs text-green-600/70 mt-2">+15% vs last month</p>
        </div>

        <div className="bg-gradient-to-br from-blue-100/10 to-blue-50/5 rounded-2xl border border-blue-200/30 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">Active Rentals</p>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FiTarget size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-600">{revenueData.activeRentals}</p>
          <p className="text-xs text-blue-600/70 mt-2">Current bookings</p>
        </div>

        <div className="bg-gradient-to-br from-amber-100/10 to-amber-50/5 rounded-2xl border border-amber-200/30 p-6 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">Rating</p>
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center text-lg">
              ⭐
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-600">{revenueData.avgRating?.toFixed ? revenueData.avgRating.toFixed(1) : revenueData.avgRating}</p>
          <p className="text-xs text-amber-600/70 mt-2">Customer satisfaction</p>
        </div>
      </div>

      {/* Cash Flow */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <h3 className="text-lg font-bold text-slate-900">Cash Flow</h3>
          <div className="flex bg-slate-100 rounded-full p-1">
            {["DAY", "MONTH", "YEAR"].map((k) => (
              <button
                key={k}
                onClick={() => setRange(k)}
                className={`px-4 py-1.5 text-sm rounded-full ${
                  range === k ? "bg-slate-900 text-white" : "hover:bg-slate-200"
                }`}
              >
                {k === "DAY" ? "Day" : k === "MONTH" ? "Month" : "Year"}
              </button>
            ))}
          </div>
        </div>

        <div className="relative h-[260px] mt-6">
          {loading ? (
            <p className="text-sm text-slate-500">Loading data...</p>
          ) : (
            <Bar data={chartData} options={chartOptions} />
          )}
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Revenue */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <FiCalendar className="text-primary" />
            Monthly Revenue
          </h3>

          <div className="space-y-4">
            {monthlyBreakdown.length === 0 && (
              <p className="text-sm text-slate-500">No revenue data yet.</p>
            )}
            {monthlyBreakdown.map((item, idx) => {
              return (
                <div key={idx}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-slate-700">{item.label}</span>
                    <span className="text-sm font-bold text-primary">{formatMillions(item.revenue)}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary-dark rounded-full transition-all"
                      style={{ width: `${(item.revenue / maxMonthlyRevenue) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{item.rentals} rentals</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Devices */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Top Performing Devices</h3>

          <div className="space-y-4">
            {topDevices.length === 0 && (
              <p className="text-sm text-slate-500">No top devices yet.</p>
            )}
            {topDevices.map((device, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200 hover:border-primary/30 transition-all group"
              >
                <div>
                  <p className="font-semibold text-slate-900 group-hover:text-primary transition-colors">{device.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{device.rentals} rentals</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary">{formatMillions(device.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Earnings Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Recent Transactions</h3>

        <div className="space-y-3">
          {loading && (
            <p className="text-sm text-slate-500">Loading data...</p>
          )}
          {!loading && transactions.length === 0 && (
            <p className="text-sm text-slate-500">No transactions yet.</p>
          )}
          {transactions.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-primary/30 hover:bg-slate-50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FiDollarSign size={18} className="text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{item.description}</p>
                  <p className="text-xs text-slate-500">{item.createdAt}</p>
                </div>
              </div>
              <p className={`font-bold ${item.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                {item.amount >= 0 ? "+" : "-"}{formatMillions(Math.abs(item.amount))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
