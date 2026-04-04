import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiClock,
  FiMail,
  FiMapPin,
  FiPackage,
  FiPhone,
  FiTruck,
  FiUser,
  FiUserCheck,
  FiX,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { motion } from "framer-motion";
import { getRentalById } from "../../service/ApiService/RentalApi";
import {
  rejectRental,
  startDelivery,
} from "../../service/ApiService/RentalActionApi";
import { confirmDialog } from "../../utils/confirmDialog";
import RejectRentalModal from "../../components/supplier/RejectRentalModal";
import ImageWithFallback from "../../components/common/ImageWithFallback";

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

const getRentalCode = (rental) => {
  if (rental?.orderCode) {
    return `BK${String(rental.orderCode).padStart(4, "0")}`;
  }
  if (rental?._id) {
    return `BK${String(rental._id).slice(-4).toUpperCase()}`;
  }
  return "—";
};

const isRentalPeriodOpenForDelivery = (items) => {
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

const getDeliveryTimeline = (rental) => {
  const pickedUpAt = rental?.pickedUpAt;
  const deliveredAt = rental?.deliveredAt;
  return [
    {
      status: "Nhận đơn từ nhà cung cấp",
      time: rental?.updatedAt ? new Date(rental.updatedAt).toISOString() : null,
      location: "Kho / cửa hàng",
      done: true,
    },
    {
      status: "Đang lấy hàng (Pickup)",
      time: pickedUpAt ? new Date(pickedUpAt).toISOString() : null,
      location: "Kho nhà cung cấp",
      done: !!pickedUpAt,
    },
    {
      status: "Đang di chuyển đến khách",
      time: pickedUpAt ? new Date(pickedUpAt).toISOString() : null,
      location: "Trên đường giao",
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

function unitLabelsFromItem(item) {
  const populated = item.deviceItemIds?.filter(
    (x) => x && typeof x === "object" && (x.serialNumber != null || x.internalCode != null || x._id)
  );
  if (populated?.length) {
    return populated.map((di) => ({
      key: di._id || di,
      label:
        di.serialNumber ||
        di.internalCode ||
        `ID …${String(di._id || di).slice(-6).toUpperCase()}`,
    }));
  }
  const sns = item.serialNumbers;
  if (Array.isArray(sns) && sns.length) {
    return sns.map((sn, i) => ({ key: i, label: sn || "—" }));
  }
  if (item.deviceItemIds?.length) {
    return item.deviceItemIds.map((id, i) => ({
      key: typeof id === "object" ? id._id : id,
      label: `Mã unit …${String(typeof id === "object" ? id._id : id).slice(-6).toUpperCase()}`,
    }));
  }
  return [];
}

const easeOut = [0.22, 1, 0.36, 1];

const fadeUpContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.04 },
  },
};

const fadeUpItem = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: easeOut },
  },
};

const cardHover =
  "rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm shadow-slate-200/40 transition-all duration-300 ease-out hover:border-primary/20 hover:shadow-lg hover:shadow-slate-200/70 hover:-translate-y-0.5";

function RentalDetailSkeleton() {
  return (
    <div className="space-y-6 pb-24">
      <div>
        <Link
          to="/supplier/rental-requests"
          className="group inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary mb-3 transition-colors duration-200"
        >
          <FiArrowLeft
            size={16}
            className="transition-transform duration-200 group-hover:-translate-x-1"
          />
          Quay lại danh sách yêu cầu đặt thuê
        </Link>
        <div className="flex flex-wrap items-center gap-3 mt-1">
          <div className="h-8 w-44 rounded-lg bg-slate-200/90 animate-pulse" />
          <div className="h-7 w-28 rounded-full bg-slate-200/80 animate-pulse" />
        </div>
        <div className="mt-2 h-4 w-64 max-w-full rounded-md bg-slate-100 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((k) => (
          <div
            key={k}
            className="h-36 rounded-2xl border border-slate-200/90 bg-slate-100/70 animate-pulse shadow-sm"
          />
        ))}
      </div>
      <div className="h-28 rounded-2xl border border-slate-200/90 bg-slate-100/70 animate-pulse shadow-sm" />
      <div className="h-52 rounded-2xl border border-slate-200/90 bg-slate-100/70 animate-pulse shadow-sm" />
    </div>
  );
}

export default function SupplierRentalDetailPage() {
  const { rentalId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [rental, setRental] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false });
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const fetchDetail = useCallback(
    async (opts = {}) => {
      const preservePrevious = opts.preservePrevious === true;
      if (!rentalId) return;
      if (!preservePrevious) setRental(null);
      try {
        const res = await getRentalById(rentalId);
        const r = res?.rental;
        if (!r || res?.success === false) {
          toast.error("Không tải được đơn hoặc bạn không có quyền xem.");
          navigate("/supplier/rental-requests", { replace: true });
          return;
        }
        setRental(r);
      } catch (e) {
        toast.error(e?.response?.data?.message || "Không tải được chi tiết đơn.");
        navigate("/supplier/rental-requests", { replace: true });
      }
    },
    [rentalId, navigate],
  );

  useEffect(() => {
    fetchDetail({ preservePrevious: false });
  }, [rentalId, fetchDetail]);

  useEffect(() => {
    if (location.hash === "#tien-do-giao") {
      const el = document.getElementById("supplier-rental-delivery");
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    }
  }, [location.hash, rental]);

  const items = useMemo(
    () => rental?.items || rental?.rentalItems || [],
    [rental]
  );

  const code = useMemo(() => getRentalCode(rental), [rental]);
  const statusLabel =
    rental?.status === "DELIVERING" && rental?.deliveredAt
      ? "Đã giao (chờ xác nhận hệ thống)"
      : STATUS_LABELS[rental?.status] || rental?.status || "—";
  const statusClass =
    rental?.status === "DELIVERING" && rental?.deliveredAt
      ? "bg-teal-50 text-teal-700 border-teal-200"
      : STATUS_STYLES[rental?.status] || STATUS_STYLES.INSPECTING;

  const canStartDelivery = rental?.status === "PENDING" && isRentalPeriodOpenForDelivery(items);

  const handleStartDelivery = async () => {
    if (!rental?._id) return;
    if (!isRentalPeriodOpenForDelivery(items)) {
      toast.error(
        "Kỳ thuê đã kết thúc theo lịch đặt. Vui lòng từ chối đơn hoặc liên hệ khách."
      );
      return;
    }
    const result = await confirmDialog({
      title: "Xác nhận bắt đầu giao hàng?",
      text: "Đơn chuyển sang ĐANG GIAO và hợp đồng giao hàng được tạo.",
      icon: "truck",
      confirmText: "Bắt đầu giao",
      cancelText: "Hủy",
      confirmColor: "#2563eb",
    });
    if (!result.isConfirmed) return;
    try {
      await startDelivery(rental._id);
      toast.success("Đã bắt đầu giao hàng!");
      fetchDetail({ preservePrevious: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể bắt đầu giao hàng");
    }
  };

  const submitReject = async (payload) => {
    if (!rental?._id) return;
    const result = await confirmDialog({
      title: "Xác nhận từ chối đơn?",
      text: "Khách sẽ nhận thông báo và đơn bị hủy.",
      icon: "warning",
      confirmText: "Từ chối",
      cancelText: "Hủy",
      confirmColor: "#dc2626",
    });
    if (!result.isConfirmed) return;
    setRejectSubmitting(true);
    try {
      await rejectRental(rental._id, payload);
      toast.success("Đã từ chối đơn hàng.");
      setRejectModal({ open: false });
      navigate("/supplier/rental-requests", { replace: true });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Từ chối thất bại");
    } finally {
      setRejectSubmitting(false);
    }
  };

  const customer =
    rental?.customerId && typeof rental.customerId === "object"
      ? rental.customerId
      : null;
  const operationStaff =
    rental?.assignedOperationStaffId &&
    typeof rental.assignedOperationStaffId === "object"
      ? rental.assignedOperationStaffId
      : null;
  const showDeliverySection =
    rental &&
    (rental.status === "DELIVERING" ||
      rental.pickedUpAt ||
      rental.deliveredAt);

  if (!rental) {
    return <RentalDetailSkeleton />;
  }

  return (
    <motion.div
      className="space-y-6 pb-24"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35, ease: easeOut }}
    >
      <motion.div
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: easeOut }}
      >
        <div>
          <Link
            to="/supplier/rental-requests"
            className="group inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-primary mb-3 transition-colors duration-200"
          >
            <FiArrowLeft
              size={16}
              className="transition-transform duration-200 group-hover:-translate-x-1"
            />
            Quay lại danh sách yêu cầu đặt thuê
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
              Đơn {code}
            </h1>
            <span
              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border transition-shadow duration-200 hover:shadow-md ${statusClass}`}
            >
              {statusLabel}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Đặt lúc {formatDateTime(rental.createdAt)} · Mã hệ thống{" "}
            <span className="font-mono text-slate-600 text-xs">{String(rental._id)}</span>
          </p>
        </div>
        {rental.status === "PENDING" && (
          <div className="flex flex-wrap gap-2 shrink-0">
            <motion.button
              type="button"
              onClick={handleStartDelivery}
              disabled={!canStartDelivery}
              whileHover={canStartDelivery ? { scale: 1.02 } : undefined}
              whileTap={canStartDelivery ? { scale: 0.98 } : undefined}
              className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-2.5 text-sm font-semibold shadow-md shadow-primary/25 transition-shadow duration-200 hover:shadow-lg hover:shadow-primary/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <FiTruck size={18} />
              Bắt đầu giao hàng
            </motion.button>
            <motion.button
              type="button"
              onClick={() => setRejectModal({ open: true })}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 text-red-700 bg-red-50 px-4 py-2.5 text-sm font-semibold transition-all duration-200 hover:bg-red-100 hover:border-red-300 hover:shadow-md"
            >
              <FiX size={18} />
              Từ chối đơn
            </motion.button>
          </div>
        )}
      </motion.div>

      <motion.div
        className="grid grid-cols-1 lg:grid-cols-3 gap-4"
        variants={fadeUpContainer}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUpItem} className={cardHover}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4 flex items-center gap-2">
            <FiUser className="text-primary" size={16} />
            Khách đặt thuê
          </h2>
          <div className="group/avatar flex gap-4">
            <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 overflow-hidden shrink-0 border border-slate-200/80 shadow-inner transition-transform duration-300 group-hover/avatar:scale-105">
              {customer?.avatar ? (
                <img src={customer.avatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-slate-400 text-xl font-semibold">
                  {(customer?.fullName || rental.phoneNumber || "?").toString().charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">
                {customer?.fullName || "—"}
              </p>
              {customer?.email ? (
                <p className="text-sm text-slate-600 truncate flex items-center gap-1.5 mt-0.5">
                  <FiMail size={14} className="text-slate-400 shrink-0" />
                  {customer.email}
                </p>
              ) : (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1.5 mt-1">
                  Hồ sơ khách chưa đồng bộ — dùng SĐT đơn hàng bên dưới để liên hệ.
                </p>
              )}
              <p className="text-sm text-slate-700 mt-2 flex items-center gap-1.5">
                <FiPhone size={14} className="text-slate-400 shrink-0" />
                <span>
                  <span className="text-slate-500 text-xs block">SĐT trên đơn</span>
                  <span className="font-medium">{rental.phoneNumber || "—"}</span>
                </span>
              </p>
              {customer?.phone && customer.phone !== rental.phoneNumber && (
                <p className="text-xs text-slate-500 mt-1">
                  SĐT tài khoản: {customer.phone}
                </p>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeUpItem} className={cardHover}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4 flex items-center gap-2">
            <FiMapPin className="text-primary" size={16} />
            Địa chỉ nhận hàng
          </h2>
          <p className="font-medium text-slate-900">
            {rental.deliveryAddress?.receiverName || "—"}
          </p>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            {rental.deliveryAddress?.fullAddress || "—"}
          </p>
          {rental.deliveryAddress?.street ||
          rental.deliveryAddress?.district ||
          rental.deliveryAddress?.city ? (
            <p className="text-xs text-slate-500 mt-2">
              {[rental.deliveryAddress?.street, rental.deliveryAddress?.district, rental.deliveryAddress?.city]
                .filter(Boolean)
                .join(", ")}
            </p>
          ) : null}
        </motion.div>

        <motion.div variants={fadeUpItem} className={cardHover}>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4 flex items-center gap-2">
            <FiUserCheck className="text-primary" size={16} />
            Nhân viên vận hành
          </h2>
          {operationStaff ? (
            <div className="flex gap-4">
              <div className="h-14 w-14 rounded-xl bg-indigo-50 overflow-hidden shrink-0 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                {operationStaff.avatar ? (
                  <img src={operationStaff.avatar} alt="" className="h-full w-full object-cover" />
                ) : (
                  (operationStaff.fullName || "?").charAt(0)
                )}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{operationStaff.fullName || "—"}</p>
                {operationStaff.phone && (
                  <p className="text-sm text-slate-600 mt-1 flex items-center gap-1.5">
                    <FiPhone size={14} className="text-slate-400 shrink-0" />
                    {operationStaff.phone}
                  </p>
                )}
                {operationStaff.email && (
                  <p className="text-sm text-slate-600 mt-0.5 flex items-center gap-1.5 truncate">
                    <FiMail size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate">{operationStaff.email}</span>
                  </p>
                )}
                <p className="text-xs text-slate-500 mt-2">
                  Phụ trách giao / thu hồi theo phân công hệ thống.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-600">
              <p className="font-medium text-slate-800">Chưa có nhân viên được gán</p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Khi đơn chuyển sang giao hàng, nhân viên vận hành nhận nhiệm vụ sẽ hiển thị tại đây để bạn liên hệ bàn giao thiết bị.
              </p>
            </div>
          )}
        </motion.div>
      </motion.div>

      <motion.div
        variants={fadeUpItem}
        initial="hidden"
        animate="show"
        className={cardHover}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4">
          Thanh toán
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {[
            { label: "Tổng thanh toán", value: `${formatMoney(rental.totalAmount)} ₫`, bold: true },
            { label: "Tiền thuê (đơn)", value: `${formatMoney(rental.rentPriceTotal)} ₫` },
            { label: "Đặt cọc", value: `${formatMoney(rental.depositAmount)} ₫` },
            {
              label: "Trạng thái TT",
              value:
                rental.paymentStatus === "PAID"
                  ? "Đã thanh toán"
                  : rental.paymentStatus === "UNPAID"
                    ? "Chưa thanh toán"
                    : rental.paymentStatus || "—",
            },
          ].map((cell) => (
            <div
              key={cell.label}
              className="rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-3 transition-all duration-200 hover:border-primary/15 hover:bg-white hover:shadow-sm"
            >
              <p className="text-slate-500 text-xs">{cell.label}</p>
              <p
                className={`mt-1 text-slate-900 ${cell.bold ? "font-bold text-base" : "font-semibold"}`}
              >
                {cell.value}
              </p>
            </div>
          ))}
        </div>
        {rental.notes ? (
          <p className="mt-4 text-sm text-slate-600 border-t border-slate-100 pt-4">
            <span className="font-medium text-slate-700">Ghi chú khách:</span> {rental.notes}
          </p>
        ) : null}
      </motion.div>

      <motion.div
        variants={fadeUpItem}
        initial="hidden"
        animate="show"
        className={cardHover}
      >
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-2">
          <FiPackage className="text-primary" size={16} />
          Thiết bị đã gán cho đơn
        </h2>
        <p className="text-xs text-slate-500 mb-4">
          Chuẩn bị đúng serial / mã nội bộ dưới đây khi bàn giao cho nhân viên vận hành.
        </p>
        <div className="space-y-4">
          {items.map((item, idx) => {
            const dev = item.deviceId;
            const units = unitLabelsFromItem(item);
            return (
              <motion.div
                key={item._id || idx}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.35, ease: easeOut }}
                className="group/line rounded-xl border border-slate-200/90 p-4 flex flex-col sm:flex-row gap-4 transition-all duration-300 hover:border-primary/25 hover:shadow-md hover:bg-slate-50/30"
              >
                <div className="w-full sm:w-28 h-28 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 transition-transform duration-300 group-hover/line:scale-[1.02] shadow-sm">
                  {dev?.images?.[0] ? (
                    <ImageWithFallback
                      src={dev.images[0]}
                      alt={dev?.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-slate-400">
                      <FiPackage size={32} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-900 text-lg">{dev?.name || "Thiết bị"}</p>
                  <p className="text-sm text-slate-600 mt-1">
                    Kỳ thuê: {formatDate(item.rentalStartDate)} → {formatDate(item.rentalEndDate)} · SL:{" "}
                    <span className="font-semibold">{item.quantity}</span> · Giá/đơn vị:{" "}
                    {formatMoney(item.rentPrice)} ₫
                  </p>
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                      Unit gán cho đơn (serial / mã)
                    </p>
                    {units.length ? (
                      <ul className="flex flex-wrap gap-2">
                        {units.map((u) => (
                          <li
                            key={u.key}
                            className="text-xs font-mono bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg text-slate-800 transition-all duration-200 hover:border-primary/40 hover:bg-primary/5 hover:scale-105 cursor-default"
                          >
                            {u.label}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                        Chưa có thông tin unit trên đơn — kiểm tra lại dữ liệu hoặc liên hệ hỗ trợ.
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {showDeliverySection && (
        <motion.div
          id="supplier-rental-delivery"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: easeOut }}
          className={`${cardHover} scroll-mt-24 relative overflow-hidden`}
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-transparent to-indigo-500/[0.04]" />
          <div className="relative">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 mb-4 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FiTruck size={16} />
            </span>
            Tiến độ giao hàng
          </h2>
          <div className="space-y-1">
            {getDeliveryTimeline(rental).map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * index, duration: 0.35, ease: easeOut }}
                className="flex items-start gap-4 rounded-xl p-3 -mx-1 transition-colors duration-200 hover:bg-slate-50/80"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-transform duration-200 hover:scale-110 ${
                    step.done
                      ? "bg-green-50 text-green-600 border-green-200 shadow-sm shadow-green-600/10"
                      : "bg-slate-100 text-slate-400 border-slate-200"
                  }`}
                >
                  {step.done ? <FiCheckCircle size={20} /> : <FiClock size={20} />}
                </div>
                <div className="pt-0.5 min-w-0">
                  <p className={`font-medium ${step.done ? "text-green-800" : "text-slate-800"}`}>
                    {step.status}
                  </p>
                  {step.time && (
                    <p className="text-sm text-slate-500 mt-0.5 tabular-nums">{formatDateTime(step.time)}</p>
                  )}
                  {step.location && (
                    <p className="text-sm text-slate-600 mt-1">{step.location}</p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          </div>
        </motion.div>
      )}

      <RejectRentalModal
        open={rejectModal.open}
        rental={rental}
        onClose={() => setRejectModal({ open: false })}
        onSubmit={submitReject}
        isSubmitting={rejectSubmitting}
      />
    </motion.div>
  );
}
