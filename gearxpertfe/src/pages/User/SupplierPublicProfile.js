import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Star,
  MapPin,
  Package,
  MessageCircle,
  Clock,
  ShieldCheck,
  Search,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Store,
  Ticket,
  Copy,
  Check,
} from "lucide-react";
import {
  getSupplierStorefront,
  getSupplierStorefrontDevices,
  getSupplierStorefrontVouchers,
} from "../../service/ApiService/SupplierApi";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Most Popular" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating-desc", label: "Top Rated" },
];

export default function SupplierPublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [sortBy, setSortBy] = useState("newest");
  const [activeCategory, setActiveCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [vouchers, setVouchers] = useState([]);
  const [copiedCode, setCopiedCode] = useState("");
  const voucherScrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const MOCK_VOUCHERS = [
    {
      _id: "mock1",
      code: "NEWSHOP20",
      description: "20% off for new customers",
      discountType: "PERCENT",
      discountValue: 20,
      minOrderValue: 200000,
      maxDiscount: 100000,
      expiredAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      type: "SUPPLIER",
    },
    {
      _id: "mock2",
      code: "SAVE50K",
      description: "50,000đ off orders over 500k",
      discountType: "FIXED",
      discountValue: 50000,
      minOrderValue: 500000,
      expiredAt: new Date(Date.now() + 14 * 86400000).toISOString(),
      type: "SUPPLIER",
    },
    {
      _id: "mock3",
      code: "GEAR10",
      description: "10% off all gear rentals",
      discountType: "PERCENT",
      discountValue: 10,
      minOrderValue: 100000,
      maxDiscount: 50000,
      expiredAt: new Date(Date.now() + 60 * 86400000).toISOString(),
      type: "GLOBAL",
    },
    {
      _id: "mock4",
      code: "WELCOME15",
      description: "15% welcome discount",
      discountType: "PERCENT",
      discountValue: 15,
      minOrderValue: 150000,
      maxDiscount: 80000,
      expiredAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      type: "SUPPLIER",
    },
    {
      _id: "mock5",
      code: "FLASH100K",
      description: "100k off — flash sale today only",
      discountType: "FIXED",
      discountValue: 100000,
      minOrderValue: 800000,
      expiredAt: new Date(Date.now() + 1 * 86400000).toISOString(),
      type: "SUPPLIER",
    },
    {
      _id: "mock6",
      code: "WEEKEND30",
      description: "30% weekend special",
      discountType: "PERCENT",
      discountValue: 30,
      minOrderValue: 300000,
      maxDiscount: 150000,
      expiredAt: new Date(Date.now() + 3 * 86400000).toISOString(),
      type: "SUPPLIER",
    },
    {
      _id: "mock7",
      code: "GXFREE25K",
      description: "25,000đ off — platform gift",
      discountType: "FIXED",
      discountValue: 25000,
      minOrderValue: 100000,
      expiredAt: new Date(Date.now() + 45 * 86400000).toISOString(),
      type: "GLOBAL",
    },
    {
      _id: "mock8",
      code: "CAMERA5",
      description: "5% off camera gear",
      discountType: "PERCENT",
      discountValue: 5,
      minOrderValue: 50000,
      maxDiscount: 30000,
      expiredAt: new Date(Date.now() + 90 * 86400000).toISOString(),
      type: "SUPPLIER",
    },
    {
      _id: "mock9",
      code: "LOYAL200K",
      description: "200k off for loyal customers",
      discountType: "FIXED",
      discountValue: 200000,
      minOrderValue: 1500000,
      expiredAt: new Date(Date.now() + 21 * 86400000).toISOString(),
      type: "SUPPLIER",
    },
    {
      _id: "mock10",
      code: "GXPLATINUM",
      description: "40% platinum member exclusive",
      discountType: "PERCENT",
      discountValue: 40,
      minOrderValue: 500000,
      maxDiscount: 250000,
      expiredAt: new Date(Date.now() + 10 * 86400000).toISOString(),
      type: "GLOBAL",
    },
  ];

  const fetchProfile = useCallback(async () => {
    try {
      const res = await getSupplierStorefront(id);
      if (res?.success) {
        setSupplier(res.data);
      } else {
        toast.error("Supplier not found");
      }
    } catch {
      toast.error("Failed to load supplier profile");
    }
  }, [id]);

  const fetchDevices = useCallback(async () => {
    setDevicesLoading(true);
    try {
      const params = { page, limit: 12, sort: sortBy };
      if (activeCategory) params.category = activeCategory;
      if (searchTerm) params.search = searchTerm;

      const res = await getSupplierStorefrontDevices(id, params);
      if (res?.success) {
        setDevices(res.data?.devices || []);
        setTotalPages(res.data?.pagination?.totalPages || 1);
        setTotalItems(res.data?.pagination?.totalItems || 0);
        if (res.data?.categories) setCategories(res.data.categories);
      }
    } catch {
      toast.error("Failed to load devices");
    } finally {
      setDevicesLoading(false);
    }
  }, [id, page, sortBy, activeCategory, searchTerm]);

  const fetchVouchers = useCallback(async () => {
    try {
      const res = await getSupplierStorefrontVouchers(id);
      const real = res?.success && Array.isArray(res.data) ? res.data : [];
      const realCodes = new Set(real.map((v) => v.code));
      const fillers = MOCK_VOUCHERS.filter((m) => !realCodes.has(m.code));
      setVouchers([...real, ...fillers]);
    } catch {
      setVouchers(MOCK_VOUCHERS);
    }
  }, [id]);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchProfile();
      setLoading(false);
    };
    init();
  }, [fetchProfile]);

  useEffect(() => {
    fetchVouchers();
  }, [fetchVouchers]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(searchInput.trim());
    setPage(1);
  };

  const handleCategoryClick = (cat) => {
    setActiveCategory(cat === activeCategory ? "" : cat);
    setPage(1);
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Copied: ${code}`);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  const daysLeft = (dateStr) => {
    const diff = new Date(dateStr) - new Date();
    const d = Math.ceil(diff / 86400000);
    return d > 0 ? d : 0;
  };

  const checkVoucherScroll = useCallback(() => {
    const el = voucherScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = voucherScrollRef.current;
    if (!el) return;
    checkVoucherScroll();
    el.addEventListener("scroll", checkVoucherScroll, { passive: true });
    window.addEventListener("resize", checkVoucherScroll);
    return () => {
      el.removeEventListener("scroll", checkVoucherScroll);
      window.removeEventListener("resize", checkVoucherScroll);
    };
  }, [vouchers, checkVoucherScroll]);

  const scrollVouchers = (dir) => {
    const el = voucherScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const memberSince = supplier?.memberSince
    ? new Date(supplier.memberSince).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
      })
    : null;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-grow flex items-center justify-center">
          <div className="w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-grow flex items-center justify-center px-4">
          <div className="bg-white rounded-3xl p-12 text-center shadow-xl border border-slate-200 max-w-lg mx-auto">
            <Store className="w-20 h-20 text-slate-300 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-slate-900 mb-3">
              Supplier not found
            </h2>
            <p className="text-slate-500 mb-8">
              This supplier may have been deactivated or does not exist.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
            >
              Browse all devices
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-grow">
        {/* Back nav */}
        <div className="max-w-[1440px] mx-auto px-6 pt-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-500 hover:text-indigo-600 transition-colors text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* ===== SHOP HEADER ===== */}
        <div className="max-w-[1440px] mx-auto px-6 py-8">
          <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm overflow-hidden">
            {/* Top gradient accent bar */}
            <div className="h-2 bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500" />

            <div className="p-8 flex flex-col lg:flex-row items-center lg:items-start gap-8">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-2xl overflow-hidden ring-4 ring-indigo-50 shadow-lg">
                  <img
                    src={
                      supplier.businessAvatar ||
                      supplier.userId?.avatar ||
                      "https://via.placeholder.com/128"
                    }
                    alt={supplier.businessName}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-1.5 rounded-xl shadow-md">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 text-center lg:text-left min-w-0">
                <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-2 truncate">
                  {supplier.businessName}
                </h1>
                {supplier.businessDescription && (
                  <p className="text-slate-500 text-sm mb-5 max-w-2xl line-clamp-2">
                    {supplier.businessDescription}
                  </p>
                )}

                {/* Stats row */}
                <div className="flex flex-wrap justify-center lg:justify-start gap-6">
                  <StatItem
                    icon={<Package className="w-4 h-4" />}
                    value={supplier.deviceCount || 0}
                    label="Devices"
                  />
                  <StatItem
                    icon={<Star className="w-4 h-4 fill-amber-400 text-amber-400" />}
                    value={(supplier.supplierRating || 0).toFixed(1)}
                    label={`${supplier.supplierReviewCount || 0} reviews`}
                  />
                  <StatItem
                    icon={<MessageCircle className="w-4 h-4" />}
                    value="98%"
                    label="Response rate"
                  />
                  {memberSince && (
                    <StatItem
                      icon={<Clock className="w-4 h-4" />}
                      value={memberSince}
                      label="Member since"
                      isText
                    />
                  )}
                </div>
              </div>

              {/* Contact buttons */}
              <div className="flex flex-col gap-3 flex-shrink-0">
                {supplier.contactPhone && (
                  <a
                    href={`tel:${supplier.contactPhone}`}
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all shadow-sm"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Contact
                  </a>
                )}
                {supplier.warehouseAddress?.city && (
                  <div className="flex items-center gap-2 text-sm text-slate-500 justify-center">
                    <MapPin className="w-3.5 h-3.5" />
                    {supplier.warehouseAddress.city}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===== VOUCHERS SECTION ===== */}
        {vouchers.length > 0 && (
          <div className="max-w-[1440px] mx-auto px-6 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <Ticket className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg font-bold text-slate-900">
                Shop Vouchers
              </h2>
            </div>

            <div className="relative group/carousel">
              {/* Left arrow */}
              {canScrollLeft && (
                <button
                  onClick={() => scrollVouchers(-1)}
                  className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {/* Right arrow */}
              {canScrollRight && (
                <button
                  onClick={() => scrollVouchers(1)}
                  className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}

              <div
                ref={voucherScrollRef}
                className="flex gap-4 overflow-x-auto pb-2 scrollbar-none"
                style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              >
                {vouchers.map((v) => {
                  const isPercent = v.discountType === "PERCENT";
                  const remaining = daysLeft(v.expiredAt);
                  const isCopied = copiedCode === v.code;

                  return (
                    <div
                      key={v._id}
                      className="flex-shrink-0 w-[280px] bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow"
                    >
                      <div className="flex h-full">
                        <div className="w-[90px] bg-gradient-to-b from-rose-500 to-rose-600 flex flex-col items-center justify-center text-white relative">
                          <div className="absolute -right-2 top-4 w-4 h-4 bg-white rounded-full" />
                          <div className="absolute -right-2 bottom-4 w-4 h-4 bg-white rounded-full" />
                          <span className="text-2xl font-black leading-none">
                            {isPercent
                              ? `${v.discountValue}%`
                              : `${(v.discountValue / 1000).toFixed(0)}k`}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-80">
                            {isPercent ? "Off" : "đ Off"}
                          </span>
                          {v.type === "GLOBAL" && (
                            <span className="mt-2 text-[9px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">
                              Platform
                            </span>
                          )}
                        </div>

                        <div className="flex-1 p-3.5 flex flex-col justify-between min-h-[110px]">
                          <div>
                            <p className="text-sm font-semibold text-slate-800 line-clamp-1">
                              {v.description ||
                                `Discount ${
                                  isPercent
                                    ? `${v.discountValue}%`
                                    : `${v.discountValue.toLocaleString("vi-VN")}đ`
                                }`}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              Min. order:{" "}
                              {v.minOrderValue?.toLocaleString("vi-VN")}đ
                            </p>
                            {isPercent && v.maxDiscount && (
                              <p className="text-xs text-slate-400">
                                Max discount:{" "}
                                {v.maxDiscount.toLocaleString("vi-VN")}đ
                              </p>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <span
                              className={`text-[11px] font-semibold ${
                                remaining <= 3
                                  ? "text-rose-500"
                                  : "text-slate-400"
                              }`}
                            >
                              {remaining <= 0
                                ? "Expired"
                                : remaining === 1
                                ? "Ends tomorrow"
                                : `${remaining} days left`}
                            </span>
                            <button
                              onClick={() => handleCopyCode(v.code)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                isCopied
                                  ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                                  : "bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                              }`}
                            >
                              {isCopied ? (
                                <>
                                  <Check className="w-3 h-3" />
                                  Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  Save
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ===== PRODUCTS SECTION ===== */}
        <div className="max-w-[1440px] mx-auto px-6 pb-16">
          {/* Toolbar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-slate-900">
                All Devices
                <span className="text-sm font-normal text-slate-400 ml-2">
                  ({totalItems})
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Search */}
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search in this shop..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </form>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setPage(1);
                }}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all cursor-pointer"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Category pills */}
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              <button
                onClick={() => handleCategoryClick("")}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  !activeCategory
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300"
                }`}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => handleCategoryClick(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    activeCategory === cat
                      ? "bg-indigo-600 text-white shadow-md"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Device Grid */}
          {devicesLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : devices.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-slate-200">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">
                No devices found
              </h3>
              <p className="text-slate-500 max-w-md mx-auto">
                {searchTerm || activeCategory
                  ? "Try adjusting your filters or search terms."
                  : "This supplier hasn't listed any devices yet."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
              {devices.map((device) => (
                <Link
                  key={device._id}
                  to={`/device/${device._id}`}
                  className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-indigo-200 hover:shadow-lg transition-all duration-300 flex flex-col"
                >
                  <div className="relative aspect-square overflow-hidden bg-slate-100">
                    <img
                      src={device.images?.[0] || "https://via.placeholder.com/300"}
                      alt={device.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded-lg uppercase tracking-wider">
                        {device.category}
                      </span>
                    </div>
                    {device.stockQuantity <= 0 && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <span className="bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg">
                          Out of Stock
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 flex flex-col flex-grow">
                    <h3 className="font-semibold text-sm text-slate-800 line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors min-h-[40px]">
                      {device.name}
                    </h3>

                    <div className="mt-auto space-y-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-bold text-rose-600">
                          {device.rentPrice?.perDay?.toLocaleString("vi-VN")}đ
                        </span>
                        <span className="text-xs text-slate-400">/ day</span>
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                          <span className="font-semibold text-slate-700">
                            {(device.ratingAvg || 0).toFixed(1)}
                          </span>
                          <span className="text-slate-400">
                            ({device.reviewCount || 0})
                          </span>
                        </div>
                        {device.location?.city && (
                          <span className="text-slate-400 truncate max-w-[80px]">
                            {device.location.city}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - page) <= 1
                )
                .map((p, idx, arr) => {
                  const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <React.Fragment key={p}>
                      {showEllipsis && (
                        <span className="px-2 text-slate-400">...</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        className={`min-w-[40px] h-10 rounded-xl text-sm font-semibold transition-all ${
                          p === page
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  );
                })}

              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}

function StatItem({ icon, value, label, isText }) {
  return (
    <div className="flex items-center gap-3 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100">
      <span className="text-indigo-500">{icon}</span>
      <div>
        <p
          className={`font-bold text-slate-900 ${
            isText ? "text-sm" : "text-lg"
          }`}
        >
          {value}
        </p>
        <p className="text-[11px] text-slate-500">{label}</p>
      </div>
    </div>
  );
}
