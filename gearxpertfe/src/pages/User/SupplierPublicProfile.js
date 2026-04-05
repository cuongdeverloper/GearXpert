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
  Check,
  Heart,
  Users,
  Bell,
  BellRing,
  BellOff,
  ChevronDown,
  UserMinus,
  AlertCircle,
  Edit,
} from "lucide-react";
import ShopReportModal from "../../components/public/ShopReportModal";
import { motion, AnimatePresence } from "framer-motion";
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
import Map, { Marker } from "react-map-gl/mapbox";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import gearXpertLogo from "../../assets/logoGearXpert.png";

const SORT_OPTIONS = [
  { value: "newest", label: "Hàng mới nhất" },
  { value: "popular", label: "Phổ biến nhất" },
  { value: "price-asc", label: "Giá: Thấp đến Cao" },
  { value: "price-desc", label: "Giá: Cao xuống Thấp" },
  { value: "rating-desc", label: "Đánh giá cao" },
];

const CATEGORY_MAP = {
  CAMERA: { name: "Máy ảnh", icon: "videocam" },
  LIGHTING: { name: "Ánh sáng", icon: "lightbulb" },
  AUDIO: { name: "Âm thanh", icon: "mic" },
  OFFICE: { name: "Văn phòng", icon: "business_center" },
  GAMING: { name: "Trò chơi", icon: "sports_esports" },
  ACCESSORY: { name: "Phụ kiện", icon: "handyman" },
  DRONE: { name: "Flycam", icon: "flight" },
  OTHER: { name: "Khác", icon: "category" },
};

/** Khớp SupplierProfile.warehouseAddress: ưu tiên fullAddress, sau đó ghép street/district/city */
function formatWarehouseLine(addr) {
  if (!addr) return "";
  const full = typeof addr.fullAddress === "string" ? addr.fullAddress.trim() : "";
  if (full) return full;
  return [addr.street, addr.district, addr.city].filter(Boolean).join(", ");
}

export default function SupplierPublicProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state) => state.user?.isAuthenticated || false);
  const userAccount = useSelector((state) => state.user?.account);
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
  const [showSort, setShowSort] = useState(false);
  const sortRef = useRef(null);
  const followMenuRef = useRef(null);
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapViewState, setMapViewState] = useState({
    latitude: 16.0544,
    longitude: 108.2022,
    zoom: 15
  });
  const [showReportModal, setShowReportModal] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await getSupplierStorefront(id);
      if (res?.success) {
        setSupplier(res.data);
      } else {
        toast.error("Không tìm thấy cửa hàng");
      }
    } catch {
      toast.error("Không thể tải thông tin cửa hàng");
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
      toast.error("Không thể tải danh sách thiết bị");
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
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSort(false);
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
    await handleFollow();
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
    if (supplier?.warehouseAddress?.lat && supplier?.warehouseAddress?.lng) {
      setMapViewState({
        latitude: supplier.warehouseAddress.lat,
        longitude: supplier.warehouseAddress.lng,
        zoom: 15
      });
    }
  }, [supplier]);

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
    ? new Date(supplier.memberSince).toLocaleDateString("vi-VN", {
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
              Không tìm thấy nhà cung cấp
            </h2>
            <p className="text-slate-500 mb-8">
              Nhà cung cấp này có thể đã bị vô hiệu hóa hoặc không tồn tại.
            </p>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
            >
              Xem tất cả thiết bị
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" data-theme="light">
      <Header />

      <main className="flex-grow">
        <div className="max-w-[1440px] mx-auto px-6 pt-40 lg:pt-38">
          <button
            onClick={() => navigate(-1)}
            className="group inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-95"
          >
            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
            <span>Quay lại</span>
          </button>
        </div>

        {/* ===== SHOP HEADER ===== */}
        <div className="max-w-[1440px] mx-auto px-6 py-6">
          <div className="relative bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden group/header">
            {/* Main Background Accent - SHRUNK */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-r from-indigo-700 via-violet-600 to-indigo-500 opacity-95 group-hover/header:opacity-100 transition-opacity duration-700" data-theme="dark" />

            <div className="relative px-8">
              {/* Banner Content: logoGearXpert X Shop Name */}
              <div className="h-32 flex items-center justify-center lg:justify-start gap-5">
                <div className="flex items-center gap-4 bg-white/20 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/30 shadow-2xl">
                  <img src={gearXpertLogo} alt="GearXpert" className="h-8 w-auto brightness-0 invert" />
                  <span className="text-white/40 font-light text-2xl">|</span>
                  <h1 className="text-xl lg:text-2xl font-black text-white drop-shadow-sm truncate max-w-[400px] uppercase tracking-wider">
                    {supplier.businessName}
                  </h1>
                </div>
                {/* Modern Report & Follow Toggles - Hidden for owner */}
                {userAccount?.id !== supplier?.userId?._id && (
                  <button
                      onClick={() => {
                          if(!isAuthenticated) {
                              toast.info("Vui lòng đăng nhập để báo cáo cửa hàng");
                              navigate("/signin");
                              return;
                          }
                          setShowReportModal(true);
                      }}
                      className="ml-auto hidden sm:flex items-center gap-2.5 px-5 py-2.5 bg-white/10 hover:bg-red-500/80 backdrop-blur-md rounded-2xl border border-white/20 text-white font-black text-[10px] uppercase tracking-widest transition-all shadow-xl active:scale-95 group"
                      title="Báo cáo vi phạm"
                  >
                      <AlertCircle size={16} className="group-hover:scale-110 transition-transform" />
                      <span>Báo cáo</span>
                  </button>
                )}
              </div>

              {/* Sub Header Content: Avatar inline with Description */}
              <div className="pt-8 pb-8 flex flex-col lg:flex-row items-start gap-10">
                {/* Shop Avatar */}
                <div className="relative flex-shrink-0 z-10">
                  <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-[28px] overflow-hidden bg-white p-2 shadow-2xl ring-1 ring-slate-100/50">
                    <div className="w-full h-full rounded-[20px] overflow-hidden bg-slate-50 relative group/avatar">
                      <img
                        src={supplier.businessAvatar || supplier.userId?.avatar || "/default-shop.jpg"}
                        alt={supplier.businessName}
                        className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-700"
                      />
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1.5 rounded-xl shadow-lg border-2 border-white">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>

                <div className="flex-1 min-w-0 lg:pt-2">
                  {/* Description & Stats */}
                  {supplier.businessDescription && (
                    <p className="text-slate-600 text-base font-medium leading-relaxed mb-6 max-w-3xl line-clamp-3">
                      {supplier.businessDescription}
                    </p>
                  )}

                  {/* Modern Stat Row */}
                  <div className="flex flex-wrap gap-4 p-1 bg-slate-50/50 rounded-[22px] border border-slate-100 shadow-sm w-fit">
                    <StatItem
                      icon={<Package className="w-5 h-5" />}
                      value={supplier.deviceCount || 0}
                      label="Thiết bị"
                      theme="indigo"
                    />
                    <StatItem
                      icon={<Star className="w-5 h-5" />}
                      value={(supplier.supplierRating || 0).toFixed(1)}
                      label="Đánh giá"
                      theme="amber"
                    />
                    {memberSince && (
                      <StatItem
                        icon={<Clock className="w-5 h-5" />}
                        value={memberSince}
                        label="Tham gia"
                        theme="violet"
                        isText
                      />
                    )}
                    <StatItem
                      icon={<Users className="w-5 h-5" />}
                      value={followerCount}
                      label="Người theo dõi"
                      theme="cyan"
                    />
                  </div>
                </div>

                {/* Actions Section */}
                <div className="flex flex-col gap-3 min-w-[240px] w-full lg:w-auto lg:pt-2">
                  {userAccount?.id !== supplier?.userId?._id && (
                    !isFollowing ? (
                      <button
                        onClick={handleFollow}
                        disabled={followLoading}
                        className="group/follow relative inline-flex items-center justify-center gap-3 px-8 py-4 rounded-[20px] bg-slate-900 text-white font-black text-sm uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl active:scale-95 disabled:opacity-50"
                      >
                        <Heart className="w-5 h-5" />
                        <span>{followLoading ? "..." : "Theo dõi"}</span>
                      </button>
                    ) : (
                      <div className="relative" ref={followMenuRef}>
                        <button
                          onClick={() => setShowFollowMenu(!showFollowMenu)}
                          disabled={followLoading}
                          className="w-full inline-flex items-center justify-center gap-3 px-8 py-4 rounded-[20px] bg-white border-2 border-slate-100 text-slate-800 font-black text-sm uppercase tracking-widest hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm active:scale-95"
                        >
                          <Bell size={18} />
                          <span>Đã theo dõi</span>
                          <ChevronDown size={14} className={showFollowMenu ? 'rotate-180' : ''} />
                        </button>
                        {showFollowMenu && (
                          <div className="absolute left-0 right-0 top-full mt-3 bg-white rounded-[24px] shadow-2xl border border-slate-100 overflow-hidden z-[60] py-2 animate-in fade-in slide-in-from-top-2">
                            {[
                              { level: "all", icon: BellRing, label: "Tất cả", desc: "Mọi thông báo" },
                              { level: "personalized", icon: Bell, label: "Cá nhân hóa", desc: "Chỉ thiết bị mới" },
                              { level: "none", icon: BellOff, label: "Tắt", desc: "Không nhận thông báo" },
                            ].map(({ level, icon: Icon, label, desc }) => (
                              <button
                                key={level}
                                onClick={() => handleSetNotifLevel(level)}
                                className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors group/item"
                              >
                                <div className={`p-2 rounded-xl transition-colors ${getNotifLevel() === level ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover/item:bg-white group-hover/item:text-slate-600'}`}>
                                  <Icon size={20} />
                                </div>
                                <div className="flex-1 text-left">
                                  <p className="text-sm font-bold text-slate-800">{label}</p>
                                  <p className="text-[10px] text-slate-400 font-semibold uppercase">{desc}</p>
                                </div>
                                {getNotifLevel() === level && <Check size={16} className="text-indigo-600" />}
                              </button>
                            ))}
                            <div className="h-px bg-slate-100 my-2 mx-4" />
                            <button onClick={handleUnfollow} className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-red-50 transition-colors group/unfollow text-red-500">
                              <div className="p-2 bg-red-50 text-red-400 rounded-xl group-hover/unfollow:bg-white group-hover/unfollow:text-red-500 transition-colors">
                                <UserMinus size={20} />
                              </div>
                              <span className="text-sm font-black uppercase tracking-wider">Bỏ theo dõi</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  )}

                  {/* Add an "Edit Profile" button for the owner */}
                  {userAccount?.id === supplier?.userId?._id && (
                    <Link
                      to="/user/profile/edit-supplier"
                      className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-[20px] bg-indigo-600 text-white font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl active:scale-95"
                    >
                      <Edit size={18} />
                      <span>Chỉnh sửa shop</span>
                    </Link>
                  )}

                  <div className="flex gap-2">
                    <a href={`tel:${supplier.contactPhone}`} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 bg-indigo-50 text-indigo-700 rounded-[20px] font-black text-xs uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95">
                      <MessageCircle size={18} />
                      Liên hệ
                    </a>
                    <button onClick={() => setShowMapModal(true)} className="flex-shrink-0 p-4 bg-white border border-slate-100 text-slate-400 hover:text-indigo-600 hover:border-indigo-100 rounded-[20px] transition-all shadow-sm active:scale-95">
                      <MapPin size={22} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Address bar bottom */}
            <div className="px-8 py-4 bg-slate-50/80 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2 text-sm text-slate-400 font-bold max-w-lg overflow-hidden">
                <div className="p-1.5 bg-white rounded-lg shadow-sm">
                  <MapPin size={14} className="text-indigo-500" />
                </div>
                <span className="truncate">
                  {formatWarehouseLine(supplier.warehouseAddress) || "Chưa cập nhật địa chỉ kho"}
                </span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex -space-x-3 overflow-hidden">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-slate-200" />
                  ))}
                                    <div className="flex items-center justify-center h-8 w-8 rounded-full ring-2 ring-white bg-indigo-600 text-[10px] font-black text-white">
                    +{followerCount}
                  </div>
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  đang theo dõi
                </span>
                <button
                  type="button"
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
              </div>
            </div>
          </div>
        </div>

        {/* ===== MAP MODAL ===== */}
        {showMapModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-100 rounded-xl">
                    <MapPin className="text-indigo-600 w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Vị trí cửa hàng</h3>
                    <p className="text-sm text-slate-500 truncate max-w-md">
                      {formatWarehouseLine(supplier.warehouseAddress) || "Chưa có địa chỉ chi tiết"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMapModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors flex items-center justify-center"
                >
                  <span className="material-symbols-outlined text-slate-500 scale-125">close</span>
                </button>
              </div>

              <div className="relative w-full bg-slate-100" style={{ height: '550px' }}>
                <Map
                  {...mapViewState}
                  onMove={(evt) => setMapViewState(evt.viewState)}
                  mapStyle="mapbox://styles/mapbox/streets-v12"
                  mapboxAccessToken={process.env.REACT_APP_MAPBOX_ACCESS_TOKEN}
                  style={{ width: '100%', height: '100%' }}
                  reuseMaps
                  mapLib={mapboxgl}
                >
                  {supplier.warehouseAddress?.lat && supplier.warehouseAddress?.lng && (
                    <Marker
                      latitude={supplier.warehouseAddress.lat}
                      longitude={supplier.warehouseAddress.lng}
                      anchor="bottom"
                    >
                      <div className="flex flex-col items-center">
                        <div className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-bold shadow-lg mb-1 whitespace-nowrap">
                          {supplier.businessName}
                        </div>
                        <div className="w-10 h-10 bg-indigo-600 rounded-full border-4 border-white shadow-xl flex items-center justify-center">
                          <Store className="w-5 h-5 text-white" />
                        </div>
                        <div className="w-1 h-3 bg-indigo-600 shadow-lg"></div>
                      </div>
                    </Marker>
                  )}
                </Map>
                <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 shadow-xl pointer-events-none">
                  Sử dụng con lăn chuột hoặc nút (+/-) để zoom
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===== VOUCHERS SECTION ===== */}
        {vouchers.length > 0 && (
          <div className="max-w-[1440px] mx-auto px-6 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <Ticket className="w-5 h-5 text-rose-500" />
              <h2 className="text-lg font-bold text-slate-900">
                Mã giảm giá cửa hàng
              </h2>
            </div>

            <div className="relative group/carousel">
              {canScrollLeft && (
                <button
                  onClick={() => scrollVouchers(-1)}
                  className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}
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
                  const isCopied = copiedCode === v.code;
                  return (
                    <div key={v._id} className="flex-shrink-0 w-[280px] bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">
                      <div className="flex h-full">
                        <div className="w-[95px] bg-gradient-to-br from-indigo-600 to-violet-700 flex flex-col items-center justify-center text-white relative">
                          <div className="absolute -right-1.5 top-0 bottom-0 w-3 flex flex-col justify-around py-1">
                            {[...Array(6)].map((_, i) => (
                              <div key={i} className="w-3 h-3 bg-white rounded-full -mr-1.5" />
                            ))}
                          </div>
                          <span className="text-2xl font-black leading-none tracking-tighter">
                            {isPercent ? `${v.discountValue}%` : `${(v.discountValue / 1000).toFixed(0)}k`}
                          </span>
                          <span className="text-[10px] font-black uppercase tracking-widest mt-1 opacity-70">
                            {isPercent ? "Giảm" : "VNĐ"}
                          </span>
                        </div>
                        <div className="flex-1 p-4 flex flex-col justify-between min-h-[120px]">
                          <div>
                            <p className="text-sm font-black text-slate-800 line-clamp-1 mb-1">
                              {v.description || `Giảm ${isPercent ? `${v.discountValue}%` : `${v.discountValue.toLocaleString()}đ`}`}
                            </p>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase">
                              <Clock size={10} />
                              Hết hạn: {new Date(v.expiredAt).toLocaleDateString('vi-VN')}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed border-slate-100">
                            <div className="flex flex-col">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Đơn tối thiểu</span>
                              <span className="text-xs font-black text-indigo-600">{v.minOrderValue?.toLocaleString()}đ</span>
                            </div>
                            <button
                              onClick={() => handleCopyCode(v.code)}
                              className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isCopied ? "bg-emerald-500 text-white shadow-lg shadow-emerald-100" : "bg-slate-900 text-white hover:bg-indigo-600 shadow-lg shadow-slate-100"
                                }`}
                            >
                              {isCopied ? "Đã Lưu" : "Lưu Mã"}
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
        <div className="max-w-[1440px] mx-auto px-6 pb-20">
          <div className="flex flex-col space-y-8 mb-12">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <h2 className="text-4xl font-black text-slate-900 mb-2 tracking-tightest">
                  Danh sách sản phẩm
                </h2>
                <div className="flex items-center gap-2">
                  <div className="h-1 w-12 bg-indigo-600 rounded-full" />
                  <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                    {totalItems} thiết bị khả dụng
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <form onSubmit={handleSearch} className="relative group/search">
                  <input
                    type="text"
                    placeholder="Tìm kiếm tại cửa hàng..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    className="pl-12 pr-6 py-4 bg-white border-2 border-slate-100 rounded-[22px] text-sm w-72 focus:border-indigo-500 outline-none transition-all shadow-sm focus:shadow-indigo-100/50"
                  />
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within/search:text-indigo-500 transition-colors" />
                </form>
                <div className="relative" ref={sortRef}>
                  <button
                    onClick={() => setShowSort(!showSort)}
                    className="flex items-center justify-between gap-4 pl-6 pr-5 py-4 bg-white border-2 border-slate-100 rounded-[22px] text-sm font-black text-slate-700 hover:border-indigo-500 hover:bg-slate-50 transition-all shadow-sm min-w-[200px]"
                  >
                    <span>{SORT_OPTIONS.find(o => o.value === sortBy)?.label}</span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${showSort ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {showSort && (
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute right-0 top-full mt-3 w-64 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[24px] shadow-2xl z-50 overflow-hidden py-2"
                      >
                        <div className="px-4 py-2 border-b border-slate-50 mb-1">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sắp xếp theo</p>
                        </div>
                        {SORT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setSortBy(opt.value);
                              setPage(1);
                              setShowSort(false);
                            }}
                            className={`w-full flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-all group/item ${sortBy === opt.value ? 'bg-indigo-50/50' : ''
                              }`}
                          >
                            <span className={`text-sm font-bold transition-colors ${sortBy === opt.value ? 'text-indigo-600' : 'text-slate-600 group-hover/item:text-slate-900'
                              }`}>
                              {opt.label}
                            </span>
                            {sortBy === opt.value && (
                              <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {categories.length > 0 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-4 scrollbar-none">
                <button
                  onClick={() => handleCategoryClick("")}
                  className={`flex-shrink-0 flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-black uppercase tracking-widest transition-all ${!activeCategory ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105" : "bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                    }`}
                >
                  <span className="material-symbols-outlined text-[20px]">grid_view</span>
                  Tất cả
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => handleCategoryClick(cat)}
                    className={`flex-shrink-0 flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-black uppercase tracking-widest transition-all ${activeCategory === cat ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-105" : "bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100"
                      }`}
                  >
                    {CATEGORY_MAP[cat]?.icon && (
                      <span className="material-symbols-outlined text-[20px]">{CATEGORY_MAP[cat].icon}</span>
                    )}
                    {CATEGORY_MAP[cat]?.name || cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {devicesLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : devices.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-slate-200">
              <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">Không tìm thấy thiết bị</h3>
              <p className="text-slate-500 max-w-md mx-auto">Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm của bạn.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {devices.map((device) => (
                <Link
                  key={device._id}
                  to={`/device/${device.slug || device._id}`}
                  className="group bg-white rounded-[32px] overflow-hidden border border-slate-100 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 flex flex-col relative"
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-slate-50">
                    <img
                      src={device.images?.[0] || "/default-device.jpg"}
                      alt={device.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-white/80 backdrop-blur-md text-slate-900 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shadow-sm">
                        {CATEGORY_MAP[device.category]?.name || device.category}
                      </span>
                    </div>
                    {device.stockQuantity <= 0 && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex items-center justify-center p-6 text-center">
                        <span className="bg-white text-rose-600 text-[10px] font-black px-4 py-2 rounded-full uppercase tracking-widest shadow-2xl">
                          Hết hàng
                        </span>
                      </div>
                    )}
                    <div className="absolute bottom-4 right-4 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                      <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-xl">
                        <ArrowLeft className="w-5 h-5 rotate-180" />
                      </div>
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-grow">
                    <h3 className="font-bold text-slate-800 line-clamp-2 mb-4 group-hover:text-indigo-600 transition-colors leading-snug">
                      {device.name}
                    </h3>
                    <div className="mt-auto pt-4 border-t border-slate-50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Giá thuê</span>
                        <div className="flex items-center gap-1">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          <span className="text-xs font-black text-slate-700">{(device.ratingAvg || 0).toFixed(1)}</span>
                        </div>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-indigo-600">
                          {device.rentPrice?.perDay?.toLocaleString() || "0"}
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">vnđ / ngày</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-10">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40"><ChevronLeft size={16} /></button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${p === page ? "bg-indigo-600 text-white shadow-lg" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"}`}
                >
                  {p}
                </button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          )}
        </div>
        <ShopReportModal
            isOpen={showReportModal}
            onClose={() => setShowReportModal(false)}
            shopId={supplier._id}
            shopName={supplier.businessName}
        />
      </main>

      <Footer />
    </div>
  );
}

function StatItem({ icon, value, label, isText, theme = "indigo" }) {
  const themes = {
    indigo: "bg-indigo-50/50 text-indigo-600 border-indigo-100/50",
    amber: "bg-amber-50/50 text-amber-600 border-amber-100/50",
    violet: "bg-violet-50/50 text-violet-600 border-violet-100/50",
    cyan: "bg-cyan-50/50 text-cyan-600 border-cyan-100/50",
    emerald: "bg-emerald-50/50 text-emerald-600 border-emerald-100/50",
  };
  return (
    <div className={`flex items-center gap-3 px-4 py-2 rounded-[20px] transition-all duration-300 hover:shadow-md hover:scale-105 border ${themes[theme]}`}>
      <div className="p-2 bg-white rounded-xl shadow-sm">{icon}</div>
      <div>
        <p className={`font-black text-slate-900 leading-none ${isText ? "text-xs" : "text-lg"}`}>{value}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 tracking-wider">{label}</p>
      </div>
    </div>
  );
}
