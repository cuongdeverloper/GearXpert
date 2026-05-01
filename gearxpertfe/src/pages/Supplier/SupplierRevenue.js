import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { FiTrendingUp, FiDollarSign, FiTarget, FiCalendar, FiUsers, FiBarChart2, FiPieChart, FiActivity } from "react-icons/fi";
import { Bar, Line, Doughnut } from "react-chartjs-2";
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
  Filler
} from "chart.js";
import { getSupplierRevenue } from "../../service/ApiService/SupplierRevenueApi";

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

const EMPTY_DATA = {
  summary: {
    totalRevenue: 0,
    monthlyRevenue: 0,
    lastMonthRevenue: 0,
    activeRentals: 0,
    avgRating: 0,
    retentionRate: 0
  },
  cashFlow: { DAY: [], MONTH: [], YEAR: [] },
  monthlyBreakdown: [],
  topDevices: [],
  bottomDevices: [],
  bookingTrends: { daily: Array(7).fill(0), hourly: Array(24).fill(0) },
  transactions: [],
  rentalStatusCounts: {}
};

const formatVnd = (value) => {
  const n = Number(value ?? 0);
  const safe = Number.isFinite(n) ? n : 0;
  return `${Math.max(0, safe).toLocaleString("vi-VN")} đ`;
};

const formatVndAbs = (value) =>
  `${Number(value ?? 0).toLocaleString("vi-VN")}`;

const formatSignedVnd = (amount) => {
  const n = Number(amount ?? 0);
  const sign = n >= 0 ? "+" : "-";
  return `${sign}${formatVndAbs(Math.abs(n))} đ`;
};

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
  const bottomDevices = data?.bottomDevices || [];
  const transactions = data?.transactions || [];
  const cashFlowData = data?.cashFlow || EMPTY_DATA.cashFlow;
  const bookingTrends = data?.bookingTrends || EMPTY_DATA.bookingTrends;
  const rentalStatusCounts = data?.rentalStatusCounts || {};

  const momGrowth = useMemo(() => {
    if (!revenueData.lastMonthRevenue) return 100;
    return ((revenueData.monthlyRevenue - revenueData.lastMonthRevenue) / revenueData.lastMonthRevenue) * 100;
  }, [revenueData]);

  const cashFlowChartData = useMemo(() => {
    const series = cashFlowData[range] || [];
    return {
      labels: series.map((item) => item.label),
      datasets: [
        {
          label: "Tiền vào",
          data: series.map((item) => item.in),
          backgroundColor: "#22c55e",
          borderRadius: 8,
          barThickness: 22
        },
        {
          label: "Tiền ra",
          data: series.map((item) => item.out),
          backgroundColor: "#ef4444",
          borderRadius: 8,
          barThickness: 22
        }
      ]
    };
  }, [cashFlowData, range]);

  const hourlyTrendsData = useMemo(() => ({
    labels: Array.from({ length: 24 }, (_, i) => `${i}h`),
    datasets: [{
      label: "Lượt đặt theo giờ",
      data: bookingTrends.hourly,
      borderColor: "#6366f1",
      backgroundColor: "rgba(99, 102, 241, 0.1)",
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: "#6366f1"
    }]
  }), [bookingTrends.hourly]);

  const dailyTrendsData = useMemo(() => ({
    labels: ["CN", "T2", "T3", "T4", "T5", "T6", "T7"],
    datasets: [{
      label: "Lượt đặt theo ngày",
      data: bookingTrends.daily,
      backgroundColor: "#8b5cf6",
      borderRadius: 6
    }]
  }), [bookingTrends.daily]);

  const orderStatusData = useMemo(() => {
    const completed = rentalStatusCounts["COMPLETED"] || 0;
    const cancelled = (rentalStatusCounts["CANCELLED"] || 0) + (rentalStatusCounts["REJECTED"] || 0);
    return {
      labels: ["Hoàn thành", "Hủy/Từ chối"],
      datasets: [{
        data: [completed, cancelled],
        backgroundColor: ["#22c55e", "#ef4444"],
        borderWidth: 0,
        hoverOffset: 4
      }]
    };
  }, [rentalStatusCounts]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { usePointStyle: true, padding: 15, font: { size: 11 } }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}`
        }
      }
    }
  }), []);

  const revenueChartOptions = useMemo(() => ({
    ...chartOptions,
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${formatVnd(ctx.raw)}`
        }
      }
    },
    scales: {
      x: { grid: { display: false } },
      y: { ticks: { callback: (v) => formatVnd(v) } }
    }
  }), [chartOptions]);

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Phân tích kinh doanh</h2>
          <p className="mt-1 text-sm text-slate-600">Báo cáo chi tiết về hiệu suất và hành vi khách hàng</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
          <FiActivity className="text-green-500" /> Cập nhật thời gian thực
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tổng doanh thu</p>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <FiDollarSign size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatVnd(revenueData.totalRevenue)}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-[10px] text-slate-400">Từ khi bắt đầu</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tháng này</p>
            <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
              <FiTrendingUp size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{formatVnd(revenueData.monthlyRevenue)}</p>
          <div className="flex items-center gap-1 mt-2">
            <span className={`text-xs font-bold ${momGrowth >= 0 ? "text-green-600" : "text-red-600"}`}>
              {momGrowth >= 0 ? "+" : ""}{momGrowth.toFixed(1)}%
            </span>
            <span className="text-[10px] text-slate-400">so với tháng trước</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Khách quay lại</p>
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <FiUsers size={18} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{revenueData.retentionRate.toFixed(1)}%</p>
          <div className="flex items-center gap-1 mt-2">
            <span className="text-[10px] text-slate-400">Tỉ lệ khách hàng trung thành</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đánh giá TB</p>
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              ⭐
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{Number(revenueData.avgRating).toFixed(1)}</p>
          <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
            Dựa trên tất cả lượt thuê
          </div>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cash Flow */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FiBarChart2 className="text-indigo-600" /> Dòng tiền chi tiết
            </h3>
            <div className="flex bg-slate-100 rounded-lg p-0.5">
              {["DAY", "MONTH", "YEAR"].map((k) => (
                <button
                  key={k}
                  onClick={() => setRange(k)}
                  className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${
                    range === k ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {k === "DAY" ? "Ngày" : k === "MONTH" ? "Tháng" : "Năm"}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[280px]">
            {loading ? <div className="h-full flex items-center justify-center text-slate-400 text-sm">Đang tải...</div> : <Bar data={cashFlowChartData} options={revenueChartOptions} />}
          </div>
        </div>

        {/* Order Status */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
            <FiPieChart className="text-indigo-600" /> Tỉ lệ hoàn thành
          </h3>
          <div className="h-[200px] relative">
            <Doughnut data={orderStatusData} options={{ ...chartOptions, cutout: "70%" }} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-bold text-slate-900">
                {rentalStatusCounts["COMPLETED"] || 0}
              </p>
              <p className="text-[10px] text-slate-500 font-bold uppercase">Đơn thành công</p>
            </div>
          </div>
          <div className="mt-6 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Đang hoạt động:</span>
              <span className="font-bold text-slate-900">{revenueData.activeRentals}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Tổng đơn:</span>
              <span className="font-bold text-slate-900">
                {Object.values(rentalStatusCounts).reduce((a, b) => a + b, 0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Trends Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
            <FiActivity className="text-indigo-600" /> Khung giờ được đặt nhiều nhất
          </h3>
          <div className="h-[220px]">
            <Line data={hourlyTrendsData} options={chartOptions} />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
            <FiCalendar className="text-indigo-600" /> Các ngày trong tuần
          </h3>
          <div className="h-[220px]">
            <Bar data={dailyTrendsData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Devices Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Devices */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Thiết bị mang lại doanh thu cao</h3>
          <div className="space-y-3">
            {topDevices.length === 0 && <p className="text-xs text-slate-400 italic">Chưa có dữ liệu</p>}
            {topDevices.map((device, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{device.name}</p>
                    <p className="text-[10px] text-slate-500">{device.rentals} lượt thuê</p>
                  </div>
                </div>
                <p className="text-sm font-bold text-indigo-600">{formatVnd(device.revenue)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Devices */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-4 text-red-600">Thiết bị cần cải thiện (Thuê ít)</h3>
          <div className="space-y-3">
            {bottomDevices.length === 0 && <p className="text-xs text-slate-400 italic">Chưa có dữ liệu</p>}
            {bottomDevices.map((device, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-red-50/30 rounded-xl border border-red-100 hover:border-red-200 transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center text-xs font-bold">
                    !
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{device.name}</p>
                    <p className="text-[10px] text-slate-500">{device.rentals} lượt thuê</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-700">{formatVnd(device.revenue)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-6">Giao dịch gần đây</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <th className="pb-3 px-2">Khách hàng</th>
                <th className="pb-3 px-2">Mã đơn</th>
                <th className="pb-3 px-2">Ngày</th>
                <th className="pb-3 px-2 text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {transactions.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50 transition-colors">
                  <td className="py-4 px-2">
                    <p className="text-sm font-bold text-slate-900">{item.customerName || "Khách hàng"}</p>
                  </td>
                  <td className="py-4 px-2 text-xs font-mono text-slate-500">
                    #{String(item.id).slice(-6).toUpperCase()}
                  </td>
                  <td className="py-4 px-2 text-xs text-slate-500">
                    {item.createdAt}
                  </td>
                  <td className={`py-4 px-2 text-sm font-bold text-right ${item.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {formatSignedVnd(item.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {transactions.length === 0 && !loading && (
            <div className="py-10 text-center text-slate-400 text-xs italic">Không có dữ liệu giao dịch</div>
          )}
        </div>
      </div>
    </div>
  );
}
