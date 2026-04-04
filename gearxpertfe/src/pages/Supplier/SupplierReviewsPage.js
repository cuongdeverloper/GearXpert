import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FiStar,
  FiFilter,
  FiImage,
  FiRefreshCw,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiPackage,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { getSupplierReviews } from "../../service/ApiService/SupplierReviewsApi";

const PAGE_SIZE = 12;

const formatDateTime = (dateString) => {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function StarRow({ rating }) {
  const n = Math.min(5, Math.max(0, Number(rating) || 0));
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500" aria-label={`${n} sao`}>
      {Array.from({ length: 5 }, (_, i) => (
        <FiStar
          key={i}
          size={16}
          className={i < n ? "fill-amber-400 text-amber-400" : "text-slate-200"}
          strokeWidth={i < n ? 0 : 1.5}
        />
      ))}
    </span>
  );
}

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function SupplierReviewsPage() {
  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [devices, setDevices] = useState([]);
  const [stats, setStats] = useState({
    avgRating: 0,
    totalReviews: 0,
    byStar: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [deviceId, setDeviceId] = useState("");
  const [rating, setRating] = useState("");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [lightboxImg, setLightboxImg] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      const params = { page, limit: PAGE_SIZE };
      if (deviceId) params.deviceId = deviceId;
      if (rating) params.rating = rating;
      if (qDebounced) params.q = qDebounced;
      const res = await getSupplierReviews(params);
      setReviews(res?.reviews ?? []);
      setTotal(res?.total ?? 0);
      setStats(
        res?.stats ?? {
          avgRating: 0,
          totalReviews: 0,
          byStar: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        }
      );
      setDevices(res?.devices ?? []);
    } catch {
      toast.error("Không thể tải đánh giá");
      setReviews([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, deviceId, rating, qDebounced]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    setPage(1);
  }, [deviceId, rating, qDebounced]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hasActiveFilters = Boolean(deviceId || rating || qDebounced);

  const emptyHint = useMemo(() => {
    if (devices.length === 0) {
      return {
        title: "Chưa có thiết bị",
        body: "Thêm thiết bị cho thuê để khách có thể đặt và đánh giá sau khi hoàn tất đơn.",
        ctaTo: "/supplier/devices/new",
        ctaLabel: "Thêm thiết bị",
      };
    }
    if (!hasActiveFilters && stats.totalReviews === 0) {
      return {
        title: "Chưa có đánh giá",
        body: "Khi khách hoàn tất đơn thuê và gửi nhận xét, đánh giá sẽ hiển thị tại đây.",
        ctaTo: null,
        ctaLabel: null,
      };
    }
    if (hasActiveFilters) {
      return {
        title: "Không có kết quả",
        body: "Thử bỏ bớt bộ lọc hoặc từ khóa tìm kiếm.",
        ctaTo: null,
        ctaLabel: null,
      };
    }
    return {
      title: "Không có đánh giá",
      body: "Không thể tải thêm dữ liệu trang này.",
      ctaTo: null,
      ctaLabel: null,
    };
  }, [devices.length, hasActiveFilters, stats.totalReviews]);

  const starSummary = useMemo(() => {
    const rows = [5, 4, 3, 2, 1].map((s) => ({
      star: s,
      count: stats.byStar?.[s] ?? 0,
    }));
    const max = Math.max(...rows.map((r) => r.count), 1);
    return rows.map((r) => ({ ...r, widthPct: (r.count / max) * 100 }));
  }, [stats.byStar]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
          Quản lý đánh giá
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Xem nhận xét và số sao khách để lại cho từng thiết bị của cửa hàng.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50/80 to-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/80">
            Điểm trung bình
          </p>
          <p className="mt-2 text-3xl font-bold text-slate-900 tabular-nums">
            {stats.totalReviews ? stats.avgRating.toFixed(1) : "—"}
            <span className="text-lg text-amber-500 ml-1">/5</span>
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">
            Phân bổ sao ({stats.totalReviews} đánh giá)
          </p>
          <div className="space-y-2">
            {starSummary.map(({ star, count, widthPct }) => (
              <div key={star} className="flex items-center gap-3 text-sm">
                <span className="w-16 text-slate-600 tabular-nums">{star} sao</span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all"
                    style={{ width: `${widthPct}%` }}
                  />
                </div>
                <span className="w-8 text-right text-slate-500 tabular-nums">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Tìm trong nội dung nhận xét..."
              className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-slate-500 text-sm">
              <FiFilter size={16} /> Lọc
            </span>
            <select
              value={deviceId}
              onChange={(e) => setDeviceId(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white min-w-[160px]"
            >
              <option value="">Mọi thiết bị</option>
              {devices.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white"
            >
              <option value="">Mọi mức sao</option>
              {[5, 4, 3, 2, 1].map((s) => (
                <option key={s} value={String(s)}>
                  {s} sao
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => fetchList()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
              Làm mới
            </button>
          </div>
        </div>
      </div>

      {loading && reviews.length === 0 ? (
        <p className="text-sm text-slate-500 py-8 text-center">Đang tải đánh giá...</p>
      ) : reviews.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16 px-6 text-center text-slate-600 text-sm space-y-3">
          <p className="font-semibold text-slate-800">{emptyHint.title}</p>
          <p className="max-w-md mx-auto text-slate-500">{emptyHint.body}</p>
          {emptyHint.ctaTo && (
            <Link
              to={emptyHint.ctaTo}
              className="inline-flex items-center justify-center rounded-xl bg-primary text-white text-sm font-semibold px-5 py-2.5 hover:opacity-90 transition-opacity"
            >
              {emptyHint.ctaLabel}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r._id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-primary/25 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {r.userAvatar ? (
                    <img
                      src={r.userAvatar}
                      alt=""
                      className="h-11 w-11 rounded-full object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center text-slate-400 text-sm font-semibold">
                      {(r.userName || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-900 truncate">{r.userName}</p>
                      <StarRow rating={r.rating} />
                    </div>
                    {r.device && (
                      <Link
                        to={`/supplier/devices/${r.device._id}`}
                        className="inline-flex items-center gap-1 mt-1 text-sm text-primary font-medium hover:underline"
                      >
                        <FiPackage size={14} />
                        {r.device.name}
                      </Link>
                    )}
                    <p className="mt-3 text-sm text-slate-700 whitespace-pre-wrap">{r.comment}</p>
                    {r.images?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {r.images.map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setLightboxImg(img)}
                            className="h-16 w-16 rounded-lg overflow-hidden border border-slate-200 hover:border-primary/40"
                          >
                            <img src={img} alt="" className="h-full w-full object-cover" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="text-xs text-slate-400 sm:text-right shrink-0 flex items-center gap-1 sm:flex-col sm:items-end">
                  <FiImage size={14} className="sm:hidden text-slate-300" />
                  {formatDateTime(r.createdAt)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={classNames(
              "p-2 rounded-xl border",
              page <= 1 || loading
                ? "border-slate-100 text-slate-300"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            )}
          >
            <FiChevronLeft size={20} />
          </button>
          <span className="text-sm text-slate-600 tabular-nums px-2">
            Trang {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={classNames(
              "p-2 rounded-xl border",
              page >= totalPages || loading
                ? "border-slate-100 text-slate-300"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            )}
          >
            <FiChevronRight size={20} />
          </button>
        </div>
      )}

      {lightboxImg && (
        <button
          type="button"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
          onClick={() => setLightboxImg(null)}
        >
          <img
            src={lightboxImg}
            alt=""
            className="max-h-[90vh] max-w-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </button>
      )}
    </div>
  );
}
