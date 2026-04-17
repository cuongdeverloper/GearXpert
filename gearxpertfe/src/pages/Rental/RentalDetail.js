import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import * as rentalService from "../../service/ApiService/RentalApi";
import { getMyWallet } from "../../service/ApiService/WalletApi";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import ConfirmationModal from "../../components/my-rentals/modals/ConfirmationModal";
import ExtendModal from "../../components/my-rentals/modals/ExtendModal";
import ExtendConfirmModal from "../../components/my-rentals/modals/ExtendConfirmModal";
import DamageReportModal from "../../components/my-rentals/modals/DamageReportModal";
import ReviewModal from "../../components/my-rentals/modals/ReviewModal";
import TrackingModal from "../../components/my-rentals/modals/TrackingModal";

import {
  Clock,
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
  HelpCircle,
  FileText,
  X,
} from "lucide-react";

export default function RentalDetail() {
  const { rentalId } = useParams();
  const navigate = useNavigate();
  const account = useSelector((state) => state.user.account);
  const [rental, setRental] = useState(null);
  const [contractUrl, setContractUrl] = useState(null);
  const [showContractModal, setShowContractModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirmingReceive, setConfirmingReceive] = useState(false);

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [extendModal, setExtendModal] = useState({ isOpen: false });
  const [extendConfirmModal, setExtendConfirmModal] = useState({ isOpen: false, extensionDays: 0, extraAmount: 0, newEndDate: "", orderId: null });
  const [damageReportModal, setDamageReportModal] = useState({ isOpen: false });
  const [reviewModal, setReviewModal] = useState({ isOpen: false });
  const [reviewSelectedItems, setReviewSelectedItems] = useState([]);
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);

  const rentalsListPath =
    account?.role === "SUPPLIER" ? "/supplier/rental-requests" : "/user/myrental";

  const fetchRentalDetail = useCallback(
    async (opts = {}) => {
      const silent = !!opts.silent;
      try {
        if (!silent) setLoading(true);
        const res = await rentalService.getRentalById(rentalId);
        const data = res?.rental ?? (res?._id ? res : null);
        if (res?.success === false || !data) {
          toast.error("Không tìm thấy đơn thuê");
          navigate(rentalsListPath, { replace: true });
          return;
        }
        setRental(data);
        setContractUrl(res?.contractUrl || null);
      } catch (error) {
        toast.error("Lỗi khi tải dữ liệu");
        navigate(rentalsListPath, { replace: true });
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [rentalId, navigate, rentalsListPath]
  );

  useEffect(() => {
    if (rentalId) fetchRentalDetail();
  }, [rentalId, fetchRentalDetail]);

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const res = await getMyWallet();
        setWalletBalance(res?.data?.balance || res?.balance || 0);
      } catch (err) {
        console.error("Failed to fetch wallet:", err);
      }
    };
    fetchWalletBalance();
  }, []);

  const handleConfirmReceived = async () => {
    console.log('handleConfirmReceived called', { rentalId, role: account?.role, status: rental?.status });
    if (!rentalId) {
      console.warn('No rentalId provided');
      return;
    }
    if (account?.role === "SUPPLIER") {
      toast.error("Chỉ khách hàng mới xác nhận nhận hàng được.");
      return;
    }
    setConfirmingReceive(true);
    try {
      console.log('Calling rentalService.confirmReceived for rentalId:', rentalId);
      const result = await rentalService.confirmReceived(rentalId);
      console.log('confirmReceived result:', result);
      toast.success("Xác nhận đã nhận hàng thành công!");
      await fetchRentalDetail({ silent: true });
    } catch (err) {
      console.error('confirmReceived error:', err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Không thể xác nhận nhận hàng";
      toast.error(msg);
    } finally {
      setConfirmingReceive(false);
    }
  };

  const handleCancel = () => {
    if (!rentalId) return;
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    try {
      await rentalService.cancelRental(rentalId);
      toast.success("Đã hủy đơn thuê thành công!");
      setShowCancelModal(false);
      await fetchRentalDetail({ silent: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Không thể hủy đơn thuê";
      toast.error(msg);
    }
  };

  const handlePayNow = async () => {
    if (!rentalId) return;
    try {
      const res = await rentalService.repaySingleRental(rentalId);
      if (res?.paymentLink) {
        window.location.href = res.paymentLink;
      } else {
        toast.error("Không nhận được link thanh toán");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Không thể thanh toán";
      toast.error(msg);
    }
  };

  const handleTrack = () => {
    if (!rentalId) return;
    setShowTrackingModal(true);
  };

  const handleExtend = () => {
    if (!rentalId || !rental) return;
    // Calculate extension data from rental info
    const lastItem = rental.items?.[rental.items.length - 1];
    const currentEndDate = lastItem ? new Date(lastItem.rentalEndDate) : new Date();
    const newEndDate = new Date(currentEndDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    const quantity = rental.items?.[0]?.quantity || 1;
    const dailyPrice = rental.items?.[0]?.rentPrice || (rental.rentPriceTotal / (rental.items?.[0]?.totalDays || 1)) || 0;
    const extraAmount = Math.round(7 * dailyPrice * quantity);
    
    setExtendModal({
      isOpen: true,
      currentEndDate: currentEndDate,
      newEndDate: newEndDate.toISOString().split('T')[0],
      extraAmount: extraAmount,
      dailyPrice: dailyPrice,
      quantity: quantity,
      note: ""
    });
  };

  const handleSubmitExtend = () => {
    if (!extendModal.newEndDate) return toast.warning("Vui lòng chọn ngày gia hạn mới");
    
    const currentEnd = new Date(extendModal.currentEndDate);
    const newEnd = new Date(extendModal.newEndDate);
    const diffTime = newEnd - currentEnd;
    const additionalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Show confirmation modal
    setExtendConfirmModal({
      isOpen: true,
      extensionDays: additionalDays,
      extraAmount: extendModal.extraAmount,
      newEndDate: extendModal.newEndDate,
      orderId: rentalId
    });
  };

  const confirmExtend = async () => {
    try {
      await rentalService.extendRental(rentalId, { 
        newEndDate: extendConfirmModal.newEndDate,
        requestedDays: extendConfirmModal.extensionDays,
        extraAmount: extendConfirmModal.extraAmount,
        note: extendModal.note || ""
      });
      toast.success(`Đã gia hạn thêm ${extendConfirmModal.extensionDays} ngày!`);
      setExtendConfirmModal({ isOpen: false, extensionDays: 0, extraAmount: 0, newEndDate: "", orderId: null });
      setExtendModal({ isOpen: false });
      await fetchRentalDetail({ silent: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Không thể gia hạn";
      toast.error(msg);
    }
  };

  const handleReportDamage = () => {
    if (!rentalId || !rental) return;
    setDamageReportModal({
      isOpen: true,
      rentalId: rentalId,
      order: rental,
      items: rental.items || [],
      selectedItems: [],
      description: "",
      files: []
    });
  };

  const toggleSerialSelection = (deviceItemId, setModal) => {
    setModal(prev => {
      const currentSelected = prev.selectedItems || [];
      const isSelected = currentSelected.includes(deviceItemId);
      return {
        ...prev,
        selectedItems: isSelected
          ? currentSelected.filter(id => id !== deviceItemId)
          : [...currentSelected, deviceItemId]
      };
    });
  };

  const submitDamageReport = async (modalData) => {
    try {
      const formData = new FormData();
      formData.append('rentalId', rentalId);
      formData.append('description', modalData.description || damageReportModal.description);
      formData.append('rentalItemIds', JSON.stringify(damageReportModal.selectedItems || []));
      
      // Append files if any
      const files = modalData.files || damageReportModal.files || [];
      files.forEach(file => formData.append('files', file));
      
      await rentalService.reportDamage(formData);
      toast.success("Đã gửi báo cáo sự cố thành công!");
      setDamageReportModal({ isOpen: false });
      await fetchRentalDetail({ silent: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Không thể gửi báo cáo";
      toast.error(msg);
    }
  };

  const handleReview = () => {
    if (!rentalId || !rental) return;
    setReviewSelectedItems([]);
    setReviewModal({
      isOpen: true,
      orderId: rentalId,
      order: rental,
      items: rental.items || [],
      rating: 5,
      comment: "",
      files: []
    });
  };

  const handleFileUpload = (files, setModal) => {
    const fileArray = Array.from(files);
    setModal(prev => ({
      ...prev,
      files: [...(prev.files || []), ...fileArray]
    }));
  };

  const submitReview = async () => {
    try {
      const formData = new FormData();
      formData.append("rating", reviewModal.rating);
      formData.append("comment", reviewModal.comment || "");
      formData.append("rentalId", reviewModal.orderId);
      
      reviewModal.files?.forEach((file) => {
        formData.append("images", file);
      });
      
      let itemsToReview = reviewSelectedItems;
      if (itemsToReview.length === 0 && reviewModal.order?.items) {
        itemsToReview = reviewModal.order.items.map(item => item._id);
      }
      // Append each item individually (not JSON.stringify) to match MyRentals
      itemsToReview.forEach((itemId) => {
        formData.append("rentalItemIds", itemId);
      });
      
      await rentalService.submitReview(reviewModal.orderId, formData);
      toast.success("Đánh giá đã được gửi!");
      setReviewModal({ isOpen: false });
      await fetchRentalDetail({ silent: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Không thể gửi đánh giá";
      toast.error(msg);
    }
  };

  const handleReRent = () => {
    if (!rental?.items?.[0]?.deviceId?._id) {
      toast.error("Không tìm thấy thông tin thiết bị");
      return;
    }
    navigate(`/device/${rental.items[0].deviceId._id}`);
  };

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

  if (!rental) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 px-4">
        <p className="text-slate-600 text-center">
          Không tìm thấy đơn thuê hoặc đang chuyển hướng…
        </p>
        <button
          type="button"
          onClick={() => navigate(rentalsListPath)}
          className="rounded-xl bg-indigo-600 text-white px-5 py-2.5 font-semibold text-sm hover:bg-indigo-700"
        >
          Về danh sách đơn
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-20">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 lg:pt-40">
        {/* Back Button */}
        <button
          onClick={() => navigate(rentalsListPath)}
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

                {/* Contract View Button */}
                {contractUrl && (
                  <button
                    onClick={() => setShowContractModal(true)}
                    className="px-6 py-4 rounded-2xl flex flex-col items-center justify-center border-2 border-indigo-100 bg-indigo-50 hover:bg-indigo-100 transition-colors cursor-pointer"
                  >
                    <span className="text-sm font-bold text-indigo-400">HỢP ĐỒNG</span>
                    <span className="text-sm font-black text-indigo-600 flex items-center gap-1">
                      <FileText size={16} />
                      Xem
                    </span>
                  </button>
                )}
              </div>

              {/* Progress Steps */}
              <div className="mt-10 flex items-center justify-between relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-100 -translate-y-1/2 z-0" />
                <Step icon={<Receipt size={18} />} label="Đã đặt" active={!["REJECTED", "CANCELLED"].includes(rental.status)} />
                <Step
                  icon={<Truck size={18} />}
                  label="Giao hàng"
                  active={["DELIVERING", "RENTING", "RETURNING", "INSPECTING", "PENDING_RESOLUTION", "COMPLETED"].includes(
                    rental.status
                  )}
                />
                <Step
                  icon={<Package size={18} />}
                  label="Đang thuê"
                  active={["RENTING", "RETURNING", "INSPECTING", "PENDING_RESOLUTION", "COMPLETED"].includes(rental.status)}
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
                {rental.status === "PENDING" && (
                  <div className="space-y-3">
                    {rental.paymentStatus === "UNPAID" && (
                      <button
                        onClick={handlePayNow}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                      >
                        Thanh toán ngay <ChevronRight size={18} />
                      </button>
                    )}
                    <button
                      onClick={handleCancel}
                      className="w-full py-4 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <X size={18} /> Hủy đơn thuê
                    </button>
                  </div>
                )}

                {rental.status === "DELIVERING" && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleConfirmReceived}
                      disabled={confirmingReceive || account?.role === "SUPPLIER"}
                      className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={18} />
                      {confirmingReceive ? "Đang xử lý…" : "Xác nhận đã nhận hàng"}
                    </button>

                  </div>
                )}

                {rental.status === "RENTING" && (
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={handleExtend}
                      className="w-full py-4 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <Clock size={18} /> Yêu cầu gia hạn
                    </button>
                    <button
                      onClick={handleReportDamage}
                      className="w-full py-4 bg-red-50 text-red-600 hover:bg-red-100 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <AlertCircle size={18} /> Báo sự cố thiết bị
                    </button>
                  </div>
                )}

                {rental.status === "COMPLETED" && (
                  <div className="space-y-3">
                    {!rental.isReviewed ? (
                      <button
                        onClick={handleReview}
                        className="w-full py-4 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-2xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
                      >
                        <Star size={18} fill="currentColor" /> Đánh giá dịch vụ
                      </button>
                    ) : (
                      <div className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2">
                        <Star size={18} fill="white" /> Đã đánh giá
                      </div>
                    )}
                    <button
                      onClick={handleReRent}
                      className="w-full py-4 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-bold rounded-2xl transition-all flex items-center justify-center gap-2"
                    >
                      <Receipt size={18} /> Thuê lại
                    </button>
                  </div>
                )}

                {rental.status === "REJECTED" && (
                  <div className="w-full py-4 bg-rose-50 text-rose-700 font-bold rounded-2xl border border-rose-200 flex items-center justify-center gap-2">
                    <AlertCircle size={18} /> Đơn bị từ chối
                  </div>
                )}

                {rental.status === "RETURNING" && (
                  <div className="w-full py-4 bg-purple-50 text-purple-700 font-bold rounded-2xl border border-purple-200 flex items-center justify-center gap-2">
                    <Truck size={18} /> Đang trả thiết bị
                  </div>
                )}

                {rental.status === "INSPECTING" && (
                  <div className="w-full py-4 bg-slate-50 text-slate-700 font-bold rounded-2xl border border-slate-200 flex items-center justify-center gap-2">
                    <Package size={18} /> Đang kiểm tra thiết bị
                  </div>
                )}

                {rental.status === "PENDING_RESOLUTION" && (
                  <div className="w-full py-4 bg-red-50 text-red-700 font-bold rounded-2xl border border-red-200 flex items-center justify-center gap-2">
                    <AlertCircle size={18} /> Chờ giải quyết sự cố
                  </div>
                )}

                {rental.status === "CANCELLED" && (
                  <div className="w-full py-4 bg-red-50 text-red-700 font-bold rounded-2xl border border-red-200 flex items-center justify-center gap-2">
                    <X size={18} /> Đơn đã bị hủy
                  </div>
                )}

                <div className="pt-4 mt-4 border-t border-slate-50 text-center">
                  <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                    <HelpCircle size={12} /> Gặp vấn đề?{" "}
                    <button className="text-indigo-600 font-bold underline hover:text-indigo-700">
                      Liên hệ hỗ trợ
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Contract Modal */}
      {showContractModal && contractUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-[90vw] h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText size={20} className="text-indigo-600" />
                Hợp đồng thuê thiết bị
              </h3>
              <button
                onClick={() => setShowContractModal(false)}
                className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-600" />
              </button>
            </div>
            {/* Modal Body - Iframe */}
            <div className="flex-1 bg-slate-100">
              <iframe
                src={`https://docs.google.com/gview?url=${encodeURIComponent(contractUrl)}&embedded=true`}
                className="w-full h-full border-0"
                title="Contract Viewer"
              />
            </div>
            {/* Modal Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50">
              <p className="text-sm text-slate-500">
                Nếu không xem được, bạn có thể tải hợp đồng về máy
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => window.open(contractUrl, '_blank')}
                  className="px-4 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-100 transition-colors"
                >
                  Tải về
                </button>
                <button
                  onClick={() => setShowContractModal(false)}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <ConfirmationModal
        modalConfig={{
          isOpen: showCancelModal,
          title: "Xác nhận hủy đơn",
          description: "Bạn có chắc chắn muốn hủy đơn thuê này?",
          type: "CANCEL"
        }}
        onClose={() => setShowCancelModal(false)}
        onConfirm={confirmCancel}
      />

      <TrackingModal
        isOpen={showTrackingModal}
        onClose={() => setShowTrackingModal(false)}
        rentalId={rentalId}
        trackingInfo={rental?.trackingInfo}
      />

      <ExtendModal
        extendModal={extendModal}
        setExtendModal={setExtendModal}
        handleSubmitExtend={handleSubmitExtend}
        walletBalance={walletBalance}
        handleDateChange={(newDate) => {
          if (!extendModal.currentEndDate || !newDate) return;
          const newEndDate = new Date(newDate);
          const currentEnd = new Date(extendModal.currentEndDate);
          if (isNaN(newEndDate.getTime()) || isNaN(currentEnd.getTime())) return;
          
          const diffTime = newEndDate - currentEnd;
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const validDays = diffDays > 0 ? diffDays : 0;
          const dailyPrice = extendModal.dailyPrice || 0;
          const quantity = extendModal.quantity || 1;
          const extraAmount = validDays * dailyPrice * quantity;
          
          setExtendModal({
            ...extendModal,
            newEndDate: newDate,
            extraAmount: extraAmount
          });
        }}
        minExtendDate={(() => {
          if (!extendModal.currentEndDate) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
          }
          const currentEnd = new Date(extendModal.currentEndDate);
          if (isNaN(currentEnd.getTime())) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            return tomorrow.toISOString().split('T')[0];
          }
          const nextDay = new Date(currentEnd);
          nextDay.setDate(nextDay.getDate() + 1);
          return nextDay.toISOString().split('T')[0];
        })()}
      />

      <ExtendConfirmModal
        isOpen={extendConfirmModal.isOpen}
        onClose={() => setExtendConfirmModal({ isOpen: false, extensionDays: 0, extraAmount: 0, newEndDate: "", orderId: null })}
        onConfirm={confirmExtend}
        extensionDays={extendConfirmModal.extensionDays}
        extraAmount={extendConfirmModal.extraAmount}
        newEndDate={extendConfirmModal.newEndDate}
      />

      <DamageReportModal
        damageReportModal={damageReportModal}
        setDamageReportModal={setDamageReportModal}
        handleSubmitDamageReport={submitDamageReport}
        handleFileUpload={(e) => {
          const files = Array.from(e.target.files);
          setDamageReportModal(prev => ({
            ...prev,
            files: [...(prev.files || []), ...files]
          }));
        }}
        toggleSerialSelection={toggleSerialSelection}
      />

      <ReviewModal
        reviewModal={reviewModal}
        setReviewModal={setReviewModal}
        reviewSelectedItems={reviewSelectedItems}
        setReviewSelectedItems={setReviewSelectedItems}
        hasReviewed={reviewModal.orderId ? (rental?.isReviewed ?? false) : false}
        reviewLoading={false}
        handleSubmitReview={submitReview}
        handleFileUpload={handleFileUpload}
      />

      <Footer />
    </div>
  );
}

/* Sub Components */
const StatusBadge = ({ status }) => {
  const getStatusConfig = (rental) => {
    const status = rental?.status;
    switch (status) {
      case "PENDING":
        return { label: "Chờ xử lý", class: "bg-amber-100 text-amber-700 border-amber-200" };
      case "REJECTED":
        return { label: "Bị từ chối", class: "bg-rose-100 text-rose-700 border-rose-200" };
      case "DELIVERING": {
        if (rental?.pickedUpAt) {
          return { label: "Đang giao đến bạn", class: "bg-indigo-100 text-indigo-700 border-indigo-200" };
        }
        if (rental?.assignedOperationStaffId) {
          return { label: "Staff đang lấy hàng", class: "bg-blue-100 text-blue-700 border-blue-200" };
        }
        return { label: "Chờ staff nhận đơn", class: "bg-amber-100 text-amber-700 border-amber-200" };
      }
      case "RENTING":
        return { label: "Đang thuê", class: "bg-emerald-100 text-emerald-700 border-emerald-200" };
      case "RETURNING":
        return { label: "Đang trả", class: "bg-purple-100 text-purple-700 border-purple-200" };
      case "INSPECTING":
        return { label: "Đang kiểm tra", class: "bg-slate-100 text-slate-700 border-slate-200" };
      case "PENDING_RESOLUTION":
        return { label: "Chờ giải quyết", class: "bg-orange-100 text-orange-700 border-orange-200" };
      case "COMPLETED":
        return { label: "Hoàn tất", class: "bg-slate-100 text-slate-700 border-slate-200" };
      case "CANCELLED":
        return { label: "Đã hủy", class: "bg-rose-100 text-rose-700 border-rose-200" };
      default:
        return { label: status || "—", class: "bg-slate-100 text-slate-700 border-slate-200" };
    }
  };

  // For backward compatibility
  const configs = {
    PENDING: { label: "Chờ xử lý", class: "bg-amber-100 text-amber-700 border-amber-200" },
    REJECTED: { label: "Bị từ chối", class: "bg-rose-100 text-rose-700 border-rose-200" },
    DELIVERING: { label: "Đang giao", class: "bg-indigo-100 text-indigo-700 border-indigo-200" },
    RENTING: { label: "Đang thuê", class: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    RETURNING: { label: "Đang trả", class: "bg-purple-100 text-purple-700 border-purple-200" },
    INSPECTING: { label: "Đang kiểm tra", class: "bg-slate-100 text-slate-700 border-slate-200" },
    PENDING_RESOLUTION: { label: "Chờ giải quyết", class: "bg-red-100 text-red-700 border-red-200" },
    COMPLETED: { label: "Hoàn tất", class: "bg-green-100 text-green-700 border-green-200" },
    CANCELLED: { label: "Đã hủy", class: "bg-red-100 text-red-700 border-red-200" },
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
