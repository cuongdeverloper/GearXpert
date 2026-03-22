import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { getAdminDevices } from "../../service/ApiService/AdminDashboardApi";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import ImageGalleryModal from "../../components/admin/ImageGalleryModal";
import {
  FiSearch, FiStar, FiCheckCircle, FiAlertCircle, FiEye,
  FiChevronLeft, FiChevronRight,
} from "react-icons/fi";

const CATEGORIES = ["CAMERA", "AUDIO", "OFFICE", "GAMING", "ACCESSORY", "LIGHTING", "DRONE", "OTHER"];
const STATUSES = ["AVAILABLE", "RENTED", "MAINTENANCE", "BROKEN", "STOPPED"];

const STATUS_COLORS = {
  AVAILABLE: "bg-green-100 text-green-700",
  RENTED: "bg-blue-100 text-blue-700",
  MAINTENANCE: "bg-yellow-100 text-yellow-700",
  BROKEN: "bg-red-100 text-red-700",
  STOPPED: "bg-slate-100 text-slate-700",
};

const CATEGORY_COLORS = {
  CAMERA: "bg-purple-100 text-purple-700",
  AUDIO: "bg-indigo-100 text-indigo-700",
  OFFICE: "bg-blue-100 text-blue-700",
  GAMING: "bg-orange-100 text-orange-700",
  ACCESSORY: "bg-cyan-100 text-cyan-700",
  LIGHTING: "bg-yellow-100 text-yellow-700",
  DRONE: "bg-pink-100 text-pink-700",
  OTHER: "bg-slate-100 text-slate-700",
};

const formatVND = (amount) =>
  amount != null ? `${Number(amount).toLocaleString("vi-VN")}₫` : "—";

export default function DevicesModerationPage() {
  const dispatch = useDispatch();
  const [devices, setDevices] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Filters (now server-side)
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [viewImageDevice, setViewImageDevice] = useState(null);

  const fetchDevices = useCallback(async () => {
    try {
      dispatch(showAdminLoading());
      const res = await getAdminDevices({
        page,
        limit,
        search: search.trim(),
        ...(category !== "ALL" && { category }),
        ...(status !== "ALL" && { status }),
      });
      setDevices(res.devices || []);
      setTotal(res.total || 0);
      setTotalPages(res.totalPages || 1);
    } catch (error) {
      console.error("Error fetching devices:", error);
      setDevices([]);
      setTotal(0);
    } finally {
      dispatch(hideAdminLoading());
    }
  }, [page, limit, search, category, status, dispatch]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Reset to page 1 when filter changes
  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };
  const handleCategoryChange = (val) => {
    setCategory(val);
    setPage(1);
  };
  const handleStatusChange = (val) => {
    setStatus(val);
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 gap-3 flex-wrap lg:flex-nowrap">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or slug..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition"
            />
          </div>

          {/* Category */}
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white min-w-[140px]"
          >
            <option value="ALL">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white min-w-[140px]"
          >
            <option value="ALL">All Status</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Per page */}
        <select
          value={limit}
          onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm"
        >
          <option value={10}>10 / page</option>
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
      </div>

      {/* Stats bar */}
      <div className="text-sm text-slate-500">
        Showing {devices.length} of {total} devices
        {search && ` matching "${search}"`}
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Device</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Supplier</th>
              <th className="px-6 py-3 text-left font-semibold text-slate-700">Category</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Stock</th>
              <th className="px-6 py-3 text-right font-semibold text-slate-700">Daily Rate</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Rating</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Status</th>
              <th className="px-6 py-3 text-center font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((device) => (
              <tr
                key={device._id}
                className="border-b border-slate-200 hover:bg-slate-50 transition"
              >
                <td className="px-6 py-3">
                  <div className="font-medium text-slate-900">{device.name}</div>
                  {device.location?.city && (
                    <div className="text-xs text-slate-500">{device.location.city}</div>
                  )}
                </td>
                <td className="px-6 py-3 text-slate-600">{device.supplierName}</td>
                <td className="px-6 py-3">
                  <span
                    className={`inline-block px-3 py-1 rounded-lg text-xs font-medium ${
                      CATEGORY_COLORS[device.category] || "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {device.category}
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  <span
                    className={`font-medium ${
                      device.stockQuantity === 0 ? "text-red-600" : "text-slate-900"
                    }`}
                  >
                    {device.stockQuantity}
                  </span>
                </td>
                <td className="px-6 py-3 text-right font-medium text-slate-900">
                  {formatVND(device.rentPrice?.perDay)}/day
                </td>
                <td className="px-6 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <FiStar className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">{Number(device.ratingAvg || 0).toFixed(1)}</span>
                    <span className="text-xs text-slate-500">({device.reviewCount || 0})</span>
                  </div>
                </td>
                <td className="px-6 py-3 text-center">
                  <div
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium ${
                      STATUS_COLORS[device.status] || "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {device.status === "AVAILABLE" && <FiCheckCircle className="w-3.5 h-3.5" />}
                    {(device.status === "MAINTENANCE" || device.status === "BROKEN") && (
                      <FiAlertCircle className="w-3.5 h-3.5" />
                    )}
                    {device.status}
                  </div>
                </td>
                <td className="px-6 py-3 text-center">
                  <button
                    onClick={() => setViewImageDevice(device)}
                    className="p-1.5 rounded-lg hover:bg-blue-100 text-slate-600 hover:text-blue-600 transition"
                    title="View Images"
                  >
                    <FiEye size={16} />
                  </button>
                </td>
              </tr>
            ))}

            {devices.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                  No devices found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
            >
              <FiChevronLeft size={16} />
            </button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium transition ${
                    page === pageNum
                      ? "bg-primary text-white"
                      : "border border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}

            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg border border-slate-200 disabled:opacity-40 hover:bg-slate-50 transition"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Image Gallery Modal */}
      {viewImageDevice && (
        <ImageGalleryModal
          isOpen={!!viewImageDevice}
          onClose={() => setViewImageDevice(null)}
          images={viewImageDevice.images || []}
          deviceName={viewImageDevice.name}
        />
      )}
    </div>
  );
}