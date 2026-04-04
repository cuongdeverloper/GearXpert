/** Báo cáo sự cố supplier — chỉ dữ liệu API (không mock). */
import { useEffect, useState, useMemo } from "react";
import {
  FiAlertTriangle,
  FiSearch,
  FiFilter,
  FiImage,
  FiUser,
  FiTruck,
  FiRotateCw,
  FiTool,
  FiX,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";
import { getSupplierIssues } from "../../service/ApiService/ReportApi";
import { toast } from "react-toastify";

/* ─── Constants ───────────────────────────────────────────────────────────── */

const TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "DELIVERY", label: "Sự cố giao hàng", icon: FiTruck },
  { key: "RETURN", label: "Sự cố thu hồi", icon: FiRotateCw },
  { key: "DAMAGE", label: "Hư hỏng khi thuê", icon: FiTool },
];

const ISSUE_TYPE_LABELS = {
  MISSING: "Thiếu thiết bị",
  WRONG_ITEM: "Sai thiết bị",
  DAMAGED: "Hư hỏng",
  OTHER: "Khác",
};

const ISSUE_TYPE_STYLES = {
  MISSING: "bg-amber-50 text-amber-700 border-amber-200",
  WRONG_ITEM: "bg-purple-50 text-purple-700 border-purple-200",
  DAMAGED: "bg-rose-50 text-rose-700 border-rose-200",
  OTHER: "bg-slate-50 text-slate-700 border-slate-200",
};

const STATUS_LABELS = {
  OPEN: "Mở",
  PROCESSING: "Đang xử lý",
  WAITING_EVIDENCE: "Chờ bằng chứng",
  RESOLVED: "Đã xử lý",
  REJECTED: "Từ chối",
  VERIFIED: "Đã xác nhận",
};

const STATUS_STYLES = {
  OPEN: "bg-red-50 text-red-700 border-red-200",
  PROCESSING: "bg-amber-50 text-amber-700 border-amber-200",
  WAITING_EVIDENCE: "bg-violet-50 text-violet-800 border-violet-200",
  RESOLVED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-slate-50 text-slate-700 border-slate-200",
  VERIFIED: "bg-blue-50 text-blue-700 border-blue-200",
};

const SEVERITY_LABELS = {
  LOW: "Nhẹ",
  MEDIUM: "Trung bình",
  HIGH: "Nghiêm trọng",
};

const SEVERITY_STYLES = {
  LOW: "bg-green-50 text-green-700 border-green-200",
  MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
  HIGH: "bg-rose-50 text-rose-700 border-rose-200",
};

const REPORTED_BY_LABELS = {
  CUSTOMER: "Khách hàng",
  STAFF: "Nhân viên",
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

const formatMoney = (v) => new Intl.NumberFormat("vi-VN").format(v || 0);

const ITEMS_PER_PAGE = 10;

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function SupplierIssuesPage() {
  const [deliveryIssues, setDeliveryIssues] = useState([]);
  const [damageReports, setDamageReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [lightboxImg, setLightboxImg] = useState(null);

  useEffect(() => {
    const fetchIssues = async () => {
      try {
        setLoading(true);
        const res = await getSupplierIssues();
        const deliveryIssues =
          res?.deliveryIssues ?? res?.data?.deliveryIssues ?? [];
        const damageReports =
          res?.damageReports ?? res?.data?.damageReports ?? [];
        setDeliveryIssues(deliveryIssues);
        setDamageReports(damageReports);
      } catch {
        toast.error("Không thể tải danh sách sự cố");
      } finally {
        setLoading(false);
      }
    };
    fetchIssues();
  }, []);

  // Normalize into unified list for display
  const allIssues = useMemo(() => {
    const delivery = deliveryIssues.map((r) => ({
      ...r,
      _type: r.reportContext === "RETURN" ? "RETURN" : "DELIVERY",
      _customerName: r.rentalId?.customerId?.fullName || "—",
      _customerPhone: r.rentalId?.phoneNumber || r.rentalId?.customerId?.phone || "—",
      _staffName: r.staffId?.fullName,
      _devices: (r.deviceIds || []).map((d) => d?.name).filter(Boolean),
      _deviceImages: (r.deviceIds || []).flatMap((d) => d?.images || []),
      _severity: null,
      _compensationAmount: null,
    }));

    const damage = damageReports.map((r) => ({
      ...r,
      _type: "DAMAGE",
      _customerName: r.rentalId?.customerId?.fullName || "—",
      _customerPhone: r.rentalId?.phoneNumber || r.rentalId?.customerId?.phone || "—",
      _staffName: null,
      reportedBy: "CUSTOMER",
      issueType: "DAMAGED",
      _devices: r.deviceId ? [r.deviceId.name] : [],
      _deviceImages: r.deviceId?.images || [],
      _severity: r.severity,
      _compensationAmount: r.compensationAmount,
    }));

    return [...delivery, ...damage].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
  }, [deliveryIssues, damageReports]);

  // Filter
  const filtered = useMemo(() => {
    let list = allIssues;

    if (activeTab !== "ALL") {
      list = list.filter((r) => r._type === activeTab);
    }

    if (statusFilter !== "ALL") {
      list = list.filter((r) => r.status === statusFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r._customerName?.toLowerCase().includes(q) ||
          r._devices?.some((d) => d?.toLowerCase().includes(q)) ||
          r.description?.toLowerCase().includes(q) ||
          r._id?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [allIssues, activeTab, statusFilter, search]);

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, statusFilter, search]);

  // Stats
  const stats = useMemo(() => {
    const open = allIssues.filter((r) => r.status === "OPEN").length;
    const processing = allIssues.filter((r) => r.status === "PROCESSING").length;
    const resolved = allIssues.filter(
      (r) => r.status === "RESOLVED"
    ).length;
    return { total: allIssues.length, open, processing, resolved };
  }, [allIssues]);

  const uniqueStatuses = useMemo(() => {
    const set = new Set(allIssues.map((r) => r.status));
    return [...set];
  }, [allIssues]);

  /* ─── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Báo cáo sự cố</h1>
        <p className="text-sm text-slate-500 mt-1">
          Xem các sự cố được ghi nhận từ nhân viên giao hàng và khách hàng
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Tổng sự cố" value={stats.total} color="slate" />
        <StatCard label="Đang mở" value={stats.open} color="red" />
        <StatCard label="Đang xử lý" value={stats.processing} color="amber" />
        <StatCard label="Đã xử lý" value={stats.resolved} color="green" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.icon && <tab.icon size={14} />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Tìm theo tên khách, thiết bị, mô tả..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="pl-9 pr-8 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            {uniqueStatuses.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s] || s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <FiAlertTriangle size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">Không tìm thấy sự cố nào</p>
          <p className="text-sm mt-1">Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginated.map((issue) => (
            <IssueCard
              key={issue._id}
              issue={issue}
              onImageClick={setLightboxImg}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-sm text-slate-500">
            Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
            {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} / {filtered.length}
          </p>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <FiChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - currentPage) <= 1
              )
              .reduce((acc, p) => {
                if (acc.length && p - acc[acc.length - 1] > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`dot-${i}`} className="px-2 py-2 text-slate-400 text-sm">
                    ...
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                      currentPage === p
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            >
              <FiChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setLightboxImg(null)}
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <button
              onClick={() => setLightboxImg(null)}
              className="absolute -top-3 -right-3 bg-white rounded-full p-1.5 shadow-lg text-slate-600 hover:text-red-500"
            >
              <FiX size={18} />
            </button>
            <img
              src={lightboxImg}
              alt="Ảnh sự cố"
              className="rounded-xl max-h-[85vh] object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Sub-components ──────────────────────────────────────────────────────── */

function StatCard({ label, value, color }) {
  const colorMap = {
    slate: "bg-slate-50 text-slate-700 border-slate-200",
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    green: "bg-green-50 text-green-700 border-green-200",
  };
  return (
    <div className={`rounded-2xl border p-4 ${colorMap[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function IssueCard({ issue, onImageClick }) {
  const [expanded, setExpanded] = useState(false);

  const typeLabel =
    issue._type === "DELIVERY"
      ? "Giao hàng"
      : issue._type === "RETURN"
      ? "Thu hồi"
      : "Hư hỏng khi thuê";

  const typeStyle =
    issue._type === "DELIVERY"
      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
      : issue._type === "RETURN"
      ? "bg-purple-50 text-purple-700 border-purple-200"
      : "bg-rose-50 text-rose-700 border-rose-200";

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
      {/* Header row */}
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-3 p-5 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            {/* Type badge */}
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border ${typeStyle}`}>
              {issue._type === "DELIVERY" && <FiTruck size={12} />}
              {issue._type === "RETURN" && <FiRotateCw size={12} />}
              {issue._type === "DAMAGE" && <FiTool size={12} />}
              {typeLabel}
            </span>

            {/* Issue type */}
            {issue.issueType && (
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                  ISSUE_TYPE_STYLES[issue.issueType] || "bg-slate-50 text-slate-600"
                }`}
              >
                {ISSUE_TYPE_LABELS[issue.issueType] || issue.issueType}
              </span>
            )}

            {/* Status */}
            <span
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                STATUS_STYLES[issue.status] || "bg-slate-50 text-slate-600"
              }`}
            >
              {STATUS_LABELS[issue.status] || issue.status}
            </span>

            {/* Severity (damage only) */}
            {issue._severity && (
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                  SEVERITY_STYLES[issue._severity] || ""
                }`}
              >
                {SEVERITY_LABELS[issue._severity] || issue._severity}
              </span>
            )}
          </div>

          {/* Customer & reporter */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
            <span className="flex items-center gap-1">
              <FiUser size={13} className="text-slate-400" />
              <span className="font-medium">{issue._customerName}</span>
            </span>
            {issue._customerPhone && issue._customerPhone !== "—" && (
              <span className="text-slate-400">{issue._customerPhone}</span>
            )}
            <span className="text-slate-400">•</span>
            <span className="text-xs">
              Báo cáo bởi:{" "}
              <span className="font-medium">
                {REPORTED_BY_LABELS[issue.reportedBy] || issue.reportedBy}
                {issue._staffName ? ` (${issue._staffName})` : ""}
              </span>
            </span>
          </div>

          {/* Device names */}
          {issue._devices?.length > 0 && (
            <p className="text-sm text-slate-500 mt-1.5 truncate">
              Thiết bị: {issue._devices.join(", ")}
            </p>
          )}
        </div>

        {/* Right side: timestamp + image count */}
        <div className="flex sm:flex-col items-center sm:items-end gap-2 sm:gap-1 shrink-0 text-right">
          <span className="text-xs text-slate-400">{formatDateTime(issue.createdAt)}</span>
          {issue.images?.length > 0 && (
            <span className="flex items-center gap-1 text-xs text-slate-400">
              <FiImage size={12} /> {issue.images.length} ảnh
            </span>
          )}
          {issue._compensationAmount > 0 && (
            <span className="text-xs font-semibold text-rose-600">
              Bồi thường: {formatMoney(issue._compensationAmount)}₫
            </span>
          )}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {/* Description */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
              Mô tả
            </h4>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">
              {issue.description || "Không có mô tả"}
            </p>
          </div>

          {/* Resolved note */}
          {(issue.resolutionNote || issue.resolvedNote) && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Ghi chú xử lý
              </h4>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {issue.resolutionNote || issue.resolvedNote}
              </p>
            </div>
          )}

          {/* Issue images */}
          {issue.images?.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Hình ảnh sự cố
              </h4>
              <div className="flex gap-2 flex-wrap">
                {issue.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => onImageClick(img)}
                    className="h-20 w-20 rounded-xl overflow-hidden border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all"
                  >
                    <img
                      src={img}
                      alt={`Ảnh ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-400">
            <span>ID: {issue._id}</span>
            {issue.rentalId?._id && <span>Rental: {issue.rentalId._id}</span>}
            {issue.rentalId?.status && (
              <span>Trạng thái đơn: {issue.rentalId.status}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
