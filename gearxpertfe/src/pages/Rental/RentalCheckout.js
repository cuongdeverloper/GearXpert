import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  Trash2,
  CreditCard,
  Wallet,
  Ticket,
  MapPin,
  Home,
  X,
  ChevronLeft,
  ShieldCheck,
  Truck,
  Phone,
  PackageCheck,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { getCart, removeCartItem } from "../../service/ApiService/CartApi";
import { validateVoucher } from "../../service/ApiService/VoucherApi.js";
import { checkout } from "../../service/ApiService/RentalApi";
import { getMyWallet } from "../../service/ApiService/WalletApi";

// --- MAP IMPORTS ---
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- CONSTANTS ---
const FPT_COORDS = { lat: 15.9753, lng: 108.2524 };
const MIN_DELIVERY_FEE = 10000;
const FEE_PER_KM = 5000;

// Hàm tính khoảng cách đường chim bay
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const CART_TYPE = location.state?.cartType || "NORMAL";

  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState({
    street: "",
    district: "",
    city: "",
    fullAddress: "",
  });
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [useInsurance, setUseInsurance] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState("BANK");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  
  // Mặc định vị trí bản đồ tại FPT Đà Nẵng
  const [mapPosition, setMapPosition] = useState([FPT_COORDS.lat, FPT_COORDS.lng]);
  const [deliveryFee, setDeliveryFee] = useState(10000); // Mặc định phí tối thiểu
  const [distance, setDistance] = useState(0);

  const [wallet, setWallet] = useState(null);

  useEffect(() => {
    const { street, district, city } = address;
    const full = [street, district, city].filter(Boolean).join(", ");
    setAddress((prev) => ({ ...prev, fullAddress: full }));
  }, [address.street, address.district, address.city]);

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getCart(CART_TYPE);
      setCart(res.items || []);
    } catch {
      toast.error("Không thể tải đơn hàng");
    } finally {
      setLoading(false);
    }
  }, [CART_TYPE]);

  const fetchWalletData = useCallback(async () => {
    try {
      const res = await getMyWallet();
      setWallet(res);
    } catch (err) {
      console.error("Lỗi lấy thông tin ví:", err);
    }
  }, []);

  useEffect(() => {
    fetchCart();
    fetchWalletData();
  }, [fetchCart, fetchWalletData]);

  // --- MAP LOGIC ---
  function MapEventsHandler() {
    useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;
        setMapPosition([lat, lng]);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`
          );
          const data = await res.json();
          if (data && data.address) {
            const addr = data.address;
            const fullAddrText = data.display_name;

            // KIỂM TRA NỘI THÀNH ĐÀ NẴNG
            const isDaNang = fullAddrText.includes("Đà Nẵng");
            if (!isDaNang) {
                toast.error("GearXpert hiện chỉ hỗ trợ giao hàng tại nội thành Đà Nẵng!");
                return;
            }

            // TÍNH KHOẢNG CÁCH VÀ PHÍ SHIP
            const dist = calculateDistance(FPT_COORDS.lat, FPT_COORDS.lng, lat, lng);
            const fee = Math.max(MIN_DELIVERY_FEE, Math.round(dist * FEE_PER_KM));
            
            setDistance(dist);
            setDeliveryFee(fee);

            setAddress({
              city: "Đà Nẵng",
              district: addr.suburb || addr.district || addr.county || addr.quarter || "",
              street: addr.road || addr.house_number || "",
              fullAddress: fullAddrText,
            });
            
            toast.success(`Khoảng cách: ${dist.toFixed(1)}km. Phí ship: ${fee.toLocaleString()}đ`);
            setTimeout(() => setShowMapModal(false), 1200);
          }
        } catch {
          toast.error("Lỗi lấy địa chỉ");
        }
      },
    });
    return mapPosition ? <Marker position={mapPosition} /> : null;
  }

  // --- HANDLERS ---
  const handleRemoveItem = async (id) => {
    try {
      await removeCartItem(id);
      setCart((prev) => prev.filter((i) => i._id !== id));
      setAppliedVoucher(null);
      toast.success("Đã xóa khỏi đơn hàng");
    } catch {
      toast.error("Xóa thất bại");
    }
  };

  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) return toast.warning("Nhập mã giảm giá");
    try {
      setIsApplyingVoucher(true);
      const res = await validateVoucher({
        code: voucherCode,
        cartType: CART_TYPE,
      });
      setAppliedVoucher(res.data);
      toast.success(`Đã áp dụng giảm ${res.data.discount.toLocaleString()}đ`);
    } catch (err) {
      setAppliedVoucher(null);
      toast.error(err.response?.data?.message || "Mã không hợp lệ");
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  // --- CALCULATION ---
  const subtotal = cart.reduce(
    (sum, item) =>
      sum + item.deviceId?.rentPrice?.perDay * item.totalDays * item.quantity,
    0
  );
  
  const insuranceFee = useInsurance ? Math.round(subtotal * 0.05) : 0;
  const total =
    subtotal + deliveryFee + insuranceFee - (appliedVoucher?.discount || 0);

  const handleCheckout = async () => {
    if (!address.fullAddress || !phoneNumber)
      return toast.warning("Vui lòng điền đủ thông tin nhận hàng");
    if (!agreeTerms) return toast.warning("Bạn chưa đồng ý điều khoản");

    const phoneRegex = /^(0[3|5|7|8|9])([0-9]{8})$/;
    if (!phoneRegex.test(phoneNumber)) {
      return toast.error(
        "Số điện thoại không hợp lệ (Phải có 10 số, ví dụ: 0912345678)"
      );
    }
    
    if (selectedPayment === "WALLET") {
      if (!wallet || wallet.balance < total) {
        return toast.error("Số dư ví không đủ để thanh toán đơn hàng này!");
      }
    }

    try {
      setIsProcessing(true);
      const res = await checkout({
        cartType: CART_TYPE,
        deliveryAddress: address,
        phoneNumber,
        paymentMethod: selectedPayment,
        useInsurance,
        notes,
        voucherCode: appliedVoucher?.code,
        shippingFee: deliveryFee, // Gửi thêm phí ship nếu backend cần
      });

      if (selectedPayment === "BANK" && res.paymentLink) {
        toast.info("Đang chuyển hướng đến trang thanh toán...");
        window.location.href = res.paymentLink.checkoutUrl;
      } else {
        toast.success("Đặt thuê thành công!");
        setTimeout(() => navigate("/profile/rentals"), 2000);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Thanh toán thất bại");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center font-black text-slate-400 animate-pulse">
        GEARXPERT LOADING...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20 font-sans text-slate-900">
      <ToastContainer theme="colored" position="top-right" autoClose={2000} />

      {/* HEADER SECTION */}
      <div className="sticky top-0 z-[60] bg-white/80 backdrop-blur-xl border-b border-slate-200 rounded-b-[40px] shadow-sm mb-10">
        <div className="max-w-[1440px] mx-auto px-10 py-6 flex items-center justify-between">
          <button
            onClick={() => navigate("/user/cart")}
            className="group flex items-center gap-2 text-slate-500 hover:text-indigo-600 font-bold transition-all"
          >
            <div className="p-2 bg-slate-50 rounded-full group-hover:bg-indigo-50 transition-colors">
              <ChevronLeft size={20} />
            </div>
            Quay lại giỏ hàng
          </button>
          <div className="flex flex-col items-center">
            <h1 className="text-2xl font-black uppercase tracking-tighter italic leading-none">
              Checkout
            </h1>
            <span className="text-[10px] font-bold text-indigo-500 tracking-[0.2em] uppercase mt-1">
              Giao hàng từ FPT University Đà Nẵng
            </span>
          </div>
          <div className="w-32 hidden md:block"></div>
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        {/* LEFT: DELIVERY & PAYMENT */}
        <div className="lg:col-span-7 space-y-8">
          <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-200">
                <MapPin size={24} />
              </div>
              <h2 className="text-xl font-black uppercase italic tracking-tight">
                Thông tin nhận máy
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => {
                  setAddress({
                    street: "FPT University",
                    district: "Ngũ Hành Sơn",
                    city: "Đà Nẵng",
                    fullAddress: "Trường Đại học FPT Đà Nẵng, Ngũ Hành Sơn, Đà Nẵng",
                  });
                  setDistance(0);
                  setDeliveryFee(10000);
                }}
                className="flex items-center justify-center gap-3 bg-slate-50 hover:bg-slate-100 py-4 rounded-2xl border border-slate-200 transition-all font-bold text-slate-700"
              >
                <Home size={18} /> Tại trường (FPTU)
              </button>
              <button
                onClick={() => setShowMapModal(true)}
                className="flex items-center justify-center gap-3 bg-indigo-50 hover:bg-indigo-100 py-4 rounded-2xl border border-indigo-200 transition-all font-bold text-indigo-700"
              >
                <MapPin size={18} /> Chọn từ bản đồ Đà Nẵng
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="ml-4 text-[10px] font-black text-slate-400 uppercase">
                    Tỉnh / Thành phố
                  </span>
                  <input
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 ring-indigo-500"
                    placeholder="Đà Nẵng"
                    disabled
                    value={address.city}
                  />
                </div>
                <div className="space-y-1">
                  <span className="ml-4 text-[10px] font-black text-slate-400 uppercase">
                    Quận / Huyện
                  </span>
                  <input
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 ring-indigo-500"
                    placeholder="..."
                    value={address.district}
                    onChange={(e) =>
                      setAddress({ ...address, district: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <span className="ml-4 text-[10px] font-black text-slate-400 uppercase">
                  Số nhà, tên đường
                </span>
                <input
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 ring-indigo-500"
                  placeholder="..."
                  value={address.street}
                  onChange={(e) =>
                    setAddress({ ...address, street: e.target.value })
                  }
                />
              </div>

              <div className="bg-indigo-600 text-white p-5 rounded-[24px] shadow-inner relative overflow-hidden group">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                  <MapPin size={80} />
                </div>
                <div className="flex justify-between items-start z-10 relative">
                    <div>
                        <span className="text-[10px] font-black opacity-60 uppercase tracking-widest">
                        Địa chỉ giao hàng
                        </span>
                        <p className="text-sm font-bold mt-1 leading-relaxed">
                        {address.fullAddress || "Chưa xác định vị trí..."}
                        </p>
                    </div>
                    {distance > 0 && (
                        <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-xl text-right">
                             <span className="block text-[9px] uppercase font-black">Khoảng cách</span>
                             <span className="text-xs font-black">{distance.toFixed(1)} km</span>
                        </div>
                    )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <Phone
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />
                  <input
                    type="tel"
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 pl-12 text-sm font-bold focus:ring-2 ring-indigo-500"
                    placeholder="Số điện thoại (10 số)"
                    value={phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      if (value.length <= 10) setPhoneNumber(value);
                    }}
                  />
                </div>
                <input
                  className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-bold focus:ring-2 ring-indigo-500"
                  placeholder="Ghi chú thêm..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Section: Payment Methods */}
          <div className="bg-white rounded-[40px] p-10 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-slate-900 rounded-2xl text-white">
                <CreditCard size={24} />
              </div>
              <h2 className="text-xl font-black uppercase italic tracking-tight text-slate-900">
                Phương thức thanh toán
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <label
                className={`relative flex items-center gap-4 p-6 rounded-3xl border-2 transition-all cursor-pointer group ${
                  selectedPayment === "BANK"
                    ? "border-indigo-600 bg-indigo-50/50"
                    : "border-slate-100 bg-slate-50 hover:border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  className="hidden"
                  checked={selectedPayment === "BANK"}
                  onChange={() => setSelectedPayment("BANK")}
                />
                <div
                  className={`p-3 rounded-2xl transition-all ${
                    selectedPayment === "BANK"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-400 group-hover:text-slate-600"
                  }`}
                >
                  <CreditCard size={24} />
                </div>
                <div>
                  <p className="font-black text-slate-900 leading-none">
                    Chuyển khoản
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
                    VietQR Instant
                  </p>
                </div>
                {selectedPayment === "BANK" && (
                  <div className="absolute top-4 right-4 w-3 h-3 bg-indigo-600 rounded-full animate-ping" />
                )}
              </label>

              <label
                className={`relative flex items-center gap-4 p-6 rounded-3xl border-2 transition-all cursor-pointer group ${
                  selectedPayment === "WALLET"
                    ? "border-indigo-600 bg-indigo-50/50"
                    : "border-slate-100 bg-slate-50 hover:border-slate-200"
                }`}
              >
                <input
                  type="radio"
                  className="hidden"
                  checked={selectedPayment === "WALLET"}
                  onChange={() => setSelectedPayment("WALLET")}
                />
                <div
                  className={`p-3 rounded-2xl transition-all ${
                    selectedPayment === "WALLET"
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-slate-400 group-hover:text-slate-600"
                  }`}
                >
                  <Wallet size={24} />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="font-black text-slate-900 leading-none">
                      Ví GearXpert
                    </p>
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                        wallet?.balance >= total
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {wallet?.balance?.toLocaleString() || 0}đ
                    </span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight">
                    Dùng số dư ví
                  </p>
                </div>
              </label>
            </div>

            {selectedPayment === "BANK" && (
              <div className="mt-8 p-8 bg-slate-900 rounded-[32px] text-white flex flex-col md:flex-row items-center gap-8 animate-in zoom-in-95 duration-300">
                <div className="bg-white p-3 rounded-[24px] shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=GEARXPERT_PAY_${total}`}
                    alt="QR"
                    className="w-32 h-32"
                  />
                </div>
                <div className="flex-1 text-center md:text-left">
                  <span className="inline-block bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter mb-3">
                    Thanh toán an toàn qua PayOS
                  </span>
                  <p className="text-sm text-slate-300 leading-relaxed font-medium">
                    Bạn sẽ được chuyển hướng đến cổng thanh toán PayOS để thực hiện quét mã VietQR. <br />
                    Đơn hàng sẽ được xác nhận tự động ngay sau khi bạn hoàn tất chuyển khoản.
                  </p>
                </div>
              </div>
            )}

            {selectedPayment === "WALLET" && wallet?.balance < total && (
              <div className="mt-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-pulse">
                <X size={20} className="shrink-0" />
                <p className="text-xs font-bold uppercase">
                  Số dư ví không đủ. Vui lòng nạp thêm hoặc chọn Chuyển khoản.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: ORDER SUMMARY */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl sticky top-28">
            <h2 className="text-xl font-black text-slate-900 uppercase italic mb-8 flex items-center justify-between">
              Giỏ hàng của bạn
              <span className="text-sm not-italic font-bold bg-slate-100 text-slate-500 px-3 py-1 rounded-full uppercase tracking-tighter">
                {cart.length} món
              </span>
            </h2>

            <div className="max-h-[320px] overflow-y-auto pr-2 space-y-6 mb-8 scrollbar-hide">
              {cart.map((item) => (
                <div key={item._id} className="flex gap-4 items-start group">
                  <div className="relative w-20 h-20 shrink-0">
                    <img
                      src={item.deviceId?.images?.[0]}
                      className="w-full h-full rounded-2xl object-cover border border-slate-100 group-hover:scale-105 transition-transform"
                    />
                    <button
                      onClick={() => handleRemoveItem(item._id)}
                      className="absolute -top-2 -left-2 bg-white text-red-500 p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-900 text-sm truncate uppercase tracking-tight">
                      {item.deviceId?.name}
                    </p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                        {item.totalDays} ngày
                      </span>
                      <span className="w-1 h-1 bg-slate-200 rounded-full" />
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                        SL: {item.quantity}
                      </span>
                    </div>
                    <p className="font-black text-indigo-600 text-sm mt-1">
                      {(
                        item.deviceId?.rentPrice?.perDay *
                        item.totalDays *
                        item.quantity
                      ).toLocaleString()}
                      đ
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-8 border-t border-slate-100">
              <div className="flex justify-between text-sm font-bold text-slate-400 uppercase tracking-tighter">
                <span>Tạm tính</span>
                <span className="text-slate-600">
                  {subtotal.toLocaleString()}đ
                </span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-400 uppercase tracking-tighter">
                <span className="flex flex-col">
                    Phí vận chuyển
                    {distance > 0 && <span className="text-[9px] text-indigo-500 lowercase font-medium">({distance.toFixed(1)} km từ trường)</span>}
                </span>
                <span className="text-slate-600">
                  {deliveryFee.toLocaleString()}đ
                </span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-400 uppercase tracking-tighter">
                <label className="flex items-center gap-3 cursor-pointer text-slate-500 hover:text-indigo-600 transition-colors">
                  <input
                    type="checkbox"
                    className="w-5 h-5 rounded-lg border-slate-200 text-indigo-600 focus:ring-indigo-500 transition-all"
                    checked={useInsurance}
                    onChange={(e) => setUseInsurance(e.target.checked)}
                  />
                  Phí bảo hiểm thiết bị (5%)
                </label>
                <span className="text-slate-600">
                  {insuranceFee.toLocaleString()}đ
                </span>
              </div>

              <div className="flex gap-2 py-4">
                <div className="relative flex-1 group">
                  <Ticket
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors"
                    size={18}
                  />
                  <input
                    className="w-full bg-slate-50 border-none rounded-[20px] pl-12 pr-4 py-4 text-sm uppercase font-black placeholder:text-slate-300 focus:ring-2 ring-indigo-500 transition-all"
                    placeholder="Mã voucher"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleApplyVoucher}
                  disabled={isApplyingVoucher || !voucherCode}
                  className="bg-slate-900 text-white px-6 rounded-[20px] text-xs font-black uppercase hover:bg-indigo-600 disabled:opacity-30 transition-all shadow-lg shadow-slate-200"
                >
                  {isApplyingVoucher ? "..." : "Áp dụng"}
                </button>
              </div>

              {appliedVoucher && (
                <div className="flex justify-between items-center bg-emerald-50 text-emerald-600 p-4 rounded-2xl border border-emerald-100 animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                      <Ticket size={14} />
                    </div>
                    <span className="text-xs font-black uppercase">
                      Đã giảm: {appliedVoucher.code}
                    </span>
                  </div>
                  <span className="font-black">
                    -{appliedVoucher.discount.toLocaleString()}đ
                  </span>
                </div>
              )}

              <div className="pt-6 flex justify-between items-end border-t border-slate-50">
                <div className="space-y-1">
                  <span className="block font-black text-slate-400 uppercase text-[10px] tracking-widest">
                    Tổng cộng
                  </span>
                  <span className="text-4xl font-black text-slate-900 tracking-tighter leading-none">
                    {total.toLocaleString()}đ
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg uppercase tracking-tight">
                    <ShieldCheck size={12} /> Bảo mật 100%
                  </div>
                </div>
              </div>
            </div>

            <label className="flex items-center gap-4 mt-8 p-5 bg-slate-50 rounded-[24px] cursor-pointer group hover:bg-slate-100 transition-all">
              <input
                type="checkbox"
                className="w-6 h-6 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
              />
              <span className="text-[11px] text-slate-500 font-bold leading-tight group-hover:text-slate-700">
                Tôi đồng ý với các{" "}
                <span className="text-indigo-600 underline">
                  Điều khoản dịch vụ
                </span>{" "}
                và{" "}
                <span className="text-indigo-600 underline">
                  Quy định thuê trả
                </span>{" "}
                của GearXpert.
              </span>
            </label>

            <button
              disabled={isProcessing || cart.length === 0}
              onClick={handleCheckout}
              className="w-full mt-6 bg-slate-900 text-white py-6 rounded-[28px] font-black text-xl uppercase tracking-widest hover:bg-indigo-600 hover:-translate-y-1 transition-all shadow-2xl shadow-indigo-200 active:scale-[0.98] disabled:opacity-30 flex items-center justify-center gap-3"
            >
              {isProcessing ? (
                <>
                  <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />{" "}
                  Đang tạo đơn...
                </>
              ) : (
                <>
                  <PackageCheck size={24} /> Xác nhận thuê ngay
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL MAP */}
      {showMapModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-md p-6">
          <div className="bg-white rounded-[48px] w-full max-w-5xl overflow-hidden shadow-2xl border border-white animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 rounded-2xl text-white">
                  <MapPin size={24} />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 uppercase italic tracking-tight text-xl">
                    Vị trí của bạn (Đà Nẵng)
                  </h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
                    Vận chuyển từ FPT University Đà Nẵng
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="p-4 hover:bg-white rounded-full transition-all text-slate-400 hover:text-red-500 shadow-sm border border-slate-100"
              >
                <X size={24} />
              </button>
            </div>
            <div className="h-[550px] w-full relative">
              <MapContainer
                center={mapPosition}
                zoom={14}
                style={{ height: "100%", width: "100%" }}
                whenCreated={(map) => map.invalidateSize()}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapEventsHandler />
                {/* Marker cố định tại FPT Đà Nẵng để khách dễ nhìn */}
                <Marker position={[FPT_COORDS.lat, FPT_COORDS.lng]} opacity={0.6} />
              </MapContainer>
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[1000] bg-white px-8 py-4 rounded-[24px] shadow-2xl border border-slate-100 font-bold text-sm text-indigo-600 animate-bounce">
                👆 Chọn vị trí của bạn tại Đà Nẵng
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}