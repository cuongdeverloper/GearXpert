import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  Trash2,
  Edit2,
  Package,
  Store,
  ChevronLeft,
  X,
  Save,
  AlertCircle,
  ThumbsUp,
  BarChart3,
  Filter,
  Clock,
  ShoppingBag,
  Calendar,
  User,
  Search,
  XCircle,
  CheckCircle,
} from "lucide-react";
import Header from "../../components/navigation/Header";
import { getMyReviews, updateReview, deleteReview } from "../../service/ApiService/ReviewApi";

export default function MyReviews() {
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReviews, setTotalReviews] = useState(0);
  const [stats, setStats] = useState(null);
  const [editingReview, setEditingReview] = useState(null);
  const [editForm, setEditForm] = useState({ rating: 5, comment: "" });
  const [editImages, setEditImages] = useState([]); // Ảnh cũ giữ lại
  const [editNewImages, setEditNewImages] = useState([]); // Ảnh mới upload
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filterRating, setFilterRating] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const data = await getMyReviews(page, 10, filterRating);
      if (data.success) {
        setReviews(data.reviews);
        setTotalPages(data.totalPages);
        setTotalReviews(data.total);
        setStats(data.stats);
      }
    } catch (error) {
      toast.error("Không thể tải danh sách đánh giá");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [page, filterRating]);

  const handleEdit = (review) => {
    if (!review.canEdit) {
      toast.warning("Đã quá 48 giờ, không thể chỉnh sửa đánh giá này");
      return;
    }
    setEditingReview(review);
    setEditForm({
      rating: review.rating,
      comment: review.comment,
    });
    setEditImages(review.images || []);
    setEditNewImages([]);
  };

  const handleUpdate = async () => {
    if (!editForm.comment.trim()) {
      toast.warning("Vui lòng nhập nội dung đánh giá");
      return;
    }
    if (editImages.length + editNewImages.length > 5) {
      toast.error("Tối đa 5 ảnh cho mỗi đánh giá");
      return;
    }
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("rating", editForm.rating);
      formData.append("comment", editForm.comment);
      // Gửi ảnh cũ giữ lại
      editImages.forEach((img) => {
        formData.append("keepImages", img);
      });
      // Gửi ảnh mới
      editNewImages.forEach((file) => {
        formData.append("images", file);
      });
      await updateReview(editingReview._id, formData);
      toast.success("Cập nhật đánh giá thành công");
      setEditingReview(null);
      setEditNewImages([]);
      fetchReviews();
    } catch (error) {
      toast.error(error?.message || "Cập nhật thất bại");
    } finally {
      setIsSubmitting(false);
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

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      setIsSubmitting(true);
      await deleteReview(deleteConfirm._id);
      toast.success("Đã xóa đánh giá");
      setDeleteConfirm(null);
      fetchReviews();
    } catch (error) {
      toast.error(error?.message || "Xóa thất bại");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingColor = (rating) => {
    if (rating >= 4) return "text-green-600 bg-green-50 border-green-200";
    if (rating >= 3) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getRatingLabel = (rating) => {
    const labels = { 5: "Tuyệt vời", 4: "Tốt", 3: "Bình thường", 2: "Tệ", 1: "Rất tệ" };
    return labels[rating] || "";
  };

  const renderStars = (rating, interactive = false, onRate = null) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onRate?.(star)}
            className={`${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
          >
            <Star
              size={interactive ? 28 : 16}
              className={star <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}
            />
          </button>
        ))}
      </div>
    );
  };

  const filteredReviews = reviews.filter(
    (r) =>
      r.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.device?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.supplier?.fullName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors shadow-sm"
            >
              <ChevronLeft size={24} className="text-slate-600 dark:text-slate-400" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ThumbsUp size={28} className="text-primary" />
                Đánh giá của tôi
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Quản lý tất cả đánh giá bạn đã gửi cho các sản phẩm
              </p>
            </div>
          </div>
          <Link
            to="/user/myrental"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium shadow-lg shadow-primary/20"
          >
            <ShoppingBag size={18} />
            Xem đơn thuê
          </Link>
        </div>

        {/* Statistics Dashboard */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Total Reviews */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Tổng đánh giá</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalReviews}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <BarChart3 size={24} className="text-primary" />
                </div>
              </div>
            </div>

            {/* Average Rating */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Đánh giá trung bình</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.averageRating}</p>
                    <span className="text-sm text-slate-500">/5</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Star size={24} className="text-amber-500 fill-amber-500" />
                </div>
              </div>
            </div>

            {/* Can Edit */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Có thể chỉnh sửa</p>
                  <p className="text-3xl font-bold text-green-600 mt-1">{stats.canEditCount}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
                  <Edit2 size={24} className="text-green-600" />
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">Trong vòng 48 giờ</p>
            </div>

            {/* Most Common Rating */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Đánh giá phổ biến nhất</p>
                  <div className="flex items-center gap-2 mt-1">
                    {Object.entries(stats.ratingDistribution).sort((a, b) => b[1] - a[1])[0][1] > 0 ? (
                      <>
                        <p className="text-3xl font-bold text-slate-900 dark:text-white">
                          {Object.entries(stats.ratingDistribution).sort((a, b) => b[1] - a[1])[0][0]}★
                        </p>
                        <span className="text-sm text-slate-500">
                          ({Object.entries(stats.ratingDistribution).sort((a, b) => b[1] - a[1])[0][1]} đánh giá)
                        </span>
                      </>
                    ) : (
                      <p className="text-lg text-slate-400">Chưa có</p>
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
                  <ThumbsUp size={24} className="text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Rating Distribution Bar */}
        {stats && stats.totalReviews > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm mb-8">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-primary" />
              Phân bố đánh giá
            </h3>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.ratingDistribution[star] || 0;
                const percentage = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300 w-8">{star}★</span>
                    <div className="flex-1 h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.5, delay: 0.1 * (5 - star) }}
                        className={`h-full rounded-full ${star >= 4 ? "bg-green-500" : star >= 3 ? "bg-amber-500" : "bg-red-500"
                          }`}
                      />
                    </div>
                    <span className="text-sm text-slate-500 w-12 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Rating Filter */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Filter size={16} />
              Lọc:
            </span>
            <button
              onClick={() => { setFilterRating(null); setPage(1); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${!filterRating
                  ? "bg-primary text-white"
                  : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                }`}
            >
              Tất cả
            </button>
            {[5, 4, 3, 2, 1].map((rating) => (
              <button
                key={rating}
                onClick={() => { setFilterRating(rating); setPage(1); }}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1 ${filterRating === rating
                    ? "bg-primary text-white"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                  }`}
              >
                {rating}★
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm đánh giá, sản phẩm, nhà cung cấp..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full"
              >
                <XCircle size={16} className="text-slate-400" />
              </button>
            )}
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : filteredReviews.length === 0 ? (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                <ThumbsUp size={48} className="text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                {searchTerm ? "Không tìm thấy đánh giá" : "Chưa có đánh giá nào"}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md mx-auto">
                {searchTerm
                  ? "Không tìm thấy đánh giá phù hợp với từ khóa của bạn"
                  : "Bạn chưa đánh giá sản phẩm nào. Hãy thuê và trải nghiệm sản phẩm để đánh giá!"}
              </p>
              <Link
                to="/user/myrental"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
              >
                <ShoppingBag size={18} />
                Xem đơn thuê của tôi
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-500 mb-4">
                Hiển thị {filteredReviews.length} / {totalReviews} đánh giá
              </p>
              {filteredReviews.map((review, index) => (
                <motion.div
                  key={review._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Device Info */}
                    <div className="flex-shrink-0 w-full lg:w-56">
                      <Link to={`/device/${review.device?.slug || ""}`} className="block group">
                        <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-700 mb-3 relative">
                          {review.device?.images?.[0] ? (
                            <img
                              src={review.device.images[0]}
                              alt={review.device.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package size={40} className="text-slate-400" />
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${getRatingColor(review.rating)}`}>
                              {review.rating}/5
                            </span>
                          </div>
                        </div>
                        <h3 className="font-semibold text-slate-900 dark:text-white text-sm line-clamp-2 group-hover:text-primary transition-colors">
                          {review.device?.name || "Sản phẩm"}
                        </h3>
                        {review.device?.category && (
                          <p className="text-xs text-slate-500 mt-1">{review.device.category}</p>
                        )}
                      </Link>
                    </div>

                    {/* Review Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                          {renderStars(review.rating)}
                          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                            {getRatingLabel(review.rating)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <Calendar size={12} />
                          {new Date(review.createdAt).toLocaleDateString("vi-VN")}
                        </div>
                      </div>

                      {/* Comment */}
                      <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 mb-4">
                        <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {review.comment}
                        </p>
                      </div>

                      {/* Images */}
                      {review.images?.length > 0 && (
                        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                          {review.images.map((img, idx) => (
                            <a
                              key={idx}
                              href={img}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-shrink-0"
                            >
                              <img
                                src={img}
                                alt={`Review ${idx + 1}`}
                                className="w-24 h-24 rounded-lg object-cover hover:ring-2 ring-primary transition-all"
                              />
                            </a>
                          ))}
                        </div>
                      )}

                      {/* Rental & Supplier Info */}
                      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
                        {review.supplier && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg">
                            <Store size={14} />
                            <span>{review.supplier.fullName}</span>
                          </div>
                        )}
                        {review.rental && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg">
                            <ShoppingBag size={14} />
                            <span>Đơn #{review.rental._id.toString().slice(-6)}</span>
                          </div>
                        )}
                        {review.device?.pricePerDay && (
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-lg">
                            <span>{review.device.pricePerDay.toLocaleString()}đ/ngày</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700">
                        {review.canEdit ? (
                          <>
                            <button
                              onClick={() => handleEdit(review)}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                            >
                              <Edit2 size={16} />
                              Chỉnh sửa
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(review)}
                              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            >
                              <Trash2 size={16} />
                              Xóa
                            </button>
                            <span className="text-xs text-slate-400 flex items-center gap-1 ml-auto">
                              <Clock size={12} />
                              Còn {review.hoursLeft}h để chỉnh sửa
                            </span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <CheckCircle size={12} />
                            Đã khóa (quá 48 giờ)
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`px-4 py-2 rounded-xl font-medium transition-colors ${p === page
                    ? "bg-primary text-white shadow-lg shadow-primary/20"
                    : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50"
                  }`}
              >
                {p}
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setEditingReview(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Chỉnh sửa đánh giá</h2>
                <button
                  onClick={() => setEditingReview(null)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Đánh giá của bạn
                  </label>
                  {renderStars(editForm.rating, true, (r) => setEditForm({ ...editForm, rating: r }))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Nội dung đánh giá
                  </label>
                  <textarea
                    value={editForm.comment}
                    onChange={(e) => setEditForm({ ...editForm, comment: e.target.value })}
                    rows={4}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    placeholder="Chia sẻ trải nghiệm của bạn..."
                  />
                </div>

                {/* Ảnh cũ được giữ lại */}
                {editImages.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
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
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
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
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                      Thêm ảnh mới (tối đa {5 - editImages.length - editNewImages.length})
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleAddEditImages}
                      className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                    />
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setEditingReview(null)}
                    className="flex-1 px-4 py-3 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
                    ) : (
                      <Save size={18} />
                    )}
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-sm"
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                  <Trash2 size={32} className="text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Xác nhận xóa</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  Bạn có chắc muốn xóa đánh giá này? Hành động này không thể hoàn tác.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 px-4 py-3 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mx-auto" />
                  ) : (
                    "Xóa"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
