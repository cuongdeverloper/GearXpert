import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getSupplierDevices, deleteDevice } from "../../service/ApiService/DeviceApi";
import { DEVICE_STATUS_CONFIG } from "../../utils/deviceStatus";
import { FiEdit2, FiTrash2, FiPlus, FiEye, FiSearch } from "react-icons/fi";
import AddDeviceModal from "../../components/admin/AddDeviceModal";
import ImageGalleryModal from "../../components/admin/ImageGalleryModal";
import UpdateDeviceModal from "../../components/admin/UpdateDeviceModal";
import { toast } from "react-toastify";
import { confirmDialog } from "../../utils/confirmDialog";

const CATEGORIES = ["ALL", "CAMERA", "AUDIO", "OFFICE", "GAMING", "ACCESSORY", "LIGHTING", "DRONE", "OTHER"];
const STATUS_OPTIONS = [
  { value: "ALL", label: "All status" },
  { value: "AVAILABLE", label: "Available" },
  { value: "RENTED", label: "Rented" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "BROKEN", label: "Broken" },
  { value: "STOPPED", label: "Stopped" },
];
const PAGE_SIZES = [5, 10, 20];
const SORT_OPTIONS = [
  { value: "createdAt", label: "Newest" },
  { value: "name", label: "Name (A-Z)" },
  { value: "-name", label: "Name (Z-A)" },
  { value: "rentPrice.perDay", label: "Price (Low-High)" },
  { value: "-rentPrice.perDay", label: "Price (High-Low)" },
  { value: "ratingAvg", label: "Rating (High-Low)" },
];

export default function SupplierDevicesList() {
  const user = useSelector((state) => state.user.account);
  const [devices, setDevices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("createdAt");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewImageDevice, setViewImageDevice] = useState(null);
  const [editDevice, setEditDevice] = useState(null);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Fetch devices
  const fetchDevices = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const params = {
        limit: pageSize,
        page: page,
        sort,
      };
      if (category !== "ALL") {
        params.category = category;
      }
      if (status !== "ALL") {
        params.status = status;
      }
      const response = await getSupplierDevices(user.id, params);
      setDevices(response.devices || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      console.error("Error fetching devices:", error);
      toast.error("Failed to load devices");
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
    // eslint-disable-next-line
  }, [user?.id, page, pageSize, category, status, sort]);

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };
  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };
  const handleSortChange = (e) => {
    setSort(e.target.value);
    setPage(1);
  };
  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  // Search filter (client-side on fetched data)
  const filteredDevices = searchTerm
    ? devices.filter((d) =>
      d.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    : devices;

  // Delete device handler
  const handleDeleteDevice = async (device) => {
    const result = await confirmDialog({
      title: "Delete device?",
      text: `Are you sure you want to delete "${device.name}"? This action cannot be undone!`,
      icon: "warning",
      confirmText: "Yes, delete it!",
      cancelText: "Cancel",
      confirmColor: "#d33",
      cancelColor: "#3085d6",
    });
    if (result.isConfirmed) {
      try {
        await deleteDevice(device._id || device.id);
        toast.success("Device deleted successfully!");
        fetchDevices();
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to delete device");
      }
    }
  };

  return (
    <div className="space-y-6">

      {/* Header Section */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Devices</h2>
          <p className="mt-1 text-sm text-slate-600">Manage and monitor your equipment listings</p>
          <p className="mt-1 text-xs text-slate-400">Supplier ID: <span className="font-mono text-slate-500">{user?.id}</span></p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-2xl font-semibold shadow-lg shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95">
          <FiPlus size={20} />
          <span>Add Device</span>
        </button>
      </div>


      {/* Filters & Search */}
      <div className="space-y-3 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        {/* Search */}
        <div className="relative">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
        </div>
        {/* Category, Status, Sort, Page Size */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-semibold text-slate-700">Category:</label>
            <select
              value={category}
              onChange={handleCategoryChange}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 bg-white hover:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "All categories" : c}
                </option>
              ))}
            </select>
            <label className="text-sm font-semibold text-slate-700 ml-4">Status:</label>
            <select
              value={status}
              onChange={handleStatusChange}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 bg-white hover:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm font-semibold text-slate-700">Sort by:</label>
            <select
              value={sort}
              onChange={handleSortChange}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 bg-white hover:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <label className="text-sm font-semibold text-slate-700 ml-4">Per page:</label>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 bg-white hover:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s} items</option>
              ))}
            </select>
          </div>
        </div>
      </div>


      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Devices List */}
      {!isLoading && (
        <div className="space-y-3">
          {filteredDevices.map((device) => {
            const statusCfg = DEVICE_STATUS_CONFIG[device.status];
            return (
              <div
                key={device._id}
                className="flex gap-4 rounded-xl border border-slate-200 bg-white p-3 lg:p-4 shadow-sm hover:shadow-lg hover:border-indigo-400/70 transition-all group relative overflow-hidden"
                style={{ boxShadow: '0 2px 8px 0 rgba(80,102,144,0.06)' }}
              >
                {/* Image */}
                <div className="relative h-20 w-20 lg:h-24 lg:w-24 flex-shrink-0 rounded-lg overflow-hidden bg-gradient-to-br from-indigo-50 to-slate-100 border border-indigo-100 group-hover:border-indigo-300 transition">
                  <img
                    src={device.images?.[0] || "https://via.placeholder.com/150"}
                    alt={device.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute bottom-1 right-1 bg-white/80 text-[10px] px-1.5 py-0.5 rounded shadow text-slate-500 font-semibold">{device.images?.length || 0} ảnh</span>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <h3 className="text-lg font-bold text-slate-900 truncate">{device.name}</h3>
                        <span
                          className="h-fit rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap bg-gradient-to-r from-indigo-100 to-indigo-50 text-indigo-700 border border-indigo-200 shadow-sm mr-1"
                        >
                          {device.category}
                        </span>
                        <span
                          className={`h-fit rounded px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider whitespace-nowrap border shadow-sm ${statusCfg?.className ||
                            "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                        >
                          {statusCfg?.label || device.status}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500 mt-1">
                        {device.location?.city && `${device.location.city}`}
                      </p>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="mt-2 grid grid-cols-2 gap-2 lg:grid-cols-4">
                    <div className="bg-gradient-to-br from-indigo-50 to-white rounded border border-indigo-100 p-1.5 flex flex-col items-start">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Daily Rate</span>
                      <span className="text-base font-bold text-primary mt-0.5">${device.rentPrice?.perDay || 0}</span>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-white rounded border border-yellow-100 p-1.5 flex flex-col items-start">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Deposit</span>
                      <span className="text-base font-bold text-yellow-700 mt-0.5">${device.depositAmount || 0}</span>
                    </div>
                    <div className="bg-gradient-to-br from-amber-50 to-white rounded border border-amber-100 p-1.5 flex flex-col items-start">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Rating</span>
                      <span className="text-base font-bold text-amber-500 mt-0.5">★ {device.ratingAvg || 0}</span>
                    </div>
                    <div className="bg-gradient-to-br from-slate-50 to-white rounded border border-slate-200 p-1.5 flex flex-col items-start">
                      <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Stock</span>
                      <span className="text-base font-bold text-slate-900 mt-0.5">{device.stockQuantity || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2 lg:flex-row items-center">
                  <button
                    onClick={() => setViewImageDevice(device)}
                    className="p-2 rounded border border-blue-100 text-blue-600 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-200"
                    title="View Images"
                  >
                    <FiEye size={16} />
                  </button>
                  <button
                    className="p-2 rounded border border-slate-200 text-slate-600 bg-slate-50 hover:text-primary hover:bg-primary/10 hover:border-primary/30 transition-all hover:shadow focus:outline-none focus:ring-2 focus:ring-primary/20"
                    title="Update Device"
                    onClick={() => setEditDevice(device)}
                  >
                    <FiEdit2 size={16} />
                  </button>
                  <button
                    className="p-2 rounded border border-red-100 text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all hover:shadow focus:outline-none focus:ring-2 focus:ring-red-200"
                    title="Delete Device"
                    onClick={() => handleDeleteDevice(device)}
                  >
                    <FiTrash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
          {filteredDevices.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 lg:p-12 text-center">
              <div className="text-6xl mb-3">📦</div>
              <p className="text-lg font-semibold text-slate-900">No devices found</p>
              <p className="text-sm text-slate-600 mt-1">Try adjusting your filters or add a new device</p>
            </div>
          )}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && devices.length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">
            <span className="text-primary font-bold">{total === 0 ? 0 : (page - 1) * pageSize + 1}</span>
            <span className="text-slate-600"> - </span>
            <span className="text-primary font-bold">{Math.min(page * pageSize, total)}</span>
            <span className="text-slate-600"> of </span>
            <span className="text-primary font-bold">{total}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
              disabled={page === 1}
              onClick={() => setPage(1)}
            >
              First
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Prev
            </button>
            <span className="text-sm font-semibold text-slate-900">
              <span className="text-primary">{page}</span>
              <span className="text-slate-400"> / </span>
              <span>{totalPages}</span>
            </span>
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
            >
              Last
            </button>
          </div>
        </div>
      )}

      {/* Add Device Modal */}
      <AddDeviceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDeviceAdded={() => {
          setPage(1);
          fetchDevices();
        }}
      />

      {/* Image Gallery Modal */}
      {viewImageDevice && (
        <ImageGalleryModal
          isOpen={!!viewImageDevice}
          onClose={() => setViewImageDevice(null)}
          images={viewImageDevice.images || []}
          deviceName={viewImageDevice.name}
        />
      )}

      {/* Update Device Modal */}
      {editDevice && (
        <UpdateDeviceModal
          isOpen={!!editDevice}
          onClose={() => setEditDevice(null)}
          device={editDevice && {
            ...editDevice,
            id: editDevice._id || editDevice.id
          }}
          onDeviceUpdated={() => {
            setEditDevice(null);
            fetchDevices();
          }}
        />
      )}
    </div>
  );
}
