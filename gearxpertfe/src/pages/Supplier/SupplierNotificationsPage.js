import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FiBell,
  FiCheck,
  FiChevronLeft,
  FiChevronRight,
  FiExternalLink,
  FiFilter,
  FiRefreshCw,
} from "react-icons/fi";
import { toast } from "react-toastify";
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "../../service/ApiService/notificationApi";
import { useSocket } from "../../SocketContext";

const PAGE_SIZE = 15;

const TYPE_LABELS = {
  ORDER: "Đơn hàng",
  SYSTEM: "Hệ thống",
  CHAT: "Tin nhắn",
  PAYMENT: "Thanh toán",
  STORE_VOUCHER: "Voucher cửa hàng",
  STORE_DEVICE: "Thiết bị cửa hàng",
  STORE_POST: "Bài đăng cửa hàng",
  ADMIN_BROADCAST: "Thông báo admin",
  LIKE: "Thích",
  COMMENT: "Bình luận",
  DELIVERY_ISSUE: "Sự cố giao hàng",
  RETURN_ISSUE: "Sự cố hoàn trả",
  DAMAGE_REPORT: "Báo cáo hư hỏng",
};

const TYPE_STYLES = {
  ORDER: "bg-blue-50 text-blue-800 border-blue-200",
  SYSTEM: "bg-slate-100 text-slate-700 border-slate-200",
  CHAT: "bg-cyan-50 text-cyan-800 border-cyan-200",
  PAYMENT: "bg-emerald-50 text-emerald-800 border-emerald-200",
  STORE_VOUCHER: "bg-violet-50 text-violet-800 border-violet-200",
  STORE_DEVICE: "bg-amber-50 text-amber-800 border-amber-200",
  STORE_POST: "bg-pink-50 text-pink-800 border-pink-200",
  ADMIN_BROADCAST: "bg-indigo-50 text-indigo-800 border-indigo-200",
  LIKE: "bg-rose-50 text-rose-800 border-rose-200",
  COMMENT: "bg-orange-50 text-orange-800 border-orange-200",
  DELIVERY_ISSUE: "bg-red-50 text-red-800 border-red-200",
  RETURN_ISSUE: "bg-purple-50 text-purple-800 border-purple-200",
  DAMAGE_REPORT: "bg-red-50 text-red-900 border-red-200",
};

const READ_FILTERS = [
  { value: "all", label: "Tất cả" },
  { value: "unread", label: "Chưa đọc" },
  { value: "read", label: "Đã đọc" },
];

const timeAgo = (date) => {
  if (!date) return "";
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "Vừa xong";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return new Date(date).toLocaleDateString("vi-VN");
};

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

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

function StatCard({ label, value, sub, color }) {
  const colorMap = {
    slate: "bg-slate-50 text-slate-800 border-slate-200",
    indigo: "bg-indigo-50 text-indigo-900 border-indigo-200",
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-200",
    amber: "bg-amber-50 text-amber-900 border-amber-200",
  };
  const valueStr = value != null ? String(value) : "";
  const compactValue = valueStr.length > 14;
  return (
    <div className={classNames("rounded-2xl border p-4", colorMap[color])}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p
        className={classNames(
          "font-bold mt-1 tabular-nums leading-snug break-words",
          compactValue ? "text-base sm:text-lg" : "text-2xl"
        )}
      >
        {value}
      </p>
      {sub != null && sub !== "" && (
        <p className="text-xs mt-1 opacity-75">{sub}</p>
      )}
    </div>
  );
}

export default function SupplierNotificationsPage() {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [list, setList] = useState([]);
  const [total, setTotal] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [page, setPage] = useState(1);
  const [readFilter, setReadFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNotifications({
        page,
        limit: PAGE_SIZE,
        read: readFilter,
        ...(typeFilter ? { type: typeFilter } : {}),
      });
      const rows = Array.isArray(res) ? res : res?.notifications || [];
      setList(rows);
      setTotal(Array.isArray(res) ? rows.length : res?.total ?? rows.length);
      setUnreadCount(
        Array.isArray(res)
          ? rows.filter((n) => !n.isRead).length
          : res?.unreadCount ?? 0
      );
    } catch {
      toast.error("Không tải được thông báo");
      setList([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, readFilter, typeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket) return;
    const onNew = () => load();
    socket.on("newNotification", onNew);
    return () => socket.off("newNotification", onNew);
  }, [socket, load]);

  const handleMarkOne = async (id) => {
    try {
      await markNotificationAsRead(id);
      setList((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      toast.error("Không cập nhật được trạng thái đọc");
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsAsRead();
      setList((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success("Đã đánh dấu tất cả là đã đọc");
    } catch {
      toast.error("Thao tác thất bại");
    }
  };

  const openNotif = (n) => {
    if (!n.isRead) handleMarkOne(n._id);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header — cùng nhịp với Báo cáo sự cố / trang supplier khác */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Hộp thông báo</h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl">
            Đơn thuê, thanh toán, sự cố giao hàng và tin nhắn hệ thống — cập nhật theo thời gian thực.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => load()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FiRefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAll}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm"
            >
              <FiCheck size={16} />
              Đánh dấu đã đọc tất cả
            </button>
          )}
        </div>
      </div>

      {/* Thống kê */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Chưa đọc (toàn hộp)"
          value={unreadCount}
          sub="Theo máy chủ"
          color="indigo"
        />
        <StatCard
          label="Tổng theo bộ lọc"
          value={total}
          sub="Dùng cho phân trang"
          color="slate"
        />
        <StatCard
          label="Trên trang này"
          value={list.length}
          sub={`${PAGE_SIZE} tối đa / trang`}
          color="amber"
        />
        <StatCard
          label="Loại đang lọc"
          value={typeFilter ? TYPE_LABELS[typeFilter] || typeFilter : "Tất cả"}
          sub={`Trang ${page} / ${totalPages}`}
          color="emerald"
        />
      </div>

      {/* Bộ lọc */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {READ_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => {
                setReadFilter(f.value);
                setPage(1);
              }}
              className={classNames(
                "px-4 py-2 rounded-xl text-sm font-medium border transition-all whitespace-nowrap",
                readFilter === f.value
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-[220px]">
          <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Mọi loại thông báo</option>
            {Object.entries(TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Danh sách */}
      {loading && list.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="h-9 w-9 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-sm">
            <FiBell className="text-slate-300" size={28} />
          </div>
          <p className="mt-4 text-lg font-semibold text-slate-800">Không có thông báo</p>
          <p className="text-sm text-slate-500 mt-1 px-4">
            Thử đổi bộ lọc hoặc nhấn Làm mới. Thông báo mới cũng sẽ hiện khi có sự kiện trên hệ thống.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          {list.map((n) => (
            <div
              key={n._id}
              className={classNames(
                "flex gap-4 px-5 py-4 border-b border-slate-100 last:border-b-0 transition-colors",
                n.isRead ? "hover:bg-slate-50/80" : "bg-indigo-50/35 hover:bg-indigo-50/50"
              )}
            >
              <div
                className={classNames(
                  "w-1 shrink-0 rounded-full self-stretch min-h-[3rem]",
                  n.isRead ? "bg-slate-200" : "bg-indigo-500"
                )}
                aria-hidden
              />
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                {n.image ? (
                  <img src={n.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <FiBell className="text-slate-400" size={22} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4">
                  <div>
                    <p className="font-semibold text-slate-900 leading-snug">{n.title}</p>
                    <p className="text-sm text-slate-600 mt-1 leading-relaxed">{n.message}</p>
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <p className="text-xs font-medium text-slate-500">{timeAgo(n.createdAt)}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{formatDateTime(n.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={classNames(
                      "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border",
                      TYPE_STYLES[n.type] || "bg-slate-100 text-slate-700 border-slate-200"
                    )}
                  >
                    {TYPE_LABELS[n.type] || n.type || "Khác"}
                  </span>
                  {!n.isRead && (
                    <span className="text-[11px] font-bold uppercase tracking-wide text-indigo-600">
                      Mới
                    </span>
                  )}
                  {n.link && (
                    <button
                      type="button"
                      onClick={() => openNotif(n)}
                      className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 transition-colors"
                    >
                      Mở liên kết
                      <FiExternalLink size={14} />
                    </button>
                  )}
                  {!n.isRead && (
                    <button
                      type="button"
                      onClick={() => handleMarkOne(n._id)}
                      className="text-sm font-medium text-slate-500 hover:text-slate-900 underline-offset-2 hover:underline"
                    >
                      Đánh dấu đã đọc
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
          <p className="text-sm text-slate-500">
            Hiển thị {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} / {total}
          </p>
          <div className="flex items-center gap-1 flex-wrap justify-center sm:justify-end">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <FiChevronLeft size={18} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - page) <= 1
              )
              .reduce((acc, p) => {
                if (acc.length && p - acc[acc.length - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-2 py-2 text-slate-400 text-sm">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    disabled={loading}
                    onClick={() => setPage(p)}
                    className={classNames(
                      "px-3 py-2 rounded-lg text-sm font-medium border transition-colors",
                      page === p
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <FiChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
