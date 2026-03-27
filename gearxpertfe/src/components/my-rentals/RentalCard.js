// RentalCard.jsx
import React from "react";
import {
  AlertCircle,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  MapPin,
  RefreshCcw,
  Star,
  Truck,
  Wrench,
  XCircle,
  CheckCircle2,
} from "lucide-react";
import { getDaysRemaining, getDueStatus } from "./helpers";

const statusMeta = (order) => {
  if (order.status === "APPROVED") {
    return { label: "Đã duyệt", cls: "bg-indigo-50 text-indigo-700 border-indigo-100" };
  }
  switch (order.status) {
    case "PENDING":
      return { label: "Chờ xác nhận", cls: "bg-amber-50 text-amber-800 border-amber-100" };
    case "DELIVERING":
      return {
        label: order.deliveredAt ? "Đã giao · Chờ xác nhận" : "Đang giao",
        cls: "bg-blue-50 text-blue-800 border-blue-100",
      };
    case "RENTING":
      return { label: "Đang thuê", cls: "bg-emerald-50 text-emerald-800 border-emerald-100" };
    case "RETURNING":
      return { label: "Đang thu hồi", cls: "bg-orange-50 text-orange-800 border-orange-100" };
    case "COMPLETED":
      return { label: "Hoàn tất", cls: "bg-slate-50 text-slate-700 border-slate-200" };
    case "CANCELLED":
      return { label: "Đã hủy", cls: "bg-rose-50 text-rose-800 border-rose-100" };
    default:
      return { label: order.status, cls: "bg-slate-50 text-slate-700 border-slate-200" };
  }
};

const toCode = (orderCode) =>
  orderCode ? `BK${String(orderCode).padStart(4, "0")}` : null;

export default function RentalCard({
  order,
  onClickDetail,
  onPayNow,
  onCancel,
  onConfirmReceived,
  onTrack,
  onExtend,
  onReportDelivery,
  onReportDamage,
  onReview,
  onReRent,
}) {
  const meta = statusMeta(order);
  const orderCode = toCode(order.orderCode);
  const supplier = order.items?.[0]?.deviceId?.supplierId;

  const due =
    order.status === "RENTING" && order.items?.[0]?.rentalEndDate
      ? getDueStatus(getDaysRemaining(order.items[0].rentalEndDate))
      : null;

  const handleClick = (fn) => (e) => {
    e.stopPropagation();
    fn?.();
  };

  const primaryActions = (() => {
    if (order.status === "PENDING") {
      return (
        <div className="flex flex-wrap gap-2">
          {order.paymentStatus === "UNPAID" && (
            <button
              onClick={handleClick(onPayNow)}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black inline-flex items-center gap-2"
            >
              <CreditCard size={16} /> Thanh toán
            </button>
          )}
          <button
            onClick={handleClick(onCancel)}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-black inline-flex items-center gap-2"
          >
            <XCircle size={16} /> Hủy
          </button>
        </div>
      );
    }

    if (order.status === "DELIVERING") {
      return (
        <div className="flex flex-wrap gap-2">
          {order.deliveredAt && (
            <button
              onClick={handleClick(onConfirmReceived)}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-black inline-flex items-center gap-2"
            >
              <CheckCircle2 size={16} /> Xác nhận nhận hàng
            </button>
          )}
          <button
            onClick={handleClick(onTrack)}
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 text-sm font-black inline-flex items-center gap-2"
          >
            <Truck size={16} /> Theo dõi
          </button>
        </div>
      );
    }

    if (order.status === "RENTING") {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleClick(onExtend)}
            className="px-4 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-100 text-sm font-black inline-flex items-center gap-2"
          >
            <Clock size={16} /> Gia hạn
          </button>
          <button
            onClick={handleClick(onReportDamage)}
            className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 text-sm font-black inline-flex items-center gap-2"
          >
            <Wrench size={16} /> Báo cáo sự cố
          </button>
        </div>
      );
    }

    if (order.status === "COMPLETED") {
      return (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleClick(onReview)}
            className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 text-sm font-black inline-flex items-center gap-2"
          >
            <Star size={16} /> Đánh giá
          </button>
          <button
            onClick={handleClick(onReRent)}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white text-sm font-black inline-flex items-center gap-2"
          >
            <RefreshCcw size={16} /> Thuê lại
          </button>
        </div>
      );
    }

    return null;
  })();

  return (
    <div
      className="bg-white rounded-3xl border border-slate-200/70 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                {supplier?.avatar ? (
                  <img
                    src={supplier.avatar}
                    alt="Supplier"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.target.src = "https://placehold.co/48x48?text=Shop";
                    }}
                  />
                ) : (
                  <span className="text-slate-500 font-black">S</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-slate-900 truncate">
                  {supplier?.fullName || "Nhà cung cấp"}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                  <span className="font-mono">{orderCode || `#${order._id?.slice(-8)}`}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-[10px] font-black uppercase ${meta.cls}`}>
                    {meta.label}
                  </span>
                  {order.paymentStatus === "UNPAID" && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 text-[10px] font-black uppercase">
                      <AlertCircle size={12} /> Unpaid
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                Tổng thanh toán
              </div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {(order.totalAmount || 0).toLocaleString()} ₫
              </div>
            </div>
          </div>

          {due && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm font-bold flex items-center justify-between ${
                due.color === "red"
                  ? "bg-rose-50 border-rose-200 text-rose-800"
                  : "bg-amber-50 border-amber-200 text-amber-800"
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock size={18} />
                <span>{due.label}</span>
              </div>
              <div className="text-xs font-black opacity-70">
                {new Date(order.items[0].rentalEndDate).toLocaleDateString("vi-VN")}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            {(order.items || []).map((item) => {
              const image =
                item.deviceId?.images?.[0] ||
                "https://via.placeholder.com/300?text=No+Image";
              const start = item.rentalStartDate
                ? new Date(item.rentalStartDate).toLocaleDateString("vi-VN")
                : "-";
              const end = item.rentalEndDate
                ? new Date(item.rentalEndDate).toLocaleDateString("vi-VN")
                : "-";

              const hasReport =
                order.status === "DELIVERING"
                  ? !!item.deliveryIssues?.[0]
                  : order.status === "RENTING"
                    ? !!item.damageReports?.[0]
                    : false;

              return (
                <div
                  key={item._id}
                  className="flex items-center gap-4 p-4 rounded-2xl border border-slate-200/70 bg-slate-50"
                >
                  <img
                    src={image}
                    alt={item.deviceId?.name}
                    className="w-14 h-14 rounded-2xl object-cover border border-slate-200 bg-white"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-black text-slate-900 truncate">
                      {item.deviceId?.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} /> {start} — {end}
                      </span>
                      <span className="font-black text-indigo-700">
                        x{item.quantity}
                      </span>
                    </div>
                  </div>

                  {(order.status === "DELIVERING" || order.status === "RENTING") && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (order.status === "DELIVERING") onReportDelivery(item);
                        else onReportDamage(item);
                      }}
                      className={`px-4 py-2 rounded-xl text-[11px] font-black inline-flex items-center gap-2 border ${
                        hasReport
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <AlertCircle size={14} />
                      Báo cáo
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
            <div className="text-[11px] text-slate-500 flex flex-col gap-1">
              <div className="inline-flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" />
                <span className="line-clamp-1">{order.deliveryAddress?.fullAddress || "-"}</span>
              </div>
              <div className="inline-flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 font-black uppercase text-[10px]">
                  {order.paymentMethod || "-"}
                </span>
                <span className="text-[11px] text-slate-500">
                  Cọc: {(order.depositAmount || 0).toLocaleString()} ₫
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              {primaryActions}
              <button
                onClick={handleClick(onClickDetail)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-black inline-flex items-center gap-2"
              >
                <FileText size={16} /> Chi tiết
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
