import { useEffect, useMemo, useState } from "react";
import { useDispatch } from "react-redux";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import { FiTrendingUp, FiUsers, FiBox, FiDollarSign, FiStar } from "react-icons/fi";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { getAdminDashboard, getAdminDashboardCharts } from "../../service/ApiService/AdminDashboardApi";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

export default function AdminDashboard() {
  const dispatch = useDispatch();
  const [stats, setStats] = useState([]);
  const [topDevices, setTopDevices] = useState([]);
  const [recentRentals, setRecentRentals] = useState([]);
  const [revenueSeries, setRevenueSeries] = useState([]);

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
          setRecentRentals(dashboardRes.value?.recentRentals || []);
        } else {
          console.error("Failed to load admin dashboard:", dashboardRes.reason);
        }

        if (chartsRes.status === "fulfilled") {
          setRevenueSeries(chartsRes.value?.revenueSeries || []);
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

  const revenueChartData = useMemo(() => ({
    labels: revenueSeries.map((item) => item.label),
    datasets: [
      {
        label: "Doanh thu",
        data: revenueSeries.map((item) => item.total),
        backgroundColor: "#6366f1",
        borderRadius: 8,
        barThickness: 22,
      },
    ],
  }), [revenueSeries]);

  const revenueChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
      },
      tooltip: {
        callbacks: {
          label: (ctx) => `$${ctx.raw.toLocaleString("en-US")}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        ticks: {
          callback: (v) => `$${Number(v).toLocaleString("en-US")}`,
        },
      },
    },
  }), []);

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, idx) => (
          <div key={idx} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
            <div className={`mb-3 inline-block rounded-lg p-3 ${stat.color}`}>
              {stat.icon === "users" && <FiUsers size={24} />}
              {stat.icon === "box" && <FiBox size={24} />}
              {stat.icon === "package" && <FiTrendingUp size={24} />}
              {stat.icon === "dollar" && <FiDollarSign size={24} />}
            </div>
            <p className="text-xs font-medium text-slate-600 mb-1">{stat.label}</p>
            <p className="text-3xl font-bold text-slate-900 mb-2">{stat.value}</p>
            <p className="text-xs font-semibold text-green-600">{stat.change} so với tháng trước</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Revenue Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Xu hướng doanh thu</h3>
          <div className="relative h-[220px]">
            <Bar data={revenueChartData} options={revenueChartOptions} />
          </div>
        </div>

        {/* Top Devices */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Thiết bị thuê nhiều nhất</h3>
          <div className="space-y-3">
            {topDevices.map((device, idx) => (
              <div key={`${device.name}-${idx}`} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-semibold text-sm">
                    {idx + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{device.name}</p>
                    <p className="text-xs text-slate-500">{device.supplierName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <FiStar className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="text-sm font-medium">{device.ratingAvg}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Rentals */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Đơn thuê gần đây</h3>
          <div className="space-y-3">
            {recentRentals.map((rental) => (
              <div key={rental.id} className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{rental.customerName}</p>
                  <p className="text-xs text-slate-500">{rental.deviceName}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-900">${rental.totalAmount}</p>
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                      rental.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : rental.status === "RENTING"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {rental.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity Timeline */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Hoạt động nền tảng</h3>
          <div className="space-y-3">
            {[
              { time: "2 hours ago", action: "New rental request from John Doe", icon: "📦" },
              { time: "4 hours ago", action: "Device moderation approved", icon: "✓" },
              { time: "6 hours ago", action: "New supplier registration", icon: "👤" },
              { time: "8 hours ago", action: "Payment received - $1,250", icon: "💰" },
              { time: "10 hours ago", action: "Device maintenance scheduled", icon: "🔧" },
            ].map((activity, idx) => (
              <div key={idx} className="flex gap-3 pb-3 border-b border-slate-100">
                <div className="text-2xl">{activity.icon}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">{activity.action}</p>
                  <p className="text-xs text-slate-500">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">Trạng thái hệ thống</h3>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "API Status", status: "Operational", color: "green" },
            { label: "Database", status: "Operational", color: "green" },
            { label: "Payment Gateway", status: "Operational", color: "green" },
            { label: "Email Service", status: "Operational", color: "green" },
          ].map((item, idx) => (
            <div key={idx} className="rounded-lg border border-slate-200 p-3 text-center">
              <p className="text-xs text-slate-600 mb-1">{item.label}</p>
              <div className={`flex items-center justify-center gap-1 text-sm font-medium ${
                item.color === "green" ? "text-green-600" : "text-red-600"
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  item.color === "green" ? "bg-green-600" : "bg-red-600"
                }`} />
                {item.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
