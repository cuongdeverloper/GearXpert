import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  getSupplierDevices,
  getDeviceItemsForSupplier,
  createDeviceItemForSupplier,
} from "../../service/ApiService/DeviceApi";
import { DEVICE_STATUS_CONFIG } from "../../utils/deviceStatus";
import { formatDate } from "../../utils/formatters";
import {
  FiPlus,
  FiMinus,
  FiSearch,
  FiBox,
  FiCheckCircle,
  FiClock,
  FiTool,
  FiChevronRight,
  FiChevronDown,
  FiX,
  FiImage,
} from "react-icons/fi";
import { toast } from "react-toastify";

const ITEM_STATUS_VI = {
  AVAILABLE: "Sẵn sàng",
  RENTED: "Đang thuê",
  RESERVED: "Đã giữ",
  PENDING_RESOLUTION: "Chờ xử lý sự cố",
  MAINTENANCE: "Bảo trì",
  REPAIR: "Sửa chữa",
  DAMAGED: "Hỏng",
  LOST: "Mất",
  RETIRED: "Ngưng dùng",
};

const ITEM_STATUS_CLASS = {
  AVAILABLE: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  RENTED: "bg-violet-50 text-violet-800 border border-violet-200",
  RESERVED: "bg-amber-50 text-amber-800 border border-amber-200",
  PENDING_RESOLUTION: "bg-red-50 text-red-800 border border-red-200",
  MAINTENANCE: "bg-orange-50 text-orange-800 border border-orange-200",
  REPAIR: "bg-orange-50 text-orange-900 border border-orange-200",
  DAMAGED: "bg-red-50 text-red-800 border border-red-200",
  LOST: "bg-slate-100 text-slate-700 border border-slate-200",
  RETIRED: "bg-slate-100 text-slate-600 border border-slate-200",
};

const CONDITION_VI = {
  NEW: "Mới",
  GOOD: "Tốt",
  FAIR: "Khá",
  NEEDS_REPAIR: "Cần sửa",
  DAMAGED: "Hỏng",
};

const MAX_ITEM_IMAGES = 5;
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
  const [expanded, setExpanded] = useState({});
  const [itemsByDevice, setItemsByDevice] = useState({});
  const [itemsLoading, setItemsLoading] = useState({});
  const [addFormFor, setAddFormFor] = useState(null);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addDraft, setAddDraft] = useState({
    serialNumber: "",
    internalCode: "",
    condition: "GOOD",
    locationNote: "",
  });
  const [addImageFiles, setAddImageFiles] = useState([]);

  const itemImagePreviewUrls = useMemo(
    () => addImageFiles.map((file) => URL.createObjectURL(file)),
    [addImageFiles]
  );

  useEffect(() => {
    return () => {
      itemImagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [itemImagePreviewUrls]);

  const closeAddModal = useCallback(() => {
    setAddFormFor(null);
    setAddImageFiles([]);
  }, []);

  useEffect(() => {
    if (!addFormFor) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeAddModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addFormFor, closeAddModal]);

  useEffect(() => {
    if (!addFormFor) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [addFormFor]);

  const loadItems = useCallback(async (deviceId) => {
    if (!deviceId) return;
    setItemsLoading((prev) => ({ ...prev, [deviceId]: true }));
    try {
      const res = await getDeviceItemsForSupplier(deviceId, { limit: 500 });
      setItemsByDevice((prev) => ({ ...prev, [deviceId]: res.items || [] }));
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Không tải được danh sách đơn vị");
      setItemsByDevice((prev) => ({ ...prev, [deviceId]: [] }));
    } finally {
      setItemsLoading((prev) => ({ ...prev, [deviceId]: false }));
    }
  }, []);

  const fetchDevices = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const params = {
        limit: "all",
      };
      const response = await getSupplierDevices(user.id, params);
      setDevices(response.devices || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 1);
    } catch (error) {
      console.error("Error fetching devices:", error);
      toast.error("Không tải được danh sách thiết bị");
      setDevices([]);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  const toggleExpand = (deviceId) => {
    setExpanded((prev) => {
      const nextOpen = !prev[deviceId];
      if (nextOpen) loadItems(deviceId);
      else {
        setAddFormFor((f) => {
          if (f === deviceId) {
            setAddImageFiles([]);
            return null;
          }
          return f;
        });
      }
      return { ...prev, [deviceId]: nextOpen };
    });
  };

  const onOpenAddForm = (e, deviceId) => {
    e.stopPropagation();
    setExpanded((prev) => ({ ...prev, [deviceId]: true }));
    loadItems(deviceId);
    setAddFormFor(deviceId);
    setAddImageFiles([]);
    setAddDraft({
      serialNumber: "",
      internalCode: "",
      condition: "GOOD",
      locationNote: "",
    });
  };

  const onCancelAddForm = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    closeAddModal();
  };

  const onPickItemImages = (e) => {
    const picked = Array.from(e.target.files || []).filter((f) => /^image\//.test(f.type));
    setAddImageFiles((prev) => [...prev, ...picked].slice(0, MAX_ITEM_IMAGES));
    e.target.value = "";
  };

  const removeItemImageAt = (idx) => {
    setAddImageFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const onSubmitAddItem = async (e, deviceId) => {
    e.preventDefault();
    e.stopPropagation();
    setAddSubmitting(true);
    try {
      const payload = {
        serialNumber: addDraft.serialNumber.trim() || undefined,
        internalCode: addDraft.internalCode.trim() || undefined,
        condition: addDraft.condition,
      };
      const note = addDraft.locationNote.trim();
      if (note) payload.location = { note };
      const files = addImageFiles.length ? addImageFiles : null;
      await createDeviceItemForSupplier(deviceId, payload, files);
      toast.success("Đã thêm đơn vị vào kho");
      closeAddModal();
      await loadItems(deviceId);
      await fetchDevices();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thêm được đơn vị");
    } finally {
      setAddSubmitting(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // Search & Stock Filtering (client-side)
  const filteredDevices = useMemo(() => {
    let result = devices;

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((d) =>
        d.name.toLowerCase().includes(lowerSearch) ||
        (d.sku || d.code || "").toLowerCase().includes(lowerSearch)
      );
    }

    // Stock filter
    result = result.filter((device) => {
      const totalUnits = device.stockQuantity || 0;
      if (stockFilter === "ALL") return true;
      if (stockFilter === "OUT_OF_STOCK") return totalUnits === 0;
      if (stockFilter === "LOW_STOCK") {
        return totalUnits > 0 && totalUnits <= LOW_STOCK_THRESHOLD;
      }
      return totalUnits > LOW_STOCK_THRESHOLD;
    });

    return result;
  }, [devices, searchTerm, stockFilter]);

  // Pagination calculation (client-side)
  const stockFilteredDevices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredDevices.slice(start, start + pageSize);
  }, [filteredDevices, page, pageSize]);

  const totalPagesCount = Math.ceil(filteredDevices.length / pageSize);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [searchTerm, stockFilter]);

  const inventorySummary = useMemo(() => {
    return devices.reduce(
      (acc, device) => {
        // stockQuantity trên Device = tổng DeviceItem (đã sync), không cộng thêm rented
        const total = device.stockQuantity || 0;
        const rented = device.rentedQuantity || 0;
        const available =
          typeof device.availableQuantity === "number"
            ? device.availableQuantity
            : Math.max(0, total - rented);
        acc.totalProducts += 1;
        acc.totalUnits += total;
        acc.availableUnits += available;
        acc.rentedUnits += rented;
        acc.maintenanceUnits += device.maintenanceCount || 0;
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

  const addModalProduct = useMemo(() => {
    if (!addFormFor) return null;
    return devices.find((d) => String(d._id) === String(addFormFor)) || null;
  }, [devices, addFormFor]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
            Quản lý Kho hàng
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Theo dõi số lượng và trạng thái thiết bị — mở từng dòng để xem serial / thêm đơn vị.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/supplier/devices/new")}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-primary to-primary-dark text-white rounded-2xl font-semibold shadow-lg shadow-primary/30 hover:shadow-lg hover:shadow-primary/40 transition-all hover:scale-105 active:scale-95"
        >
          <FiPlus size={20} />
          <span>Thêm sản phẩm</span>
        </button>
      </div>

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

      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {!isLoading && (
        <>
          <div className="space-y-3 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <div className="relative flex-1">
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Tìm kiếm theo tên sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {STOCK_FILTERS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
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
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-900">Danh sách kho</h3>
              <p className="text-sm text-slate-500">
                Quản lý số lượng thiết bị cho mỗi sản phẩm
              </p>
            </div>
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500">
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
                  const rentedUnits = device.rentedQuantity || 0;
                  const availableUnits =
                    typeof device.availableQuantity === "number"
                      ? device.availableQuantity
                      : Math.max(0, totalUnits - rentedUnits);
                  const maintenanceUnits = device.maintenanceCount || 0;
                  const statusCfg = DEVICE_STATUS_CONFIG[device.status];
                  const sku = device.sku || device.code || device._id?.slice(-6) || "N/A";
                  const isOpen = !!expanded[device._id];
                  const deviceItems = itemsByDevice[device._id];
                  const loadingItems = !!itemsLoading[device._id];

                  return (
                    <Fragment key={device._id}>
                      <tr
                        className={
                          isOpen ? "bg-primary/[0.04] hover:bg-primary/[0.06]" : "hover:bg-slate-50"
                        }
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleExpand(device._id)}
                              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                              aria-expanded={isOpen}
                              aria-label={isOpen ? "Thu gọn" : "Mở danh sách đơn vị"}
                            >
                              {isOpen ? <FiChevronDown size={18} /> : <FiChevronRight size={18} />}
                            </button>
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                <img
                                  src={device.images?.[0] || "https://via.placeholder.com/150"}
                                  alt={device.name}
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-slate-900">{device.name}</p>
                                <p className="truncate text-xs text-slate-500">{device.category}</p>
                              </div>
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
                              title="Sắp có"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-400 cursor-not-allowed bg-white"
                            >
                              <FiMinus size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => onOpenAddForm(e, device._id)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary hover:bg-primary/15"
                              title="Thêm đơn vị"
                            >
                              <FiPlus size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                      {isOpen && (
                        <tr className="bg-slate-50/80">
                          <td colSpan={8} className="border-t border-slate-100 px-4 py-4">
                            <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                                <h4 className="text-sm font-semibold text-slate-900">
                                  Đơn vị vật lý (serial)
                                </h4>
                                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                                  {loadingItems && (!deviceItems || deviceItems.length === 0)
                                    ? "…"
                                    : deviceItems?.length ?? 0}{" "}
                                  dòng
                                </span>
                              </div>

                              {loadingItems && (!deviceItems || deviceItems.length === 0) ? (
                                <p className="text-sm text-slate-500">Đang tải...</p>
                              ) : !deviceItems || deviceItems.length === 0 ? (
                                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center text-sm text-slate-500">
                                  Chưa có đơn vị. Nhấn + ở cột Điều chỉnh để thêm.
                                </p>
                              ) : (
                                <div className="overflow-x-auto rounded-lg border border-slate-100">
                                  <table className="w-full min-w-[640px] text-sm">
                                    <thead className="text-slate-500">
                                      <tr className="border-b border-slate-100 bg-slate-50/80 text-left">
                                        <th className="px-3 py-2 font-semibold">Serial</th>
                                        <th className="px-3 py-2 font-semibold">Mã NB</th>
                                        <th className="px-3 py-2 font-semibold">Ảnh</th>
                                        <th className="px-3 py-2 font-semibold">Trạng thái</th>
                                        <th className="px-3 py-2 font-semibold">Tình trạng</th>
                                        <th className="px-3 py-2 font-semibold whitespace-nowrap">Tạo</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {deviceItems.map((u) => (
                                          <tr key={u._id} className="bg-white hover:bg-slate-50">
                                            <td className="px-3 py-2.5 font-mono text-xs text-slate-800">
                                              {u.serialNumber || "—"}
                                            </td>
                                            <td className="px-3 py-2.5 font-mono text-xs text-slate-600">
                                              {u.internalCode || "—"}
                                            </td>
                                            <td className="px-3 py-2.5">
                                              {u.images?.length ? (
                                                <div className="flex flex-wrap gap-1.5">
                                                  {u.images.slice(0, 3).map((src, i) => (
                                                    <a
                                                      key={i}
                                                      href={src}
                                                      target="_blank"
                                                      rel="noopener noreferrer"
                                                      className="block shrink-0 rounded-md ring-1 ring-slate-200"
                                                    >
                                                      <img
                                                        src={src}
                                                        alt=""
                                                        className="h-8 w-8 rounded-md object-cover"
                                                      />
                                                    </a>
                                                  ))}
                                                  {u.images.length > 3 ? (
                                                    <span className="self-center text-xs text-slate-500">
                                                      +{u.images.length - 3}
                                                    </span>
                                                  ) : null}
                                                </div>
                                              ) : (
                                                <span className="text-slate-400">—</span>
                                              )}
                                            </td>
                                            <td className="px-3 py-2.5">
                                              <span
                                                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                                                  ITEM_STATUS_CLASS[u.status] ||
                                                  "bg-slate-100 text-slate-600 border border-slate-200"
                                                }`}
                                              >
                                                {ITEM_STATUS_VI[u.status] || u.status}
                                              </span>
                                            </td>
                                            <td className="px-3 py-2.5 text-slate-600">
                                              {CONDITION_VI[u.condition] || u.condition || "—"}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-2.5 text-xs text-slate-500">
                                              {u.createdAt ? formatDate(u.createdAt) : "—"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
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

          {devices.length > 0 && (
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
                  type="button"
                  className="px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-sm font-medium"
                  disabled={page === 1}
                  onClick={() => setPage(1)}
                >
                  Đầu
                </button>
                <button
                  type="button"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  Trước
                </button>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-semibold text-slate-900">{page}</span>
                  <span className="text-sm text-slate-500">/ {totalPagesCount}</span>
                </div>
                <button
                  onClick={() => setPage(p => Math.min(totalPagesCount, p + 1))}
                  disabled={page === totalPagesCount || totalPagesCount === 0}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  Sau
                </button>
                <button
                  onClick={() => setPage(totalPagesCount)}
                  disabled={page === totalPagesCount || totalPagesCount === 0}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
                >
                  Cuối
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {addFormFor && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-device-item-modal-title"
        >
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
            onClick={closeAddModal}
            aria-hidden
          />
          <div
            className="relative z-10 flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-primary/[0.06] to-white px-5 py-4">
              <div className="min-w-0">
                <h3
                  id="add-device-item-modal-title"
                  className="font-display text-lg font-bold tracking-tight text-slate-900"
                >
                  Thêm đơn vị mới
                </h3>
                <p className="mt-0.5 truncate text-sm text-slate-600">
                  {addModalProduct?.name || "Sản phẩm"}
                  {addModalProduct?.category ? (
                    <span className="text-slate-400"> · {addModalProduct.category}</span>
                  ) : null}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Tối đa {MAX_ITEM_IMAGES} ảnh, upload Cloudinary
                </p>
              </div>
              <button
                type="button"
                onClick={closeAddModal}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                aria-label="Đóng"
              >
                <FiX size={20} />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <form
                onSubmit={(e) => onSubmitAddItem(e, addFormFor)}
                className="space-y-4"
              >
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">
                      Serial nhà sản xuất
                    </span>
                    <input
                      type="text"
                      value={addDraft.serialNumber}
                      onChange={(e) =>
                        setAddDraft((d) => ({ ...d, serialNumber: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="VD: SN trên thân máy, IMEI…"
                      autoComplete="off"
                    />
                    <p className="mt-1 text-[11px] leading-snug text-slate-500">
                      Là &quot;mã của máy&quot; do hãng gắn — duy nhất toàn hệ thống nếu bạn nhập.
                    </p>
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium text-slate-600">
                      Mã nội bộ (của cửa hàng)
                    </span>
                    <input
                      type="text"
                      value={addDraft.internalCode}
                      onChange={(e) =>
                        setAddDraft((d) => ({ ...d, internalCode: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="VD: CAM-014, KỆ-A-12"
                      autoComplete="off"
                    />
                    <p className="mt-1 text-[11px] leading-snug text-slate-500">
                      Bạn tự đặt để nhận diện chiếc này trong kho; không nhất thiết trùng seri in trên máy.
                    </p>
                  </label>
                  <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                    Tình trạng
                    <select
                      value={addDraft.condition}
                      onChange={(e) =>
                        setAddDraft((d) => ({ ...d, condition: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    >
                      {Object.entries(CONDITION_VI).map(([val, label]) => (
                        <option key={val} value={val}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-medium text-slate-600 sm:col-span-2">
                    Ghi chú vị trí / kho
                    <input
                      type="text"
                      value={addDraft.locationNote}
                      onChange={(e) =>
                        setAddDraft((d) => ({ ...d, locationNote: e.target.value }))
                      }
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="Tùy chọn"
                    />
                  </label>
                  <div className="sm:col-span-2">
                    <span className="block text-xs font-medium text-slate-600">Ảnh đơn vị</span>
                    <label className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:border-primary/40 hover:bg-primary/5">
                      <FiImage size={18} />
                      Chọn ảnh
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/jpg"
                        multiple
                        className="hidden"
                        onChange={onPickItemImages}
                        disabled={
                          addImageFiles.length >= MAX_ITEM_IMAGES || addSubmitting
                        }
                      />
                    </label>
                    {addImageFiles.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {addImageFiles.map((file, idx) => (
                          <div
                            key={`${file.name}-${idx}`}
                            className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200"
                          >
                            <img
                              src={itemImagePreviewUrls[idx]}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeItemImageAt(idx)}
                              className="absolute right-0.5 top-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                              aria-label="Xóa ảnh"
                            >
                              <FiX size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={onCancelAddForm}
                    className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={addSubmitting}
                    className="rounded-xl bg-gradient-to-r from-primary to-primary-dark px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-50"
                  >
                    {addSubmitting ? "Đang lưu…" : "Thêm đơn vị"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
