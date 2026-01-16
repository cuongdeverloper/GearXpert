import { useEffect, useMemo, useState } from "react";
import { mockSupplierDevices } from "../../mocks/devices.mock";
import { DEVICE_STATUS_CONFIG } from "../../utils/deviceStatus";
import { FiEdit2, FiTrash2, FiPlus } from "react-icons/fi";

const CATEGORIES = ["ALL", "CAMERA", "AUDIO", "OFFICE", "GAMING", "ACCESSORY"];
const PAGE_SIZES = [5, 10, 20];

export default function SupplierDevicesList() {
  const [category, setCategory] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* ===== FILTER ===== */
  const filteredDevices = useMemo(() => {
    if (category === "ALL") return mockSupplierDevices;
    return mockSupplierDevices.filter((d) => d.category === category);
  }, [category]);

  /* reset page when filter / page size changes */
  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  /* ===== PAGINATION ===== */
  const total = filteredDevices.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  /* keep page in valid range */
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  const safePage = Math.min(page, totalPages);

  const paginatedDevices = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredDevices.slice(start, start + pageSize);
  }, [filteredDevices, safePage, pageSize]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Devices</h2>
          <p className="mt-1 text-sm text-slate-600">Manage and monitor your equipment listings</p>
        </div>

        <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-2xl font-semibold shadow-lg shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95">
          <FiPlus size={20} />
          <span>Add Device</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
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
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-slate-700">Per page:</label>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 bg-white hover:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s} items
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Devices List */}
      <div className="space-y-3">
        {paginatedDevices.map((device) => {
          const statusCfg = DEVICE_STATUS_CONFIG[device.status];

          return (
            <div
              key={device._id}
              className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 lg:p-5 shadow-sm hover:shadow-md hover:border-primary/30 transition-all group"
            >
              {/* Image */}
              <div className="relative h-24 w-24 lg:h-28 lg:w-28 flex-shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200">
                <img
                  src={device.images?.[0] || "https://via.placeholder.com/150"}
                  alt={device.name}
                  className="h-full w-full object-cover"
                />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <h3 className="text-lg font-bold text-slate-900 truncate">{device.name}</h3>
                      <span
                        className={`h-fit rounded-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider whitespace-nowrap ${
                          statusCfg?.className ||
                          "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {statusCfg?.label || device.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {device.category}
                      {device.location?.city && ` • ${device.location.city}`}
                    </p>
                  </div>
                </div>

                {/* Pricing */}
                <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-3">
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-tighter">Daily Rate</p>
                    <p className="text-lg font-bold text-primary mt-1">${device.rentPrice.perDay}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-tighter">Deposit</p>
                    <p className="text-lg font-bold text-slate-900 mt-1">${device.depositAmount}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-200">
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-tighter">Rating</p>
                    <p className="text-lg font-bold text-amber-500 mt-1">★ {device.ratingAvg || 4.5}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 lg:flex-row">
                <button className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-primary hover:bg-primary/5 hover:border-primary/30 transition-all hover:shadow-md">
                  <FiEdit2 size={18} />
                </button>
                <button className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 hover:border-red-200 transition-all hover:shadow-md">
                  <FiTrash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}

        {paginatedDevices.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 lg:p-12 text-center">
            <div className="text-6xl mb-3">📦</div>
            <p className="text-lg font-semibold text-slate-900">No devices found</p>
            <p className="text-sm text-slate-600 mt-1">Try adjusting your filters or add a new device</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <p className="text-sm font-semibold text-slate-700">
          <span className="text-primary font-bold">{total === 0 ? 0 : (safePage - 1) * pageSize + 1}</span>
          <span className="text-slate-600"> - </span>
          <span className="text-primary font-bold">{Math.min(safePage * pageSize, total)}</span>
          <span className="text-slate-600"> of </span>
          <span className="text-primary font-bold">{total}</span>
        </p>

        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
            disabled={safePage === 1}
            onClick={() => setPage(1)}
          >
            First
          </button>
          <button
            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
            disabled={safePage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>

          <span className="text-sm font-semibold text-slate-900">
            <span className="text-primary">{safePage}</span>
            <span className="text-slate-400"> / </span>
            <span>{totalPages}</span>
          </span>

          <button
            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
            disabled={safePage === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </button>
          <button
            className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
            disabled={safePage === totalPages}
            onClick={() => setPage(totalPages)}
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}
