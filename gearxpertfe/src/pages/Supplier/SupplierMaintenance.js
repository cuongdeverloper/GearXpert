import { useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import {
  FiTool,
  FiBell,
  FiClipboard,
  FiCheckCircle,
  FiXCircle,
  FiLoader,
  FiPlus,
  FiCalendar,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
} from "react-icons/fi";
import { toast } from "react-toastify";
import {
  getMaintenanceReminders,
  approveReminder,
  ignoreReminder,
  getWorkOrders,
  createWorkOrder,
  updateWorkOrderStatus,
  completeWorkOrder,
  getSupplierDeviceItems,
} from "../../service/ApiService/MaintenanceApi";

// ─── Constants ────────────────────────────────────────────────────────────────
const TABS = [
  { key: "reminders", label: "Nhắc nhở bảo trì", icon: FiBell },
  { key: "workorders", label: "Lệnh bảo trì", icon: FiClipboard },
];

const WO_STATUS_LABELS = {
  PENDING: "Đang chờ",
  IN_PROGRESS: "Đang thực hiện",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

const WO_STATUS_STYLES = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-green-50 text-green-700 border-green-200",
  CANCELLED: "bg-slate-50 text-slate-500 border-slate-200",
};

const WO_TYPE_LABELS = {
  PREVENTIVE: "Phòng ngừa",
  CORRECTIVE: "Sửa chữa (Sự cố)",
};

const WO_TYPE_STYLES = {
  PREVENTIVE: "bg-indigo-50 text-indigo-700 border-indigo-200",
  CORRECTIVE: "bg-rose-50 text-rose-700 border-rose-200",
};

const TRIGGER_TYPE_LABELS = {
  RENTAL_COUNT: "Số lần thuê",
  DATE_INTERVAL: "Khoảng thời gian",
  NEXT_DUE: "Quá hạn",
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatDateTime = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const today = () => {
  const d = new Date();
  return d.toISOString().split("T")[0];
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SupplierMaintenance() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get("tab");
    return ["reminders", "workorders"].includes(t) ? t : "reminders";
  });

  useEffect(() => {
    const newTab = searchParams.get("tab");
    if (newTab && ["reminders", "workorders"].includes(newTab)) {
      setActiveTab(newTab);
    }
  }, [location.search]);

  // Reminders state
  const [reminders, setReminders] = useState([]);
  const [remindersLoading, setRemindersLoading] = useState(false);

  // WorkOrders state
  const [workOrders, setWorkOrders] = useState([]);
  const [woLoading, setWoLoading] = useState(false);
  const [woStatusFilter, setWoStatusFilter] = useState("ALL");
  const [woTypeFilter, setWoTypeFilter] = useState("ALL");

  // Modals
  const [approveModal, setApproveModal] = useState(null); // reminder object
  const [createWoModal, setCreateWoModal] = useState(false);
  const [completeModal, setCompleteModal] = useState(null); // workorder object
  const [lightboxImg, setLightboxImg] = useState(null);

  // Forms
  const [approveForm, setApproveForm] = useState({ scheduledDate: today(), notes: "" });
  const [createWoForm, setCreateWoForm] = useState({
    deviceItemId: "",
    maintenanceType: "PREVENTIVE",
    scheduledDate: today(),
    notes: "",
  });
  const [completeForm, setCompleteForm] = useState({ notes: "", cost: "", imagesBefore: [], imagesAfter: [] });
  const [submitting, setSubmitting] = useState(false);

  // Danh sách DeviceItems của supplier (cho dropdown tạo WO thủ công)
  const [allDeviceItems, setAllDeviceItems] = useState([]);
  const [deviceItemsLoading, setDeviceItemsLoading] = useState(false);

  const loadSupplierDeviceItems = useCallback(async () => {
    setDeviceItemsLoading(true);
    try {
      const res = await getSupplierDeviceItems();
      setAllDeviceItems(Array.isArray(res?.data) ? res.data : (res?.data?.data || []));
    } catch {
      // silent — ko block
    } finally {
      setDeviceItemsLoading(false);
    }
  }, []);

  // ── Data Loaders ────────────────────────────────────────────────────────────
  const loadReminders = useCallback(async () => {
    setRemindersLoading(true);
    try {
      const res = await getMaintenanceReminders("PENDING");
      setReminders(res?.data?.data || res?.data || []);
    } catch {
      toast.error("Không thể tải danh sách nhắc nhở");
    } finally {
      setRemindersLoading(false);
    }
  }, []);

  const loadWorkOrders = useCallback(async () => {
    setWoLoading(true);
    try {
      const params = {};
      if (woStatusFilter !== "ALL") params.status = woStatusFilter;
      if (woTypeFilter !== "ALL") params.maintenanceType = woTypeFilter;
      const res = await getWorkOrders(params);
      setWorkOrders(res?.data?.data || res?.data || []);
    } catch {
      toast.error("Không thể tải danh sách lệnh bảo trì");
    } finally {
      setWoLoading(false);
    }
  }, [woStatusFilter, woTypeFilter]);

  useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  useEffect(() => {
    if (activeTab === "workorders") loadWorkOrders();
  }, [activeTab, loadWorkOrders]);

  const setTab = (key) => {
    setActiveTab(key);
    setSearchParams({ tab: key }, { replace: true });
  };

  // ── Reminder Actions ────────────────────────────────────────────────────────
  const handleApproveSubmit = async () => {
    if (!approveModal) return;
    setSubmitting(true);
    try {
      await approveReminder(approveModal._id, approveForm);
      toast.success("Đã tạo lệnh bảo trì!");
      setApproveModal(null);
      setApproveForm({ scheduledDate: today(), notes: "" });
      loadReminders();
      loadWorkOrders();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể duyệt nhắc nhở");
    } finally {
      setSubmitting(false);
    }
  };

  const handleIgnore = (reminder) => {
    const tId = toast(
      <div>
        <p className="font-medium text-slate-800 mb-3">Bỏ qua nhắc nhở bảo trì này?</p>
        <div className="flex gap-2 justify-end">
          <button 
            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors"
            onClick={() => toast.dismiss(tId)}
          >
            Hủy
          </button>
          <button 
            className="px-3 py-1.5 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
            onClick={async () => {
              toast.dismiss(tId);
              try {
                await ignoreReminder(reminder._id);
                toast.success("Đã bỏ qua nhắc nhở bảo trì");
                loadReminders();
              } catch (err) {
                toast.error(err?.response?.data?.message || "Không thể bỏ qua");
              }
            }}
          >
            Đồng ý
          </button>
        </div>
      </div>,
      { autoClose: false, closeOnClick: false, closeButton: false }
    );
  };

  // ── WorkOrder Actions ────────────────────────────────────────────
  const handleCreateWo = async () => {
    if (!createWoForm.deviceItemId) {
      toast.warning("Vui lòng chọn thiết bị");
      return;
    }
    setSubmitting(true);
    try {
      await createWorkOrder(createWoForm);
      toast.success("Đã tạo lệnh bảo trì!");
      setCreateWoModal(false);
      setCreateWoForm({ deviceItemId: "", maintenanceType: "PREVENTIVE", scheduledDate: today(), notes: "" });
      loadWorkOrders();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể tạo lệnh bảo trì");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = (wo, status) => {
    const confirmMsg =
      status === "IN_PROGRESS" ? "Bắt đầu thực hiện lệnh bảo trì này?" : "Hủy lệnh bảo trì này?";
    
    const tId = toast(
      <div>
        <p className="font-medium text-slate-800 mb-3">{confirmMsg}</p>
        <div className="flex gap-2 justify-end">
          <button 
            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-md text-sm font-medium hover:bg-slate-200 transition-colors"
            onClick={() => toast.dismiss(tId)}
          >
            Đóng
          </button>
          <button 
            className={`px-3 py-1.5 text-white rounded-md text-sm font-medium transition-colors ${
              status === "IN_PROGRESS" ? "bg-indigo-600 hover:bg-indigo-700" : "bg-red-600 hover:bg-red-700"
            }`}
            onClick={async () => {
              toast.dismiss(tId);
              try {
                await updateWorkOrderStatus(wo._id, status);
                toast.success(status === "IN_PROGRESS" ? "Đã bắt đầu thực hiện lệnh bảo trì" : "Đã hủy lệnh bảo trì thành công");
                loadWorkOrders();
              } catch (err) {
                toast.error(err?.response?.data?.message || "Không thể cập nhật trạng thái");
              }
            }}
          >
            Đồng ý
          </button>
        </div>
      </div>,
      { autoClose: false, closeOnClick: false, closeButton: false }
    );
  };

  const handleCompleteSubmit = async () => {
    if (!completeModal) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("notes", completeForm.notes || "");
      fd.append("cost", completeForm.cost || "0");
      completeForm.imagesBefore.forEach((f) => fd.append("imagesBefore", f));
      completeForm.imagesAfter.forEach((f) => fd.append("imagesAfter", f));
      await completeWorkOrder(completeModal._id, fd);
      toast.success("Hoàn tất bảo trì! Thiết bị đã về trạng thái Khả dụng.");
      setCompleteModal(null);
      setCompleteForm({ notes: "", cost: "", imagesBefore: [], imagesAfter: [] });
      loadWorkOrders();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Không thể hoàn tất");
    } finally {
      setSubmitting(false);
    }
  };

  // Pending reminders count badge
  const pendingCount = reminders.length;

  // Filtered WO
  const filteredWOs = useMemo(() => workOrders, [workOrders]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
          Bảo trì thiết bị
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Quản lý lịch bảo trì định kỳ và lệnh sửa chữa theo từng thiết bị vật lý.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                isActive
                  ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Icon size={15} />
              {tab.label}
              {tab.key === "reminders" && pendingCount > 0 && (
                <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full text-xs font-bold bg-rose-500 text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Reminders ─────────────────────────────────────────────────── */}
      {activeTab === "reminders" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {remindersLoading
                ? "Đang tải..."
                : `${pendingCount} nhắc nhở đang chờ xử lý`}
            </p>
            <button
              onClick={loadReminders}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 border border-slate-200 hover:bg-slate-50"
            >
              <FiRefreshCw size={13} />
              Tải lại
            </button>
          </div>

          {remindersLoading ? (
            <LoadingSpinner />
          ) : reminders.length === 0 ? (
            <EmptyState
              icon={FiBell}
              title="Không có nhắc nhở nào"
              desc="Hệ thống sẽ tự động tạo nhắc nhở khi thiết bị đến lịch bảo trì."
            />
          ) : (
            reminders.map((rem) => (
              <ReminderCard
                key={rem._id}
                reminder={rem}
                onApprove={() => {
                  setApproveModal(rem);
                  setApproveForm({ scheduledDate: today(), notes: "" });
                }}
                onIgnore={() => handleIgnore(rem)}
              />
            ))
          )}
        </div>
      )}

      {/* ── Tab: Work Orders ───────────────────────────────────────────────── */}
      {activeTab === "workorders" && (
        <div className="space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {/* Status filter */}
              <select
                value={woStatusFilter}
                onChange={(e) => setWoStatusFilter(e.target.value)}
                className="rounded-xl border border-slate-200 text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Tất cả trạng thái</option>
                {Object.entries(WO_STATUS_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              {/* Type filter */}
              <select
                value={woTypeFilter}
                onChange={(e) => setWoTypeFilter(e.target.value)}
                className="rounded-xl border border-slate-200 text-sm px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">Tất cả loại</option>
                {Object.entries(WO_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <button
                onClick={loadWorkOrders}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-slate-600 border border-slate-200 hover:bg-slate-50"
              >
                <FiRefreshCw size={13} />
                Tải lại
              </button>
            </div>
            <button
              onClick={() => {
                setCreateWoModal(true);
                loadSupplierDeviceItems();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
            >
              <FiPlus size={15} />
              Tạo lệnh thủ công
            </button>
          </div>

          {woLoading ? (
            <LoadingSpinner />
          ) : filteredWOs.length === 0 ? (
            <EmptyState
              icon={FiClipboard}
              title="Chưa có lệnh bảo trì nào"
              desc="Bạn có thể tạo lệnh thủ công hoặc duyệt từ nhắc nhở bảo trì."
            />
          ) : (
            filteredWOs.map((wo) => (
              <WorkOrderCard
                key={wo._id}
                wo={wo}
                onStart={() => handleUpdateStatus(wo, "IN_PROGRESS")}
                onCancel={() => handleUpdateStatus(wo, "CANCELLED")}
                onComplete={() => {
                  setCompleteModal(wo);
                  setCompleteForm({ notes: "", cost: "", imagesBefore: [], imagesAfter: [] });
                }}
                onImageClick={setLightboxImg}
              />
            ))
          )}
        </div>
      )}

      {/* ── Modal: Approve Reminder ──────────────────────────────────────── */}
      {approveModal && (
        <Modal
          title="Duyệt nhắc nhở — Tạo lệnh bảo trì"
          onClose={() => setApproveModal(null)}
        >
          <div className="space-y-4">
            <InfoRow
              label="Thiết bị"
              value={`${approveModal.deviceId?.name || "—"} · ${
                approveModal.deviceItemId?.internalCode || approveModal.deviceItemId?.serialNumber || "N/A"
              }`}
            />
            <InfoRow label="Lý do nhắc" value={approveModal.triggerValue} />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ngày thực hiện <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                min={today()}
                value={approveForm.scheduledDate}
                onChange={(e) => setApproveForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
              <textarea
                rows={3}
                value={approveForm.notes}
                onChange={(e) => setApproveForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Nội dung cần bảo trì, lưu ý..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
               Thiết bị sẽ chuyển sang trạng thái <strong>Đang bảo trì</strong> và không thể cho thuê.
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => setApproveModal(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              onClick={handleApproveSubmit}
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <FiLoader size={13} className="animate-spin" />}
              Xác nhận tạo lệnh
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Create WorkOrder ──────────────────────────────────────── */}
      {createWoModal && (
        <Modal
          title="Tạo lệnh bảo trì thủ công"
          onClose={() => {
            setCreateWoModal(false);
            setCreateWoForm({ deviceItemId: "", maintenanceType: "PREVENTIVE", scheduledDate: today(), notes: "" });
          }}
        >
          <div className="space-y-4">
            {/* Dropdown Thiết bị */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Thiết bị <span className="text-rose-500">*</span>
              </label>
              {deviceItemsLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-400 py-2">
                  <FiTool size={13} className="animate-spin" /> Đang tải danh sách thiết bị...
                </div>
              ) : allDeviceItems.length === 0 ? (
                <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  ⚠️ Không tìm thấy thiết bị nào trong kho.
                </p>
              ) : (
                <select
                  value={createWoForm.deviceItemId}
                  onChange={(e) => setCreateWoForm((f) => ({ ...f, deviceItemId: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Chọn thiết bị —</option>
                  {allDeviceItems.map((item, idx) => {
                    const devName = item.device?.name || "Thiết bị";
                    const serial = item.internalCode || item.serialNumber || `#${idx + 1}`;
                    const statusTag = item.status === "AVAILABLE" ? " ✅" : item.status === "MAINTENANCE" ? " 🔧" : " ⚠️";
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
              <label className="block text-sm font-medium text-slate-700 mb-1">Loại bảo trì</label>
              <select
                value={createWoForm.maintenanceType}
                onChange={(e) => setCreateWoForm((f) => ({ ...f, maintenanceType: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="PREVENTIVE">Phòng ngừa</option>
                <option value="CORRECTIVE">Sửa chữa (Sự cố)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Ngày thực hiện <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                min={today()}
                value={createWoForm.scheduledDate}
                onChange={(e) => setCreateWoForm((f) => ({ ...f, scheduledDate: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú</label>
              <textarea
                rows={3}
                value={createWoForm.notes}
                onChange={(e) => setCreateWoForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Nội dung cần thực hiện..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
               Thiết bị sẽ chuyển sang trạng thái <strong>Đang bảo trì</strong>.
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => setCreateWoModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              onClick={handleCreateWo}
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <FiLoader size={13} className="animate-spin" />}
              Tạo lệnh
            </button>
          </div>
        </Modal>
      )}

      {/* ── Modal: Complete WorkOrder ──────────────────────────────────────── */}
      {completeModal && (
        <Modal title="Xác nhận hoàn tất bảo trì" onClose={() => setCompleteModal(null)}>
          <div className="space-y-4">
            <InfoRow
              label="Thiết bị"
              value={`${completeModal.deviceId?.name || "—"} · ${
                completeModal.deviceItemId?.internalCode || completeModal.deviceItemId?.serialNumber || "N/A"
              }`}
            />
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                📷 Ảnh trước bảo trì
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  setCompleteForm((f) => ({ ...f, imagesBefore: Array.from(e.target.files) }))
                }
                className="text-sm text-slate-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                📷 Ảnh sau bảo trì
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  setCompleteForm((f) => ({ ...f, imagesAfter: Array.from(e.target.files) }))
                }
                className="text-sm text-slate-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Chi phí (VND)</label>
              <input
                type="number"
                min={0}
                value={completeForm.cost}
                onChange={(e) => setCompleteForm((f) => ({ ...f, cost: e.target.value }))}
                placeholder="0"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Kết quả bảo trì</label>
              <textarea
                rows={3}
                value={completeForm.notes}
                onChange={(e) => setCompleteForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Mô tả công việc đã thực hiện..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              ✅ Thiết bị sẽ trở về trạng thái <strong>Khả dụng</strong> sau khi hoàn tất.
            </p>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button
              onClick={() => setCompleteModal(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              onClick={handleCompleteSubmit}
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting && <FiLoader size={13} className="animate-spin" />}
              Xác nhận hoàn tất
            </button>
          </div>
        </Modal>
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
              className="absolute -top-3 -right-3 bg-white rounded-full p-1.5 shadow-lg text-slate-600 hover:text-rose-500"
            >
              <FiXCircle size={18} />
            </button>
            <img src={lightboxImg} alt="Ảnh bảo trì" className="rounded-xl max-h-[85vh] object-contain" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReminderCard({ reminder, onApprove, onIgnore }) {
  const item = reminder.deviceItemId || {};
  const device = reminder.deviceId || {};

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      {/* Device image */}
      {device.images?.[0] ? (
        <img
          src={device.images[0]}
          alt={device.name}
          className="w-16 h-16 rounded-xl object-cover border border-slate-200 shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <FiTool size={24} className="text-slate-400" />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="font-semibold text-slate-900 text-sm">
            {device.name || "Thiết bị"}
          </span>
          <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">
            {item.internalCode || item.serialNumber || "N/A"}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            {TRIGGER_TYPE_LABELS[reminder.triggerType] || reminder.triggerType}
          </span>
        </div>
        <p className="text-sm text-slate-600">{reminder.triggerValue}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          Nhắc lúc {new Date(reminder.createdAt).toLocaleString("vi-VN")}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 shrink-0">
        <button
          onClick={onIgnore}
          className="px-3 py-1.5 rounded-xl text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
        >
          Bỏ qua
        </button>
        <button
          onClick={onApprove}
          className="px-4 py-1.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-1.5"
        >
          <FiCheckCircle size={13} />
          Duyệt → Tạo lệnh
        </button>
      </div>
    </div>
  );
}

function WorkOrderCard({ wo, onStart, onCancel, onComplete, onImageClick }) {
  const [expanded, setExpanded] = useState(false);
  const item = wo.deviceItemId || {};
  const device = wo.deviceId || {};

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row sm:items-center gap-3 p-5 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Device image */}
        {device.images?.[0] ? (
          <img
            src={device.images[0]}
            alt={device.name}
            className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0"
          />
        ) : (
          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <FiTool size={20} className="text-slate-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {/* Status */}
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                WO_STATUS_STYLES[wo.status] || "bg-slate-50 text-slate-600 border-slate-200"
              }`}
            >
              {WO_STATUS_LABELS[wo.status] || wo.status}
            </span>
            {/* Type */}
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                WO_TYPE_STYLES[wo.maintenanceType] || "bg-slate-50 text-slate-600"
              }`}
            >
              {WO_TYPE_LABELS[wo.maintenanceType] || wo.maintenanceType}
            </span>
          </div>
          <p className="font-semibold text-slate-900 text-sm">
            {device.name || "Thiết bị"}{" "}
            <span className="text-slate-500 font-normal text-xs">
              · {item.internalCode || item.serialNumber || "N/A"}
            </span>
          </p>
          <div className="flex items-center gap-4 mt-0.5 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <FiCalendar size={11} />
              Lên lịch: {formatDate(wo.scheduledDate)}
            </span>
            {wo.completedDate && (
              <span className="flex items-center gap-1">
                <FiCheckCircle size={11} className="text-green-500" />
                Hoàn tất: {formatDate(wo.completedDate)}
              </span>
            )}
          </div>
        </div>

        {/* Expand toggle */}
        <div className="shrink-0 text-slate-400">
          {expanded ? <FiChevronUp size={18} /> : <FiChevronDown size={18} />}
        </div>
      </div>

      {/* Expanded */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {/* Notes */}
          {wo.notes && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Ghi chú</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{wo.notes}</p>
            </div>
          )}

          {/* Cost */}
          {wo.status === "COMPLETED" && wo.cost > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-1">Chi phí</p>
              <p className="text-sm font-semibold text-slate-700">
                {new Intl.NumberFormat("vi-VN").format(wo.cost)}₫
              </p>
            </div>
          )}

          {/* Images */}
          {(wo.imagesBefore?.length > 0 || wo.imagesAfter?.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              {wo.imagesBefore?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    Ảnh trước
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {wo.imagesBefore.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => onImageClick(img)}
                        className="h-16 w-16 rounded-lg overflow-hidden border border-slate-200 hover:border-indigo-300"
                      >
                        <img src={img} alt="Trước" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {wo.imagesAfter?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                    Ảnh sau
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {wo.imagesAfter.map((img, i) => (
                      <button
                        key={i}
                        onClick={() => onImageClick(img)}
                        className="h-16 w-16 rounded-lg overflow-hidden border border-slate-200 hover:border-indigo-300"
                      >
                        <img src={img} alt="Sau" className="h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {wo.status !== "COMPLETED" && wo.status !== "CANCELLED" && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              {wo.status === "PENDING" && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onStart(); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                  >
                    ▶️ Bắt đầu thực hiện
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onCancel(); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <FiXCircle size={13} />
                    Hủy lệnh
                  </button>
                </>
              )}
              {wo.status === "IN_PROGRESS" && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); onComplete(); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                  >
                    <FiCheckCircle size={13} />
                    Đánh dấu hoàn tất
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onCancel(); }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <FiXCircle size={13} />
                    Hủy lệnh
                  </button>
                </>
              )}
            </div>
          )}

          {/* Meta */}
          <div className="text-xs text-slate-400">
            <span>Tạo lúc: {formatDateTime(wo.createdAt)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-slate-100">
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <FiXCircle size={18} />
          </button>
        </div>
        <div className="px-5 pt-4 pb-2">{children}</div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex gap-2">
      <span className="text-sm font-medium text-slate-500 shrink-0">{label}:</span>
      <span className="text-sm text-slate-800">{value || "—"}</span>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-12 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-4">
        <Icon size={28} />
      </div>
      <p className="text-slate-700 font-medium mb-1">{title}</p>
      <p className="text-sm text-slate-500 max-w-xs mx-auto">{desc}</p>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-16">
      <div className="h-8 w-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );
}
