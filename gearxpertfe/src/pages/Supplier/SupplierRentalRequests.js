import {
  FiX,
  FiClock,
  FiRotateCw,
  FiAlertTriangle,
  FiEye,
  FiSearch,
  FiFilter,
  FiTruck,
  FiCheckCircle,
} from "react-icons/fi";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { getSupplierRentalRequests } from "../../service/ApiService/RentalApi";
import {
  rejectRental,
  startDelivery,
} from "../../service/ApiService/RentalActionApi";
import { toast } from "react-toastify";
import { confirmDialog } from "../../utils/confirmDialog";
import RentalDetail from "../../components/common/RentalDetail";
import RejectRentalModal from "../../components/supplier/RejectRentalModal";

const STATUS_LABELS = {
  PENDING: "Chờ xử lý",
  DELIVERING: "Đang giao",
  RENTING: "Đang thuê",
  RETURNING: "Đang trả",
  INSPECTING: "Đang kiểm tra",
  PENDING_RESOLUTION: "Sự cố / Chờ giải quyết",
  COMPLETED: "Đã trả",
  REJECTED: "Từ chối",
  CANCELLED: "Đã hủy",
};

const STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  DELIVERING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  RENTING: "bg-indigo-50 text-indigo-700 border-indigo-200",
  RETURNING: "bg-purple-50 text-purple-700 border-purple-200",
  INSPECTING: "bg-slate-50 text-slate-700 border-slate-200",
  PENDING_RESOLUTION: "bg-red-50 text-red-700 border-red-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  CANCELLED: "bg-red-50 text-red-700 border-red-200",
};

const STATUS_GROUPS = {
  PENDING: ["PENDING"],
  RENTING: [
    "DELIVERING",
    "RENTING",
    "RETURNING",
    "INSPECTING",
    "PENDING_RESOLUTION",
  ],
  RETURNED: ["COMPLETED"],
  CANCELLED: ["CANCELLED", "REJECTED"],
};

const TABS = [
  { key: "ALL", label: "Tất cả", statuses: [] },
  { key: "PENDING", label: "Chờ xử lý", statuses: STATUS_GROUPS.PENDING },
  { key: "RENTING", label: "Đang thuê", statuses: STATUS_GROUPS.RENTING },
  { key: "RETURNED", label: "Đã trả", statuses: STATUS_GROUPS.RETURNED },
  {
    key: "CANCELLED",
    label: "Hủy / Từ chối",
    statuses: STATUS_GROUPS.CANCELLED,
  },
];

const formatMoney = (value) =>
  new Intl.NumberFormat("vi-VN").format(value || 0);

const formatDate = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

/** Trùng logic BE `isRentalPeriodStillOpenForDelivery`: hết ngày trả → không giao được */
const isRentalPeriodOpenForDelivery = (rental) => {
  const items = rental?.rentalItems;
  if (!items?.length) return false;
  const now = Date.now();
  let latestEndEod = 0;
  for (const it of items) {
    const d = new Date(it.rentalEndDate);
    if (Number.isNaN(d.getTime())) continue;
    const eod = new Date(d);
    eod.setHours(23, 59, 59, 999);
    latestEndEod = Math.max(latestEndEod, eod.getTime());
  }
  return latestEndEod >= now;
};

const getRentalCode = (rental, index) => {
  if (rental.orderCode) {
    return `BK${String(rental.orderCode).padStart(4, "0")}`;
  }
  if (rental._id) {
    return `BK${rental._id.slice(-4).toUpperCase()}`;
  }
  return `BK${String(index + 1).padStart(4, "0")}`;
};

const getPrimaryItem = (rental) => {
  const items = rental.rentalItems || [];
  return items[0] || null;
};

// Trạng thái giao hàng dựa trên dữ liệu thực của rental
const getDeliveryTimeline = (rental) => {
  const pickedUpAt = rental?.pickedUpAt;
  const deliveredAt = rental?.deliveredAt;
  return [
    {
      status: "Nhận đơn từ nhà cung cấp",
      time: rental?.updatedAt ? new Date(rental.updatedAt).toISOString() : null,
      location: "Kho thiết bị - Nhà cung cấp",
      done: true,
    },
    {
      status: "Đang lấy hàng (Pickup)",
      time: pickedUpAt ? new Date(pickedUpAt).toISOString() : null,
      location: "Kho thiết bị - Nhà cung cấp",
      done: !!pickedUpAt,
    },
    {
      status: "Đang di chuyển đến khách hàng",
      time: pickedUpAt ? new Date(pickedUpAt).toISOString() : null,
      location: "Đang trên đường đến địa chỉ khách",
      done: !!pickedUpAt,
    },
    {
      status: "Đã giao thành công",
      time: deliveredAt ? new Date(deliveredAt).toISOString() : null,
      location: "Địa chỉ khách hàng",
      done: !!deliveredAt,
    },
  ];
};

export default function SupplierRentalRequests() {
  const user = useSelector((state) => state.user.account);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const rentalFromNotif = searchParams.get("rental");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listFetched, setListFetched] = useState(false);
  const [activeTab, setActiveTab] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [detailModal, setDetailModal] = useState({ open: false, rental: null });
  const [rejectModal, setRejectModal] = useState({ open: false, rental: null });
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [deliveryModal, setDeliveryModal] = useState({
    open: false,
    rental: null,
  });

  const fetchRequests = useCallback(async () => {
    if (!user?.id) {
      setListFetched(true);
      return;
    }
    setLoading(true);
    try {
      const res = await getSupplierRentalRequests(user.id, {
        status:
          "PENDING,REJECTED,DELIVERING,RENTING,RETURNING,INSPECTING,PENDING_RESOLUTION,COMPLETED,CANCELLED",
      });
      setRequests(res?.rentals || []);
    } catch (error) {
      toast.error(
        error?.response?.data?.message || "Không tải được danh sách đơn hàng",
      );
      setRequests([]);
    } finally {
      setLoading(false);
      setListFetched(true);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (!rentalFromNotif || !listFetched || loading) return;
    const clearParam = () =>
      navigate("/supplier/rental-requests", { replace: true });

    const found = requests.find(
      (r) => String(r._id) === String(rentalFromNotif),
    );
    if (found) {
      setDetailModal({ open: true, rental: found });
    } else if (requests.length > 0) {
      toast.info("Không tìm thấy đơn trong danh sách.");
    }
    clearParam();
  }, [rentalFromNotif, listFetched, loading, requests, navigate]);

  const handleStartDelivery = async (rental) => {
    if (!isRentalPeriodOpenForDelivery(rental)) {
      toast.error(
        "Kỳ thuê đã kết thúc theo lịch đặt. Vui lòng từ chối đơn hoặc liên hệ khách hàng để đặt lại.",
      );
      return;
    }
    const result = await confirmDialog({
      title: "Xác nhận bắt đầu giao hàng?",
      text: "Đơn hàng sẽ chuyển sang trạng thái ĐANG GIAO và hợp đồng giao hàng sẽ được tạo.",
      icon: "truck",
      confirmText: "Bắt đầu giao",
      cancelText: "Hủy",
      confirmColor: "#2563eb",
    });

    if (!result.isConfirmed) return;

    try {
      await startDelivery(rental._id);
      toast.success("Đã bắt đầu giao hàng!");
      fetchRequests();
    } catch (err) {
      toast.error(
        err?.response?.data?.message || "Không thể bắt đầu giao hàng",
      );
    }
  };

  const handleReject = (rental) => {
    setRejectModal({ open: true, rental });
  };

  const submitReject = async (payload) => {
    if (!rejectModal.rental?._id) return;

    const result = await confirmDialog({
      title: "Xác nhận từ chối đơn?",
      text: "Khách hàng sẽ nhận thông báo và đơn hàng bị hủy.",
      icon: "warning",
      confirmText: "Từ chối",
      cancelText: "Hủy",
      confirmColor: "#dc2626",
    });

    if (!result.isConfirmed) return;

    setRejectSubmitting(true);
    try {
      await rejectRental(rejectModal.rental._id, payload);
      toast.success("Đã từ chối đơn hàng!");
      setRejectModal({ open: false, rental: null });
      fetchRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Từ chối thất bại");
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleViewDeliveryStatus = (rental) => {
    setDeliveryModal({ open: true, rental });
  };

  const counts = useMemo(() => {
    const base = {
      ALL: requests.length,
      PENDING: 0,
      RENTING: 0,
      RETURNED: 0,
      CANCELLED: 0,
    };
    requests.forEach((r) => {
      if (STATUS_GROUPS.PENDING.includes(r.status)) base.PENDING += 1;
      if (STATUS_GROUPS.RENTING.includes(r.status)) base.RENTING += 1;
      if (STATUS_GROUPS.RETURNED.includes(r.status)) base.RETURNED += 1;
      if (STATUS_GROUPS.CANCELLED.includes(r.status)) base.CANCELLED += 1;
    });
    return base;
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const tab = TABS.find((t) => t.key === activeTab);
    return requests
      .filter((rental) => {
        if (!tab || tab.statuses.length === 0) return true;
        return tab.statuses.includes(rental.status);
      })
      .filter((rental) => {
        if (!term) return true;
        const primaryItem = getPrimaryItem(rental);
        const productName = primaryItem?.deviceId?.name || "";
        const customerName = rental.customerId?.fullName || "";
        const phone = rental.phoneNumber || "";
        const code = getRentalCode(rental, 0);
        return [code, productName, customerName, phone]
          .join(" ")
          .toLowerCase()
          .includes(term);
      });
  }, [requests, activeTab, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm]);

  const pagedRequests = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, page, pageSize]);

  if (loading && requests.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <span className="ml-3 text-slate-500 font-medium">
          Đang tải dữ liệu...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
          Quản lý đơn thuê
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Xử lý yêu cầu thuê thiết bị từ khách hàng
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 inline-flex items-center justify-center">
            <FiClock size={18} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Chờ xử lý</p>
            <p className="text-lg font-bold text-slate-900">{counts.PENDING}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-indigo-50 text-indigo-600 inline-flex items-center justify-center">
            <FiRotateCw size={18} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Đang thuê</p>
            <p className="text-lg font-bold text-slate-900">{counts.RENTING}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-green-50 text-green-600 inline-flex items-center justify-center">
            <FiCheckCircle size={18} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Đã trả</p>
            <p className="text-lg font-bold text-slate-900">
              {counts.RETURNED}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
          <span className="h-10 w-10 rounded-xl bg-red-50 text-red-600 inline-flex items-center justify-center">
            <FiAlertTriangle size={18} />
          </span>
          <div>
            <p className="text-xs text-slate-500">Hủy / Từ chối</p>
            <p className="text-lg font-bold text-slate-900">
              {counts.CANCELLED}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Danh sách đơn thuê
            </h3>
            <p className="text-sm text-slate-500">Tổng {requests.length} đơn</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <FiSearch
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm mã đơn, sản phẩm, khách hàng..."
                className="pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <button className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <FiFilter size={16} />
              Lọc
            </button>
          </div>
        </div>

        <div className="px-4 pt-2">
          <div className="inline-flex flex-wrap gap-2 rounded-xl bg-slate-50 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold border transition-all ${
                  activeTab === tab.key
                    ? "bg-white text-slate-900 border-slate-200 shadow-sm"
                    : "bg-transparent text-slate-600 border-transparent hover:text-slate-900"
                }`}
              >
                {tab.label}{" "}
                <span className="ml-2 text-xs text-slate-500">
                  {counts[tab.key] || 0}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-slate-500 border-b border-slate-200">
              <tr className="text-left">
                <th className="px-4 py-3 font-semibold">Mã đơn</th>
                <th className="px-4 py-3 font-semibold">Sản phẩm</th>
                <th className="px-4 py-3 font-semibold">Khách hàng</th>
                <th className="px-4 py-3 font-semibold">Thời gian thuê</th>
                <th className="px-4 py-3 font-semibold">Tiền thuê</th>
                <th className="px-4 py-3 font-semibold">Đặt cọc</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold text-left">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pagedRequests.map((rental, index) => {
                const primaryItem = getPrimaryItem(rental);
                const deviceName = primaryItem?.deviceId?.name || "Thiết bị";
                const extraCount = (rental.rentalItems?.length || 0) - 1;
                const rentalStart =
                  primaryItem?.rentalStartDate || rental.rentalStartDate;
                const rentalEnd =
                  primaryItem?.rentalEndDate || rental.rentalEndDate;
                const statusLabel =
                  rental.status === "DELIVERING" && rental.deliveredAt
                    ? "Đã giao thành công (chờ xác nhận)"
                    : STATUS_LABELS[rental.status] || rental.status;
                const statusClass =
                  rental.status === "DELIVERING" && rental.deliveredAt
                    ? "bg-teal-50 text-teal-700 border-teal-200"
                    : STATUS_STYLES[rental.status] || STATUS_STYLES.INSPECTING;
                const code = getRentalCode(
                  rental,
                  index + (page - 1) * pageSize,
                );
                const canStartDelivery = isRentalPeriodOpenForDelivery(rental);

                return (
                  <tr
                    key={rental._id || rental.id}
                    className="hover:bg-slate-50"
                  >
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {code}
                    </td>
                    <td className="px-4 py-4 text-slate-900">
                      <span className="font-medium">{deviceName}</span>
                      {extraCount > 0 && (
                        <span className="text-xs text-slate-500 ml-2">
                          +{extraCount} khác
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-slate-900">
                        {rental.customerId?.fullName || "Khách hàng"}
                      </div>
                      <div className="text-xs text-slate-500">
                        {rental.phoneNumber || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {formatDate(rentalStart)} - {formatDate(rentalEnd)}
                    </td>
                    <td className="px-4 py-4 font-semibold text-slate-900">
                      {formatMoney(rental.rentPriceTotal)} ₫
                    </td>
                    <td className="px-4 py-4 text-slate-700">
                      {formatMoney(rental.depositAmount)} ₫
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold border ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    </td>
                    <td className="px-4 py-4 align-middle text-left">
                      <div className="inline-flex items-center justify-start gap-3">
                        <button
                          onClick={() => setDetailModal({ open: true, rental })}
                          className="text-slate-500 hover:text-slate-900"
                          title="Xem chi tiết"
                        >
                          <FiEye size={16} />
                        </button>

                        {rental.status === "PENDING" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStartDelivery(rental)}
                              disabled={!canStartDelivery}
                              className={
                                canStartDelivery
                                  ? "text-blue-600 hover:text-blue-700"
                                  : "text-slate-300 cursor-not-allowed"
                              }
                              title={
                                canStartDelivery
                                  ? "Bắt đầu giao hàng"
                                  : "Kỳ thuê đã hết hạn — không thể bắt đầu giao. Có thể từ chối đơn."
                              }
                            >
                              <FiTruck size={16} />
                            </button>
                            <button
                              onClick={() => handleReject(rental)}
                              className="text-red-600 hover:text-red-700"
                              title="Từ chối"
                            >
                              <FiX size={16} />
                            </button>
                          </>
                        )}

                        {rental.status === "DELIVERING" && (
                          <button
                            onClick={() => handleViewDeliveryStatus(rental)}
                            className="text-indigo-600 hover:text-indigo-800"
                            title="Xem trạng thái giao hàng"
                          >
                            <FiTruck size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredRequests.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Không tìm thấy đơn hàng phù hợp
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    Đang tải...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredRequests.length > 0 && (
          <div className="flex items-center justify-between px-4 py-4 border-t border-slate-100 text-sm text-slate-600">
            <span>
              Hiển thị {(page - 1) * pageSize + 1}-
              {Math.min(page * pageSize, filteredRequests.length)} /{" "}
              {filteredRequests.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Trước
              </button>
              <span className="text-slate-500">
                Trang {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPage((prev) => Math.min(totalPages, prev + 1))
                }
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      <RejectRentalModal
        open={rejectModal.open}
        rental={rejectModal.rental}
        onClose={() => setRejectModal({ open: false, rental: null })}
        onSubmit={submitReject}
        isSubmitting={rejectSubmitting}
      />

      <RentalDetail
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, rental: null })}
        rental={detailModal.rental}
      />

      {/* Modal xem trạng thái giao hàng (fake) */}
      {deliveryModal.open && deliveryModal.rental && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-xl font-bold text-slate-900">
                Trạng thái giao hàng - {getRentalCode(deliveryModal.rental)}
              </h3>
              <button
                onClick={() => setDeliveryModal({ open: false, rental: null })}
                className="text-slate-500 hover:text-slate-700"
              >
                <FiX size={24} />
              </button>
            </div>

            <div className="space-y-6 py-2">
              {getDeliveryTimeline(deliveryModal.rental).map((step, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                      step.done
                        ? "bg-green-100 text-green-600 border-2 border-green-300"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {step.done ? (
                      <FiCheckCircle size={20} />
                    ) : (
                      <FiClock size={20} />
                    )}
                  </div>

                  <div className="flex-1 pt-1">
                    <p
                      className={`font-medium ${step.done ? "text-green-700" : "text-slate-800"}`}
                    >
                      {step.status}
                    </p>
                    {step.time && (
                      <p className="text-sm text-slate-500 mt-0.5">
                        {formatDateTime(step.time)}
                      </p>
                    )}
                    {step.location && (
                      <p className="text-sm text-slate-600 mt-1 italic">
                        {step.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={() => setDeliveryModal({ open: false, rental: null })}
                className="px-5 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
