import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  Star,
  MapPin,
  Shield,
  Package,
  CheckCircle,
  AlertCircle,
  Cpu,
  ShoppingCart,
  Zap,
  Calendar as CalendarIcon,
  PlusCircle,
  Minus,
  Plus,
  User,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import AuthRequirementModal from "../../components/common/AuthRequirementModal";

/* ===== API ===== */
import {
  getDeviceDetail,
  getDeviceAddons,
  getRelatedDevices,
} from "../../service/ApiService/DeviceApi";
import { addToCart, addInstantToCart } from "../../service/ApiService/CartApi";
import { hasRentedDevice } from "../../service/ApiService/RentalApi";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const today = new Date().toISOString().split("T")[0];
  const isAuthenticated = useSelector((state) => state.user?.isAuthenticated || false);

  const [device, setDevice] = useState(null);
  const [addonsList, setAddonsList] = useState([]);
  const [relatedDevices, setRelatedDevices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [hasRented, setHasRented] = useState(false);
  const [loading, setLoading] = useState(true);

  const [selectedImage, setSelectedImage] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [addons, setAddons] = useState([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const promises = [
        getDeviceDetail(id),
        getDeviceAddons(id),
        getRelatedDevices(id),
      ];

      if (isAuthenticated) {
        promises.push(hasRentedDevice(id));
      }

      const results = await Promise.all(promises);
      const [d, a, r, ...rest] = results;
      const rented = isAuthenticated ? rest[0] : undefined;

      setDevice(d);
      setAddonsList(a || []);
      setRelatedDevices(r || []);
      setHasRented(rented?.hasRented || false);
      setReviews(d.reviews || []);
    } catch (err) {
      console.error("Fetch device detail error:", err);
      toast.error("Không thể tải dữ liệu thiết bị");
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated]);

  useEffect(() => {
    fetchData();
    window.scrollTo(0, 0);
  }, [fetchData]);

  const validateRental = () => {
    if (!startDate || !endDate) {
      toast.warning("Vui lòng chọn ngày bắt đầu và ngày kết thúc thuê!");
      return false;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Ngày kết thúc không được nhỏ hơn ngày bắt đầu!");
      return false;
    }

    if (quantity > (device?.stockQuantity || 0)) {
      toast.error(`Chỉ còn ${device?.stockQuantity || 0} thiết bị khả dụng!`);
      return false;
    }

    return true;
  };

  const toggleAddon = (addon) => {
    const isSelected = addons.find((a) => a._id === addon._id);
    setAddons((prev) =>
      isSelected ? prev.filter((a) => a._id !== addon._id) : [...prev, addon]
    );

    if (!isSelected) {
      toast.info(`Đã thêm phụ kiện: ${addon.name}`);
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!validateRental()) return;
    try {
      await addToCart({
        deviceId: device._id,
        quantity,
        rentalStartDate: startDate,
        rentalEndDate: endDate,
        addons: addons.map((a) => a._id),
      });
      toast.success("Đã thêm vào giỏ hàng thành công!", {
        description: `${device.name} đã sẵn sàng trong giỏ của bạn.`,
        action: {
          label: "Đến giỏ hàng",
          onClick: () => navigate("/user/cart"),
        },
      });
    } catch {
      toast.error("Thêm vào giỏ thất bại. Vui lòng thử lại!");
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!validateRental()) return;

    const toastId = toast.loading("Đang xử lý yêu cầu thuê ngay...");
    try {
      const response = await addInstantToCart({
        deviceId: device._id,
        quantity,
        rentalStartDate: startDate,
        rentalEndDate: endDate,
        addons: addons.map((a) => a._id),
      });

      console.log('[handleBuyNow] Response from addInstantToCart:', response.data);

      toast.success("Đã thêm vào giỏ INSTANT!", { id: toastId });
      navigate("/rental/checkout", {
        state: { cartType: "INSTANT" },
      });
    } catch (err) {
      console.error('[handleBuyNow] Error:', err);
      toast.error("Thuê ngay thất bại", { id: toastId });
    }
  };

  const days =
    startDate && endDate
      ? Math.max(
        1,
        Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000)
      )
      : 0;

  const totalPrice = device
    ? days *
    (device.rentPrice.perDay +
      addons.reduce((s, a) => s + a.rentPrice.perDay, 0)) *
    quantity
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-light">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!device) return null;

  const supplier = device.supplierId || {};

  return (
    <div className="min-h-screen bg-background-light flex flex-col font-sans">
      <Header />
      <Toaster richColors closeButton expand={true} />

      <main className="flex-1">
        {/* HEADER NAV STICKY */}
        <div className="sticky top-[84px] z-40 mx-6 bg-white/80 backdrop-blur-md border border-slate-200 rounded-[24px] shadow-lg mt-4">
          <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Catalog
            </button>
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm font-medium text-slate-400">
                Home / Devices / {device?.category}
              </span>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="max-w-[1440px] mx-auto px-6 py-10">
          <div className="grid lg:grid-cols-12 gap-12">
            {/* LEFT: IMAGES & DETAILS */}
            <div className="lg:col-span-7 space-y-10">
              {/* IMAGES */}
              <div className="space-y-6">
                <div className="relative rounded-[32px] overflow-hidden bg-white shadow-2xl shadow-indigo-100/50 border border-slate-100 group">
                  <img
                    src={device.images?.[selectedImage]}
                    className="w-full h-[600px] object-cover transition-transform duration-700 group-hover:scale-105"
                    alt={device.name}
                  />
                  <div className="absolute top-6 left-6">
                    <span
                      className={`text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-lg ${device.stockQuantity > 0 ? "bg-indigo-600" : "bg-rose-500"
                        }`}
                    >
                      {device.stockQuantity > 0 ? device.status : "Out of Stock"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-2 hide-scroll">
                  {device.images?.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`relative min-w-[120px] h-24 rounded-2xl overflow-hidden border-2 transition-all ${selectedImage === i
                        ? "border-indigo-600 scale-95 shadow-lg"
                        : "border-transparent opacity-60 hover:opacity-100"
                        }`}
                    >
                      <img src={img} className="w-full h-full object-cover" alt="thumb" />
                    </button>
                  ))}
                </div>
              </div>

              {/* OVERVIEW */}
              <div className="space-y-6">
                <h2 className="text-3xl font-bold text-slate-900 font-display flex items-center gap-3">
                  Overview
                  <div className="h-1 flex-1 bg-slate-100 rounded-full"></div>
                </h2>
                <p className="text-lg text-slate-600 leading-relaxed whitespace-pre-line font-medium">
                  {device.description}
                </p>
              </div>

              {/* REVIEWS */}
              <div className="space-y-8">
                <h2 className="text-3xl font-bold text-slate-900 font-display flex items-center gap-3">
                  Production Reviews
                  <div className="h-1 flex-1 bg-slate-100 rounded-full"></div>
                </h2>

                <div className="space-y-6">
                  {reviews.length > 0 ? (
                    reviews.map((r) => (
                      <div
                        key={r._id}
                        className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex gap-6"
                      >
                        <img
                          src={r.userId?.avatar}
                          className="w-14 h-14 rounded-2xl object-cover ring-4 ring-slate-50"
                          alt="avatar"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-bold text-slate-900">
                                {r.userId?.fullName}
                              </h4>
                              <div className="flex gap-0.5 mt-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-3.5 h-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-600 font-medium leading-relaxed italic">
                            "{r.comment}"
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
                        No production reviews yet
                      </p>
                    </div>
                  )}

                  {!hasRented && (
                    <div className="flex items-center justify-center gap-3 p-4 bg-indigo-50 rounded-2xl text-indigo-600 text-sm font-bold">
                      <AlertCircle className="w-5 h-5" />
                      Verified renters only can leave reviews
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: CONFIG & RENTAL */}
            <div className="lg:col-span-5 space-y-8">
              {/* TITLE & RATING */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-wider">
                  <div className="w-8 h-[2px] bg-indigo-600"></div>
                  {device.category}
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-slate-900 font-display leading-tight italic">
                  {device.name}
                </h1>

                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-900">
                      {device.ratingAvg}
                    </span>
                    <span className="text-slate-400 text-sm">
                      ({device.reviewCount} reviews)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <MapPin className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {device.location?.city}
                    </span>
                  </div>
                </div>
              </div>

              {/* SUPPLIER INFO */}
              {supplier.fullName && (
                <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <User size={20} className="text-indigo-600" />
                    Nhà cung cấp
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-indigo-100">
                      <img
                        src={supplier.avatar || "https://via.placeholder.com/64"}
                        alt={supplier.fullName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-lg">
                        {supplier.fullName}
                      </p>
                      <p className="text-sm text-slate-500">
                        Đã cung cấp {device.name} cho GearXpert
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* PRICING CARD */}
              <div className="glass-panel !bg-indigo-600 rounded-[32px] p-8 text-white shadow-xl shadow-indigo-200">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-indigo-100 text-sm font-bold uppercase tracking-widest mb-1">
                      Rental Rate
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-bold">
                        {device.rentPrice?.perDay.toLocaleString()}đ
                      </span>
                      <span className="text-indigo-200">/ day</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mb-1">
                      Security Deposit
                    </p>
                    <p className="font-bold">
                      {device.depositAmount?.toLocaleString()}đ
                    </p>
                  </div>
                </div>
              </div>

              {/* RENTAL FORM */}
              <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
                {/* RENTAL PERIOD */}
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
                    <CalendarIcon className="w-4 h-4 text-indigo-600" />
                    Select Rental Period
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase ml-2">
                        Start Date
                      </p>
                      <input
                        type="date"
                        min={today}
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          if (endDate && e.target.value > endDate) setEndDate("");
                        }}
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase ml-2">
                        End Date
                      </p>
                      <input
                        type="date"
                        min={startDate || today}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* QUANTITY */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
                      <Package className="w-4 h-4 text-indigo-600" />
                      Rent Quantity
                    </label>
                    <span className="text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border text-indigo-600 bg-indigo-50 border-indigo-100">
                      Available: {device.stockQuantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100 w-fit">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:border-indigo-600 transition-all active:scale-90 disabled:opacity-50"
                      disabled={quantity <= 1}
                    >
                      <Minus size={16} strokeWidth={3} />
                    </button>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val)) {
                          setQuantity(Math.min(Math.max(1, val), device.stockQuantity || 1));
                        }
                      }}
                      className="w-12 text-center bg-transparent border-none text-lg font-black text-slate-900 outline-none select-none"
                    />
                    <button
                      onClick={() =>
                        setQuantity(Math.min(device.stockQuantity || 1, quantity + 1))
                      }
                      className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-900 flex items-center justify-center text-white hover:bg-indigo-600 hover:border-indigo-600 transition-all active:scale-90 disabled:opacity-50"
                      disabled={quantity >= (device.stockQuantity || 1)}
                    >
                      <Plus size={16} strokeWidth={3} />
                    </button>
                  </div>
                </div>

                {/* ADDONS */}
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
                    <PlusCircle className="w-4 h-4 text-indigo-600" />
                    Essential Add-ons
                  </label>
                  <div className="space-y-3">
                    {addonsList.map((a) => {
                      const isSelected = addons.find((item) => item._id === a._id);
                      return (
                        <button
                          key={a._id}
                          onClick={() => toggleAddon(a)}
                          className={`w-full flex justify-between items-center p-4 rounded-2xl border-2 transition-all ${isSelected
                            ? "border-indigo-600 bg-indigo-50 shadow-sm"
                            : "border-slate-100 hover:border-slate-200 bg-white"
                            }`}
                        >
                          <div className="text-left">
                            <p
                              className={`font-bold text-sm ${isSelected ? "text-indigo-700" : "text-slate-700"
                                }`}
                            >
                              {a.name}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold">
                              Compatible Gear
                            </p>
                          </div>
                          <span className="font-bold text-indigo-600">
                            +{a.rentPrice?.perDay.toLocaleString()}đ
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* TOTAL */}
                {days > 0 && (
                  <div className="pt-4 border-t border-dashed border-slate-200 animate-in fade-in slide-in-from-top-2">
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                        Estimated Total ({days} days)
                      </div>
                      <div className="text-2xl font-black text-indigo-600">
                        {totalPrice.toLocaleString()}đ
                      </div>
                    </div>
                  </div>
                )}

                {/* ACTIONS */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={handleAddToCart}
                    disabled={device.stockQuantity === 0}
                    className="flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Add to Cart
                  </button>
                  <button
                    onClick={handleBuyNow}
                    disabled={device.stockQuantity === 0}
                    className="flex items-center justify-center gap-2 py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-black shadow-lg shadow-slate-200 transition-all active:scale-95 disabled:bg-slate-400 disabled:shadow-none disabled:cursor-not-allowed"
                  >
                    <Zap className="w-5 h-5 fill-current" />
                    Rent Now
                  </button>
                </div>
              </div>

              {/* TRUST CRITERIA */}
              <div className="grid grid-cols-3 gap-4">
                <Criteria icon={<Shield className="w-5 h-5" />} text="Pro Insurance" />
                <Criteria icon={<Package className="w-5 h-5" />} text="Same-day Delivery" />
                <Criteria icon={<CheckCircle className="w-5 h-5" />} text="Tech Inspected" />
              </div>
            </div>
          </div>

          {/* SPECS & RELATED */}
          <div className="mt-20 grid lg:grid-cols-12 gap-12">
            {/* SPECS */}
            <div className="lg:col-span-5">
              <div className="sticky top-28 bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm space-y-6">
                <h3 className="text-2xl font-bold text-slate-900 font-display">
                  Technical Specs
                </h3>
                <div className="space-y-4">
                  {device.specs &&
                    Object.entries(device.specs).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-white rounded-xl shadow-sm">
                            <Cpu className="w-4 h-4 text-indigo-600" />
                          </div>
                          <span className="text-sm font-bold text-slate-500 uppercase tracking-tighter">
                            {k}
                          </span>
                        </div>
                        <span className="text-sm font-black text-slate-900">
                          {v}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* RELATED DEVICES */}
            <div className="lg:col-span-7 space-y-10">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-4xl font-bold text-slate-900 font-display">
                    Similar Equipment
                  </h2>
                  <p className="text-slate-500 font-medium mt-2">
                    Recommended gear based on this production kit.
                  </p>
                </div>
                <button className="text-indigo-600 font-bold hover:underline flex items-center gap-2">
                  View All <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {relatedDevices.slice(0, 6).map((d) => (
                  <div
                    key={d._id}
                    className="group bg-white rounded-[28px] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/device/${d._id}`)}
                  >
                    <div className="relative h-64 overflow-hidden">
                      <img
                        src={d.images?.[0] || d.image}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        alt={d.name}
                      />
                      <div className="absolute bottom-4 left-4">
                        <div className="glass-panel text-white text-[10px] font-bold px-3 py-1.5 rounded-xl backdrop-blur-md">
                          {d.location?.city}
                        </div>
                      </div>
                    </div>
                    <div className="p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                          {d.name}
                        </h4>
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-bold">{d.ratingAvg}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-slate-50">
                        <div className="text-indigo-600 font-black text-lg">
                          {d.rentPrice?.perDay.toLocaleString()}đ
                          <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">
                            / day
                          </span>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <Zap className="w-4 h-4 fill-current" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <AuthRequirementModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}

const Criteria = ({ icon, text }) => (
  <div className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm text-center flex flex-col items-center gap-2">
    <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
      {icon}
    </div>
    <p className="text-[10px] font-black uppercase tracking-tight text-slate-500 leading-tight">
      {text}
    </p>
  </div>
);