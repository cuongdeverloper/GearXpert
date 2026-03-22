import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  FiDollarSign,
  FiTrendingUp,
  FiClipboard,
  FiBox,
  FiClock,
  FiCheckCircle,
  FiStar,
} from "react-icons/fi";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Doughnut } from "react-chartjs-2";
import { getSupplierRevenue } from "../../service/ApiService/SupplierRevenueApi";
import { getSupplierRentalRequests } from "../../service/ApiService/RentalApi";
import { getSupplierDevices } from "../../service/ApiService/DeviceApi";

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler
);

const EMPTY_REVENUE = {
  summary: {
    totalRevenue: 0,
    monthlyRevenue: 0,
    activeRentals: 0,
    avgRating: 0,
  },
  monthlyBreakdown: [],
  topDevices: [],
  transactions: [],
};

const formatVND = (value) => (value || 0).toLocaleString("vi-VN") + "₫";
const formatShortVND = (value) => {
  return (value || 0).toLocaleString("vi-VN") + "₫";
};

export default function SupplierDashboard() {
  const user = useSelector((state) => state.user.account);
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(EMPTY_REVENUE);
  const [requests, setRequests] = useState([]);
  const [deviceTotals, setDeviceTotals] = useState({ total: 0, available: 0 });

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [revenueRes, requestRes, totalRes, availableRes] =
          await Promise.all([
            getSupplierRevenue(user.id),
            getSupplierRentalRequests(user.id, { status: "PENDING,APPROVED" }),
            getSupplierDevices(user.id, { limit: 1, page: 1 }),
            getSupplierDevices(user.id, { limit: 1, page: 1, status: "AVAILABLE" }),
          ]);

        setRevenue(revenueRes || EMPTY_REVENUE);
        setRequests(requestRes?.rentals || []);
        setDeviceTotals({
          total: totalRes?.total || 0,
          available: availableRes?.total || 0,
        });
      } catch (error) {
        console.error("Error loading supplier dashboard:", error);
        setRevenue(EMPTY_REVENUE);
        setRequests([]);
        setDeviceTotals({ total: 0, available: 0 });
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, [user?.id]);

  const summary = revenue?.summary || EMPTY_REVENUE.summary;
  const topDevices = revenue?.topDevices || [];
  const transactions = revenue?.transactions || [];
  const cashFlow = revenue?.cashFlow || { DAY: [], MONTH: [], YEAR: [] };
  const monthlyBreakdown = revenue?.monthlyBreakdown || [];

  const [cashFlowRange, setCashFlowRange] = useState("MONTH");

  const pendingCount = useMemo(
    () => requests.filter((r) => r.status === "PENDING").length,
    [requests]
  );
  const approvedCount = useMemo(
    () => requests.filter((r) => r.status === "APPROVED").length,
    [requests]
  );
  const recentRequests = useMemo(() => {
    return [...requests]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);
  }, [requests]);

  // ── Booking status breakdown for doughnut ──
  const statusBreakdown = useMemo(() => {
    const counts = {};
    requests.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [requests]);

  // ── Chart data ──
  const cashFlowData = useMemo(() => {
    const data = cashFlow[cashFlowRange] || [];
    return {
      labels: data.map((d) => d.label),
      datasets: [
        {
          label: "Income",
          data: data.map((d) => d.in),
          backgroundColor: "rgba(79, 70, 229, 0.8)",
          borderRadius: 6,
          barPercentage: 0.6,
        },
        {
          label: "Refunds",
          data: data.map((d) => d.out),
          backgroundColor: "rgba(239, 68, 68, 0.7)",
          borderRadius: 6,
          barPercentage: 0.6,
        },
      ],
    };
  }, [cashFlow, cashFlowRange]);

  const revenueLineData = useMemo(() => ({
    labels: monthlyBreakdown.map((m) => m.label),
    datasets: [
      {
        label: "Revenue",
        data: monthlyBreakdown.map((m) => m.revenue),
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: "rgb(16, 185, 129)",
      },
      {
        label: "Rentals",
        data: monthlyBreakdown.map((m) => m.rentals),
        borderColor: "rgb(79, 70, 229)",
        backgroundColor: "rgba(79, 70, 229, 0.05)",
        fill: false,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: "rgb(79, 70, 229)",
        yAxisID: "y1",
      },
    ],
  }), [monthlyBreakdown]);

  const topDeviceBarData = useMemo(() => ({
    labels: topDevices.map((d) => d.name?.length > 18 ? d.name.slice(0, 18) + "…" : d.name),
    datasets: [
      {
        label: "Revenue",
        data: topDevices.map((d) => d.revenue),
        backgroundColor: [
          "rgba(79, 70, 229, 0.8)",
          "rgba(16, 185, 129, 0.8)",
          "rgba(245, 158, 11, 0.8)",
          "rgba(59, 130, 246, 0.8)",
        ],
        borderRadius: 8,
        barPercentage: 0.65,
      },
    ],
  }), [topDevices]);

  const statusDoughnutData = useMemo(() => {
    const STATUS_COLORS = {
      PENDING: "#f59e0b",
      DELIVERING: "#6366f1",
      RENTING: "#3b82f6",
      RETURNING: "#a855f7",
      INSPECTING: "#64748b",
      COMPLETED: "#10b981",
      REJECTED: "#ef4444",
      CANCELLED: "#dc2626",
    };
    const labels = Object.keys(statusBreakdown);
    return {
      labels: labels.map((s) => STATUS_LABELS[s] || s),
      datasets: [{
        data: labels.map((s) => statusBreakdown[s]),
        backgroundColor: labels.map((s) => STATUS_COLORS[s] || "#94a3b8"),
        borderWidth: 0,
        hoverOffset: 6,
      }],
    };
  }, [statusBreakdown]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard</h2>
        <div className="flex items-center gap-2">
          <Link to="/supplier/rental-requests" className="px-3.5 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all">
            Bookings
          </Link>
          <Link to="/supplier/devices" className="px-3.5 py-2 rounded-xl bg-primary text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
            Devices
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <KpiCard icon={FiDollarSign} label="Total Revenue" value={formatShortVND(summary.totalRevenue)} color="primary" />
        <KpiCard icon={FiTrendingUp} label="This Month" value={formatShortVND(summary.monthlyRevenue)} color="green" />
        <KpiCard icon={FiClipboard} label="Pending" value={pendingCount} sub={`${approvedCount} approved`} color="amber" />
        <KpiCard icon={FiBox} label="Devices" value={deviceTotals.total} sub={`${deviceTotals.available} available`} color="blue" />
        <KpiCard icon={FiStar} label="Avg. Rating" value={summary.avgRating?.toFixed(1) || "0.0"} sub={`${summary.activeRentals} active rentals`} color="yellow" />
      </div>

      {/* Row 1: Cash Flow Bar + Revenue Line */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cash Flow — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Cash Flow</h3>
            <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
              {["DAY", "MONTH", "YEAR"].map((r) => (
                <button
                  key={r}
                  onClick={() => setCashFlowRange(r)}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                    cashFlowRange === r ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {r === "DAY" ? "7 Days" : r === "MONTH" ? "6 Months" : "3 Years"}
                </button>
              ))}
            </div>
          </div>
          {loading ? <Skeleton h="h-56" /> : (
            <div className="h-56">
              <Bar data={cashFlowData} options={barOptions} />
            </div>
          )}
        </div>

        {/* Order Status Doughnut — 1 col */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Order Status</h3>
          {loading ? <Skeleton h="h-56" /> : Object.keys(statusBreakdown).length === 0 ? (
            <p className="text-sm text-slate-400 py-16 text-center">No data yet</p>
          ) : (
            <div className="h-56 flex items-center justify-center">
              <Doughnut data={statusDoughnutData} options={doughnutOptions} />
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Revenue Trend + Top Devices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Trend Line */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-4">Revenue Trend</h3>
          {loading ? <Skeleton h="h-52" /> : monthlyBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 py-16 text-center">No data yet</p>
          ) : (
            <div className="h-52">
              <Line data={revenueLineData} options={lineOptions} />
            </div>
          )}
        </div>

        {/* Top Devices Horizontal Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Top Devices</h3>
            <Link to="/supplier/devices" className="text-xs font-semibold text-primary">View all</Link>
          </div>
          {loading ? <Skeleton h="h-52" /> : topDevices.length === 0 ? (
            <p className="text-sm text-slate-400 py-16 text-center">No data yet</p>
          ) : (
            <div className="h-52">
              <Bar data={topDeviceBarData} options={horizontalBarOptions} />
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Recent Requests + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Requests */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900">Recent Orders</h3>
            <Link to="/supplier/rental-requests" className="text-xs font-semibold text-primary">View all</Link>
          </div>
          {loading ? <Skeleton rows={4} /> : recentRequests.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No orders yet</p>
          ) : (
            <div className="space-y-2">
              {recentRequests.map((req) => (
                <div key={req._id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-2.5 hover:bg-slate-50 transition-all">
                  <p className="text-sm font-semibold text-slate-800 truncate min-w-0">
                    #{req._id?.slice(-6)} · {req.customerId?.fullName || "Customer"}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold border ${
                      req.status === "PENDING" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-green-50 text-green-700 border-green-200"
                    }`}>
                      {req.status === "PENDING" ? <FiClock size={10} /> : <FiCheckCircle size={10} />}
                      {STATUS_LABELS[req.status] || req.status}
                    </span>
                    <span className="text-sm font-bold text-primary whitespace-nowrap">{formatVND(req.totalAmount)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-slate-900">Recent Transactions</h3>
            <Link to="/supplier/revenue" className="text-xs font-semibold text-primary">Details</Link>
          </div>
          {loading ? <Skeleton rows={4} /> : transactions.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No transactions yet</p>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-slate-100 px-3.5 py-2.5 hover:bg-slate-50 transition-all">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{item.description}</p>
                    <p className="text-[11px] text-slate-400">{item.createdAt}</p>
                  </div>
                  <span className={`text-sm font-bold shrink-0 ${item.amount >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {item.amount >= 0 ? "+" : "−"}{formatShortVND(Math.abs(item.amount))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Constants & chart options ───────────────────────────────────────────── */

const STATUS_LABELS = {
  PENDING: "Pending",
  DELIVERING: "Delivering",
  RENTING: "Renting",
  RETURNING: "Returning",
  INSPECTING: "Inspecting",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const CHART_FONT = { family: "'Inter', sans-serif", size: 11 };

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top", align: "end", labels: { font: CHART_FONT, boxWidth: 12, padding: 12 } },
    tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${(c.raw || 0).toLocaleString("vi-VN")}₫` } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: CHART_FONT } },
    y: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: CHART_FONT, callback: (v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M₫` : v.toLocaleString("vi-VN") + "₫" } },
  },
};

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: "index" },
  plugins: {
    legend: { position: "top", align: "end", labels: { font: CHART_FONT, boxWidth: 12, padding: 12 } },
    tooltip: { callbacks: { label: (c) => c.datasetIndex === 0 ? `${c.dataset.label}: ${(c.raw || 0).toLocaleString("vi-VN")}₫` : `${c.dataset.label}: ${c.raw}` } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: CHART_FONT } },
    y: { position: "left", grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: CHART_FONT, callback: (v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M₫` : v.toLocaleString("vi-VN") + "₫" } },
    y1: { position: "right", grid: { display: false }, ticks: { font: CHART_FONT, stepSize: 1 } },
  },
};

const horizontalBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: "y",
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (c) => `${(c.raw || 0).toLocaleString("vi-VN")}₫` } },
  },
  scales: {
    x: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: CHART_FONT, callback: (v) => v >= 1e6 ? `${(v / 1e6).toFixed(1)}M₫` : v.toLocaleString("vi-VN") + "₫" } },
    y: { grid: { display: false }, ticks: { font: { ...CHART_FONT, size: 10 } } },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "65%",
  plugins: {
    legend: { position: "right", labels: { font: CHART_FONT, boxWidth: 10, padding: 8 } },
  },
};

/* ─── Sub-components ──────────────────────────────────────────────────────── */

const COLOR_MAP = {
  primary: { bg: "bg-primary/10", border: "border-primary/20", text: "text-primary", icon: "bg-primary/20 text-primary" },
  green: { bg: "bg-green-50", border: "border-green-200/30", text: "text-green-600", icon: "bg-green-100 text-green-600" },
  amber: { bg: "bg-amber-50", border: "border-amber-200/30", text: "text-amber-600", icon: "bg-amber-100 text-amber-600" },
  blue: { bg: "bg-blue-50", border: "border-blue-200/30", text: "text-blue-600", icon: "bg-blue-100 text-blue-600" },
  yellow: { bg: "bg-yellow-50", border: "border-yellow-200/30", text: "text-yellow-600", icon: "bg-yellow-100 text-yellow-600" },
};

function KpiCard({ icon: Icon, label, value, sub, color }) {
  const c = COLOR_MAP[color];
  return (
    <div className={`${c.bg} rounded-2xl border ${c.border} p-4 shadow-sm`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${c.icon} flex items-center justify-center`}>
          <Icon size={16} />
        </div>
      </div>
      <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
      {sub && <p className={`text-[11px] ${c.text} opacity-70 mt-1`}>{sub}</p>}
    </div>
  );
}

function Skeleton({ rows, h = "h-12" }) {
  if (rows) {
    return (
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-11 rounded-xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }
  return <div className={`${h} rounded-xl bg-slate-100 animate-pulse`} />;
}
