import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
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
  Heart,
  Users,
  Bell,
  BellRing,
  BellOff,
  ChevronDown,
  UserMinus,
} from "lucide-react";
import {
  getSupplierStorefront,
  getSupplierStorefrontDevices,
  getSupplierStorefrontVouchers,
  toggleFollowStore,
  getFollowStatus,
  updateFollowPrefs,
} from "../../service/ApiService/SupplierApi";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import { ApiCreateConversation, ApiGetUserByUserId } from "../../components/Message Socket/ApiMessage";
import { openChatWindow } from "../../redux/reducer/chatWindowReducer";

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
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.user?.isAuthenticated || false);
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
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [followData, setFollowData] = useState(null); // { followId, notifyVoucher, notifyNewDevice, notifyPost }
  const [showFollowMenu, setShowFollowMenu] = useState(false);
  const followMenuRef = useRef(null);

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
      if (res?.success && Array.isArray(res.data)) {
        setVouchers(res.data);
      } else {
        setVouchers([]);
      }
    } catch {
      setVouchers([]);
    }
  }, [id]);

  const fetchFollowStatus = useCallback(async () => {
    try {
      const res = await getFollowStatus(id);
      if (res?.success) {
        setIsFollowing(res.data.isFollowing);
        setFollowerCount(res.data.followerCount);
        setFollowData(res.data.followData || null);
      }
    } catch {
      // silent
    }
  }, [id]);

  // Close follow menu on outside click
  useEffect(() => {
    const handler = (e) => {
      if (followMenuRef.current && !followMenuRef.current.contains(e.target)) {
        setShowFollowMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleFollow = async () => {
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập để theo dõi cửa hàng");
      navigate("/signin");
      return;
    }
    setFollowLoading(true);
    try {
      const res = await toggleFollowStore(id);
      if (res?.success) {
        setIsFollowing(res.data.isFollowing);
        setFollowerCount(res.data.followerCount);
        if (res.data.isFollowing) {
          toast.success("Đã theo dõi cửa hàng!");
          // Re-fetch to get followData with prefs
          fetchFollowStatus();
        } else {
          toast.success("Đã bỏ theo dõi");
          setFollowData(null);
          setShowFollowMenu(false);
        }
      }
    } catch {
      toast.error("Không thể thực hiện, thử lại sau");
    } finally {
      setFollowLoading(false);
    }
  };

  // Compute current notification level from prefs
  const getNotifLevel = () => {
    if (!followData) return "all";
    const { notifyVoucher, notifyNewDevice, notifyPost } = followData;
    if (notifyVoucher && notifyNewDevice && notifyPost) return "all";
    if (!notifyVoucher && !notifyNewDevice && !notifyPost) return "none";
    return "personalized";
  };

  const handleSetNotifLevel = async (level) => {
    if (!followData?.followId) return;
    let prefs;
    if (level === "all") {
      prefs = { notifyVoucher: true, notifyNewDevice: true, notifyPost: true };
    } else if (level === "none") {
      prefs = { notifyVoucher: false, notifyNewDevice: false, notifyPost: false };
    } else {
      // personalized = only new devices (default personalized choice)
      prefs = { notifyVoucher: false, notifyNewDevice: true, notifyPost: false };
    }
    try {
      await updateFollowPrefs(followData.followId, prefs);
      setFollowData((prev) => ({ ...prev, ...prefs }));
      toast.success("Đã cập nhật thông báo");
    } catch {
      toast.error("Cập nhật thất bại");
    }
    setShowFollowMenu(false);
  };

  const handleUnfollow = async () => {
    setShowFollowMenu(false);
    await handleFollow(); // toggleFollowStore will unfollow
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await fetchProfile();
      setLoading(false);
    };
    init();
    fetchFollowStatus();
  }, [fetchProfile, fetchFollowStatus]);

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
    // Recheck after DOM paint to ensure scroll dimensions are calculated
    const timer = setTimeout(checkVoucherScroll, 100);
    el.addEventListener("scroll", checkVoucherScroll, { passive: true });
    window.addEventListener("resize", checkVoucherScroll);
    return () => {
      clearTimeout(timer);
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
          <div className="bg-white rounded-[28px] border border-slate-200 shadow-sm">
            {/* Top gradient accent bar */}
            <div className="h-2 bg-gradient-to-r from-indigo-600 via-violet-500 to-cyan-500 rounded-t-[28px]" />

            <div className="p-8 flex flex-col lg:flex-row items-center lg:items-start gap-8">
              {/* Avatar */}
              <div className="relative flex-shrink-0">
                <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-2xl overflow-hidden ring-4 ring-indigo-50 shadow-lg">
                  <img
                    src={
                      supplier.businessAvatar ||
                      supplier.userId?.avatar ||
                      "/default-shop.jpg"
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

                  {memberSince && (
                    <StatItem
                      icon={<Clock className="w-4 h-4" />}
                      value={memberSince}
                      label="Member since"
                      isText
                    />
                  )}
                  <StatItem
                    icon={<Users className="w-4 h-4" />}
                    value={followerCount}
                    label="Followers"
                  />
                </div>
              </div>

              {/* Contact & Follow buttons */}
              <div className="flex flex-col gap-3 flex-shrink-0">
                {/* YouTube-style follow button */}
                {!isFollowing ? (
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full font-semibold text-sm bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm ${followLoading ? "opacity-60 cursor-not-allowed" : ""}`}
                  >
                    <Heart className="w-4 h-4" />
                    {followLoading ? "..." : "Theo dõi"}
                  </button>
                ) : (
                  <div className="relative" ref={followMenuRef}>
                    <button
                      onClick={() => setShowFollowMenu(!showFollowMenu)}
                      disabled={followLoading}
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full font-semibold text-sm bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all border border-slate-200"
                    >
                      {getNotifLevel() === "none" ? (
                        <BellOff className="w-4 h-4" />
                      ) : getNotifLevel() === "all" ? (
                        <BellRing className="w-4 h-4" />
                      ) : (
                        <Bell className="w-4 h-4" />
                      )}
                      Đã theo dõi
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Dropdown menu */}
                    {showFollowMenu && (
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                        {[
                          { level: "all", icon: BellRing, label: "Tất cả", desc: "Nhận mọi thông báo" },
                          { level: "personalized", icon: Bell, label: "Dành riêng cho bạn", desc: "Chỉ thiết bị mới" },
                          { level: "none", icon: BellOff, label: "Không nhận thông báo", desc: "" },
                        ].map(({ level, icon: Icon, label, desc }) => (
                          <button
                            key={level}
                            onClick={() => handleSetNotifLevel(level)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                          >
                            <Icon className="w-5 h-5 text-slate-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-800">{label}</p>
                              {desc && <p className="text-xs text-slate-400">{desc}</p>}
                            </div>
                            {getNotifLevel() === level && (
                              <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                            )}
                          </button>
                        ))}

                        <div className="border-t border-slate-100" />
                        <button
                          onClick={handleUnfollow}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 transition-colors text-left"
                        >
                          <UserMinus className="w-5 h-5 text-red-400 flex-shrink-0" />
                          <p className="text-sm font-semibold text-red-500">Hủy theo dõi</p>
                        </button>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={async () => {
                    if (!isAuthenticated) {
                      toast.info("Vui lòng đăng nhập để nhắn tin");
                      navigate("/signin");
                      return;
                    }
                    try {
                      const suppUserId = supplier.userId?._id || supplier.userId;
                      const conversation = await ApiCreateConversation(suppUserId);
                      const friendInfo = await ApiGetUserByUserId(suppUserId);
                      dispatch(openChatWindow({ ...conversation, friendInfo }));
                    } catch (err) {
                      toast.error("Không thể mở cuộc trò chuyện");
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all shadow-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  Nhắn tin
                </button>
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
          ) : (() => {
            const inStock = devices.filter((d) => d.stockQuantity > 0);
            const outOfStock = devices.filter((d) => d.stockQuantity <= 0);
            const DeviceCard = ({ device }) => (
              <Link
                to={`/device/${device.slug || device._id}`}
                className="group bg-white rounded-2xl overflow-hidden border border-slate-100 hover:border-indigo-200 hover:shadow-lg transition-all duration-300 flex flex-col"
              >
                <div className="relative aspect-square overflow-hidden bg-slate-100">
                  <img
                    src={device.images?.[0] || "/default-device.jpg"}
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
            );

            return (
              <div className="space-y-10">
                {/* In Stock */}
                {inStock.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-emerald-500" />
                      Available ({inStock.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                      {inStock.map((device) => (
                        <DeviceCard key={device._id} device={device} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Out of Stock */}
                {outOfStock.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-slate-400 mb-4 flex items-center gap-2">
                      <Package className="w-5 h-5 text-slate-300" />
                      Out of Stock ({outOfStock.length})
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 opacity-70">
                      {outOfStock.map((device) => (
                        <DeviceCard key={device._id} device={device} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

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
