import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { getSupplierDevices, deleteDevice } from "../../service/ApiService/DeviceApi";
import { DEVICE_STATUS_CONFIG } from "../../utils/deviceStatus";
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiEye,
  FiSearch,
  FiMoreVertical,
  FiBox,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { confirmDialog } from "../../utils/confirmDialog";

const CATEGORIES = [
  "ALL",
  "CAMERA",
  "AUDIO",
  "OFFICE",
  "GAMING",
  "ACCESSORY",
  "LIGHTING",
  "DRONE",
  "OTHER",
];
const STATUS_OPTIONS = [
  { value: "ALL", label: "Tất cả trạng thái" },
  { value: "AVAILABLE", label: "Sẵn sàng" },
  { value: "SUSPICIOUS", label: "Cần kiểm tra" },
  { value: "STOPPED", label: "Đã ẩn" },
  { value: "DISCONTINUED", label: "Ngừng kinh doanh" },
];
const SORT_OPTIONS = [
  { value: "createdAt", label: "Mới nhất" },
  { value: "name", label: "Tên A-Z" },
  { value: "-name", label: "Tên Z-A" },
  { value: "rentPrice.perDay", label: "Giá Thấp-Cao" },
  { value: "-rentPrice.perDay", label: "Giá Cao-Thấp" },
  { value: "ratingAvg", label: "Đánh giá Cao-Thấp" },
];
const PAGE_SIZES = [5, 10, 20];
const CATEGORY_LABELS = {
  CAMERA: "Máy ảnh",
  AUDIO: "Âm thanh",
  OFFICE: "Văn phòng",
  GAMING: "Trò chơi",
  ACCESSORY: "Phụ kiện",
  LIGHTING: "Ánh sáng",
  DRONE: "Flycam",
  OTHER: "Khác",
};

const formatCurrency = (value) => {
  if (typeof value !== "number") return "0";
  return new Intl.NumberFormat("vi-VN").format(value);
};

export default function SupplierDevicesList() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user.account);
  const [devices, setDevices] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [category, setCategory] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("createdAt");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [failedImages, setFailedImages] = useState(new Set());

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
      setFailedImages(new Set()); // reset khi load trang mới
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

  useEffect(() => {
    if (!openMenuId) return;
    const handleClickOutside = (event) => {
      if (!event.target.closest(`[data-menu-id="${openMenuId}"]`)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [openMenuId]);

  const handleDeleteDevice = async (device) => {
    const result = await confirmDialog({
      title: "Xóa thiết bị?",
      text: `Bạn có chắc chắn muốn xóa "${device.name}"? Hành động này không thể hoàn tác!`,
      icon: "warning",
      confirmText: "Có, xóa nó!",
      cancelText: "Hủy",
      confirmColor: "#d33",
      cancelColor: "#3085d6",
    });
    if (result.isConfirmed) {
      try {
        await deleteDevice(device._id || device.id);
        toast.success("Xóa thiết bị thành công!");
        fetchDevices();
      } catch (error) {
        toast.error(error?.response?.data?.message || "Xóa thiết bị thất bại");
      }
    }
  };

  const filteredDevices = searchTerm
    ? devices.filter((d) =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : devices;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
            Danh sách sản phẩm
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Quản lý tất cả sản phẩm công nghệ của bạn
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

      <div className="space-y-3 bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
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
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="min-w-[180px] rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 bg-white hover:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 bg-white hover:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c === "ALL" ? "Tất cả danh mục" : CATEGORY_LABELS[c] || c}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 bg-white hover:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Hiển thị</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-900 bg-white hover:border-primary/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      )}

      {!isLoading && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h3 className="text-lg font-semibold text-slate-900">Danh sách sản phẩm</h3>
            <p className="text-sm text-slate-500">
              Hiển thị {filteredDevices.length} / {total} sản phẩm
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-500">
                <tr className="text-left">
                  <th className="px-4 py-3 font-semibold">Hình ảnh</th>
                  <th className="px-4 py-3 font-semibold">Tên sản phẩm</th>
                  <th className="px-4 py-3 font-semibold">Danh mục</th>
                  <th className="px-4 py-3 font-semibold">Giá thuê</th>
                  <th className="px-4 py-3 font-semibold text-center">Kho</th>
                  <th className="px-4 py-3 font-semibold text-center">Lượt thuê</th>
                  <th className="px-4 py-3 font-semibold text-center">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredDevices.map((device) => {
                  const statusCfg = DEVICE_STATUS_CONFIG[device.status];
                  return (
                    <tr key={device._id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center">
                          {device.images?.[0] && !failedImages.has(device.images[0]) ? (
                            <img
                              src={device.images[0]}
                              alt={device.name}
                              className="h-full w-full object-cover"
                              onError={() => {
                                setFailedImages((prev) => new Set(prev).add(device.images[0]));
                              }}
                            />
                          ) : (
                            <FiBox className="text-slate-300" size={20} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{device.name}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {CATEGORY_LABELS[device.category] || device.category}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatCurrency(device.rentPrice?.perDay || 0)}đ/ngày
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex min-w-[28px] justify-center rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                          {device.stockQuantity || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-slate-700 font-semibold">
                          {device.rentalCount || device.totalRentals || 0}
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
                        <div
                          className="relative inline-flex"
                          data-menu-id={device._id}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuId((prev) =>
                                prev === device._id ? null : device._id
                              )
                            }
                            className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 transition"
                            aria-label="Hành động"
                          >
                            <FiMoreVertical size={16} />
                          </button>

                          {openMenuId === device._id && (
                            <div className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-200 bg-white shadow-lg z-10">
                              <button
                                type="button"
                              onClick={() => {
                                navigate(`/supplier/devices/${device._id || device.id}`);
                                setOpenMenuId(null);
                              }}
                                className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <FiEye size={16} />
                                Xem chi tiết
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  navigate(`/supplier/devices/${device._id || device.id}/edit`);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <FiEdit2 size={16} />
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  handleDeleteDevice(device);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <FiTrash2 size={16} />
                                Xóa
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredDevices.length === 0 && (
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
