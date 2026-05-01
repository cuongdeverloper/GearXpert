/* eslint-disable react-hooks/exhaustive-deps */
import React, { useCallback, useState, useEffect } from "react";
import {
  Trash2,
  ShoppingBag,
  Calendar,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Store,
  Edit,
} from "lucide-react";
import {
  getCart,
  removeCartItem,
  updateCartItem,
} from "../../service/ApiService/CartApi";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";

const CartPage = () => {
  const { t, i18n } = useTranslation();
  const [groupedBySupplier, setGroupedBySupplier] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingBooking, setEditingBooking] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const navigate = useNavigate();

  const DAY = 1000 * 60 * 60 * 24;

  // Hàm xử lý dữ liệu: Nhóm theo supplierId
  const processCartData = useCallback(
    (rawCart) => {
      if (!rawCart?.items) return [];

      const calculateDays = (start, end) => {
        const d1 = new Date(start);
        const d2 = new Date(end);
        d1.setHours(0, 0, 0, 0);
        d2.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / DAY);
        return diffDays > 0 ? diffDays : 1;
      };

      const supplierGroups = rawCart.items.reduce((acc, item) => {
        const supplierId = item.deviceId?.supplierId?._id;
        const supplierName =
          item.deviceId?.supplierId?.fullName ||
          `${t('cart.shop_prefix')} #${supplierId?.slice(-6) || "unknown"}`;

        if (!supplierId) return acc;

        if (!acc[supplierId]) {
          acc[supplierId] = {
            supplierId,
            supplierName,
            devices: {},
          };
        }

        const deviceId = item.deviceId._id;
        if (!acc[supplierId].devices[deviceId]) {
          acc[supplierId].devices[deviceId] = {
            device: item.deviceId,
            bookings: [],
          };
        }

        acc[supplierId].devices[deviceId].bookings.push({
          id: item._id,
          startDate: new Date(item.rentalStartDate),
          endDate: new Date(item.rentalEndDate),
          quantity: item.quantity,
          totalDays: calculateDays(item.rentalStartDate, item.rentalEndDate),
          rentPrice: (() => {
            const now = new Date();
            const discountExpiry = item.deviceId?.discountExpiry ? new Date(item.deviceId.discountExpiry) : null;
            const isDiscountValid = item.deviceId?.discountPrice && discountExpiry && discountExpiry > now;
            return isDiscountValid ? item.deviceId.discountPrice : (item.deviceId?.rentPrice?.perDay || 0);
          })(),
        });

        return acc;
      }, {});

      return Object.values(supplierGroups).map((supplierGroup) => {
        supplierGroup.devices = Object.values(supplierGroup.devices).map(
          (deviceGroup) => {
            deviceGroup.bookings.sort((a, b) => a.startDate - b.startDate);
            return deviceGroup;
          }
        );
        return supplierGroup;
      });
    },
    [DAY]
  );

  const fetchCartData = useCallback(async () => {
    try {
      const res = await getCart("NORMAL");
      const processed = processCartData(res);
      setGroupedBySupplier(processed);

      if (res.cleaned) {
        toast.warning(
          res.message ||
            t('cart.auto_removed'),
          { autoClose: 5000 }
        );
      }
    } catch (err) {
      console.error("Error fetching cart", err);
      toast.error(t('cart.load_error'));
    } finally {
      setLoading(false);
    }
  }, [processCartData]);

  useEffect(() => {
    fetchCartData();
  }, [fetchCartData]);

  const handleRemove = (itemId, deviceName) => {
    setDeleteConfirm({ itemId, deviceName });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await removeCartItem(deleteConfirm.itemId);
      toast.success(t('cart.remove_success', { name: deleteConfirm.deviceName }));
      fetchCartData();
   
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (err) {
      toast.error(t('cart.remove_error'));
    } finally {
      setDeleteConfirm(null);
    }
  };

  const cancelDelete = () => {
    setDeleteConfirm(null);
  };

  const handleEditBooking = (booking) => {
    setEditingBooking({
      id: booking.id,
      startDate: booking.startDate,
      endDate: booking.endDate,
      quantity: booking.quantity,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingBooking) return;

    try {
      const payload = {
        rentalStartDate: editingBooking.startDate.toISOString(),
        rentalEndDate: editingBooking.endDate.toISOString(),
        quantity: editingBooking.quantity,
      };

      await updateCartItem(editingBooking.id, payload);
      toast.success(t('cart.update_success'));
      setEditingBooking(null);
      fetchCartData(); // reload giỏ hàng
    } catch (err) {
      console.error("Update cart item error:", err);
      toast.error(
        err.response?.data?.message ||
          t('cart.update_error')
      );
    }
  };

  const handleCheckout = () => {
    if (!groupedBySupplier || groupedBySupplier.length === 0) {
      toast.warn(t('cart.empty_warn'));
      return;
    }
    toast.info(t('cart.checkout_loading'));
    setTimeout(() => {
      navigate("/rental/checkout");
    }, 1500);
  };

  const calculateTotals = () => {
    let totalRent = 0;
    let totalDeposit = 0;

    groupedBySupplier.forEach((supplier) => {
      Object.values(supplier.devices).forEach((deviceGroup) => {
        const rent = deviceGroup.bookings.reduce(
          (sum, b) => sum + b.rentPrice * b.totalDays * b.quantity,
          0
        );
        totalRent += rent;

        const maxQty = Math.max(
          ...deviceGroup.bookings.map((b) => b.quantity),
          0
        );
        totalDeposit += (deviceGroup.device?.depositAmount || 0) * maxQty;
      });
    });

    return { rent: totalRent, deposit: totalDeposit };
  };

  const totals = calculateTotals();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        {t('cart.loading')}
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <Header />
      <div className="flex-1 pb-20">
        <ToastContainer position="top-right" autoClose={2000} theme="colored" />

        {/* HEADER NAV */}
        <div className="sticky top-[112px] z-40 mx-6 bg-white/80 backdrop-blur-md border border-slate-200 rounded-[24px] shadow-lg mt-28 mb-8">
          <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              {t('cart.back_to_shop')}
            </button>
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm font-medium text-slate-400">
                {t('cart.breadcrumb')}
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* DANH SÁCH THEO SUPPLIER (LEFT) */}
          <div className="lg:col-span-8 space-y-6">
            {groupedBySupplier.length > 0 ? (
              groupedBySupplier.map((supplierGroup) => (
                <div
                  key={supplierGroup.supplierId}
                  className="bg-white rounded-2xl p-6 border border-slate-200/60 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  {/* SUPPLIER HEADER */}
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="p-2.5 bg-indigo-100 rounded-xl">
                      <Store size={20} className="text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        {supplierGroup.supplierName}
                      </h2>
                      <p className="text-xs text-slate-500">
                        {t('cart.supplier')}
                      </p>
                    </div>
                  </div>

                  {/* DEVICES IN SUPPLIER */}
                  {Object.values(supplierGroup.devices).map((deviceGroup) => (
                    <div
                      key={deviceGroup.device._id}
                      className="mb-8 last:mb-0"
                    >
                      <div className="bg-gradient-to-br from-white via-slate-50/30 to-white rounded-2xl border border-slate-200/80 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden group">
                        {/* DEVICE HEADER WITH ENHANCED DESIGN */}
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <div className="relative flex items-center gap-5 p-6 border-b border-slate-100/60">
                            <div className="relative">
                              <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl overflow-hidden border-2 border-white shadow-lg flex-shrink-0 group-hover:scale-105 transition-transform duration-300">
                                <div className="relative group">
                                  <div 
                                    onClick={() => navigate(`/device/${deviceGroup.device?.slug}`)}
                                    className="cursor-pointer"
                                  >
                                    <img
                                      src={deviceGroup.device?.images?.[0]}
                                      alt={deviceGroup.device?.name}
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full border-2 border-white shadow-md flex items-center justify-center">
                                <span className="text-white text-xs font-bold">{deviceGroup.bookings.length}</span>
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 
                                onClick={() => navigate(`/device/${deviceGroup.device?.slug}`)}
                                className="font-bold text-slate-900 text-lg mb-2 leading-tight group-hover:text-indigo-600 transition-colors cursor-pointer hover:underline"
                              >
                                {deviceGroup.device?.name}
                              </h3>
                              <div className="flex items-center gap-3">
                                <span className="inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full">
                                  {deviceGroup.bookings.length} {t('cart.rent_schedules')}
                                </span>
                                <span className="inline-flex items-center px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full">
                                  {t('cart.in_stock')}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() =>
                                handleRemove(
                                  deviceGroup.bookings[0]?.id,
                                  deviceGroup.device?.name
                                )
                              }
                              className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all group-hover:shadow-md"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>

                        {/* BOOKINGS LIST WITH ENHANCED DESIGN */}
                        <div className="divide-y divide-slate-100/40">
                          {deviceGroup.bookings.map((booking, index) => (
                            <div
                              key={booking.id}
                              className="p-6 hover:bg-gradient-to-r hover:from-indigo-50/30 hover:to-purple-50/30 transition-all duration-200 group/item"
                            >
                              <div className="flex items-start justify-between gap-6">
                                {/* ENHANCED DATE INFO */}
                                <div className="flex items-start gap-4">
                                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover/item:scale-110 transition-transform">
                                    <Calendar size={20} className="text-white" />
                                  </div>
                                  <div className="pt-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-700 text-xs font-bold rounded-lg">
                                        #{index + 1}
                                      </span>
                                      <span className="text-sm font-semibold text-slate-900">
                                        {booking.startDate.toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
                                      </span>
                                      <span className="text-slate-300">-</span>
                                      <span className="text-sm font-semibold text-slate-900">
                                        {booking.endDate.toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                      <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                                        {booking.totalDays} {t('cart.days')}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
                                        {t('cart.quantity_short')}: {booking.quantity}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* ENHANCED PRICE & ACTIONS */}
                                <div className="flex items-end gap-4">
                                  <button
                                    onClick={() => handleEditBooking(booking)}
                                    className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all group-hover/item:shadow-md"
                                  >
                                    <Edit size={16} />
                                  </button>

                                  <div className="text-right">
                                    {(() => {
                                      const device = deviceGroup.device;
                                      const now = new Date();
                                      const discountExpiry = device?.discountExpiry ? new Date(device.discountExpiry) : null;
                                      const isDiscountValid = device?.discountPrice && discountExpiry && discountExpiry > now;
                                      const regularPrice = device?.rentPrice?.perDay || 0;
                                      const discountPrice = device?.discountPrice;
                                      const effectivePrice = isDiscountValid ? discountPrice : regularPrice;
                                      
                                      return (
                                        <div className="space-y-1">
                                          {isDiscountValid && regularPrice > 0 && (
                                            <div className="flex flex-col items-end gap-1">
                                              <div className="flex items-center gap-2">
                                                <span className="text-xs text-slate-400 line-through">
                                                  {(regularPrice * booking.totalDays * booking.quantity).toLocaleString()}d
                                                </span>
                                                <span className="px-2 py-0.5 bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs font-bold rounded-full shadow-md">
                                                  -{Math.round((1 - discountPrice/regularPrice) * 100)}%
                                                </span>
                                              </div>
                                            </div>
                                          )}
                                          <div className="flex items-center gap-2">
                                            <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                              {(effectivePrice * booking.totalDays * booking.quantity).toLocaleString()}
                                            </span>
                                            <span className="text-sm font-semibold text-slate-400">d</span>
                                          </div>
                                          <div className="text-xs text-slate-500">
                                            {effectivePrice.toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}đ × {booking.totalDays} {t('cart.days')} × {booking.quantity} {t('cart.quantity_short')}
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* TỔNG CỦA SUPPLIER */}
                  <div className="mt-6 pt-4 border-t border-slate-100 text-right">
                    <p className="text-sm font-medium text-slate-600">
                      {t('cart.supplier_subtotal')}
                      <span className="font-bold text-indigo-600 ml-2">
                        {Object.values(supplierGroup.devices)
                          .reduce((sum, d) => {
                            return (
                              sum +
                              d.bookings.reduce(
                                (s, b) =>
                                  s + b.rentPrice * b.totalDays * b.quantity,
                                0
                              )
                            );
                          }, 0)
                          .toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}
                        đ
                      </span>
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-[40px] py-20 text-center border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag size={40} className="text-slate-300" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  {t('cart.empty')}
                </h2>
                <p className="text-slate-500 mb-8">
                  {t('cart.empty_subtitle')}
                </p>
                <button
                  onClick={() => navigate("/products")}
                  className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-600 transition-all active:scale-95"
                >
                  {t('cart.explore_now')}
                </button>
              </div>
            )}
          </div>

          {/* SUMMARY (RIGHT) */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl sticky top-28">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6">
                {t('cart.summary')}
              </h2>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>{t('cart.sub_total')}</span>
                  <span>{totals.rent.toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}đ</span>
                </div>
                <div className="flex justify-between text-slate-600 font-medium">
                  <span>{t('cart.total_deposit')}</span>
                  <span>{totals.deposit.toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}đ</span>
                </div>
                <div className="flex justify-between text-slate-500 text-sm italic">
                  <span>{t('cart.service_fee')}</span>
                  <span>{t('cart.free')}</span>
                </div>
                <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                  <span className="font-bold text-slate-900">{t('cart.total')}</span>
                  <div className="text-right">
                    <p className="text-3xl font-black text-indigo-600 leading-none">
                      {(totals.rent + totals.deposit).toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US')}đ
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mt-2">
                      {t('cart.including_deposit')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 rounded-2xl p-4 flex items-start gap-3 mb-8 border border-indigo-100">
                <ShieldCheck
                  className="text-indigo-600 flex-shrink-0"
                  size={20}
                />
                <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                  {t('cart.refund_policy')}
                </p>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
              >
                {t('cart.checkout')} <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL CHỈNH SỬA LỊCH THUÊ */}
      {editingBooking && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 mb-6">
              {t('cart.edit_schedule')}
            </h3>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('cart.start_date')}
                </label>
                <DatePicker
                  selected={editingBooking.startDate}
                  onChange={(date) =>
                    setEditingBooking({ ...editingBooking, startDate: date })
                  }
                  selectsStart
                  startDate={editingBooking.startDate}
                  endDate={editingBooking.endDate}
                  minDate={new Date()}
                  dateFormat="dd/MM/yyyy"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('cart.end_date')}
                </label>
                <DatePicker
                  selected={editingBooking.endDate}
                  onChange={(date) =>
                    setEditingBooking({ ...editingBooking, endDate: date })
                  }
                  selectsEnd
                  startDate={editingBooking.startDate}
                  endDate={editingBooking.endDate}
                  minDate={editingBooking.startDate || new Date()}
                  dateFormat="dd/MM/yyyy"
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {t('cart.quantity')}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() =>
                      setEditingBooking({
                        ...editingBooking,
                        quantity: Math.max(1, editingBooking.quantity - 1),
                      })
                    }
                    className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50 transition"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={editingBooking.quantity}
                    onChange={(e) =>
                      setEditingBooking({
                        ...editingBooking,
                        quantity: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="w-20 text-center border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    onClick={() =>
                      setEditingBooking({
                        ...editingBooking,
                        quantity: Math.min(99, editingBooking.quantity + 1),
                      })
                    }
                    className="w-10 h-10 rounded-lg border border-slate-300 flex items-center justify-center hover:bg-slate-50 transition"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-3 justify-end">
              <button
                onClick={() => setEditingBooking(null)}
                className="px-6 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              >
                {t('cart.cancel')}
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
              >
                {t('cart.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="text-red-600" size={24} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                {t('cart.delete_confirm_title')}
              </h3>
              <p className="text-slate-500">
                {t('cart.delete_confirm_desc', { name: deleteConfirm.deviceName })}
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={cancelDelete}
                className="flex-1 px-6 py-2.5 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              >
                {t('cart.cancel')}
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 px-6 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium"
              >
                {t('cart.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default CartPage;
