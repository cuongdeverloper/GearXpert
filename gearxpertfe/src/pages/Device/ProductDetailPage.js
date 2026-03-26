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
  Edit,
  Trash2,
} from "lucide-react";
import { toast, Toaster } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import { useSocket } from "../../SocketContext";
import AuthRequirementModal from "../../components/common/AuthRequirementModal";

/* ===== API ===== */
import {
  getDeviceDetail,
  getDeviceAddons,
  getRelatedDevices,
} from "../../service/ApiService/DeviceApi";
import { addToCart, addInstantToCart } from "../../service/ApiService/CartApi";
import { hasRentedDevice } from "../../service/ApiService/RentalApi";
import {
  getMyReview,
  updateReview,
  deleteReview,
} from "../../service/ApiService/ReviewApi";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const today = new Date().toISOString().split("T")[0];
  const isAuthenticated = useSelector(
    (state) => state.user?.isAuthenticated || false
  );

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

  const [myReview, setMyReview] = useState(null);
  const [hasMyReview, setHasMyReview] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { socket } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const promises = [
        getDeviceDetail(slug),
        getDeviceAddons(slug),
        getRelatedDevices(slug),
      ];

      const results = await Promise.all(promises);
      const [d, a, r] = results;

      let rented;
      if (isAuthenticated && d?._id) {
        rented = await hasRentedDevice(d._id);
      }

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
  }, [slug, isAuthenticated]);

  const fetchMyReview = useCallback(async () => {
    if (!isAuthenticated || !device?._id) return;

    try {
      const data = await getMyReview(device._id);
      if (data.hasReview) {
        setMyReview(data.review);
        setHasMyReview(true);
        setEditRating(data.review.rating);
        setEditComment(data.review.comment || "");
      }
    } catch (err) {
      console.log("Không có review của bạn hoặc lỗi:", err);
    }
  }, [device?._id, isAuthenticated]);

  useEffect(() => {
    fetchData();
    window.scrollTo(0, 0);

    if (slug) {
      const viewed = JSON.parse(localStorage.getItem("viewedDevices") || "[]");
      const updated = [slug, ...viewed.filter((vId) => vId !== slug)].slice(
        0,
        10
      );
      localStorage.setItem("viewedDevices", JSON.stringify(updated));
    }
  }, [fetchData, slug]);

  useEffect(() => {
    fetchMyReview();
  }, [fetchMyReview]);

  useEffect(() => {
    if (!socket || !device?._id) return;

    console.log(`[SOCKET] Joining device room: device_${device._id}`);
    socket.emit("joinRoom", `device_${device._id}`);

    socket.on("deviceReviewUpdate", (data) => {
      console.log("[SOCKET] Received deviceReviewUpdate:", data);
      fetchData();
    });

    return () => {
      console.log(`[SOCKET] Leaving device room: device_${device._id}`);
      socket.emit("leaveRoom", `device_${device._id}`);
      socket.off("deviceReviewUpdate");
    };
  }, [socket, device?._id, fetchData]);

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

      console.log("[handleBuyNow] Response:", response.data);

      toast.success("Đã thêm vào giỏ INSTANT!", { id: toastId });
      navigate("/rental/checkout", {
        state: { cartType: "INSTANT" },
      });
    } catch (err) {
      console.error("[handleBuyNow] Error:", err);
      toast.error("Thuê ngay thất bại", { id: toastId });
    }
  };

  const handleUpdateReview = async () => {
    if (!editComment.trim()) {
      toast.error("Vui lòng nhập nội dung nhận xét");
      return;
    }

    setIsSubmittingReview(true);
    const toastId = toast.loading("Đang cập nhật review...");

    try {
      await updateReview(myReview._id, {
        rating: editRating,
        comment: editComment,
      });

      toast.success("Cập nhật review thành công!", { id: toastId });
      setMyReview((prev) => ({
        ...prev,
        rating: editRating,
        comment: editComment,
      }));
      setIsEditingReview(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Cập nhật review thất bại", {
        id: toastId,
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDeleteReview = async () => {
    setShowDeleteConfirm(false);
    const toastId = toast.loading("Đang xóa review...");

    try {
      await deleteReview(myReview._id);
      toast.success("Đã xóa review thành công", { id: toastId });
      setMyReview(null);
      setHasMyReview(false);
    } catch (err) {
      toast.error(err.response?.data?.message || "Xóa review thất bại", {
        id: toastId,
      });
    }
  };

  const days =
    startDate && endDate
      ? Math.max(
          1,
          Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000)
        )
      : 0;

  const discountPrice = device?.discountPrice || 0;
  const expiry = device?.discountExpiry ? new Date(device.discountExpiry) : null;
  const isExpired = (expiry && expiry < new Date());
  const effectivePrice = (discountPrice > 0 && !isExpired) ? discountPrice : (device?.rentPrice?.perDay || 0);
  
  const totalPrice = device
    ? days *
      (effectivePrice +
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
    <div className="min-h-screen bg-background-light flex flex-col font-sans text-[15px]">
      <Header />
      <Toaster richColors closeButton expand={true} />

      <main className="flex-1">
        {/* HEADER NAV STICKY */}
        <div className="sticky top-[84px] z-40 mx-4 sm:mx-6 bg-white/80 backdrop-blur-md border border-slate-200 rounded-2xl shadow-lg mt-3">
          <div className="max-w-7xl mx-auto px-5 sm:px-6 py-3 flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors font-semibold text-sm"
            >
              <ArrowLeft className="w-5 h-5" />
              Quay lại danh mục
            </button>
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm font-medium text-slate-400">
                Trang chủ / Thiết bị / {device?.category}
              </span>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 py-8 lg:py-10">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10">
            {/* LEFT: IMAGES & DETAILS */}
            <div className="lg:col-span-7 space-y-8">
              {/* IMAGES */}
              <div className="space-y-5">
                <div className="relative rounded-3xl overflow-hidden bg-white shadow-xl shadow-indigo-100/40 border border-slate-100 group">
                  <img
                    src={device.images?.[selectedImage]}
                    className="w-full h-[420px] sm:h-[480px] lg:h-[520px] object-cover transition-transform duration-700 group-hover:scale-105"
                    alt={device.name}
                  />
                  <div className="absolute top-5 left-5">
                    <span
                      className={`text-white text-xs font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-md ${
                        device.stockQuantity > 0
                          ? "bg-indigo-600"
                          : "bg-rose-500"
                      }`}
                    >
                      {device.stockQuantity > 0
                        ? device.status
                        : "Hết hàng"}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 overflow-x-auto pb-2 hide-scroll">
                  {device.images?.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedImage(i)}
                      className={`relative min-w-[90px] sm:min-w-[100px] h-20 sm:h-24 rounded-2xl overflow-hidden border-2 transition-all ${
                        selectedImage === i
                          ? "border-indigo-600 scale-95 shadow-md"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img}
                        className="w-full h-full object-cover"
                        alt="thumb"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* OVERVIEW */}
              <div className="space-y-5">
                <h2 className="text-2xl font-bold text-slate-900 font-display flex items-center gap-3">
                  Tổng quan
                  <div className="h-1 flex-1 bg-slate-100 rounded-full"></div>
                </h2>
                <p className="text-[15px] text-slate-600 leading-relaxed whitespace-pre-line font-medium">
                  {device.description}
                </p>
              </div>

              {/* MY REVIEW SECTION */}
              {isAuthenticated && (
                <div className="mt-10 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-3">
                    <User className="w-5 h-5 text-indigo-600" />
                    Đánh giá của tôi
                  </h3>

                  {hasMyReview ? (
                    <div className="space-y-5">
                      {!isEditingReview ? (
                        <>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-5 h-5 ${
                                      i < myReview.rating
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-slate-200"
                                    }`}
                                  />
                                ))}
                              </div>
                              <span className="text-sm text-slate-500 font-medium">
                                {new Date(
                                  myReview.createdAt
                                ).toLocaleDateString("vi-VN")}
                              </span>
                            </div>

                            {(() => {
                              const hoursDiff =
                                (Date.now() -
                                  new Date(myReview.createdAt).getTime()) /
                                (1000 * 60 * 60);
                              const canEdit = hoursDiff <= 48;

                              return canEdit ? (
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => setIsEditingReview(true)}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 hover:border-indigo-300 rounded-xl transition-all"
                                  >
                                    <Edit className="w-4 h-4" />
                                    Chỉnh sửa
                                  </button>
                                  <button
                                    onClick={handleDeleteReview}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded-xl transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Xóa
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs italic px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full">
                                  Đã quá 48 giờ
                                </span>
                              );
                            })()}
                          </div>

                          <p className="text-slate-700 leading-relaxed text-[15px] font-medium">
                            {myReview.comment}
                          </p>

                          {myReview.images?.length > 0 && (
                            <div className="flex gap-3 flex-wrap mt-3">
                              {myReview.images.map((img, idx) => (
                                <img
                                  key={idx}
                                  src={img}
                                  alt={`Review ${idx + 1}`}
                                  className="w-24 h-24 object-cover rounded-xl border border-slate-200 shadow-sm hover:shadow transition-all duration-300"
                                />
                              ))}
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-5">
                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Đánh giá của bạn
                            </label>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setEditRating(star)}
                                  className="focus:outline-none transition-transform hover:scale-110"
                                >
                                  <Star
                                    className={`w-8 h-8 transition-all ${
                                      star <= editRating
                                        ? "fill-amber-400 text-amber-400 drop-shadow-sm"
                                        : "text-slate-300 hover:text-amber-300"
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                              Nhận xét
                            </label>
                            <textarea
                              value={editComment}
                              onChange={(e) => setEditComment(e.target.value)}
                              className="w-full h-36 p-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none text-slate-700 placeholder-slate-400 text-[15px]"
                              placeholder="Chia sẻ trải nghiệm của bạn..."
                            />
                          </div>

                          <div className="flex gap-4 justify-end pt-1">
                            <button
                              onClick={() => setIsEditingReview(false)}
                              disabled={isSubmittingReview}
                              className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                            >
                              Hủy
                            </button>
                            <button
                              onClick={handleUpdateReview}
                              disabled={
                                isSubmittingReview || !editComment.trim()
                              }
                              className={`min-w-[120px] px-5 py-2.5 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all ${
                                isSubmittingReview
                                  ? "bg-indigo-400 cursor-not-allowed"
                                  : "bg-indigo-600 hover:bg-indigo-700"
                              }`}
                            >
                              {isSubmittingReview ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  Đang lưu...
                                </>
                              ) : (
                                "Lưu thay đổi"
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                      <p className="text-slate-600 font-medium">
                        Bạn chưa đánh giá sản phẩm này
                      </p>
                      {hasRented && (
                        <p className="mt-2 text-sm text-indigo-600">
                          (Bạn có thể đánh giá vì đã từng thuê thiết bị này)
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* REVIEWS */}
              <div className="space-y-7">
                <h2 className="text-2xl font-bold text-slate-900 font-display flex items-center gap-3">
                  Đánh giá thiết bị
                  <div className="h-1 flex-1 bg-slate-100 rounded-full"></div>
                </h2>

                <div className="space-y-5">
                  {reviews.length > 0 ? (
                    reviews.map((r) => (
                      <div
                        key={r._id}
                        className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex gap-5"
                      >
                        <img
                          src={r.userId?.avatar}
                          className="w-12 h-12 rounded-2xl object-cover ring-4 ring-slate-50 flex-shrink-0"
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
                                    className={`w-3.5 h-3.5 ${
                                      i < r.rating
                                        ? "fill-amber-400 text-amber-400"
                                        : "text-slate-200"
                                    }`}
                                  />
                                ))}
                              </div>
                            </div>
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                              {new Date(r.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-slate-600 font-medium leading-relaxed italic text-[15px]">
                            "{r.comment}"
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                      <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">
                        Chưa có đánh giá nào
                      </p>
                    </div>
                  )}

                  {!hasRented && (
                    <div className="flex items-center justify-center gap-3 p-4 bg-indigo-50 rounded-2xl text-indigo-600 text-sm font-bold">
                      <AlertCircle className="w-5 h-5" />
                      Chỉ những người đã thuê mới có thể để lại đánh giá
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT: CONFIG & RENTAL */}
            <div className="lg:col-span-5 space-y-7">
              {/* TITLE & RATING */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm uppercase tracking-wider">
                  <div className="w-7 h-[2px] bg-indigo-600"></div>
                  {device.category}
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 font-display leading-tight italic">
                  {device.name}
                </h1>

                <div className="flex items-center gap-5">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                    <span className="font-bold text-slate-900">
                      {device.ratingAvg}
                    </span>
                    <span className="text-slate-400 text-sm">
                      ({device.reviewCount} đánh giá)
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
              {(supplier.businessName || supplier.fullName) && (
                <div
                  onClick={() => navigate(`/supplier/${supplier._id}`)}
                  className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm cursor-pointer hover:border-indigo-200 hover:shadow transition-all group"
                >
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-3">
                    <User size={20} className="text-indigo-600" />
                    Nhà cung cấp
                  </h3>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-indigo-100 group-hover:border-indigo-300 transition-colors flex-shrink-0">
                      <img
                        src={
                          supplier.businessAvatar ||
                          supplier.avatar ||
                          "/default-shop.jpg"
                        }
                        alt={supplier.businessName || supplier.fullName}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-base group-hover:text-indigo-600 transition-colors truncate">
                        {supplier.businessName || supplier.fullName}
                      </p>
                      <p className="text-sm text-slate-500 truncate">
                        Đã đăng {device.name} trên GearXpert
                      </p>
                    </div>
                    <ArrowLeft className="w-5 h-5 text-slate-300 rotate-180 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
                  </div>
                </div>
              )}

              {/* PRICING CARD */}
              <div className="bg-indigo-600 rounded-3xl p-6 text-white shadow-xl shadow-indigo-200/50">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mb-1">
                      Giá thuê
                    </p>
                    <div className="flex flex-col gap-1">
                      {device.discountPrice > 0 && !isExpired && (
                        <span className="text-sm text-indigo-300/80 line-through font-bold">
                          {device.rentPrice?.perDay.toLocaleString()}đ
                        </span>
                      )}
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold">
                          {effectivePrice.toLocaleString()}đ
                        </span>
                        <span className="text-indigo-200 text-sm">/ ngày</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest mb-1">
                      Tiền đặt cọc
                    </p>
                    <p className="font-bold text-lg">
                      {device.depositAmount?.toLocaleString()}đ
                    </p>
                  </div>
                </div>
              </div>

              {/* RENTAL FORM */}
              <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
                {/* RENTAL PERIOD */}
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
                    <CalendarIcon className="w-4 h-4 text-indigo-600" />
                    Chọn thời gian thuê
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase ml-1.5">
                        Ngày bắt đầu
                      </p>
                      <input
                        type="date"
                        min={today}
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          if (endDate && e.target.value > endDate)
                            setEndDate("");
                        }}
                        className="w-full bg-slate-50 border-none rounded-2xl p-3.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase ml-1.5">
                        Ngày kết thúc
                      </p>
                      <input
                        type="date"
                        min={startDate || today}
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full bg-slate-50 border-none rounded-2xl p-3.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* QUANTITY */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-bold text-slate-700 uppercase tracking-wider">
                      <Package className="w-4 h-4 text-indigo-600" />
                      Số lượng thuê
                    </label>
                    <span className="text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-widest border text-indigo-600 bg-indigo-50 border-indigo-100">
                      Có sẵn: {device.stockQuantity}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-2xl border border-slate-100 w-fit">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:text-indigo-600 hover:border-indigo-600 transition-all active:scale-95 disabled:opacity-50"
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
                          setQuantity(
                            Math.min(
                              Math.max(1, val),
                              device.stockQuantity || 1
                            )
                          );
                        }
                      }}
                      className="w-10 text-center bg-transparent border-none text-lg font-black text-slate-900 outline-none select-none"
                    />
                    <button
                      onClick={() =>
                        setQuantity(
                          Math.min(device.stockQuantity || 1, quantity + 1)
                        )
                      }
                      className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-900 flex items-center justify-center text-white hover:bg-indigo-600 hover:border-indigo-600 transition-all active:scale-95 disabled:opacity-50"
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
                    Phụ kiện đi kèm
                  </label>
                  <div className="space-y-3">
                    {addonsList.map((a) => {
                      const isSelected = addons.find(
                        (item) => item._id === a._id
                      );
                      return (
                        <button
                          key={a._id}
                          onClick={() => toggleAddon(a)}
                          className={`w-full flex justify-between items-center p-4 rounded-2xl border-2 transition-all text-left ${
                            isSelected
                              ? "border-indigo-600 bg-indigo-50 shadow-sm"
                              : "border-slate-100 hover:border-slate-200 bg-white"
                          }`}
                        >
                          <div>
                            <p
                              className={`font-bold text-sm ${
                                isSelected
                                  ? "text-indigo-700"
                                  : "text-slate-700"
                              }`}
                            >
                              {a.name}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase font-bold mt-0.5">
                              Thiết bị tương thích
                            </p>
                          </div>
                          <span className="font-bold text-indigo-600 whitespace-nowrap">
                            +{a.rentPrice?.perDay.toLocaleString()}đ
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* TOTAL */}
                {days > 0 && (
                  <div className="pt-4 border-t border-dashed border-slate-200">
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">
                        Tổng cộng dự kiến ({days} ngày)
                      </div>
                      <div className="text-xl sm:text-2xl font-black text-indigo-600">
                        {totalPrice.toLocaleString()}đ
                      </div>
                    </div>
                  </div>
                )}

                {/* ACTIONS */}
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <button
                    onClick={handleAddToCart}
                    disabled={device.stockQuantity === 0}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    Thêm vào giỏ
                  </button>
                  <button
                    onClick={handleBuyNow}
                    disabled={device.stockQuantity === 0}
                    className="flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-slate-900 text-white font-bold hover:bg-black shadow-lg shadow-slate-200/50 transition-all active:scale-95 disabled:bg-slate-400 disabled:shadow-none disabled:cursor-not-allowed text-sm"
                  >
                    <Zap className="w-5 h-5 fill-current" />
                    Thuê ngay
                  </button>
                </div>
              </div>

              {/* TRUST CRITERIA */}
              <div className="grid grid-cols-3 gap-4">
                <Criteria
                  icon={<Shield className="w-5 h-5" />}
                  text="Bảo hiểm Pro"
                />
                <Criteria
                  icon={<Package className="w-5 h-5" />}
                  text="Giao trong ngày"
                />
                <Criteria
                  icon={<CheckCircle className="w-5 h-5" />}
                  text="Kiểm định kỹ thuật"
                />
              </div>
            </div>
          </div>

          {/* SPECS & RELATED */}
          <div className="mt-16 grid lg:grid-cols-12 gap-8 lg:gap-10">
            {/* SPECS */}
            <div className="lg:col-span-5">
              <div className="sticky top-24 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
                <h3 className="text-xl font-bold text-slate-900 font-display">
                  Thông số kỹ thuật
                </h3>
                <div className="space-y-3">
                  {device.specs &&
                    Object.entries(device.specs).map(([k, v]) => (
                      <div
                        key={k}
                        className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl text-sm"
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
            <div className="lg:col-span-7 space-y-8">
              <div className="flex items-end justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-slate-900 font-display">
                    Thiết bị tương tự
                  </h2>
                  <p className="text-slate-500 font-medium mt-1.5 text-[15px]">
                    Gợi ý thiết bị dựa trên bộ quay phim này.
                  </p>
                </div>
                <button className="text-indigo-600 font-bold hover:underline flex items-center gap-2 text-sm">
                  Xem tất cả <ArrowLeft className="w-4 h-4 rotate-180" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedDevices.slice(0, 6).map((d) => (
                  <div
                    key={d._id}
                    className="group bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
                    onClick={() => navigate(`/device/${d._id}`)}
                  >
                    <div className="relative h-52 sm:h-56 overflow-hidden">
                      <img
                        src={d.images?.[0] || d.image}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        alt={d.name}
                      />
                      <div className="absolute bottom-3 left-3">
                        <div className="bg-black/60 text-white text-xs font-bold px-2.5 py-1 rounded-xl backdrop-blur-sm">
                          {d.location?.city}
                        </div>
                      </div>
                    </div>
                    <div className="p-5 space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-bold text-slate-900 line-clamp-2 group-hover:text-indigo-600 transition-colors text-base">
                          {d.name}
                        </h4>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-bold">
                            {d.ratingAvg}
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-3 border-t border-slate-50">
                        <div className="text-indigo-600 font-black text-base">
                          {d.rentPrice?.perDay.toLocaleString()}đ
                          <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">
                            / ngày
                          </span>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
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

      {/* MODAL XÁC NHẬN XÓA */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl p-7 max-w-md w-[90%] mx-4 shadow-2xl border border-slate-100 transform transition-all scale-100">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-7 h-7 text-rose-500" />
              <h3 className="text-xl font-bold text-slate-900">
                Xác nhận xóa review
              </h3>
            </div>
            <p className="text-slate-600 mb-7 leading-relaxed text-[15px]">
              Bạn có chắc chắn muốn xóa đánh giá này? Hành động này không thể
              hoàn tác.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteReview}
                className="px-6 py-2.5 bg-rose-600 text-white font-medium rounded-xl hover:bg-rose-700 transition-colors active:scale-95 shadow-sm"
              >
                Xóa review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Criteria = ({ icon, text }) => (
  <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm text-center flex flex-col items-center gap-2">
    <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
      {icon}
    </div>
    <p className="text-[10px] font-black uppercase tracking-tight text-slate-500 leading-tight">
      {text}
    </p>
  </div>
);
