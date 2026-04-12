import { useEffect, useState, useMemo, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { ApiCreateConversation, ApiGetUserByUserId } from "../../components/Message Socket/ApiMessage";
import { openChatWindow } from "../../redux/reducer/chatWindowReducer";
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
  FiFileText,
  FiMessageSquare,
  FiCheckCircle,
  FiUpload,
  FiShield,
} from "react-icons/fi";
import { HiOutlineChatAlt2 } from "react-icons/hi";
import { getSupplierIssues, patchSupplierIssueStatus } from "../../service/ApiService/ReportApi";
import { createWorkOrderFromIssue, getDeviceItemsByDeviceIds } from "../../service/ApiService/MaintenanceApi";
import { toast } from "react-toastify";
import ReturnFailureDetailDialog from "../OperationStaff/tabs/handover/components/ReturnFailureDetailDialog";

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
  WAITING_EVIDENCE: "bg-violet-50 text-violet-700 border-violet-200",
  RESOLVED: "bg-green-50 text-green-700 border-green-200",
  REJECTED: "bg-slate-50 text-slate-700 border-slate-200",
  VERIFIED: "bg-blue-50 text-blue-700 border-blue-200",
};

const HANDOVER_FAILURE_REASON_LABELS = {
  NO_SHOW: "Khách không có mặt",
  CUSTOMER_REJECT: "Khách từ chối nhận",
  MISSING_ACCESSORY: "Thiếu phụ kiện",
  DEVICE_MISMATCH: "Sai thiết bị / sai serial",
  DAMAGED_ITEM_AT_DELIVERY: "Thiết bị hư hỏng khi giao",
  DELIVERY_BLOCKED: "Bị chặn giao / không thể tiếp cận",
  OTHER: "Khác",
};

const RETURN_FAIL_REGEX = /^Thu hồi thất bại:/i;
const HANDOVER_FAIL_REGEX = /^(Handover thất bại:|Đơn hàng không thành công vì lý do:)/i;

function isReturnReport(r) {
  const desc = r.description || "";
  if (HANDOVER_FAIL_REGEX.test(desc)) return false;
  if (r.reportContext === "RETURN" || RETURN_FAIL_REGEX.test(desc)) return true;
  return false;
}

const parseReturnFailDescription = (description = "") => {
  const text = String(description || "");
  const parts = text.split("|").map((x) => x.trim()).filter(Boolean);
  const first = parts[0] || "";
  const reason = first.replace(/^Thu hồi thất bại:\s*/i, "").trim();
  const operatorNote = parts[parts.length - 1] || "";
  return { reason, operatorNote };
};

const parseDeliveryFailDescription = (description = "") => {
  const text = String(description || "");
  const codeMatch = text.match(/Handover thất bại:\s*([A-Z_]+)/i);
  const labelMatch = text.match(/Đơn hàng không thành công vì lý do:\s*([^|.]+)/i);
  const segments = text.split("|").map((x) => x.trim()).filter(Boolean);
  const operatorNote = segments[segments.length - 1] || "";
  return {
    reason:
      labelMatch?.[1]?.trim() ||
      (codeMatch?.[1] ? HANDOVER_FAILURE_REASON_LABELS[codeMatch[1].toUpperCase()] : "") ||
      "",
    operatorNote,
  };
};

const VALID_TABS = ["ALL", "DELIVERY", "RETURN", "DAMAGE"];

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

const supplierIssueActions = [
  {
    key: "reply",
    label: "Phản hồi",
    hint: "Gửi phản hồi cho khách / vận hành",
    icon: FiMessageSquare,
  },
  {
    key: "processing",
    label: "Đánh dấu đang xử lý",
    hint: "Cập nhật trạng thái phía nhà cung cấp",
    icon: FiCheckCircle,
  },
  {
    key: "evidence",
    label: "Gửi bằng chứng",
    hint: "Đính kèm ảnh / tài liệu bổ sung",
    icon: FiUpload,
  },
  {
    key: "escalate",
    label: "Nhờ GearXpert can thiệp",
    hint: "Yêu cầu hỗ trợ từ nền tảng",
    icon: FiShield,
  },
];

/**
 * Đơn đã bị từ chối (rental REJECTED): không hiện "Gửi bằng chứng";
 * nút xử lý đổi thành "Xác nhận" (từ chối đơn là trường hợp vận hành bình thường).
 */
function getSupplierActionsForIssue(issue) {
  const rentalStatus = issue.rentalId?.status;
  const isRejectedRental = rentalStatus === "REJECTED";
  return supplierIssueActions
    .filter((a) => !(isRejectedRental && a.key === "evidence"))
    .map((a) => {
      if (a.key === "processing" && isRejectedRental) {
        return {
          ...a,
          label: "Xác nhận",
          hint: "Xác nhận đã nắm thông tin. Từ chối đơn là thao tác vận hành bình thường — không cần gửi bằng chứng.",
        };
      }
      return a;
    });
}

/* ─── Component ───────────────────────────────────────────────────────────── */

export default function SupplierIssuesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [deliveryIssues, setDeliveryIssues] = useState([]);
  const [damageReports, setDamageReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => {
    const u = (searchParams.get("tab") || "").toUpperCase();
    return VALID_TABS.includes(u) ? u : "ALL";
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [lightboxImg, setLightboxImg] = useState(null);
  const [dialogDetail, setDialogDetail] = useState(null);
  const [woIssueModal, setWoIssueModal] = useState(null);
  const [woIssueForm, setWoIssueForm] = useState({ deviceItemId: "", scheduledDate: "", notes: "" });
  const [woSubmitting, setWoSubmitting] = useState(false);
  // DeviceItems từ rental để hiển thị dropdown
  const [woRentalDeviceItems, setWoRentalDeviceItems] = useState([]);
  const [woDeviceItemsLoading, setWoDeviceItemsLoading] = useState(false);

  const todayStr = () => new Date().toISOString().split("T")[0];

  const loadIssues = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  useEffect(() => {
    const u = (searchParams.get("tab") || "").toUpperCase();
    if (VALID_TABS.includes(u)) setActiveTab(u);
  }, [searchParams]);

  const setTab = useCallback(
    (key) => {
      setActiveTab(key);
      if (key === "ALL") {
        setSearchParams({}, { replace: true });
      } else {
        setSearchParams({ tab: key }, { replace: true });
      }
    },
    [setSearchParams]
  );

  const openOperationalDetail = (report) => {
    const isReturn = isReturnReport(report);
    const parsed = isReturn
      ? parseReturnFailDescription(report?.description || "")
      : parseDeliveryFailDescription(report?.description || "");
    setDialogDetail({
      title: isReturn ? "Chi tiết sự cố thu hồi (vận hành)" : "Chi tiết sự cố giao hàng (vận hành)",
      customerName: report?.rentalId?.customerId?.fullName || "Khách hàng",
      phone: report?.rentalId?.phoneNumber || "-",
      reason: parsed.reason || report?.issueType || "Khác",
      operatorNote: parsed.operatorNote || report?.description || "",
      images: Array.isArray(report?.images) ? report.images : [],
      reasonLabel: isReturn ? "Lý do thu hồi thất bại" : "Lý do giao hàng thất bại",
    });
  };

  const openWoIssueModal = async (issue) => {
    setWoIssueModal(issue);
    setWoIssueForm({ deviceItemId: "", scheduledDate: todayStr(), notes: "" });
    setWoRentalDeviceItems([]);

    // Lấy DeviceItems từ các device có trong issue (issue.deviceIds đã được populate trên FE)
    // deviceIds có trong cả DAMAGE (issue.deviceId) và DELIVERY/RETURN (issue.deviceIds)
    let deviceIds = [];
    if (issue._type === "DAMAGE") {
      // DamageReport: issue.deviceId là 1 Device object
      const did = issue.deviceId?._id || issue.deviceId;
      if (did) deviceIds = [String(did)];
    } else {
      // DeliveryIssueReport: issue.deviceIds là mảng Device objects
      deviceIds = (issue.deviceIds || []).map((d) => String(d?._id || d)).filter(Boolean);
    }

    if (deviceIds.length === 0) return;

    setWoDeviceItemsLoading(true);
    try {
      const res = await getDeviceItemsByDeviceIds(deviceIds);
      const items = Array.isArray(res?.data) ? res.data : (res?.data?.data || []);
      setWoRentalDeviceItems(items);
      // Tự chọn sẵn nếu chỉ có 1 item
      if (items.length === 1 && items[0]._id) {
        setWoIssueForm((f) => ({ ...f, deviceItemId: String(items[0]._id) }));
      }
    } catch {
      // silent
    } finally {
      setWoDeviceItemsLoading(false);
    }
  };

  const handleCreateWoFromIssue = async () => {
    if (!woIssueModal) return;
    if (!woIssueForm.deviceItemId) {
      toast.warning("Vui lòng chọn thiết bị");
      return;
    }
    if (!woIssueForm.scheduledDate) {
      toast.warning("Vui lòng chọn ngày thực hiện");
      return;
    }
    setWoSubmitting(true);
    try {
      // Xác định issueModel
      const issueModel = woIssueModal._type === "DAMAGE" ? "DamageReport" : "DeliveryIssueReport";
      await createWorkOrderFromIssue({
        deviceItemId: woIssueForm.deviceItemId,
        issueId: woIssueModal._id,
        issueModel,
        scheduledDate: woIssueForm.scheduledDate,
        notes: woIssueForm.notes,
      });
      toast.success("Đã tạo lệnh sửa chữa! Thiết bị chuyển sang REPAIR.");
      setWoIssueModal(null);
      await loadIssues();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể tạo lệnh sửa chữa");
    } finally {
      setWoSubmitting(false);
    }
  };

  // Normalize into unified list for display
  const allIssues = useMemo(() => {
    const delivery = deliveryIssues.map((r) => ({
      ...r,
      _type: isReturnReport(r) ? "RETURN" : "DELIVERY",
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
          Sự cố giao hàng / thu hồi từ vận hành và khách; hư hỏng khi thuê từ khách — một nơi để theo dõi.
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
            onClick={() => setTab(tab.key)}
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
              onOperationalDetail={openOperationalDetail}
              onIssueUpdated={loadIssues}
              onCreateWorkOrder={openWoIssueModal}
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
      <ReturnFailureDetailDialog
        open={Boolean(dialogDetail)}
        onClose={() => setDialogDetail(null)}
        detail={dialogDetail}
      />

      {/* Modal: Tạo lệnh sửa chữa từ issue */}
      {woIssueModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Tạo lệnh sửa chữa</h3>
              <button onClick={() => setWoIssueModal(null)} className="text-slate-400 hover:text-slate-700">
                <FiX size={18} />
              </button>
            </div>
            <div className="px-5 pt-4 pb-2 space-y-4">
              {/* Thông tin sự cố */}
              <div className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2">
                <div>
                  <span className="font-medium">Sự cố:</span>{" "}
                  {woIssueModal._type === "DAMAGE" ? "Hư hỏng khi thuê" : woIssueModal._type === "RETURN" ? "Thu hồi" : "Giao hàng"}
                  {" — "}{woIssueModal._customerName}
                </div>
                {woIssueModal._devices?.length > 0 && (
                  <div className="mt-1 border-t border-slate-200/60 pt-1">
                    <span className="font-medium">Sản phẩm:</span> {woIssueModal._devices.join(", ")}
                  </div>
                )}
              </div>

              {/* Dropdown Thiết bị */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Thiết bị <span className="text-rose-500">*</span>
                </label>
                {woDeviceItemsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                    <FiTool size={13} className="animate-spin" /> Đang tải thiết bị trong đơn...
                  </div>
                ) : woRentalDeviceItems.length === 0 ? (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    ⚠️ Không tìm thấy thiết bị trong đơn hàng này. Đơn có thể chưa được phân bổ serial.
                  </p>
                ) : (
                  <select
                    value={woIssueForm.deviceItemId}
                    onChange={(e) => setWoIssueForm((f) => ({ ...f, deviceItemId: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                  >
                    <option value="">— Chọn thiết bị cần sửa —</option>
                    {woRentalDeviceItems.map((item, idx) => {
                      if (!item._id) return null;
                      const devName = item.device?.name || "Thiết bị";
                      const serial = item.internalCode || item.serialNumber || `#${idx + 1}`;
                      const statusTag =
                        item.status === "AVAILABLE" ? " ✅" :
                        item.status === "PENDING_RESOLUTION" ? " 🔴" :
                        item.status === "REPAIR" ? " 🔧" : "";
                      return (
                        <option key={item._id} value={item._id}>
                          {devName} — {serial}{statusTag}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Ngày thực hiện <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={woIssueForm.scheduledDate}
                  onChange={(e) => setWoIssueForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={woIssueForm.notes}
                  onChange={(e) => setWoIssueForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Nội dung cần sửa chữa..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                ⚠️ Thiết bị sẽ chuyển sang trạng thái <strong>REPAIR</strong>.
              </p>
            </div>
            <div className="flex justify-end gap-2 px-5 pb-5 pt-2">
              <button
                onClick={() => setWoIssueModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                onClick={handleCreateWoFromIssue}
                disabled={woSubmitting}
                className="px-5 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2"
              >
                {woSubmitting && <FiTool size={13} className="animate-pulse" />}
                Tạo lệnh sửa chữa
              </button>
            </div>
          </div>
        </div>
      )}

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

function IssueCard({ issue, onImageClick, onOperationalDetail, onIssueUpdated, onCreateWorkOrder  }) {
  const [expanded, setExpanded] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state) => state.user?.isAuthenticated);

  const supplierActions = useMemo(
    () => getSupplierActionsForIssue(issue),
    [issue._id, issue.rentalId?.status]
  );

  const handleSupplierAction = async (e) => {
    e.stopPropagation();
    if (String(issue._id).startsWith("return-failed-")) {
      toast.warning(
        "Không thể cập nhật bản ghi tổng hợp từ hệ thống. Liên hệ vận hành nếu cần."
      );
      return;
    }
    const rentalStatus = issue.rentalId?.status;
    const isRejectedRental = rentalStatus === "REJECTED";
    const targetStatus = isRejectedRental ? "RESOLVED" : "PROCESSING";
    try {
      await patchSupplierIssueStatus(issue._id, { status: targetStatus });
      toast.success(
        isRejectedRental
          ? "Đã xác nhận — báo cáo chuyển sang Đã xử lý (RESOLVED)"
          : "Đã đánh dấu đang xử lý — trạng thái báo cáo: PROCESSING"
      );
      onIssueUpdated?.();
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Không thể cập nhật trạng thái";
      toast.error(msg);
    }
  };

  const handleContactCustomerChat = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      toast.info("Vui lòng đăng nhập để nhắn tin");
      navigate("/signin");
      return;
    }
    const customerId =
      issue.rentalId?.customerId?._id || issue.rentalId?.customerId;
    if (!customerId) {
      toast.error("Không tìm thấy tài khoản khách trên đơn.");
      return;
    }
    try {
      const conversation = await ApiCreateConversation(customerId);
      const friendInfo = await ApiGetUserByUserId(customerId);
      dispatch(openChatWindow({ ...conversation, friendInfo }));
    } catch (err) {
      console.error(err);
      toast.error("Không thể mở cuộc trò chuyện");
    }
  };

  const showOperationalDetail =
    issue._type !== "DAMAGE" &&
    (issue.reportedBy === "STAFF" || issue.source === "RETURN_RECORD");

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
          {showOperationalDetail && onOperationalDetail && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOperationalDetail(issue);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100"
            >
              <FiFileText size={12} />
              Biên bản vận hành
            </button>
          )}
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

          {/* Supplier actions */}
          <div
            className="rounded-xl border border-dashed border-indigo-200/80 bg-indigo-50/40 p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-800/90 mb-3">
              Thao tác xử lý (nhà cung cấp)
            </h4>
            <div className="flex flex-wrap gap-2">
              {supplierActions.map(({ key, label, hint, icon: Icon }) => {
                const rentalSt = issue.rentalId?.status;
                const isRejectedRental = rentalSt === "REJECTED";
                const processingDisabled =
                  key === "processing" &&
                  (!isRejectedRental
                    ? issue.status !== "OPEN"
                    : !["OPEN", "PROCESSING"].includes(issue.status));
                return (
                <button
                  key={key}
                  type="button"
                  title={hint}
                  disabled={processingDisabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (key === "processing") {
                      handleSupplierAction(e);
                      return;
                    }
                    toast.info(label);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-indigo-200 bg-white text-indigo-800 hover:bg-indigo-50 hover:border-indigo-300 transition-colors shadow-sm disabled:opacity-45 disabled:cursor-not-allowed disabled:hover:bg-white"
                >
                  <Icon size={14} className="shrink-0 opacity-80" />
                  {label}
                </button>
              );
              })}
              <button
                type="button"
                title="Mở khung chat Messenger với khách hàng (theo tài khoản đơn thuê)"
                onClick={handleContactCustomerChat}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-sm"
              >
                <HiOutlineChatAlt2 size={16} className="shrink-0 opacity-80" />
                Liên hệ khách
              </button>
              {/* Nút Tạo lệnh sửa chữa */}
              {onCreateWorkOrder && ["OPEN"].includes(issue.status) && (
                <button
                  type="button"
                  title="Tạo lệnh sửa chữa cho thiết bị này"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCreateWorkOrder(issue);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-colors shadow-sm"
                >
                  <FiTool size={14} className="shrink-0 opacity-80" />
                  Tạo lệnh sửa chữa
                </button>
              )}
              {onCreateWorkOrder && ["PROCESSING", "RESOLVED"].includes(issue.status) && (
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm opacity-80 cursor-default"
                >
                  <FiTool size={14} className="shrink-0" />
                  Đã tạo lệnh sửa chữa
                </button>
              )}
            </div>
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
