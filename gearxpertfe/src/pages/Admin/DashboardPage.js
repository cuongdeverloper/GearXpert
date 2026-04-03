import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import { FiTrendingUp, FiUsers, FiBox, FiDollarSign } from "react-icons/fi";
import { Bar, Doughnut, Line } from "react-chartjs-2";
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
import {
  getAdminDashboard,
  getAdminDashboardCharts,
} from "../../service/ApiService/AdminDashboardApi";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler
);

const fmtMoney = (n) => `${Number(n || 0).toLocaleString("vi-VN")} đ`;

const RENTAL_STATUS_VI = {
  PENDING: "Chờ xử lý",
  PAID: "Đã thanh toán",
  APPROVED: "Đã duyệt",
  DELIVERING: "Đang giao",
  RENTING: "Đang thuê",
  RETURNING: "Hoàn trả",
  INSPECTING: "Kiểm tra",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  PENDING_RESOLUTION: "Chờ xử lý khiếu nại",
  REFUNDED: "Hoàn tiền",
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

const KPI_LABEL_VI = {
  "Total Users": "Người dùng",
  "Active Rentals": "Đơn thuê hoạt động",
  "Total Devices": "Thiết bị",
  "Monthly Revenue": "Doanh thu tháng",
};

const STATUS_COLORS = [
  "#6366f1",
  "#22c55e",
  "#f59e0b",
  "#3b82f6",
  "#ec4899",
  "#8b5cf6",
  "#14b8a6",
  "#64748b",
  "#ef4444",
  "#84cc16",
];

const CHART_TOOLTIP = {
  backgroundColor: "rgba(15, 23, 42, 0.92)",
  titleFont: { size: 12 },
  bodyFont: { size: 12 },
  padding: 10,
  cornerRadius: 8,
};

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const [stats, setStats] = useState([]);
  const [topDevices, setTopDevices] = useState([]);
  const [revenueSeries, setRevenueSeries] = useState([]);
  const [statusBreakdown, setStatusBreakdown] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);

  const withTimeout = (promise, ms, label) =>
    new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`${label} timeout after ${ms}ms`));
      }, ms);
      promise
        .then((res) => {
          clearTimeout(timer);
          resolve(res);
        })
        .catch((err) => {
          clearTimeout(timer);
          reject(err);
        });
    });

  useEffect(() => {
    const fetchDashboard = async () => {
      dispatch(showAdminLoading());
      try {
        const [dashboardRes, chartsRes] = await Promise.allSettled([
          withTimeout(getAdminDashboard(), 12000, "admin dashboard"),
          withTimeout(getAdminDashboardCharts(), 12000, "admin charts"),
        ]);

        if (dashboardRes.status === "fulfilled") {
          setStats(dashboardRes.value?.stats || []);
          setTopDevices(dashboardRes.value?.topDevices || []);
        } else {
          console.error("Failed to load admin dashboard:", dashboardRes.reason);
        }

        if (chartsRes.status === "fulfilled") {
          setRevenueSeries(chartsRes.value?.revenueSeries || []);
          setStatusBreakdown(chartsRes.value?.statusBreakdown || []);
          setCategoryBreakdown(chartsRes.value?.categoryBreakdown || []);
        } else {
          console.error("Failed to load admin charts:", chartsRes.reason);
        }
      } catch (error) {
        console.error("Failed to load admin dashboard:", error);
      } finally {
        dispatch(hideAdminLoading());
      }
    };

    fetchDashboard();
  }, [dispatch]);

  const revenueBarData = useMemo(
    () => ({
      labels: revenueSeries.map((item) => item.label),
      datasets: [
        {
          label: "Doanh thu",
          data: revenueSeries.map((item) => item.total),
          backgroundColor: "rgba(99, 102, 241, 0.85)",
          borderRadius: 6,
          barThickness: 26,
        },
      ],
    }),
    [revenueSeries]
  );

  const revenueLineData = useMemo(
    () => ({
      labels: revenueSeries.map((item) => item.label),
      datasets: [
        {
          label: "Xu hướng",
          data: revenueSeries.map((item) => item.total),
          borderColor: "#6366f1",
          backgroundColor: "rgba(99, 102, 241, 0.12)",
          borderWidth: 2,
          fill: true,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
        },
      ],
    }),
    [revenueSeries]
  );

  const statusDoughnutData = useMemo(() => {
    const labels = statusBreakdown.map(
      (s) => RENTAL_STATUS_VI[s.status] || s.status || "Khác"
    );
    return {
      labels,
      datasets: [
        {
          data: statusBreakdown.map((s) => s.count),
          backgroundColor: statusBreakdown.map(
            (_, i) => STATUS_COLORS[i % STATUS_COLORS.length]
          ),
          borderWidth: 0,
        },
      ],
    };
  }, [statusBreakdown]);

  const topDevicesHorizontalData = useMemo(() => {
    const labels = topDevices.map((d) => {
      const n = d.name || "—";
      return n.length > 28 ? `${n.slice(0, 28)}…` : n;
    });
    return {
      labels,
      datasets: [
        {
          label: "Lượt cho thuê (gộp số lượng)",
          data: topDevices.map((d) => d.totalRentals ?? 0),
          backgroundColor: "rgba(14, 165, 233, 0.85)",
          borderRadius: 4,
          barThickness: 18,
        },
      ],
    };
  }, [topDevices]);

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
            (_, i) => STATUS_COLORS[(i + 3) % STATUS_COLORS.length]
          ),
          borderRadius: 6,
          barThickness: 22,
        },
      ],
    };
  }, [categoryBreakdown]);

  const moneyAxisCallback = (v) => fmtMoney(v);

  const baseOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: "bottom",
          labels: { boxWidth: 10, usePointStyle: true },
        },
        tooltip: {
          ...CHART_TOOLTIP,
          callbacks: {
            label: (ctx) => {
              const value = ctx.raw;
              if (ctx.dataset.label === "Doanh thu" || ctx.dataset.label === "Xu hướng") {
                return ` ${fmtMoney(value)}`;
              }
              if (ctx.dataset.label === "Lượt cho thuê (gộp số lượng)") {
                return ` ${value} lượt`;
              }
              if (ctx.dataset.label === "Số thiết bị") {
                return ` ${value} thiết bị`;
              }
              return ` ${value}`;
            },
          },
        },
      },
    }),
    []
  );

  const revenueBarOptions = useMemo(
    () => ({
      ...baseOptions,
      scales: {
        x: { grid: { display: false } },
        y: {
          ticks: { callback: moneyAxisCallback },
          grid: { color: "rgba(148, 163, 184, 0.2)" },
        },
      },
    }),
    [baseOptions]
  );

  const revenueLineOptions = useMemo(
    () => ({
      ...baseOptions,
      scales: {
        x: { grid: { display: false } },
        y: {
          ticks: { callback: moneyAxisCallback },
          grid: { color: "rgba(148, 163, 184, 0.2)" },
        },
      },
    }),
    [baseOptions]
  );

  const doughnutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: { boxWidth: 10, usePointStyle: true, font: { size: 11 } },
        },
        tooltip: {
          ...CHART_TOOLTIP,
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = total ? Math.round((ctx.raw / total) * 100) : 0;
              return ` ${ctx.raw} đơn (${pct}%)`;
            },
          },
        },
      },
    }),
    []
  );

  const horizontalBarOptions = useMemo(
    () => ({
      ...baseOptions,
      indexAxis: "y",
      scales: {
        x: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          grid: { color: "rgba(148, 163, 184, 0.2)" },
        },
        y: { grid: { display: false } },
      },
    }),
    [baseOptions]
  );

  const categoryBarOptions = useMemo(
    () => ({
      ...baseOptions,
      scales: {
        x: { grid: { display: false } },
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1 },
          grid: { color: "rgba(148, 163, 184, 0.2)" },
        },
      },
    }),
    [baseOptions]
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Tổng quan</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Biểu đồ theo dữ liệu thực từ hệ thống
        </p>
      </div>

      {/* KPI — gọn */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm"
          >
            <div className={`mb-2 inline-flex rounded-lg p-2 ${stat.color}`}>
              {stat.icon === "users" && <FiUsers size={20} />}
              {stat.icon === "box" && <FiBox size={20} />}
              {stat.icon === "package" && <FiTrendingUp size={20} />}
              {stat.icon === "dollar" && <FiDollarSign size={20} />}
            </div>
            <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
              {KPI_LABEL_VI[stat.label] || stat.label}
            </p>
            <p className="text-xl font-bold text-slate-900">{stat.value}</p>
            <p className="text-[10px] font-semibold text-emerald-600 mt-0.5">
              {stat.change} so với kỳ trước
            </p>
          </div>
        ))}
      </div>

      {/* Doanh thu: cột + đường */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold text-slate-900">
            Doanh thu theo tháng (đã thanh toán)
          </h3>
          <p className="text-xs text-slate-500 mb-4">6 tháng gần nhất</p>
          <div className="relative h-[260px]">
            <Bar data={revenueBarData} options={revenueBarOptions} />
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-1 text-base font-semibold text-slate-900">
            Xu hướng doanh thu
          </h3>
          <p className="text-xs text-slate-500 mb-4">Cùng khoảng thời gian</p>
          <div className="relative h-[260px]">
            <Line data={revenueLineData} options={revenueLineOptions} />
          </div>
        </div>
      </div>

      {/* Trạng thái đơn + Top thiết bị */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-1">
          <h3 className="mb-1 text-base font-semibold text-slate-900">
            Trạng thái đơn thuê
          </h3>
          <p className="text-xs text-slate-500 mb-4">Tổng hợp toàn hệ thống</p>
          <div className="relative mx-auto h-[260px] max-w-[280px]">
            {statusBreakdown.length > 0 ? (
              <Doughnut data={statusDoughnutData} options={doughnutOptions} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
          <h3 className="mb-1 text-base font-semibold text-slate-900">
            Thiết bị được thuê nhiều nhất
          </h3>
          <p className="text-xs text-slate-500 mb-4">Theo tổng quantity trên RentalItem</p>
          <div className="relative h-[280px]">
            {topDevices.length > 0 ? (
              <Bar data={topDevicesHorizontalData} options={horizontalBarOptions} />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">
                Chưa có dữ liệu
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danh mục thiết bị */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 text-base font-semibold text-slate-900">
          Thiết bị theo danh mục
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Số lượng listing (không tính add-on)
        </p>
        <div className="relative h-[280px] max-w-3xl">
          {categoryBreakdown.length > 0 ? (
            <Bar data={categoryBarData} options={categoryBarOptions} />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Chưa có dữ liệu
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
