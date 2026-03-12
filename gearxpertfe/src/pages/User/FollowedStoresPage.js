import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Bell, BellOff, Tag, Package, FileText, UserMinus, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import { getMyFollowedStores, updateFollowPrefs, toggleFollowStore } from "../../service/ApiService/SupplierApi";
import ImageWithFallback from "../../components/common/ImageWithFallback";

export default function FollowedStoresPage() {
  const navigate = useNavigate();
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState(null);
  const [unfollowingId, setUnfollowingId] = useState(null);

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      setLoading(true);
      const res = await getMyFollowedStores();
      setStores(res?.data?.follows || res?.follows || []);
    } catch {
      toast.error("Không thể tải danh sách cửa hàng");
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePref = async (followId, field, currentValue) => {
    setTogglingId(`${followId}-${field}`);
    try {
      await updateFollowPrefs(followId, { [field]: !currentValue });
      setStores((prev) =>
        prev.map((s) =>
          s._id === followId ? { ...s, [field]: !currentValue } : s
        )
      );
    } catch {
      toast.error("Cập nhật thất bại");
    } finally {
      setTogglingId(null);
    }
  };

  const handleUnfollow = async (supplierId, followId) => {
    setUnfollowingId(followId);
    try {
      await toggleFollowStore(supplierId);
      setStores((prev) => prev.filter((s) => s._id !== followId));
      toast.success("Đã hủy theo dõi");
    } catch {
      toast.error("Hủy theo dõi thất bại");
    } finally {
      setUnfollowingId(null);
    }
  };

  const prefButtons = [
    { field: "notifyVoucher", label: "Voucher", icon: Tag },
    { field: "notifyNewDevice", label: "Thiết bị mới", icon: Package },
    { field: "notifyPost", label: "Bài đăng", icon: FileText },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-grow w-full pb-12">
        {/* Header Section */}
        <section className="relative w-full bg-slate-900 overflow-hidden mb-10 pt-10 pb-20 lg:pt-16 lg:pb-24">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?q=80&w=2070')] bg-cover bg-center opacity-20" />
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-slate-900/95 to-cyan-900/90" />

          <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-white mb-6 border border-white/10 bg-white/5 backdrop-blur-md">
              <Store size={16} className="text-indigo-300" />
              <span className="text-xs font-bold tracking-[0.1em] uppercase text-indigo-100">Following</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 tracking-tight">
              Cửa hàng <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">đang theo dõi</span>
            </h1>

            <p className="text-lg text-slate-300 max-w-2xl mx-auto font-light">
              Quản lý các cửa hàng bạn theo dõi và tuỳ chỉnh thông báo.
            </p>
          </div>
        </section>

        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-16 relative z-20">
          <div className="bg-white/50 backdrop-blur-3xl rounded-[32px] p-6 lg:p-10 shadow-xl border border-white/60">
            {/* Count */}
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/60">
              <div className="flex items-center gap-3">
                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600">
                  <Store size={20} />
                </span>
                <span className="text-lg font-bold text-slate-800">
                  {stores.length} cửa hàng
                </span>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div className="flex justify-center py-20">
                <Loader2 size={32} className="animate-spin text-indigo-500" />
              </div>
            )}

            {/* Empty */}
            {!loading && stores.length === 0 && (
              <div className="text-center py-20">
                <Store size={48} className="mx-auto text-slate-300 mb-4" />
                <p className="text-slate-500 text-lg font-medium mb-2">Bạn chưa theo dõi cửa hàng nào</p>
                <p className="text-slate-400 text-sm mb-6">Khám phá các nhà cung cấp và theo dõi để nhận thông báo</p>
                <button
                  onClick={() => navigate("/products")}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Khám phá thiết bị
                </button>
              </div>
            )}

            {/* Store list */}
            {!loading && stores.length > 0 && (
              <div className="grid gap-4">
                {stores.map((store) => {
                  const supplier = store.supplierId || {};
                  const profile = store.profile || {};
                  const displayName = profile.businessName || supplier.username || "Cửa hàng";
                  const avatar = profile.businessAvatar || supplier.image;

                  return (
                    <div
                      key={store._id}
                      className="bg-white rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-all"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        {/* Avatar + Info */}
                        <div
                          className="flex items-center gap-4 flex-1 cursor-pointer"
                          onClick={() => navigate(`/supplier/${supplier._id}`)}
                        >
                          <div className="w-14 h-14 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0">
                            {avatar ? (
                              <ImageWithFallback
                                src={avatar}
                                alt={displayName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-bold text-xl">
                                {displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-900 truncate">{displayName}</h3>
                            <p className="text-sm text-slate-500">
                              {store.deviceCount || 0} thiết bị
                              {profile.description && (
                                <span className="hidden sm:inline"> · {profile.description.slice(0, 60)}{profile.description.length > 60 ? "..." : ""}</span>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Notification prefs */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {prefButtons.map(({ field, label, icon: Icon }) => {
                            const active = store[field];
                            const toggling = togglingId === `${store._id}-${field}`;
                            return (
                              <button
                                key={field}
                                onClick={() => handleTogglePref(store._id, field, active)}
                                disabled={toggling}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                                  active
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"
                                    : "bg-slate-50 text-slate-400 border-slate-200 hover:bg-slate-100"
                                }`}
                                title={active ? `Tắt thông báo ${label}` : `Bật thông báo ${label}`}
                              >
                                {toggling ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : active ? (
                                  <Bell size={12} />
                                ) : (
                                  <BellOff size={12} />
                                )}
                                <Icon size={12} />
                                <span className="hidden sm:inline">{label}</span>
                              </button>
                            );
                          })}

                          {/* Unfollow */}
                          <button
                            onClick={() => handleUnfollow(supplier._id, store._id)}
                            disabled={unfollowingId === store._id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 transition-all"
                            title="Hủy theo dõi"
                          >
                            {unfollowingId === store._id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <UserMinus size={12} />
                            )}
                            <span className="hidden sm:inline">Bỏ theo dõi</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
