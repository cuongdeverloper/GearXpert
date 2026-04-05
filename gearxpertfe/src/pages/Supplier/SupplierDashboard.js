import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiClipboard,
  FiBox,
  FiUsers,
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
import { getSupplierDevices } from "../../service/ApiService/DeviceApi";
import { getMyFollowerAnalytics } from "../../service/ApiService/SupplierApi";

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
  cashFlow: { DAY: [], MONTH: [], YEAR: [] },
  monthlyBreakdown: [],
  topDevices: [],
  transactions: [],
  rentalStatusCounts: {},
  categoryBreakdown: [],
};

const EMPTY_FOLLOWER_STATS = {
  totalFollowers: 0,
  newLast30Days: 0,
  monthlyNewFollows: [],
};

/** Số tiền đầy đủ (không viết tắt tr/M) */
const formatVnd = (value) =>
  `${Number(value ?? 0).toLocaleString("vi-VN")} đ`;

/** So sánh % cur so với prev; null nếu không tính được */
function pctVersusPrevious(prev, cur) {
  const p = Number(prev);
  const c = Number(cur);
  if (Number.isNaN(p) || Number.isNaN(c)) return null;
  if (Math.abs(p) < 1e-9 && Math.abs(c) < 1e-9) return null;
  if (Math.abs(p) < 1e-9) return { pct: c > 0 ? 100 : 0, up: c >= 0 };
  const raw = ((c - p) / Math.abs(p)) * 100;
  const capped = Math.max(-999, Math.min(999, raw));
  return { pct: Math.round(capped * 100) / 100, up: raw >= 0 };
}

export default function SupplierDashboard() {
  const user = useSelector((state) => state.user.account);
  const [loading, setLoading] = useState(true);
  const [revenue, setRevenue] = useState(EMPTY_REVENUE);
  const [deviceTotals, setDeviceTotals] = useState({ total: 0, available: 0 });
  const [followerStats, setFollowerStats] = useState(EMPTY_FOLLOWER_STATS);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user?.id) return;
      setLoading(true);
      try {
        const [revenueRes, totalRes, availableRes, followerRes] = await Promise.all([
          getSupplierRevenue(user.id),
          getSupplierDevices(user.id, { limit: 1, page: 1 }),
          getSupplierDevices(user.id, { limit: 1, page: 1, status: "AVAILABLE" }),
          getMyFollowerAnalytics().catch(() => null),
        ]);

        setRevenue(revenueRes || EMPTY_REVENUE);
        setDeviceTotals({
          total: totalRes?.total || 0,
          available: availableRes?.total || 0,
        });
        if (followerRes?.success && followerRes?.data) {
          setFollowerStats({
            totalFollowers: followerRes.data.totalFollowers ?? 0,
            newLast30Days: followerRes.data.newLast30Days ?? 0,
            monthlyNewFollows: followerRes.data.monthlyNewFollows ?? [],
          });
        } else {
          setFollowerStats(EMPTY_FOLLOWER_STATS);
        }
      } catch (error) {
        console.error("Error loading supplier dashboard:", error);
        setRevenue(EMPTY_REVENUE);
        setDeviceTotals({ total: 0, available: 0 });
        setFollowerStats(EMPTY_FOLLOWER_STATS);
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
  const rentalStatusCounts = revenue?.rentalStatusCounts || {};
  const categoryBreakdown = revenue?.categoryBreakdown || [];

  const [cashFlowRange, setCashFlowRange] = useState("MONTH");

  const pendingCount = rentalStatusCounts.PENDING || 0;
  const approvedCount = rentalStatusCounts.APPROVED || 0;

  const revenuePeriodTrend = useMemo(() => {
    const m = monthlyBreakdown;
    if (!m?.length || m.length < 2) return null;
    const a = m[m.length - 2];
    const b = m[m.length - 1];
    return pctVersusPrevious(a.revenue, b.revenue);
  }, [monthlyBreakdown]);

  const totalOrdersCount = useMemo(
    () =>
      Object.values(rentalStatusCounts).reduce(
        (acc, n) => acc + (typeof n === "number" ? n : 0),
        0
      ),
    [rentalStatusCounts]
  );

  const dashboardDateLabel = useMemo(
    () =>
      new Date().toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    []
  );

  const stockAvailablePct = useMemo(() => {
    const t = deviceTotals.total || 0;
    if (t <= 0) return null;
    return Math.round(((deviceTotals.available || 0) / t) * 100);
  }, [deviceTotals]);

  // ── Dữ liệu biểu đồ ──
  const cashFlowData = useMemo(() => {
    const data = cashFlow[cashFlowRange] || [];
    return {
      labels: data.map((d) => d.label),
      datasets: [
        {
          label: "Thu vào",
          data: data.map((d) => d.in),
          backgroundColor: "rgba(124, 58, 237, 0.92)",
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 36,
        },
        {
          label: "Hoàn / chi",
          data: data.map((d) => d.out),
          backgroundColor: "rgba(203, 213, 225, 0.9)",
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 36,
        },
      ],
    };
  }, [cashFlow, cashFlowRange]);

  const revenueLineData = useMemo(() => ({
    labels: monthlyBreakdown.map((m) => m.label),
    datasets: [
      {
        label: "Doanh thu",
        data: monthlyBreakdown.map((m) => m.revenue),
        borderColor: "rgb(124, 58, 237)",
        backgroundColor: "rgba(124, 58, 237, 0.12)",
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: "rgb(124, 58, 237)",
      },
      {
        label: "Số đơn thuê",
        data: monthlyBreakdown.map((m) => m.rentals),
        borderColor: "rgb(99, 102, 241)",
        backgroundColor: "rgba(99, 102, 241, 0.06)",
        fill: false,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: "rgb(99, 102, 241)",
        yAxisID: "y1",
      },
    ],
  }), [monthlyBreakdown]);

  const topDeviceBarData = useMemo(() => ({
    labels: topDevices.map((d) => d.name?.length > 18 ? d.name.slice(0, 18) + "…" : d.name),
    datasets: [
      {
        label: "Doanh thu",
        data: topDevices.map((d) => d.revenue),
        backgroundColor: [
          "rgba(124, 58, 237, 0.9)",
          "rgba(139, 92, 246, 0.85)",
          "rgba(99, 102, 241, 0.85)",
          "rgba(167, 139, 250, 0.85)",
        ],
        borderRadius: 8,
        barPercentage: 0.65,
      },
    ],
  }), [topDevices]);

  const statusDoughnutData = useMemo(() => {
    const STATUS_COLORS = {
      PENDING: "#f59e0b",
      APPROVED: "#22c55e",
      DELIVERING: "#6366f1",
      DELIVERY_ISSUE: "#f97316",
      RENTING: "#3b82f6",
      RETURNING: "#a855f7",
      INSPECTING: "#64748b",
      PENDING_RESOLUTION: "#fb7185",
      PENDING_SUPPLIER_RESOLUTION: "#e11d48",
      COMPLETED: "#10b981",
      REJECTED: "#ef4444",
      CANCELLED: "#dc2626",
    };
    const labels = Object.keys(rentalStatusCounts);
    return {
      labels: labels.map((s) => STATUS_LABELS[s] || s),
      datasets: [{
        data: labels.map((s) => rentalStatusCounts[s]),
        backgroundColor: labels.map((s) => STATUS_COLORS[s] || "#94a3b8"),
        borderWidth: 0,
        hoverOffset: 6,
      }],
    };
  }, [rentalStatusCounts]);

  const categoryBarData = useMemo(() => {
    const labels = categoryBreakdown.map(
      (c) => CATEGORY_VI[c.category] || c.category
    );
    return {
      labels,
      datasets: [
        {
          label: "Số thiết bị",
          data: categoryBreakdown.map((c) => c.count),
          backgroundColor: categoryBreakdown.map(
            (_, i) => CATEGORY_BAR_COLORS[i % CATEGORY_BAR_COLORS.length]
          ),
          borderRadius: 6,
          barPercentage: 0.65,
        },
      ],
    };
  }, [categoryBreakdown]);

  const recentTxChartSlice = useMemo(
    () => [...transactions].slice(0, 5).reverse(),
    [transactions]
  );

  const recentTxBarData = useMemo(
    () => ({
      labels: recentTxChartSlice.map((t) => `#${String(t.id).slice(-6)}`),
      datasets: [
        {
          label: "Số tiền",
          data: recentTxChartSlice.map((t) => t.amount),
          backgroundColor: recentTxChartSlice.map((t) =>
            t.amount >= 0 ? "rgba(16, 185, 129, 0.78)" : "rgba(239, 68, 68, 0.78)"
          ),
          borderRadius: 6,
          barPercentage: 0.55,
        },
      ],
    }),
    [recentTxChartSlice]
  );

  const txBarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => {
              const i = items[0]?.dataIndex;
              return i != null ? recentTxChartSlice[i]?.description || "" : "";
            },
            label: (item) => {
              const i = item.dataIndex;
              const v = recentTxChartSlice[i]?.amount ?? item.raw ?? 0;
              const sign = v >= 0 ? "+" : "−";
              return ` ${sign}${Math.abs(v).toLocaleString("vi-VN")} đ`;
            },
            afterLabel: (item) => {
              const i = item.dataIndex;
              return recentTxChartSlice[i]?.createdAt || "";
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: CHART_FONT } },
        y: {
          grid: { color: "rgba(0,0,0,0.04)" },
          ticks: {
            font: CHART_FONT,
            callback: (v) => `${Number(v).toLocaleString("vi-VN")} đ`,
          },
        },
      },
    }),
    [recentTxChartSlice]
  );

  const followerBarData = useMemo(
    () => ({
      labels: (followerStats.monthlyNewFollows || []).map((m) => m.label),
      datasets: [
        {
          label: "Theo dõi mới",
          data: (followerStats.monthlyNewFollows || []).map((m) => m.newFollows),
          backgroundColor: "rgba(139, 92, 246, 0.88)",
          borderRadius: 6,
          maxBarThickness: 22,
          barPercentage: 0.55,
        },
      ],
    }),
    [followerStats]
  );

  const maxCategoryCount =
    categoryBreakdown.length > 0 ? categoryBreakdown[0].count : 1;

  return (
    <div className="space-y-6 rounded-2xl border border-violet-100/70 bg-gradient-to-br from-[#f3f0ff] via-violet-50/70 to-white px-4 py-5 sm:px-6 sm:py-7 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] -m-1 sm:-m-2">
      {/* Tiêu đề kiểu dashboard hiện đại */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
            Tổng quan hiệu suất
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Tóm tắt dữ liệu — <span className="text-slate-700">{dashboardDateLabel}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/supplier/rental-requests"
            className="px-4 py-2.5 rounded-xl border border-violet-200/80 bg-white/90 text-sm font-semibold text-slate-700 shadow-sm shadow-violet-200/20 hover:bg-white transition-all"
          >
            Yêu cầu thuê
          </Link>
          <Link
            to="/supplier/devices"
            className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold shadow-lg shadow-violet-500/30 hover:bg-violet-700 transition-all"
          >
            Quản lý thiết bị
          </Link>
        </div>
      </div>

      {/* KPI — thẻ trắng, có % xu hướng */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-violet-200/60 bg-white p-6 shadow-[0_12px_40px_-12px_rgba(124,58,237,0.28)] ring-1 ring-violet-100/80">
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Doanh thu tháng này
            </p>
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <FiDollarSign size={20} className="text-violet-600" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight break-words">
            {formatVnd(summary.monthlyRevenue)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <KpiTrend trend={revenuePeriodTrend} />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Kỳ cuối trên biểu đồ 6 tháng:{" "}
            <span className="font-medium text-slate-600">
              {(monthlyBreakdown[monthlyBreakdown.length - 1]?.rentals ?? 0).toLocaleString("vi-VN")} đơn
            </span>{" "}
            đã thanh toán
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_10px_35px_-12px_rgba(15,23,42,0.12)]">
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Tổng doanh thu lũy kế
            </p>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <FiTrendingUp size={20} className="text-emerald-600" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight break-words">
            {formatVnd(summary.totalRevenue)}
          </p>
          <p className="text-xs text-slate-400 mt-3">Đã thanh toán, trừ hoàn tiền</p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_10px_35px_-12px_rgba(15,23,42,0.12)]">
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Chờ & đã duyệt
            </p>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <FiClipboard size={20} className="text-amber-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{pendingCount}</p>
          <p className="text-xs text-slate-500 mt-3">
            <span className="font-semibold text-emerald-600">{approvedCount}</span> đơn đã phê duyệt
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-[0_10px_35px_-12px_rgba(15,23,42,0.12)]">
          <div className="flex items-start justify-between gap-2 mb-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Thiết bị trong kho
            </p>
            <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
              <FiBox size={20} className="text-sky-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-slate-900">{deviceTotals.total}</p>
          <p className="text-xs text-slate-500 mt-3">
            {deviceTotals.available} sẵn sàng
            {stockAvailablePct != null && (
              <span className="text-slate-400"> · {stockAvailablePct}% khả dụng</span>
            )}
          </p>
        </div>
      </div>

      {/* Khách theo dõi cửa hàng — khối gọn */}
      <div className="rounded-xl border border-white/80 bg-white/95 p-3 sm:p-4 shadow-[0_8px_28px_-12px_rgba(124,58,237,0.16)] backdrop-blur-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 mb-2">
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
              <FiUsers className="text-violet-600" size={17} />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 leading-tight">Khách theo dõi cửa hàng</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-snug">
                Lượt <strong className="font-medium text-slate-600">Theo dõi</strong> trên gian hàng công khai; khách
                xem danh sách tại <span className="text-slate-600">Gian hàng đã theo dõi</span>.
              </p>
              {user?.id && (
                <Link
                  to={`/supplier/${user.id}`}
                  className="inline-block mt-1 text-[11px] font-semibold text-violet-600 hover:text-violet-800"
                >
                  Trang gian hàng →
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-5 shrink-0 sm:justify-end">
            <div className="text-right sm:text-right">
              <p className="text-lg sm:text-xl font-bold text-slate-900 leading-none tabular-nums">
                {(followerStats.totalFollowers ?? 0).toLocaleString("vi-VN")}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">Tổng follower</p>
            </div>
            <div className="text-right sm:text-right">
              <p className="text-lg sm:text-xl font-bold text-violet-700 leading-none tabular-nums">
                {(followerStats.newLast30Days ?? 0).toLocaleString("vi-VN")}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">30 ngày gần nhất</p>
            </div>
          </div>
        </div>
        {loading ? (
          <Skeleton h="h-28" />
        ) : (
          <div className="h-28 sm:h-32">
            <Bar data={followerBarData} options={followerBarOptions} />
          </div>
        )}
      </div>

      {/* Hàng chính: biểu đồ lớn + cột phụ (giống layout SalesHub) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-5">
        <div className="lg:col-span-2 rounded-2xl border border-white/80 bg-white/95 p-5 sm:p-6 shadow-[0_14px_45px_-16px_rgba(124,58,237,0.22)] backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Hoạt động thu chi</h3>
              <p className="text-xs text-slate-500 mt-0.5">Thu vào và hoàn tiền theo kỳ</p>
            </div>
            <div className="flex gap-1 self-start rounded-xl bg-slate-100/90 p-1">
              {["DAY", "MONTH", "YEAR"].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setCashFlowRange(r)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    cashFlowRange === r
                      ? "bg-white text-violet-700 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {r === "DAY" ? "7 ngày" : r === "MONTH" ? "6 tháng" : "3 năm"}
                </button>
              ))}
            </div>
          </div>
          {loading ? (
            <Skeleton h="h-72" />
          ) : (
            <div className="h-64 sm:h-72">
              <Bar data={cashFlowData} options={barOptions} />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-[0_12px_40px_-14px_rgba(15,23,42,0.15)] backdrop-blur-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Trạng thái đơn</h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">
                Tất cả
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-3">Phân bổ theo trạng thái</p>
            {loading ? (
              <Skeleton h="h-52" />
            ) : Object.keys(rentalStatusCounts).length === 0 ? (
              <p className="text-sm text-slate-400 py-12 text-center">Chưa có dữ liệu</p>
            ) : (
              <div className="relative mx-auto h-52 max-w-[260px]">
                <Doughnut data={statusDoughnutData} options={doughnutOptions} />
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center pr-14 sm:pr-16">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-slate-900 leading-none">
                      {totalOrdersCount.toLocaleString("vi-VN")}
                    </p>
                    <p className="text-[10px] font-medium text-slate-500 mt-1">đơn hàng</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-white/80 bg-white/95 p-4 shadow-[0_12px_40px_-14px_rgba(15,23,42,0.12)] backdrop-blur-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
              Danh mục nổi bật
            </p>
            {loading || categoryBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                {loading ? "…" : "Chưa có dữ liệu"}
              </p>
            ) : (
              <ul className="space-y-3">
                {categoryBreakdown.slice(0, 4).map((c) => (
                  <li key={c.category}>
                    <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                      <span>{CATEGORY_VI[c.category] || c.category}</span>
                      <span className="text-slate-500">{c.count} máy</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400 transition-all"
                        style={{
                          width: `${Math.max(8, (c.count / maxCategoryCount) * 100)}%`,
                        }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Danh mục kho + giao dịch (biểu đồ) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-[0_10px_35px_-12px_rgba(15,23,42,0.1)] backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Thiết bị theo danh mục</h3>
            <Link to="/supplier/devices" className="text-xs font-semibold text-primary">
              Quản lý kho
            </Link>
          </div>
          {loading ? (
            <Skeleton h="h-52" />
          ) : categoryBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 py-16 text-center">Chưa có thiết bị</p>
          ) : (
            <div className="h-52">
              <Bar data={categoryBarData} options={categoryBarOptions} />
            </div>
          )}
        </div>
        <div className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-[0_10px_35px_-12px_rgba(15,23,42,0.1)] backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Giao dịch gần đây</h3>
            <Link to="/supplier/revenue" className="text-xs font-semibold text-primary">
              Xem phân tích
            </Link>
          </div>
          {loading ? (
            <Skeleton h="h-52" />
          ) : transactions.length === 0 ? (
            <p className="text-sm text-slate-400 py-16 text-center">Chưa có giao dịch</p>
          ) : (
            <div className="h-52">
              <Bar data={recentTxBarData} options={txBarOptions} />
            </div>
          )}
        </div>
      </div>

      {/* Xu hướng doanh thu + biểu đồ thiết bị */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-[0_10px_35px_-12px_rgba(15,23,42,0.1)] backdrop-blur-sm">
          <h3 className="font-bold text-slate-900 mb-4">Xu hướng doanh thu</h3>
          {loading ? <Skeleton h="h-52" /> : monthlyBreakdown.length === 0 ? (
            <p className="text-sm text-slate-400 py-16 text-center">Chưa có dữ liệu</p>
          ) : (
            <div className="h-52">
              <Line data={revenueLineData} options={lineOptions} />
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/95 p-5 shadow-[0_10px_35px_-12px_rgba(15,23,42,0.1)] backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900">Thiết bị theo doanh thu</h3>
            <Link to="/supplier/devices" className="text-xs font-semibold text-primary">Xem tất cả</Link>
          </div>
          {loading ? <Skeleton h="h-52" /> : topDevices.length === 0 ? (
            <p className="text-sm text-slate-400 py-16 text-center">Chưa có dữ liệu</p>
          ) : (
            <div className="h-52">
              <Bar data={topDeviceBarData} options={horizontalBarOptions} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Hằng số & tùy chọn biểu đồ ─────────────────────────────────────────── */

const STATUS_LABELS = {
  PENDING: "Chờ xử lý",
  APPROVED: "Đã duyệt",
  DELIVERING: "Đang giao",
  DELIVERY_ISSUE: "Sự cố giao hàng",
  RENTING: "Đang thuê",
  RETURNING: "Đang trả",
  INSPECTING: "Đang kiểm tra",
  PENDING_RESOLUTION: "Chờ xử lý sự cố",
  PENDING_SUPPLIER_RESOLUTION: "Chờ quyết định NCC",
  COMPLETED: "Hoàn tất",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
};

const CATEGORY_VI = {
  CAMERA: "Máy ảnh",
  LIGHTING: "Ánh sáng",
  AUDIO: "Âm thanh",
  OFFICE: "Văn phòng",
  GAMING: "Trò chơi",
  ACCESSORY: "Phụ kiện",
  DRONE: "Flycam",
  OTHER: "Khác",
};

const CATEGORY_BAR_COLORS = [
  "rgba(79, 70, 229, 0.85)",
  "rgba(16, 185, 129, 0.85)",
  "rgba(245, 158, 11, 0.85)",
  "rgba(59, 130, 246, 0.85)",
  "rgba(236, 72, 153, 0.85)",
  "rgba(139, 92, 246, 0.85)",
  "rgba(20, 184, 166, 0.85)",
  "rgba(100, 116, 139, 0.85)",
];

const CHART_FONT = { family: "'Inter', sans-serif", size: 11 };

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top", align: "end", labels: { font: CHART_FONT, boxWidth: 12, padding: 12 } },
    tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${(c.raw || 0).toLocaleString("vi-VN")} đ` } },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: CHART_FONT } },
    y: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: CHART_FONT, callback: (v) => `${Number(v).toLocaleString("vi-VN")} đ` } },
  },
};

const lineOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { intersect: false, mode: "index" },
  plugins: {
    legend: { position: "top", align: "end", labels: { font: CHART_FONT, boxWidth: 12, padding: 12 } },
    tooltip: {
      callbacks: {
        label: (c) =>
          c.datasetIndex === 0
            ? `${c.dataset.label}: ${(c.raw || 0).toLocaleString("vi-VN")} đ`
            : `${c.dataset.label}: ${c.raw}`,
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: CHART_FONT } },
    y: { position: "left", grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: CHART_FONT, callback: (v) => `${Number(v).toLocaleString("vi-VN")} đ` } },
    y1: { position: "right", grid: { display: false }, ticks: { font: CHART_FONT, stepSize: 1 } },
  },
};

const horizontalBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: "y",
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: (c) => `${(c.raw || 0).toLocaleString("vi-VN")} đ` } },
  },
  scales: {
    x: { grid: { color: "rgba(0,0,0,0.04)" }, ticks: { font: CHART_FONT, callback: (v) => `${Number(v).toLocaleString("vi-VN")} đ` } },
    y: { grid: { display: false }, ticks: { font: { ...CHART_FONT, size: 10 } } },
  },
};

const categoryBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: "top", align: "end", labels: { font: CHART_FONT, boxWidth: 12, padding: 12 } },
    tooltip: {
      callbacks: {
        label: (c) => `${c.dataset.label}: ${c.raw}`,
      },
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: CHART_FONT } },
    y: {
      beginAtZero: true,
      ticks: { stepSize: 1, font: CHART_FONT },
      grid: { color: "rgba(0,0,0,0.04)" },
    },
  },
};

const followerBarOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      bodyFont: { size: 11 },
      titleFont: { size: 11 },
      callbacks: {
        label: (c) => `${c.dataset.label}: ${c.raw} người`,
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { font: { family: "'Inter', sans-serif", size: 9 }, maxRotation: 0 },
    },
    y: {
      beginAtZero: true,
      ticks: {
        stepSize: 1,
        font: { family: "'Inter', sans-serif", size: 9 },
        precision: 0,
      },
      grid: { color: "rgba(0,0,0,0.04)" },
    },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "68%",
  plugins: {
    legend: {
      position: "right",
      labels: { font: CHART_FONT, boxWidth: 8, padding: 6 },
    },
  },
};

/* ─── Thành phần phụ ───────────────────────────────────────────────────── */

function KpiTrend({ trend }) {
  if (!trend) {
    return (
      <span className="text-xs text-slate-400">Chưa đủ 2 kỳ trên biểu đồ để so sánh</span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        trend.up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
      }`}
    >
      {trend.up ? <FiTrendingUp size={13} className="shrink-0" /> : <FiTrendingDown size={13} className="shrink-0" />}
      {trend.up ? "+" : "−"}
      {Math.abs(trend.pct)}%
      <span className="font-normal text-slate-500">vs kỳ trước</span>
    </span>
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


