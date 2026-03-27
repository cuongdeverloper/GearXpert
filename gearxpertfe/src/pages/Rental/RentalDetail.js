import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as rentalService from "../../service/ApiService/RentalApi";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";

import {
  Clock,
  Calendar,
  MapPin,
  Truck,
  Package,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Star,
  ArrowLeft,
  Phone,
  ChevronRight,
  Receipt,
  ShieldCheck,
  HelpCircle,
  History,
} from "lucide-react";

export default function RentalDetail() {
  const { rentalId } = useParams();
  const navigate = useNavigate();
  const [rental, setRental] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchRentalDetail = async () => {
    try {
      setLoading(true);
      const res = await rentalService.getRentalById(rentalId);
      if (!res?.success || !res.rental) {
        toast.error("Không tìm thấy đơn thuê");
        navigate("/my-rentals");
        return;
      }
      setRental(res.rental);
    } catch (error) {
      toast.error("Lỗi khi tải dữ liệu");
      navigate("/my-rentals");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rentalId) fetchRentalDetail();
  }, [rentalId]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium animate-pulse">
            Đang chuẩn bị dữ liệu...
          </p>
        </div>
      </div>
    );

  if (!rental) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Back Button */}
        <button
          onClick={() => navigate("/user/myrental")}
          className="group flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-all mb-8"
        >
          <div className="p-2 rounded-full group-hover:bg-indigo-50 transition-colors">
            <ArrowLeft size={20} />
          </div>
          <span className="font-medium">Quay lại danh sách đơn thuê</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT COLUMN */}
          <div className="lg:col-span-8 space-y-6">
            {/* 1. Order Status Banner */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-16 -mt-16 opacity-50" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold uppercase tracking-wider">
                      Mã đơn: #{rental._id.slice(-6).toUpperCase()}
                    </span>
                    <StatusBadge status={rental.status} />
                  </div>
                  <h1 className="text-3xl font-extrabold text-slate-800">
                    Chi tiết đơn hàng
                  </h1>
                  <p className="text-slate-500 mt-1 flex items-center gap-2">
                    <Clock size={16} /> Đặt lúc:{" "}
                    {new Date(rental.createdAt).toLocaleString("vi-VN")}
                  </p>
                </div>

                <div className="px-6 py-4 rounded-2xl flex flex-col items-center justify-center border-2 border-slate-100 bg-slate-50">
                  <span className="text-sm font-bold text-slate-400">TỔNG</span>
                  <span className="text-2xl font-black text-slate-800">
                    {rental.items?.length || 0} thiết bị
                  </span>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="mt-10 flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                <Step icon={<Receipt size={18} />} label="Đã đặt" active />
                <Step
                  icon={<Truck size={18} />}
                  label="Giao hàng"
                  active={["DELIVERING", "RENTING", "COMPLETED"].includes(
                    rental.status
                  )}
                />
                <Step
                  icon={<Package size={18} />}
                  label="Đang thuê"
                  active={["RENTING", "COMPLETED"].includes(rental.status)}
                />
                <Step
                  icon={<CheckCircle2 size={18} />}
                  label="Hoàn tất"
                  active={rental.status === "COMPLETED"}
                />
              </div>
            </div>

            {/* 2. Danh sách thiết bị - Mỗi item có ngày riêng */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Package className="text-indigo-500" />
                Danh sách thiết bị thuê
              </h3>

              <div className="space-y-6">
                {rental.items?.map((item, idx) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);

                  const startDate = new Date(item.rentalStartDate);
                  const dueDate = new Date(item.rentalEndDate);
                  dueDate.setHours(0, 0, 0, 0);

                  const diffTime = dueDate - today;
                  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                  const isOverdue = daysLeft < 0;
                  const isUrgent = daysLeft <= 2 && daysLeft >= 0;
                  const isRenting = item.status === "RENTING";

                  return (
                    <div
                      key={idx}
                      className={`group relative p-6 rounded-3xl border transition-all duration-300 overflow-hidden
                        ${
                          isRenting && isOverdue
                            ? "border-red-500 bg-red-50 shadow-red-100"
                            : isRenting && isUrgent
                            ? "border-orange-500 bg-orange-50 shadow-orange-100"
                            : "border-slate-100 hover:border-indigo-200 hover:bg-slate-50"
                        }`}
                    >
                      {/* Badge Due Date */}
                      {isRenting && (
                        <div
                          className={`absolute -top-1 -right-1 px-6 py-2 rounded-bl-3xl text-sm font-black uppercase tracking-wider shadow-md
                            ${
                              isOverdue
                                ? "bg-red-600 text-white animate-pulse"
                                : isUrgent
                                ? "bg-orange-500 text-white"
                                : "bg-emerald-600 text-white"
                            }`}
                        >
                          {isOverdue
                            ? `QUÁ HẠN ${Math.abs(daysLeft)} NGÀY`
                            : daysLeft === 0
                            ? "HẾT HẠN HÔM NAY"
                            : `CÒN ${daysLeft} NGÀY`}
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row gap-6">
                        {/* Image */}
                        <div className="relative w-full sm:w-44 h-44 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                          <img
                            src={
                              item.deviceId?.images?.[0] ||
                              "/placeholder-device.png"
                            }
                            alt={item.deviceId?.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {isRenting && (isOverdue || isUrgent) && (
                            <div className="absolute top-3 left-3">
                              <div
                                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 ${
                                  isOverdue
                                    ? "bg-red-600 text-white"
                                    : "bg-orange-500 text-white"
                                }`}
                              >
                                <AlertCircle size={14} />
                                {isOverdue ? "Quá hạn" : "Sắp hết hạn"}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 flex flex-col">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="text-xl font-bold text-slate-800">
                                {item.deviceId?.name ||
                                  item.deviceSnapshot?.name}
                              </h4>
                              <p className="text-slate-500 mt-1">
                                Số lượng:{" "}
                                <span className="font-semibold text-slate-700">
                                  x{item.quantity}
                                </span>
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                item.status === "RENTING"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>

                          {/* Thời gian thuê của thiết bị này */}
                          <div className="grid grid-cols-2 gap-4 mb-5">
                            <div className="bg-slate-50 p-4 rounded-2xl">
                              <p className="text-xs text-slate-400 font-medium">
                                Nhận máy
                              </p>
                              <p className="font-semibold text-slate-700 mt-1">
                                {startDate.toLocaleDateString("vi-VN")}
                              </p>
                            </div>
                            <div
                              className={`p-4 rounded-2xl ${
                                isOverdue
                                  ? "bg-red-50 border border-red-200"
                                  : isUrgent
                                  ? "bg-orange-50 border border-orange-200"
                                  : "bg-emerald-50 border border-emerald-200"
                              }`}
                            >
                              <p
                                className="text-xs font-medium"
                                style={{
                                  color: isOverdue
                                    ? "#dc2626"
                                    : isUrgent
                                    ? "#ea580c"
                                    : "#10b981",
                                }}
                              >
                                Hạn trả
                              </p>
                              <p
                                className="font-semibold mt-1"
                                style={{
                                  color: isOverdue
                                    ? "#dc2626"
                                    : isUrgent
                                    ? "#ea580c"
                                    : "#10b981",
                                }}
                              >
                                {dueDate.toLocaleDateString("vi-VN")}
                              </p>
                            </div>
                          </div>

                          {/* Due Date Highlight Box */}
                          {isRenting && (
                            <div
                              className={`p-5 rounded-2xl border-2 flex items-center gap-4 ${
                                isOverdue
                                  ? "border-red-300 bg-red-50"
                                  : isUrgent
                                  ? "border-orange-300 bg-orange-50"
                                  : "border-emerald-200 bg-emerald-50"
                              }`}
                            >
                              <div
                                className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                  isOverdue
                                    ? "bg-red-100 text-red-600"
                                    : isUrgent
                                    ? "bg-orange-100 text-orange-600"
                                    : "bg-emerald-100 text-emerald-600"
                                }`}
                              >
                                <Clock size={28} />
                              </div>
                              <div>
                                <p
                                  className={`font-semibold ${
                                    isOverdue
                                      ? "text-red-600"
                                      : isUrgent
                                      ? "text-orange-600"
                                      : "text-emerald-600"
                                  }`}
                                >
                                  {isOverdue
                                    ? `Đã quá hạn ${Math.abs(
                                        daysLeft
                                      )} ngày - Vui lòng trả ngay!`
                                    : daysLeft === 0
                                    ? "Hôm nay là ngày cuối cùng"
                                    : `Còn ${daysLeft} ngày để trả thiết bị`}
                                </p>
                              </div>
                            </div>
                          )}

                          {/* Serial Numbers */}
                          {item.deviceItemIds?.length > 0 && (
                            <div className="mt-5 flex flex-wrap gap-2">
                              {item.deviceItemIds.map((id, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] font-mono bg-white border border-slate-200 px-3 py-1 rounded-lg text-slate-500"
                                >
                                  S/N:{" "}
                                  {id._id?.slice(-8).toUpperCase() ||
                                    id.toString().slice(-8).toUpperCase()}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="mt-auto pt-6 border-t border-slate-100 flex justify-between items-end">
                            <div>
                              <p className="text-xs text-slate-400">
                                Thời gian thuê
                              </p>
                              <p className="font-bold text-slate-700">
                                {item.totalDays} ngày
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-400">Giá thuê</p>
                              <p className="text-xl font-black text-indigo-600">
                                {item.rentPrice.toLocaleString()} ₫
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Địa chỉ nhận hàng */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <MapPin size={20} className="text-indigo-500" /> Địa chỉ nhận
                hàng
              </h3>
              <div className="space-y-3">
                <p className="font-bold text-slate-800 text-lg">
                  {rental.deliveryAddress?.receiverName}
                </p>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {rental.deliveryAddress?.fullAddress}
                </p>
                <div className="flex items-center gap-2 text-indigo-600 font-bold bg-indigo-50 w-fit px-3 py-1 rounded-lg text-sm">
                  <Phone size={14} /> {rental.phoneNumber}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Payment & Actions */}
          <div className="lg:col-span-4 space-y-6">
            {/* Payment Summary */}
            <div className="bg-slate-900 rounded-[2rem] p-8 shadow-xl text-white relative overflow-hidden">
              <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
                <CreditCard className="text-indigo-400" /> Chi phí thanh toán
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between text-slate-400">
                  <span>Tổng tiền thuê</span>
                  <span className="text-white font-medium">
                    {rental.rentPriceTotal?.toLocaleString()} ₫
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tiền đặt cọc</span>
                  <span className="text-white font-medium">
                    {rental.depositAmount?.toLocaleString()} ₫
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Phí vận chuyển</span>
                  <span className="text-white font-medium">
                    {rental.deliveryFee?.toLocaleString() || 0} ₫
                  </span>
                </div>
                {rental.voucherDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400">
                    <span>Giảm giá Voucher</span>
                    <span className="font-medium">
                      -{rental.voucherDiscount.toLocaleString()} ₫
                    </span>
                  </div>
                )}

                <div className="pt-6 mt-6 border-t border-slate-800 flex justify-between items-end">
                  <div>
                    <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">
                      TỔNG THANH TOÁN
                    </p>
                    <p className="text-3xl font-black text-indigo-400 mt-1">
                      {rental.totalAmount?.toLocaleString()} ₫
                    </p>
                  </div>
                  <span className="px-3 py-1 bg-slate-800 rounded text-xs font-bold text-slate-400">
                    {rental.paymentMethod}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold mb-6">Thao tác đơn hàng</h3>
              <div className="space-y-3">
                {/* Các button hành động giữ nguyên như cũ */}
                {rental.status === "PENDING" &&
                  rental.paymentStatus === "UNPAID" && (
                    <button
                      onClick={() =>
                        rentalService
                          .repaySingleRental(rentalId)
                          .then(
                            (res) => (window.location.href = res.paymentLink)
                          )
                      }
                      className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      Thanh toán ngay <ChevronRight size={18} />
                    </button>
                  )}

                {rental.status === "DELIVERING" && (
                  <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2">
                    <CheckCircle2 size={18} /> Xác nhận đã nhận hàng
                  </button>
                )}

                {rental.status === "RENTING" && (
                  <div className="grid grid-cols-1 gap-3">
                    <button className="w-full py-4 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-2xl transition-all">
                      Yêu cầu gia hạn
                    </button>
                    <button className="w-full py-4 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-2xl transition-all">
                      Báo sự cố thiết bị
                    </button>
                  </div>
                )}

                {rental.status === "COMPLETED" && (
                  <button className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2">
                    <Star size={18} fill="currentColor" /> Đánh giá dịch vụ
                  </button>
                )}

                <div className="pt-4 mt-4 border-t border-slate-50 text-center">
                  <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                    <HelpCircle size={12} /> Gặp vấn đề?{" "}
                    <a href="#" className="text-indigo-600 font-bold underline">
                      Liên hệ hỗ trợ
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

/* Sub Components */
const StatusBadge = ({ status }) => {
  const configs = {
    PENDING: { label: "Đang chờ", class: "bg-amber-100 text-amber-700" },
    DELIVERING: { label: "Đang giao", class: "bg-blue-100 text-blue-700" },
    RENTING: { label: "Đang thuê", class: "bg-emerald-100 text-emerald-700" },
    COMPLETED: { label: "Hoàn tất", class: "bg-slate-100 text-slate-700" },
    CANCELLED: { label: "Đã hủy", class: "bg-red-100 text-red-700" },
  };
  const config = configs[status] || configs.PENDING;
  return (
    <span
      className={`px-4 py-1 rounded-full text-[13px] font-bold border-2 border-white shadow-sm ${config.class}`}
    >
      {config.label}
    </span>
  );
};

const Step = ({ icon, label, active }) => (
  <div className="flex flex-col items-center gap-2 relative z-10">
    <div
      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 ${
        active
          ? "bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-200"
          : "bg-white text-slate-300 border-2 border-slate-100"
      }`}
    >
      {icon}
    </div>
    <span
      className={`text-[11px] font-bold uppercase tracking-tighter ${
        active ? "text-indigo-600" : "text-slate-400"
      }`}
    >
      {label}
    </span>
  </div>
);
