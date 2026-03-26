import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getSupplierDevices } from "../../service/ApiService/DeviceApi";
import { DEVICE_STATUS_CONFIG } from "../../utils/deviceStatus";
import {
  FiPlus,
  FiSearch,
  FiBox,
  FiCheckCircle,
  FiClock,
  FiTool,
} from "react-icons/fi";
import { toast } from "react-toastify";

const LOW_STOCK_THRESHOLD = 2;
const STOCK_FILTERS = [
  { value: "ALL", label: "Tất cả" },
  { value: "IN_STOCK", label: "Sẵn hàng" },
  { value: "LOW_STOCK", label: "Sắp hết" },
  { value: "OUT_OF_STOCK", label: "Hết hàng" },
];

export default function SupplierInventoryPage() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user.account);
  const [devices, setDevices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [stockFilter, setStockFilter] = useState("ALL");

  // Fetch devices
  const fetchDevices = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const params = {
        limit: pageSize,
        page: page,
      };
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
  }, [user?.id, page, pageSize]);

  // Search filter (client-side on fetched data)
  const filteredDevices = searchTerm
    ? devices.filter((d) =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : devices;

  const stockFilteredDevices = useMemo(() => {
    return filteredDevices.filter((device) => {
      const totalUnits = device.stockQuantity || 0;
      if (stockFilter === "ALL") return true;
      if (stockFilter === "OUT_OF_STOCK") return totalUnits === 0;
      if (stockFilter === "LOW_STOCK") {
        return totalUnits > 0 && totalUnits <= LOW_STOCK_THRESHOLD;
      }
      return totalUnits > LOW_STOCK_THRESHOLD;
    });
  }, [filteredDevices, stockFilter]);

  const inventorySummary = useMemo(() => {
    return devices.reduce(
      (acc, device) => {
        const totalUnits = device.stockQuantity || 0;
        acc.totalProducts += 1;
        acc.totalUnits += totalUnits;
        if (device.status === "AVAILABLE") acc.availableUnits += totalUnits;
        if (device.status === "RENTED") acc.rentedUnits += totalUnits;
        if (device.status === "MAINTENANCE") acc.maintenanceUnits += totalUnits;
        return acc;
      },
      {
        totalProducts: 0,
        totalUnits: 0,
        availableUnits: 0,
        rentedUnits: 0,
        maintenanceUnits: 0,
      }
    );
  }, [devices]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
            Quản lý Kho hàng
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Theo dõi số lượng và trạng thái thiết bị của bạn
          </p>
        </div>

        <button
          onClick={() => navigate("/supplier/devices/new")}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-2xl font-semibold shadow-lg shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95"
        >
          <FiPlus size={20} />
          <span>Thêm sản phẩm</span>
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 inline-flex items-center justify-center">
            <FiBox size={18} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Sản phẩm</p>
            <p className="text-lg font-bold text-slate-900">{inventorySummary.totalProducts}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-slate-100 text-slate-700 inline-flex items-center justify-center">
            <FiBox size={18} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Tổng thiết bị</p>
            <p className="text-lg font-bold text-slate-900">{inventorySummary.totalUnits}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 inline-flex items-center justify-center">
            <FiCheckCircle size={18} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Sẵn sàng</p>
            <p className="text-lg font-bold text-slate-900">{inventorySummary.availableUnits}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 inline-flex items-center justify-center">
            <FiClock size={18} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Đang thuê</p>
            <p className="text-lg font-bold text-slate-900">{inventorySummary.rentedUnits}</p>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 inline-flex items-center justify-center">
            <FiTool size={18} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Bảo trì</p>
            <p className="text-lg font-bold text-slate-900">{inventorySummary.maintenanceUnits}</p>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {/* Inventory table */}
      {!isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Danh sách kho</h3>
              <p className="text-sm text-slate-500">
                Quản lý số lượng thiết bị cho mỗi sản phẩm
              </p>
            </div>
            <div className="relative w-full lg:w-64">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Tìm kiếm sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
            {STOCK_FILTERS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setStockFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                  stockFilter === tab.value
                    ? "bg-primary/10 text-primary border-primary/20"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500 border-t border-slate-200">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                  <th className="px-4 py-3 font-semibold">Mã</th>
                  <th className="px-4 py-3 font-semibold text-center">Tổng</th>
                  <th className="px-4 py-3 font-semibold text-center">Sẵn sàng</th>
                  <th className="px-4 py-3 font-semibold text-center">Đang thuê</th>
                  <th className="px-4 py-3 font-semibold text-center">Bảo trì</th>
                  <th className="px-4 py-3 font-semibold text-center">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold text-center">Điều chỉnh</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stockFilteredDevices.map((device) => {
                  const totalUnits = device.stockQuantity || 0;
                  const availableUnits = device.status === "AVAILABLE" ? totalUnits : 0;
                  const rentedUnits = device.status === "RENTED" ? totalUnits : 0;
                  const maintenanceUnits = device.status === "MAINTENANCE" ? totalUnits : 0;
                  const statusCfg = DEVICE_STATUS_CONFIG[device.status];
                  const sku = device.sku || device.code || device._id?.slice(-6) || "N/A";

                  return (
                    <tr key={device._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                            <img
                              src={device.images?.[0] || "https://via.placeholder.com/150"}
                              alt={device.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{device.name}</p>
                            <p className="text-xs text-slate-500">{device.category}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 font-medium">{sku}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex min-w-[28px] justify-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {totalUnits}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex min-w-[28px] justify-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
                          {availableUnits}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex min-w-[28px] justify-center rounded-full bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-700">
                          {rentedUnits}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex min-w-[28px] justify-center rounded-full bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                          {maintenanceUnits}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                            statusCfg?.className ||
                            "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}
                        >
                          {statusCfg?.label || device.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            disabled
                            className="h-7 w-7 rounded-lg border border-slate-200 text-slate-400 cursor-not-allowed"
                          >
                            -
                          </button>
                          <button
                            type="button"
                            disabled
                            className="h-7 w-7 rounded-lg border border-slate-200 text-slate-400 cursor-not-allowed"
                          >
                            +
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {stockFilteredDevices.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      Không tìm thấy sản phẩm phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {!isLoading && devices.length > 0 && (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
          <p className="text-sm font-semibold text-slate-700">
            <span className="text-primary font-bold">
              {total === 0 ? 0 : (page - 1) * pageSize + 1}
            </span>
            <span className="text-slate-600"> - </span>
            <span className="text-primary font-bold">{Math.min(page * pageSize, total)}</span>
            <span className="text-slate-600"> của </span>
            <span className="text-primary font-bold">{total}</span>
          </p>
          <div className="flex items-center gap-2">
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
              disabled={page === 1}
              onClick={() => setPage(1)}
            >
              Đầu
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Trước
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
              Sau
            </button>
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
              disabled={page === totalPages}
              onClick={() => setPage(totalPages)}
            >
              Cuối
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
