import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  FiDollarSign,
  FiTrendingUp,
  FiClipboard,
  FiBox,
  FiArrowUpRight,
  FiClock,
  FiCheckCircle,
  FiTarget,
} from "react-icons/fi";
import { getSupplierRevenue } from "../../service/ApiService/SupplierRevenueApi";
import { getSupplierRentalRequests } from "../../service/ApiService/RentalApi";
import { getSupplierDevices } from "../../service/ApiService/DeviceApi";

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

const formatMoney = (value) => (value || 0).toLocaleString("vi-VN");
const formatMillions = (value) => `${((value || 0) / 1000000).toFixed(1)}M`;

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
      .slice(0, 4);
  }, [requests]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
            Bảng điều khiển Nhà cung cấp
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Tổng quan về thu nhập, đặt hàng và hiệu suất kho hàng.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/supplier/rental-requests"
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-all"
          >
            Xem yêu cầu
          </Link>
          <Link
            to="/supplier/devices"
            className="px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all"
          >
            Quản lý thiết bị
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-primary/20 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">
              Tổng doanh thu
            </p>
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <FiDollarSign size={20} className="text-primary" />
            </div>
          </div>
          <p className="text-3xl font-bold text-primary">
            {formatMillions(summary.totalRevenue)}
          </p>
          <p className="text-xs text-primary/70 mt-2">Tổng thu nhập từ trước đến nay</p>
        </div>

        <div className="bg-gradient-to-br from-green-100/10 to-green-50/5 rounded-2xl border border-green-200/30 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">
              Tháng này
            </p>
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
              <FiTrendingUp size={20} className="text-green-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-green-600">
            {formatMillions(summary.monthlyRevenue)}
          </p>
          <p className="text-xs text-green-600/70 mt-2">Hiệu suất hàng tháng</p>
        </div>

        <div className="bg-gradient-to-br from-amber-100/10 to-amber-50/5 rounded-2xl border border-amber-200/30 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">
              Yêu cầu chờ xử lý
            </p>
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <FiClipboard size={20} className="text-amber-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-xs text-amber-600/70 mt-2">
            {approvedCount} đơn đặt hàng đã phê duyệt
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-100/10 to-blue-50/5 rounded-2xl border border-blue-200/30 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">
              Kho hàng
            </p>
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FiBox size={20} className="text-blue-600" />
            </div>
          </div>
          <p className="text-3xl font-bold text-blue-600">{deviceTotals.total}</p>
          <p className="text-xs text-blue-600/70 mt-2">
            {deviceTotals.available} thiết bị sẵn sàng ngay
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            title: "Yêu cầu thuê",
            desc: "Phê duyệt hoặc từ chối đơn đặt mới",
            to: "/supplier/rental-requests",
            icon: FiClipboard,
            color: "text-primary",
          },
          {
            title: "Thiết bị",
            desc: "Thêm hoặc cập nhật danh sách của bạn",
            to: "/supplier/devices",
            icon: FiBox,
            color: "text-blue-600",
          },
          {
            title: "Doanh thu",
            desc: "Xem phân tích thu nhập chi tiết",
            to: "/supplier/revenue",
            icon: FiDollarSign,
            color: "text-green-600",
          },
          {
            title: "Quảng cáo",
            desc: "Quảng bá sản phẩm của bạn",
            to: "/supplier/advertisements",
            icon: FiTarget,
            color: "text-indigo-600",
          },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.title}
              to={item.to}
              className="group bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Icon size={20} className={item.color} />
                </div>
                <FiArrowUpRight className="text-slate-400 group-hover:text-primary transition-colors" />
              </div>
              <p className="font-semibold text-slate-900">{item.title}</p>
              <p className="text-sm text-slate-500 mt-1">{item.desc}</p>
            </Link>
          );
        })}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Yêu cầu gần đây</h3>
            <Link
              to="/supplier/rental-requests"
              className="text-sm font-semibold text-primary hover:text-primary-dark"
            >
              Xem tất cả
            </Link>
          </div>
          {loading && <p className="text-sm text-slate-500">Đang tải...</p>}
          {!loading && recentRequests.length === 0 && (
            <p className="text-sm text-slate-500">Chưa có yêu cầu nào.</p>
          )}
          <div className="space-y-3">
            {recentRequests.map((req) => (
              <div
                key={req._id}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:border-primary/30 hover:bg-slate-50 transition-all"
              >
                <div>
                  <p className="font-semibold text-slate-900">
                    Đơn thuê #{req._id?.slice(-6)}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    {req.customerId?.fullName || "Khách hàng"}
                  </p>
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold border ${
                      req.status === "PENDING"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-green-50 text-green-700 border-green-200"
                    }`}
                  >
                    {req.status === "PENDING" ? (
                      <FiClock size={12} />
                    ) : (
                      <FiCheckCircle size={12} />
                    )}
                    {req.status === "PENDING" ? "Chờ xử lý" : "Đã duyệt"}
                  </span>
                  <p className="text-sm font-bold text-primary mt-2">
                    {formatMoney(req.totalAmount)} ₫
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900">Thiết bị hàng đầu</h3>
            <Link
              to="/supplier/devices"
              className="text-sm font-semibold text-primary hover:text-primary-dark"
            >
              Xem tất cả
            </Link>
          </div>
          {loading && <p className="text-sm text-slate-500">Đang tải...</p>}
          {!loading && topDevices.length === 0 && (
            <p className="text-sm text-slate-500">Chưa có dữ liệu thiết bị.</p>
          )}
          <div className="space-y-3">
            {topDevices.slice(0, 4).map((device, idx) => (
              <div
                key={`${device.name}-${idx}`}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:border-primary/30 hover:bg-slate-50 transition-all"
              >
                <div>
                  <p className="font-semibold text-slate-900">{device.name}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {device.rentals} lượt thuê
                  </p>
                </div>
                <p className="text-sm font-bold text-primary">
                  {formatMillions(device.revenue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">Giao dịch gần đây</h3>
          <Link
            to="/supplier/revenue"
            className="text-sm font-semibold text-primary hover:text-primary-dark"
          >
            Xem phân tích
          </Link>
        </div>
        {loading && <p className="text-sm text-slate-500">Đang tải...</p>}
        {!loading && transactions.length === 0 && (
          <p className="text-sm text-slate-500">Chưa có giao dịch nào.</p>
        )}
        <div className="space-y-3">
          {transactions.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-slate-200 p-4 hover:border-primary/30 hover:bg-slate-50 transition-all"
            >
              <div>
                <p className="font-semibold text-slate-900">{item.description}</p>
                <p className="text-xs text-slate-500 mt-1">{item.createdAt}</p>
              </div>
              <p
                className={`font-bold ${
                  item.amount >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                {item.amount >= 0 ? "+" : "-"}
                {formatMillions(Math.abs(item.amount))}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
