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
  RESOLVED: "Đã xử lý",
  REJECTED: "Từ chối",
  VERIFIED: "Đã xác nhận",
};

const STATUS_STYLES = {
  OPEN: "bg-red-50 text-red-700 border-red-200",
  PROCESSING: "bg-amber-50 text-amber-700 border-amber-200",
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

/* ─── Mock data (xóa khi có API thật) ────────────────────────────────────── */
const USE_MOCK = true;

const MOCK_DELIVERY_ISSUES = [
  {
    _id: "di001",
    rentalId: { _id: "r001", customerId: { fullName: "Nguyễn Văn An", email: "an@gmail.com", phone: "0901234567", image: "" }, phoneNumber: "0901234567", status: "INSPECTING", inspectedContext: "DELIVERY" },
    staffId: { fullName: "Trần Minh Quân" },
    deviceIds: [
      { name: "Sony A7 III Body", images: ["https://picsum.photos/seed/sony1/400/300"] },
      { name: "Sony FE 24-70mm f/2.8 GM", images: ["https://picsum.photos/seed/lens1/400/300"] },
    ],
    reportedBy: "STAFF",
    issueType: "DAMAGED",
    description: "Phát hiện lens bị trầy xước nặng phần kính trước khi giao cho khách. Body máy có vết móp nhẹ ở góc phải.",
    images: ["https://picsum.photos/seed/dmg1/600/400", "https://picsum.photos/seed/dmg2/600/400", "https://picsum.photos/seed/dmg3/600/400"],
    status: "OPEN",
    reportContext: "DELIVERY",
    resolvedNote: "",
    createdAt: "2026-03-12T08:30:00Z",
  },
  {
    _id: "di002",
    rentalId: { _id: "r002", customerId: { fullName: "Lê Thị Bích Ngọc", email: "ngoc@gmail.com", phone: "0912345678" }, phoneNumber: "0912345678", status: "INSPECTING", inspectedContext: "DELIVERY" },
    staffId: { fullName: "Phạm Hoàng Dũng" },
    deviceIds: [
      { name: "Canon EOS R5", images: ["https://picsum.photos/seed/canon1/400/300"] },
    ],
    reportedBy: "STAFF",
    issueType: "WRONG_ITEM",
    description: "Khách đặt Canon EOS R5 nhưng trong kiện hàng là Canon EOS R6. Đã liên hệ kho để xác nhận.",
    images: ["https://picsum.photos/seed/wrong1/600/400"],
    status: "PROCESSING",
    reportContext: "DELIVERY",
    resolvedNote: "",
    createdAt: "2026-03-11T14:20:00Z",
  },
  {
    _id: "di003",
    rentalId: { _id: "r003", customerId: { fullName: "Trần Quốc Bảo", email: "bao@gmail.com", phone: "0923456789" }, phoneNumber: "0923456789", status: "DELIVERING" },
    staffId: null,
    deviceIds: [
      { name: "DJI Mavic 3 Pro", images: ["https://picsum.photos/seed/dji1/400/300"] },
      { name: "DJI RC Pro Controller", images: ["https://picsum.photos/seed/dji2/400/300"] },
    ],
    reportedBy: "CUSTOMER",
    issueType: "MISSING",
    description: "Nhận hàng thiếu remote controller DJI RC Pro. Trong kiện chỉ có drone và 1 pin, không có controller như trong đơn hàng.",
    images: ["https://picsum.photos/seed/miss1/600/400", "https://picsum.photos/seed/miss2/600/400"],
    status: "OPEN",
    reportContext: "DELIVERY",
    resolvedNote: "",
    createdAt: "2026-03-10T16:45:00Z",
  },
  {
    _id: "di004",
    rentalId: { _id: "r004", customerId: { fullName: "Phạm Minh Tú", email: "tu@gmail.com", phone: "0934567890" }, phoneNumber: "0934567890", status: "COMPLETED" },
    staffId: { fullName: "Trần Minh Quân" },
    deviceIds: [
      { name: "Godox AD600Pro", images: ["https://picsum.photos/seed/godox/400/300"] },
    ],
    reportedBy: "STAFF",
    issueType: "DAMAGED",
    description: "Đèn flash bị vỡ phần kính bảo vệ trong quá trình vận chuyển. Đã chụp ảnh biên bản và báo cho kho.",
    images: ["https://picsum.photos/seed/flash1/600/400"],
    status: "RESOLVED",
    reportContext: "DELIVERY",
    resolvedNote: "Đã đổi đèn mới cho khách và ghi nhận lỗi đóng gói vận chuyển.",
    createdAt: "2026-03-08T09:15:00Z",
  },
];

const MOCK_RETURN_ISSUES = [
  {
    _id: "ri001",
    rentalId: { _id: "r005", customerId: { fullName: "Hoàng Đức Anh", email: "anh@gmail.com", phone: "0945678901" }, phoneNumber: "0945678901", status: "INSPECTING", inspectedContext: "RETURN" },
    staffId: { fullName: "Phạm Hoàng Dũng" },
    deviceIds: [
      { name: "Zhiyun Crane 3S", images: ["https://picsum.photos/seed/zhiyun/400/300"] },
    ],
    reportedBy: "STAFF",
    issueType: "DAMAGED",
    description: "Gimbal bị gãy cần nối ở khớp thứ 2. Motor pan không hoạt động. Có dấu hiệu va đập mạnh, vỏ ngoài bị nứt.",
    images: ["https://picsum.photos/seed/gimbal1/600/400", "https://picsum.photos/seed/gimbal2/600/400"],
    status: "OPEN",
    reportContext: "RETURN",
    resolvedNote: "",
    createdAt: "2026-03-12T17:00:00Z",
  },
  {
    _id: "ri002",
    rentalId: { _id: "r006", customerId: { fullName: "Vũ Thanh Hằng", email: "hang@gmail.com", phone: "0956789012" }, phoneNumber: "0956789012", status: "INSPECTING", inspectedContext: "RETURN" },
    staffId: { fullName: "Trần Minh Quân" },
    deviceIds: [
      { name: "Sony A7S III Body", images: ["https://picsum.photos/seed/a7s/400/300"] },
      { name: "Sony FE 35mm f/1.4 GM", images: ["https://picsum.photos/seed/35mm/400/300"] },
    ],
    reportedBy: "STAFF",
    issueType: "MISSING",
    description: "Thiếu nắp body máy và nắp đuôi lens. Khách nói bị mất trong quá trình sử dụng.",
    images: [],
    status: "PROCESSING",
    reportContext: "RETURN",
    resolvedNote: "",
    createdAt: "2026-03-11T10:30:00Z",
  },
  {
    _id: "ri003",
    rentalId: { _id: "r007", customerId: { fullName: "Đặng Thùy Linh", email: "linh@gmail.com", phone: "0967890123" }, phoneNumber: "0967890123", status: "COMPLETED" },
    staffId: { fullName: "Phạm Hoàng Dũng" },
    deviceIds: [
      { name: "Canon RF 70-200mm f/2.8L IS", images: ["https://picsum.photos/seed/rf70/400/300"] },
    ],
    reportedBy: "STAFF",
    issueType: "OTHER",
    description: "Lens trả về có mùi ẩm mốc, kiểm tra thấy có nấm mốc bên trong phần tử kính phía sau. Cần vệ sinh chuyên sâu.",
    images: ["https://picsum.photos/seed/mold1/600/400", "https://picsum.photos/seed/mold2/600/400"],
    status: "RESOLVED",
    reportContext: "RETURN",
    resolvedNote: "Đã gửi lens đi vệ sinh. Chi phí 800.000₫ tính cho khách thuê.",
    createdAt: "2026-03-06T11:00:00Z",
  },
];

const MOCK_DAMAGE_REPORTS = [
  {
    _id: "dr001",
    rentalId: { _id: "r008", customerId: { fullName: "Ngô Quang Huy", email: "huy@gmail.com", phone: "0978901234" }, phoneNumber: "0978901234", status: "RENTING" },
    deviceId: { name: "Nikon Z8 Body", images: ["https://picsum.photos/seed/z8/400/300"] },
    customerId: { fullName: "Ngô Quang Huy" },
    description: "Máy bị rơi từ tripod cao khoảng 1.5m. Màn hình phía sau bị nứt, chụp vẫn được nhưng không xem lại được ảnh trên màn hình.",
    images: ["https://picsum.photos/seed/nikon1/600/400", "https://picsum.photos/seed/nikon2/600/400", "https://picsum.photos/seed/nikon3/600/400"],
    severity: "HIGH",
    status: "OPEN",
    compensationAmount: 5500000,
    createdAt: "2026-03-13T06:20:00Z",
  },
  {
    _id: "dr002",
    rentalId: { _id: "r009", customerId: { fullName: "Lý Anh Khoa", email: "khoa@gmail.com", phone: "0989012345" }, phoneNumber: "0989012345", status: "RENTING" },
    deviceId: { name: "DJI RS 3 Pro", images: ["https://picsum.photos/seed/rs3/400/300"] },
    customerId: { fullName: "Lý Anh Khoa" },
    description: "Gimbal không cân bằng được sau khi chuyển từ mode pan-follow sang lock. Có tiếng kêu lạ ở motor tilt.",
    images: ["https://picsum.photos/seed/rs3bug/600/400"],
    severity: "MEDIUM",
    status: "VERIFIED",
    compensationAmount: 1200000,
    createdAt: "2026-03-12T13:45:00Z",
  },
  {
    _id: "dr003",
    rentalId: { _id: "r010", customerId: { fullName: "Mai Phương Thảo", email: "thao@gmail.com", phone: "0990123456" }, phoneNumber: "0990123456", status: "COMPLETED" },
    deviceId: { name: "Sigma 35mm f/1.4 Art", images: ["https://picsum.photos/seed/sigma/400/300"] },
    customerId: { fullName: "Mai Phương Thảo" },
    description: "Lens bị trầy nhẹ phần coating trước do lau bằng vải không đúng loại. Chất lượng ảnh không ảnh hưởng đáng kể.",
    images: ["https://picsum.photos/seed/scratch/600/400"],
    severity: "LOW",
    status: "RESOLVED",
    compensationAmount: 0,
    createdAt: "2026-03-05T15:30:00Z",
  },
];

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
    fetchIssues();
  }, []);

  const fetchIssues = async () => {
    // ── Mock mode ──
    if (USE_MOCK) {
      setDeliveryIssues([...MOCK_DELIVERY_ISSUES, ...MOCK_RETURN_ISSUES]);
      setDamageReports(MOCK_DAMAGE_REPORTS);
      setLoading(false);
      return;
    }
    // ── Real API ──
    try {
      setLoading(true);
      const res = await getSupplierIssues();
      setDeliveryIssues(res.data?.deliveryIssues || []);
      setDamageReports(res.data?.damageReports || []);
    } catch {
      toast.error("Không thể tải danh sách sự cố");
    } finally {
      setLoading(false);
    }
  };

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
          {issue.resolvedNote && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">
                Ghi chú xử lý
              </h4>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">
                {issue.resolvedNote}
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
