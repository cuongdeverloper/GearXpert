/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps, jsx-a11y/img-redundant-alt */
import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import {
  ArrowLeft,
  ArrowRight,
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
  FileText,
  MessageSquare,
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Maximize2,
  Heart,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast, Toaster } from "sonner";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import BackButton from "../../components/common/BackButton";
import ProductCard from "../../components/common/ProductCard";
import { useSocket } from "../../SocketContext";
import AuthRequirementModal from "../../components/common/AuthRequirementModal";

/* ===== API ===== */
import { getDeviceDetail, getDeviceAddons, getRelatedDevices, getDeviceAvailableCount } from "../../service/ApiService/DeviceApi";
import { addToCart, addInstantToCart, getCart } from "../../service/ApiService/CartApi";
import { hasRentedDevice } from "../../service/ApiService/RentalApi";
import {
  getMyReview,
  updateReview,
  deleteReview,
  getDeviceReviews,
} from "../../service/ApiService/ReviewApi";
import { toggleFavorite, checkIsFavorite } from "../../service/ApiService/FavoriteApi";

export default function ProductDetailPage() {
  const { t } = useTranslation();
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
  const [realAvailableCount, setRealAvailableCount] = useState(0);
  const [addons, setAddons] = useState([]);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [myReview, setMyReview] = useState(null);
  const [hasMyReview, setHasMyReview] = useState(false);
  const [isEditingReview, setIsEditingReview] = useState(false);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState("");
  const [editImages, setEditImages] = useState([]); // Ảnh cũ giữ lại
  const [editNewImages, setEditNewImages] = useState([]); // Ảnh mới upload
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [isSpecsModalOpen, setIsSpecsModalOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedSpecs, setExpandedSpecs] = useState(false);
  const reviewsPerPage = 5;
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 });
  const [thumbnailOffset, setThumbnailOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [flyingItem, setFlyingItem] = useState(null); // For cart animation
  const [cartItems, setCartItems] = useState([]); // Store cart items for validation

  const { socket } = useSocket();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);

      const promises = [
        getDeviceDetail(slug),
        getDeviceAddons(slug),
        getRelatedDevices(slug),
        getDeviceAvailableCount(slug),
      ];

      const results = await Promise.all(promises);
      const [d, a, r, available] = results;

      let rented;
      if (isAuthenticated && d?._id) {
        rented = await hasRentedDevice(d._id);
      }

      setDevice(d);
      setAddonsList(a || []);
      setRelatedDevices(r || []);
      setHasRented(rented?.hasRented || false);
      setReviews(d.reviews || []);
      setRealAvailableCount(available?.availableCount || 0);
    } catch (err) {
      console.error("Fetch device detail error:", err);
      toast.error(t('productDetail.loading_device'));
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
        setEditImages(data.review.images || []);
        setEditNewImages([]);
      }
    } catch (err) {
      console.log("Không có review của bạn hoặc lỗi:", err);
    }
  }, [device?._id, isAuthenticated]);

  // Check favorite status
  const checkFavoriteStatus = useCallback(async () => {
    if (!isAuthenticated || !device?._id) return;
    try {
      const res = await checkIsFavorite(device._id);
      console.log("Favorite check response:", res);
      // Backend returns isFavorited field (axios auto-unwraps response)
      const isFav = res?.isFavorited ?? false;
      console.log("Setting favorite status to:", isFav);
      setIsFavorite(isFav);
    } catch (err) {
      console.log("Không có review review:", err);
      setIsFavorite(false);
    }
  }, [device?._id, isAuthenticated]);

  // Handle toggle favorite
  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!device?._id || isTogglingFavorite) return;

    setIsTogglingFavorite(true);
    try {
      const res = await toggleFavorite(device._id);
      console.log("Toggle favorite response:", res);
      // Backend returns isFavorited field (axios auto-unwraps response)
      const isFav = res?.isFavorited ?? false;
      console.log("Setting favorite to:", isFav);
      setIsFavorite(isFav);
      toast.success(isFav ? "Thêm vào danh sách yêu thích thành công" : "Xóa danh sách yêu thích thành công");
    } catch (err) {
      console.error("Toggle favorite error:", err);
      toast.error("Có errors khi thao tác");
    } finally {
      setIsTogglingFavorite(false);
    }
  };

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
    checkFavoriteStatus();
  }, [checkFavoriteStatus]);

  // Fetch cart items for validation
  const fetchCartItems = useCallback(async () => {
    if (!isAuthenticated) return [];
    try {
      const res = await getCart();
      const items = res?.items || res || [];
      setCartItems(items);
      return items;
    } catch (err) {
      console.error("Fetch cart items error:", err);
      return [];
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCartItems();
  }, [fetchCartItems]);

  useEffect(() => {
    if (!socket || !device?._id) return;

    socket.emit("joinRoom", `device_${device._id}`);

    socket.on("deviceReviewUpdate", (data) => {
      fetchData();
    });

    return () => {
      socket.emit("leaveRoom", `device_${device._id}`);
      socket.off("deviceReviewUpdate");
    };
  }, [socket, device?._id, fetchData]);

  const validateRental = () => {
    if (!startDate || !endDate) {
      toast.warning(t('productDetail.warn_select_dates', { defaultValue: "Vui lòng chọn ngày bắt đầu và ngày kết thúc thuê!" }));
      return false;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error(t('productDetail.error_end_date_before_start', { defaultValue: "Ngày kết thúc không được nhỏ hơn ngày bắt đầu!" }));
      return false;
    }

    if (quantity > realAvailableCount) {
      toast.error(t('productDetail.error_not_enough_stock', { count: realAvailableCount, defaultValue: `Chỉ còn ${realAvailableCount} thiết bị khả dụng!` }));
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
      toast.info(t('productDetail.addon_added', { name: addon.name }));
    }
  };

  const handleDeleteReview = (reviewId) => {
    // Handle MongoDB ObjectId object format (extract $oid or use toString)
    const id = typeof reviewId === 'object' ? reviewId?.$oid || reviewId?._id || reviewId?.toString() : reviewId;
    setReviewToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteReview = async () => {
    if (!reviewToDelete) return;
    try {
      await deleteReview(reviewToDelete);
      toast.success('Đã xóa đánh giá');
      setShowDeleteConfirm(false);
      setReviewToDelete(null);
      // Reset my review state if deleting own review
      if (myReview && reviewToDelete === myReview._id?.toString()) {
        setMyReview(null);
        setHasMyReview(false);
      }
      // Refresh reviews
      const updated = await getDeviceReviews(device._id);
      setReviews(updated || []);
    } catch (err) {
      toast.error(err?.response?.message || 'Không thể xóa đánh giá');
    }
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!validateRental()) return;
    
    // Refresh cart items to get latest data
    const currentCartItems = await fetchCartItems();
    
    // Check if product already exists in cart
    console.log('Cart items:', currentCartItems);
    console.log('Device ID:', device._id);
    const existingCartItem = currentCartItems.find(item => {
      const cartDeviceId = typeof item.deviceId === 'object' ? item.deviceId?._id : item.deviceId;
      const currentDeviceId = typeof device._id === 'object' ? device._id?.toString() : device._id;
      console.log('Comparing:', cartDeviceId, 'vs', currentDeviceId);
      return cartDeviceId === currentDeviceId;
    });
    console.log('Existing cart item:', existingCartItem);
    const existingQuantity = existingCartItem ? existingCartItem.quantity : 0;
    const totalQuantity = existingQuantity + quantity;
    
    // Check if total quantity exceeds available stock
    if (totalQuantity > realAvailableCount) {
      toast.error(`Sản phẩm đã có ${existingQuantity} trong giỏ hàng. Chỉ còn ${realAvailableCount - existingQuantity} sản phẩm có thể thêm.`, {
        description: "Vui lòng điều chỉnh số lượng hoặc xóa sản phẩm cũ trong giỏ hàng.",
      });
      return;
    }
    
    // Trigger fly animation
    const buttonRect = document.getElementById('addToCartBtn')?.getBoundingClientRect();
    const cartRect = document.querySelector('[data-cart-icon]')?.getBoundingClientRect();
    
    if (buttonRect && cartRect && device?.images?.[0]) {
      setFlyingItem({
        startX: buttonRect.left + buttonRect.width / 2,
        startY: buttonRect.top,
        endX: cartRect.left + cartRect.width / 2,
        endY: cartRect.top,
        image: device.images[0],
        id: Date.now(),
      });
      
      // Clear flying item after animation
      setTimeout(() => setFlyingItem(null), 1000);
    }
    
    try {
      await addToCart({
        deviceId: device._id,
        quantity,
        rentalStartDate: startDate,
        rentalEndDate: endDate,
        addons: addons.map((a) => a._id),
      });
      // Refresh cart items after adding
      await fetchCartItems();
      window.dispatchEvent(new Event('cartUpdated'));
      toast.success(t('productDetail.success_add_cart'), {
        description: t('productDetail.success_add_cart_desc', { name: device.name }),
        action: {
          label: t('productDetail.go_to_cart'),
          onClick: () => navigate("/user/cart"),
        },
      });
    } catch {
      toast.error(t('productDetail.error_add_cart'));
    }
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!validateRental()) return;

    const toastId = toast.loading(t('productDetail.processing_instant'));
    try {
      const response = await addInstantToCart({
        deviceId: device._id,
        quantity,
        rentalStartDate: startDate,
        rentalEndDate: endDate,
        addons: addons.map((a) => a._id),
      });
      toast.success(t('productDetail.success_add_cart'), { id: toastId });
      navigate("/rental/checkout", {
        state: { cartType: "INSTANT" },
      });
    } catch (err) {
      console.error("[handleBuyNow] Error:", err);

      // Detailed error handling
      const errorMessage = err.response?.data?.message || err.message || "Thuê ngay thất bại";

      // Specific error messages
      if (errorMessage.includes("không tồn tại")) {
        toast.error("Thiết bị không tồn tại hoặc đã bị xóa", { id: toastId });
      } else if (errorMessage.includes("khả dụng")) {
        toast.error(errorMessage, { id: toastId });
      } else if (errorMessage.includes("Ngày kết thúc")) {
        toast.error("Ngày kết thúc phải sau ngày bắt đầu", { id: toastId });
      } else {
        toast.error(errorMessage, { id: toastId });
      }
    }
  };

  const handleUpdateReview = async () => {
    if (!editComment.trim()) {
      toast.error(t('productDetail.error_empty_comment', { defaultValue: "Vui lòng nhập nội dung nhận xét" }));
      return;
    }

    // Kiểm tra tổng số ảnh
    if (editImages.length + editNewImages.length > 5) {
      toast.error("Tối đa 5 ảnh cho mỗi đánh giá");
      return;
    }

    setIsSubmittingReview(true);
    const toastId = toast.loading(t('productDetail.updating_review'));

    try {
      const formData = new FormData();
      formData.append("rating", editRating);
      formData.append("comment", editComment);
      
      // Gửi ảnh cũ giữ lại
      editImages.forEach((img) => {
        formData.append("keepImages", img);
      });
      
      // Gửi ảnh mới
      editNewImages.forEach((file) => {
        formData.append("images", file);
      });

      await updateReview(myReview._id, formData);

      toast.success("Cập nhật review thành công!", { id: toastId });
      setMyReview((prev) => ({
        ...prev,
        rating: editRating,
        comment: editComment,
        images: [...editImages, ...editNewImages.map(f => URL.createObjectURL(f))],
      }));
      setIsEditingReview(false);
      setEditNewImages([]);
    } catch (err) {
      toast.error(err.response?.data?.message || "Cập nhật review thất bại", {
        id: toastId,
      });
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleRemoveEditImage = (index) => {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddEditImages = (e) => {
    const files = Array.from(e.target.files);
    if (editImages.length + editNewImages.length + files.length > 5) {
      toast.error("Tối đa 5 ảnh");
      return;
    }
    setEditNewImages((prev) => [...prev, ...files]);
  };

  const handleRemoveNewImage = (index) => {
    setEditNewImages((prev) => prev.filter((_, i) => i !== index));
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
    <div className="min-h-screen bg-background-light flex flex-col font-sans text-[15px]" data-theme="light">
      <Header />
      <Toaster richColors closeButton expand={true} />

      <main className="flex-1 pt-28">
        {/* MAIN CONTENT */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6">
            <BackButton fallbackPath="/products" />
          </div>
          <div className="grid lg:grid-cols-12 gap-6">
            {/* LEFT: Title, Actions, Image, Description/Specs */}
            <div className="lg:col-span-8 space-y-4">
              {/* Product Name - First */}
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 leading-tight">{device.name}</h1>

              {/* Action Buttons Row */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleFavorite}
                  disabled={isTogglingFavorite}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${isFavorite
                      ? 'border-rose-200 bg-rose-50 text-rose-600'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-rose-600 hover:border-rose-200'
                    }`}
                >
                  <Heart
                    className={`w-4 h-4 ${isFavorite ? "text-rose-600" : "text-slate-600"}`}
                    fill={isFavorite ? "currentColor" : "none"}
                    strokeWidth={isFavorite ? 0 : 2}
                  />
                  <span className="text-xs font-medium">{isFavorite ? 'Đã yêu thích' : 'Yêu thích'}</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab('reviews');
                    setTimeout(() => {
                      const reviewsSection = document.getElementById('reviews-section');
                      reviewsSection?.scrollIntoView({ behavior: 'smooth' });
                    }, 100);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs font-medium">Xem đánh giá</span>
                </button>
                <button
                  onClick={() => setIsSpecsModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-200 transition-all"
                >
                  <Cpu className="w-4 h-4" />
                  <span className="text-xs font-medium">Xem thông số</span>
                </button>
              </div>

              {/* Image Gallery - Redesigned: Main image full height, thumbnails on right */}
              <div className="flex gap-3 h-[400px]">
                {/* Main Image */}
                <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <div
                    className="relative h-full group cursor-zoom-in"
                    onClick={() => {
                      setIsImageModalOpen(true);
                      setZoomLevel(1);
                      setImageOffset({ x: 0, y: 0 });
                    }}
                  >
                    <img
                      src={device.images?.[selectedImage]}
                      className="w-full h-full object-cover"
                      alt={device.name}
                    />
                    <div className="absolute top-4 left-4 flex flex-wrap gap-2">
                      {realAvailableCount === 0 ? (
                        <span className="bg-red-500/95 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">Hết hàng</span>
                      ) : (
                        <span className="bg-emerald-500/95 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg">Còn {realAvailableCount}</span>
                      )}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-sm text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Zap className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                {/* Thumbnails - Vertical on right matching main image height */}
                {device.images?.length > 1 && (
                  <div className="w-20 flex flex-col gap-2 h-full">
                    {/* Up Arrow */}
                    <button
                      onClick={() => setThumbnailOffset(Math.max(0, thumbnailOffset - 1))}
                      disabled={thumbnailOffset === 0}
                      className="w-20 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-4 h-4 text-slate-600 rotate-90" />
                    </button>

                    {/* Thumbnail Container - Fixed height for 4 images */}
                    <div className="w-20 h-[344px] overflow-hidden relative">
                      <div 
                        className="flex flex-col gap-2 transition-transform duration-300 ease-out"
                        style={{ transform: `translateY(-${thumbnailOffset * 88}px)` }}
                      >
                        {device.images.map((img, i) => (
                          <button
                            key={i}
                            onClick={() => setSelectedImage(i)}
                            className={`relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 transition-all ${selectedImage === i
                                ? "ring-2 ring-indigo-600"
                                : "opacity-70 hover:opacity-100"
                              }`}
                          >
                            <img src={img} className="w-full h-full object-cover" alt="" />
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Down Arrow */}
                    <button
                      onClick={() => {
                        const maxOffset = Math.max(0, device.images.length - 4);
                        setThumbnailOffset(Math.min(maxOffset, thumbnailOffset + 1));
                      }}
                      disabled={thumbnailOffset >= device.images.length - 4}
                      className="w-20 h-8 flex-shrink-0 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRight className="w-4 h-4 text-slate-600 rotate-90" />
                    </button>
                  </div>
                )}
              </div>

              {/* TABS */}
              <div className="bg-white rounded-2xl border border-slate-200 p-2 mb-6 shadow-sm">
                <div className="flex gap-1">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-xl transition-all duration-200 ${activeTab === 'overview'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <FileText className="w-4 h-4" />
                    Mô tả
                  </button>
                  <button
                    onClick={() => setActiveTab('specs')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-xl transition-all duration-200 ${activeTab === 'specs'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <Cpu className="w-4 h-4" />
                    Thông số
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium rounded-xl transition-all duration-200 ${activeTab === 'reviews'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Đánh giá
                    {device.reviewCount > 0 && (
                      <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${activeTab === 'reviews' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                        {device.reviewCount}
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* TAB CONTENT */}
              {activeTab === 'overview' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Mô tả sản phẩm
                  </h3>
                  <div className="prose prose-slate max-w-none">
                    <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                      {device.description || "Chưa có mô tả cho sản phẩm này."}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === 'specs' && (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <Cpu className="w-5 h-5 text-indigo-600" />
                    Thông số kỹ thuật
                  </h3>
                  {device.specs && Object.keys(device.specs).length > 0 ? (
                    <>
                      <div className="grid gap-3">
                        {Object.entries(device.specs)
                          .slice(0, expandedSpecs ? undefined : 5)
                          .map(([k, v]) => (
                            <div
                              key={k}
                              className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all"
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                                  <Cpu className="w-5 h-5 text-indigo-600" />
                                </div>
                                <span className="font-medium text-slate-600">{k}</span>
                              </div>
                              <span className="font-bold text-slate-900 text-right">{v}</span>
                            </div>
                          ))}
                      </div>
                      
                      {/* Expand/Collapse Button */}
                      {Object.keys(device.specs).length > 5 && (
                        <div className="flex justify-center mt-4">
                          <button
                            onClick={() => setExpandedSpecs(!expandedSpecs)}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all"
                          >
                            {expandedSpecs ? (
                              <>
                                <ChevronUp className="w-4 h-4" />
                                Thu gom
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4" />
                                Xem them {Object.keys(device.specs).length - 5} thong so
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-12 bg-slate-50 rounded-xl">
                      <Cpu className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500 font-medium">Chua co thong so ky thuat</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reviews' && (
                <div id="reviews-section" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                  {/* Average Rating Summary */}
                  {reviews.length > 0 && (
                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 mb-6 border border-amber-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-3xl font-bold text-amber-600">
                              {(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)}
                            </div>
                            <div className="flex gap-0.5 mt-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-4 h-4 ${
                                    i < Math.round(reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length)
                                      ? "fill-amber-400 text-amber-400"
                                      : "text-amber-200"
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-700">Trung bình</p>
                            <p className="text-xs text-slate-500">Dùng trên {reviews.length} đánh giá</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500 mb-1">Phân tích:</div>
                          <div className="space-y-1">
                            {[5, 4, 3, 2, 1].map(star => {
                              const count = reviews.filter(r => r.rating === star).length;
                              const percentage = (count / reviews.length) * 100;
                              return (
                                <div key={star} className="flex items-center gap-2 text-xs">
                                  <span className="w-4 text-right">{star}</span>
                                  <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                  <div className="w-20 bg-amber-100 rounded-full h-1.5 overflow-hidden">
                                    <div 
                                      className="bg-amber-400 h-full rounded-full transition-all duration-500"
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <span className="w-8 text-right text-slate-600">{count}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-indigo-600" />
                    Đánh giá từ khách hàng
                    {reviews.length > 0 && (
                      <span className="ml-2 px-2.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
                        {reviews.length}
                      </span>
                    )}
                  </h3>

                  {/* Reviews List */}
                  <div className="space-y-4">
                    {reviews.length > 0 ? (
                      <div>
                        {reviews
                          .slice((currentPage - 1) * reviewsPerPage, currentPage * reviewsPerPage)
                          .map((r) => (
                            <div
                              key={r._id}
                              className="p-5 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all"
                            >
                              <div className="flex gap-4">
                                <img
                                  src={r.userId?.avatar}
                                  className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-sm flex-shrink-0"
                                  alt="avatar"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h4 className="font-bold text-slate-900 text-sm">{r.userId?.fullName}</h4>
                                      <div className="flex items-center gap-2 mt-1">
                                        <div className="flex gap-0.5">
                                          {Array.from({ length: 5 }).map((_, i) => (
                                            <Star
                                              key={i}
                                              className={`w-3.5 h-3.5 ${i < r.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                                            />
                                          ))}
                                        </div>
                                        <span className="text-xs text-slate-400">· {new Date(r.createdAt).toLocaleDateString('vi-VN')}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <p className="text-slate-600 text-sm leading-relaxed">{r.comment}</p>
                                  
                                  {/* Review Images */}
                                  {r.images && r.images.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-3">
                                      {r.images.map((img, idx) => (
                                        <img
                                          key={idx}
                                          src={img}
                                          alt={`Review image ${idx + 1}`}
                                          className="w-16 h-16 rounded-lg object-cover border border-slate-200 cursor-pointer hover:opacity-80"
                                          onClick={() => window.open(img, '_blank')}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Delete button - only show for review owner */}
                                {r.isOwner && (
                                  <button
                                    onClick={() => handleDeleteReview(r._id)}
                                    className="text-red-400 hover:text-red-600 transition-colors p-1"
                                    title="Xóa đánh giá"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        
                        {/* Pagination */}
                        {Math.ceil(reviews.length / reviewsPerPage) > 1 && (
                          <div className="flex justify-center items-center gap-2 mt-6 pt-4 border-t border-slate-200">
                            <button
                              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={currentPage === 1}
                              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            
                            <div className="flex items-center gap-1">
                              {Array.from({ length: Math.ceil(reviews.length / reviewsPerPage) }).map((_, index) => (
                                <button
                                  key={index + 1}
                                  onClick={() => setCurrentPage(index + 1)}
                                  className={`w-8 h-8 rounded-lg text-sm font-medium transition-all ${
                                    currentPage === index + 1
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                                  }`}
                                >
                                  {index + 1}
                                </button>
                              ))}
                            </div>
                            
                            <button
                              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(reviews.length / reviewsPerPage), prev + 1))}
                              disabled={currentPage === Math.ceil(reviews.length / reviewsPerPage)}
                              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-slate-50 rounded-xl">
                        <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500 font-medium">Chưa có đánh giá nào</p>
                        <p className="text-slate-400 text-sm mt-1">Hãy là người đầu tiên đánh giá sản phẩm này</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* MY REVIEW SECTION */}
              {isAuthenticated && (
                <div className="mt-10 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                  <h3 className="text-xl font-bold text-slate-900 mb-5 flex items-center gap-3">
                    <User className="w-5 h-5 text-indigo-600" />
                    {t('productDetail.my_review')}
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
                                    className={`w-5 h-5 ${i < myReview.rating
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
                                    {t('common.edit')}
                                  </button>
                                  <button
                                    onClick={() => handleDeleteReview(myReview._id)}
                                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 hover:border-rose-300 rounded-xl transition-all"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    {t('common.delete')}
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs italic px-3 py-1.5 bg-slate-100 text-slate-500 rounded-full">
                                  {t('productDetail.days_too_long')}
                                </span>
                              );
                            })()}
                          </div>

                          <p className="text-slate-700 leading-relaxed text-[15px] font-medium whitespace-pre-wrap break-all">
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
                              {t('productDetail.my_review')}
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
                                    className={`w-8 h-8 transition-all ${star <= editRating
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
                              placeholder={t('productDetail.share_experience')}
                            />
                          </div>

                          {/* Ảnh cũ được giữ lại */}
                          {editImages.length > 0 && (
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Ảnh đã lưu ({editImages.length})
                              </label>
                              <div className="flex gap-2 flex-wrap">
                                {editImages.map((img, idx) => (
                                  <div key={idx} className="relative group">
                                    <img
                                      src={img}
                                      alt={`Review ${idx + 1}`}
                                      className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                                    />
                                    <button
                                      onClick={() => handleRemoveEditImage(idx)}
                                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      type="button"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Ảnh mới upload */}
                          {editNewImages.length > 0 && (
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Ảnh mới ({editNewImages.length})
                              </label>
                              <div className="flex gap-2 flex-wrap">
                                {editNewImages.map((file, idx) => (
                                  <div key={idx} className="relative group">
                                    <img
                                      src={URL.createObjectURL(file)}
                                      alt={`New ${idx + 1}`}
                                      className="w-20 h-20 object-cover rounded-lg border border-slate-200"
                                    />
                                    <button
                                      onClick={() => handleRemoveNewImage(idx)}
                                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                      type="button"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Upload ảnh mới */}
                          {editImages.length + editNewImages.length < 5 && (
                            <div>
                              <label className="block text-sm font-semibold text-slate-700 mb-2">
                                Thêm ảnh mới (tối đa {5 - editImages.length - editNewImages.length})
                              </label>
                              <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleAddEditImages}
                                className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                              />
                            </div>
                          )}

                          <div className="flex gap-4 justify-end pt-1">
                            <button
                              onClick={() => setIsEditingReview(false)}
                              disabled={isSubmittingReview}
                              className="px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors"
                            >
                              {t('common.cancel')}
                            </button>
                            <button
                              onClick={handleUpdateReview}
                              disabled={
                                isSubmittingReview || !editComment.trim()
                              }
                              className={`min-w-[120px] px-5 py-2.5 rounded-xl text-white font-medium flex items-center justify-center gap-2 transition-all ${isSubmittingReview
                                ? "bg-indigo-400 cursor-not-allowed"
                                : "bg-indigo-600 hover:bg-indigo-700"
                                }`}
                            >
                              {isSubmittingReview ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                  {t('common.loading')}
                                </>
                              ) : (
                                t('common.save')
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                      <p className="text-slate-600 font-medium">
                        {t('productDetail.not_reviewed')}
                      </p>
                      {hasRented && (
                        <p className="mt-2 text-sm text-indigo-600">
                          {t('productDetail.review_hint')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* RIGHT: Store, Pricing, Commitments */}
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-28 space-y-4">
                {/* Supplier Card - First */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <img
                        src={supplier.businessAvatar || supplier.avatar || '/default-avatar.png'}
                        alt={supplier.businessName || supplier.fullName}
                        className="w-14 h-14 rounded-full object-cover border-2 border-slate-100"
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-base text-slate-900 truncate">
                        {supplier.businessName || supplier.fullName}
                      </h4>
                      <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-0.5">
                        <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                        <span className="font-semibold text-slate-700">{(supplier.ratingAvg || 0).toFixed(1)}</span>
                        <span className="text-slate-300">•</span>
                        <span>{supplier.deviceCount || 0} thiết bị</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/supplier/${supplier._id}`)}
                    className="w-full py-2.5 text-sm font-semibold text-indigo-700 bg-indigo-50 rounded-xl hover:bg-indigo-100 transition-colors flex items-center justify-center gap-2 group"
                  >
                    Xem trang cửa hàng
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </button>
                </div>

                {/* Pricing & Actions - Second */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 overflow-hidden">
                  {/* Price Header */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-slate-400 text-xs mb-1 flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          Giá thuê/ngày
                        </p>
                        <div className="flex items-baseline gap-2">
                          <span className="text-3xl font-bold">{effectivePrice.toLocaleString()}đ</span>
                          {device.discountPrice > 0 && !isExpired && (
                            <span className="text-sm text-slate-400 line-through bg-slate-700/50 px-2 py-0.5 rounded">
                              {device.rentPrice?.perDay.toLocaleString()}đ
                            </span>
                          )}
                        </div>
                        {device.discountPrice > 0 && !isExpired && (
                          <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            Tiết kiệm {(device.rentPrice?.perDay - device.discountPrice).toLocaleString()}đ
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-slate-400 text-xs mb-1">Đặt cọc</p>
                        <p className="font-semibold text-lg">{device.depositAmount?.toLocaleString()}đ</p>
                      </div>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="p-5 space-y-4">
                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="group">
                        <label className="text-xs font-medium text-slate-500 mb-1.5 block flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          Nhận hàng
                        </label>
                        <input
                          type="date"
                          min={today}
                          value={startDate}
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            if (endDate && e.target.value > endDate) setEndDate("");
                          }}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                        />
                      </div>
                      <div className="group">
                        <label className="text-xs font-medium text-slate-500 mb-1.5 block flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          Trả hàng
                        </label>
                        <input
                          type="date"
                          min={startDate || today}
                          value={endDate}
                          onChange={(e) => setEndDate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                        />
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="flex items-center justify-between bg-slate-50 rounded-xl p-3 border border-slate-100">
                      <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Package className="w-4 h-4 text-slate-400" />
                        Số lượng
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          disabled={quantity <= 1}
                          className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:border-indigo-300 hover:text-indigo-600 disabled:opacity-40 transition-all active:scale-95"
                        >
                          <Minus size={16} strokeWidth={2.5} />
                        </button>
                        <span className="w-10 text-center font-bold text-slate-900">{quantity}</span>
                        <button
                          onClick={() => setQuantity(Math.min(realAvailableCount || 1, quantity + 1))}
                          disabled={quantity >= (realAvailableCount || 1)}
                          className="w-9 h-9 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 transition-all active:scale-95 shadow-sm"
                        >
                          <Plus size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>

                    {/* Stock Status */}
                    <div className="flex items-center justify-center gap-2 text-xs">
                      <span className={`w-2 h-2 rounded-full ${realAvailableCount > 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      <span className={realAvailableCount > 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                        {realAvailableCount > 0 ? `Còn ${realAvailableCount} sản phẩm` : 'Hết hàng'}
                      </span>
                    </div>

                    {/* Total */}
                    {days > 0 && (
                      <div className="pt-4 border-t border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-slate-500 flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            Tổng {days} ngày
                          </span>
                          <span className="text-xs text-slate-400">{effectivePrice.toLocaleString()}đ × {quantity} × {days}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-base font-semibold text-slate-700">Thành tiền</span>
                          <span className="text-2xl font-bold text-indigo-600">{totalPrice.toLocaleString()}đ</span>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <button
                        id="addToCartBtn"
                        onClick={handleAddToCart}
                        disabled={realAvailableCount === 0}
                        className="py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2"
                      >
                        <ShoppingCart className="w-4 h-4" />
                        Giỏ hàng
                      </button>
                      <button
                        onClick={handleBuyNow}
                        disabled={realAvailableCount === 0}
                        className="py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-semibold text-sm hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Thuê ngay
                      </button>
                    </div>
                  </div>
                </div>

                {/* Commitments with Descriptions - Third */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Cam kết dịch vụ</h3>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Bảo hiểm thiết bị</h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Tất cả thiết bị đều được bảo hiểm trong suốt thời gian thuê. Bạn không phải lo lắng về hư hỏng ngoài ý muốn.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Kiểm tra chất lượng</h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Thiết bị được kiểm tra kỹ lưỡng trước khi giao. Đảm bảo hoạt động tốt khi đến tay bạn.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Giao hàng tận nơi</h4>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">Giao thiết bị đến địa chỉ bạn yêu cầu. Tiết kiệm thời gian di chuyển.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RELATED DEVICES */}
          <div className="mt-16">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Sản phẩm tương tự</h2>
                <p className="text-slate-500 text-sm mt-1">Các thiết bị cùng danh mục bạn có thể quan tâm</p>
              </div>
              <button
                onClick={() => navigate(`/products?category=${device.category}`)}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group"
              >
                Xem tất cả
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {relatedDevices.slice(0, 4).map((d) => (
                <ProductCard key={d._id} device={d} variant="detailed" />
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Image Preview Modal */}
      {isImageModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col"
          onClick={() => {
            if (!isDragging) {
              setIsImageModalOpen(false);
              setZoomLevel(1);
              setImageOffset({ x: 0, y: 0 });
            }
          }}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 text-white">
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-400">
                {selectedImage + 1} / {device.images?.length}
              </span>
              <span className="text-sm text-slate-300">{device.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Zoom Controls */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomLevel(prev => Math.min(prev + 0.5, 4));
                }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Zoom in"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomLevel(prev => Math.max(prev - 0.5, 0.5));
                }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Zoom out"
                disabled={zoomLevel <= 0.5}
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setZoomLevel(1);
                  setImageOffset({ x: 0, y: 0 });
                }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Reset zoom"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsImageModalOpen(false);
                  setZoomLevel(1);
                  setImageOffset({ x: 0, y: 0 });
                }}
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors ml-4"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Modal Body - Image Container */}
          <div
            className="flex-1 flex items-center justify-center overflow-hidden relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Navigation - Previous */}
            {device.images?.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(prev => prev === 0 ? device.images.length - 1 : prev - 1);
                  setZoomLevel(1);
                  setImageOffset({ x: 0, y: 0 });
                }}
                className="absolute left-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Image with Zoom and Pan */}
            <div
              className="relative cursor-move"
              onMouseDown={(e) => {
                if (zoomLevel > 1) {
                  setIsDragging(true);
                  setDragStart({ x: e.clientX - imageOffset.x, y: e.clientY - imageOffset.y });
                }
              }}
              onMouseMove={(e) => {
                if (isDragging && zoomLevel > 1) {
                  setImageOffset({
                    x: e.clientX - dragStart.x,
                    y: e.clientY - dragStart.y
                  });
                }
              }}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
            >
              <img
                src={device.images?.[selectedImage]}
                alt={device.name}
                className="max-w-full max-h-[80vh] object-contain transition-transform duration-200"
                style={{
                  transform: `scale(${zoomLevel}) translate(${imageOffset.x / zoomLevel}px, ${imageOffset.y / zoomLevel}px)`,
                  cursor: zoomLevel > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                }}
                draggable={false}
              />
            </div>

            {/* Navigation - Next */}
            {device.images?.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedImage(prev => prev === device.images.length - 1 ? 0 : prev + 1);
                  setZoomLevel(1);
                  setImageOffset({ x: 0, y: 0 });
                }}
                className="absolute right-4 z-10 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Modal Footer - Thumbnails */}
          {device.images?.length > 1 && (
            <div className="p-4 flex justify-center gap-2 overflow-x-auto">
              {device.images.map((img, i) => (
                <button
                  key={i}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedImage(i);
                    setZoomLevel(1);
                    setImageOffset({ x: 0, y: 0 });
                  }}
                  className={`relative w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 transition-all ${selectedImage === i
                      ? 'ring-2 ring-white'
                      : 'opacity-50 hover:opacity-80'
                    }`}
                >
                  <img src={img} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
          )}

          {/* Zoom Level Indicator */}
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-white text-sm">
            {Math.round(zoomLevel * 100)}%
          </div>
        </div>
      )}

      {/* Specs Modal - Slide from right */}
      {isSpecsModalOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setIsSpecsModalOpen(false)}
          />

          {/* Modal Panel */}
          <div className="relative w-full max-w-lg h-full bg-white shadow-2xl transform transition-transform duration-300 ease-out animate-[slideInRight_0.3s_ease-out]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-indigo-700">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Thông số kỹ thuật</h2>
                  <p className="text-indigo-100 text-sm mt-0.5">{device.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsSpecsModalOpen(false)}
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto h-[calc(100vh-100px)] bg-slate-50/50">
              {device.specs && Object.keys(device.specs).length > 0 ? (
                <div className="space-y-4">
                  {/* Summary Card */}
                  <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center">
                        <Package className="w-4 h-4 text-white" />
                      </div>
                      <span className="font-semibold text-slate-800">Tổng quan thiết bị</span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Thiết bị có {Object.keys(device.specs).length} thông số kỹ thuật chính được liệt kê chi tiết bên dưới.
                    </p>
                  </div>

                  {/* Specs Grid */}
                  <div className="grid gap-3">
                    {Object.entries(device.specs).map(([k, v], index) => (
                      <div
                        key={k}
                        className="group flex items-center p-5 bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all duration-300 animate-[slideInRight_0.4s_ease-out]"
                        style={{ animationDelay: `${index * 0.08}s` }}
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center flex-shrink-0 group-hover:from-indigo-500 group-hover:to-purple-500 transition-all duration-300">
                            <Cpu className="w-6 h-6 text-indigo-600 group-hover:text-white transition-colors" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">{k}</p>
                            <p className="text-base font-bold text-slate-900 truncate">{v}</p>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-slate-200">
                  <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                    <Cpu className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-slate-500 font-medium text-lg">Chưa có thông số kỹ thuật</p>
                  <p className="text-slate-400 text-sm mt-2">Thông tin sẽ được cập nhật sớm</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Flying Item Animation */}
      {flyingItem && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            left: flyingItem.startX,
            top: flyingItem.startY,
            width: '60px',
            height: '60px',
            animation: 'flyToCart 0.8s ease-in-out forwards',
            '--end-x': `${flyingItem.endX - flyingItem.startX}px`,
            '--end-y': `${flyingItem.endY - flyingItem.startY}px`,
          }}
        >
          <img
            src={flyingItem.image}
            alt="Flying"
            className="w-full h-full object-cover rounded-lg shadow-lg border-2 border-white"
          />
        </div>
      )}

      {/* Delete Review Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
            onClick={() => setShowDeleteConfirm(false)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl p-6 text-center">
            <h3 className="text-xl font-black text-gray-900 uppercase italic mb-2">
              Xác nhận xóa
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Bạn có chắc muốn xóa đánh giá này? Hành động này không thể hoàn tác.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-bold text-sm hover:bg-gray-200 transition-all"
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteReview}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition-all"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthRequirementModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
      <Footer />
    </div>
  );
}

const Criteria = ({ icon, text }) => (
  <div className="bg-white rounded-xl p-3 border border-slate-200 text-center">
    <div className="text-indigo-600 mx-auto mb-1">{icon}</div>
    <p className="text-[10px] text-slate-600">{text}</p>
  </div>
);

// Add custom styles for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideInRight {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes fadeInUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes flyToCart {
    0% {
      transform: translate(0, 0) scale(1) rotate(0deg);
      opacity: 1;
      filter: drop-shadow(0 10px 20px rgba(0,0,0,0.3));
    }
    25% {
      transform: translate(calc(var(--end-x) * 0.25), calc(var(--end-y) * 0.25)) scale(1.1) rotate(90deg);
      filter: drop-shadow(0 15px 30px rgba(99, 102, 241, 0.4));
    }
    50% {
      transform: translate(calc(var(--end-x) * 0.5), calc(var(--end-y) * 0.5)) scale(0.9) rotate(180deg);
      filter: drop-shadow(0 20px 40px rgba(99, 102, 241, 0.5));
    }
    75% {
      transform: translate(calc(var(--end-x) * 0.75), calc(var(--end-y) * 0.75)) scale(0.6) rotate(270deg);
      filter: drop-shadow(0 10px 20px rgba(99, 102, 241, 0.3));
    }
    100% {
      transform: translate(var(--end-x), var(--end-y)) scale(0.2) rotate(360deg);
      opacity: 0;
      filter: drop-shadow(0 0 0 rgba(0,0,0,0));
    }
  }
  
  .animate-slideInRight {
    animation: slideInRight 0.3s ease-out forwards;
  }
  
  .animate-fadeInUp {
    animation: fadeInUp 0.3s ease-out forwards;
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(style);
}
