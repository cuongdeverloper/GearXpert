import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiX, FiMapPin, FiUser, FiPackage, FiImage,
  FiMessageSquare, FiClock, FiCheckCircle, FiAlertCircle,
  FiFileText,
} from "react-icons/fi";
import { toast } from "react-toastify";
import { getDisputeDetail, updateDispute, getAdminList } from "../../service/ApiService/AdminDisputeApi";
import { formatCurrency, formatDate } from "../../utils/formatters";

// ─── Badge helpers ────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  OPEN:             "bg-slate-100 text-slate-700",
  PROCESSING:       "bg-blue-100 text-blue-700",
  WAITING_EVIDENCE: "bg-yellow-100 text-yellow-700",
  RESOLVED:         "bg-emerald-100 text-emerald-700",
  REJECTED:         "bg-red-100 text-red-700",
};

const CASE_TYPE_COLORS = {
  DELIVERY: "bg-indigo-100 text-indigo-700",
  DAMAGE:   "bg-orange-100 text-orange-700",
};

const SEVERITY_COLORS = {
  LOW:    "bg-emerald-100 text-emerald-700",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH:   "bg-red-100 text-red-700",
};

const ISSUE_TYPE_LABELS = {
  MISSING:    "Missing Item",
  WRONG_ITEM: "Wrong Item",
  DAMAGED:    "Damaged",
  OTHER:      "Other",
};

const STATUS_LABELS = {
  OPEN:             "Open",
  PROCESSING:       "Processing",
  WAITING_EVIDENCE: "Waiting Evidence",
  RESOLVED:         "Resolved",
  REJECTED:         "Rejected",
};

function Badge({ value, map }) {
  const cls = map[value] || "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      {value}
    </span>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, icon: Icon, children }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
      <h4 className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400 mb-3">
        {Icon && <Icon size={14} />}
        {title}
      </h4>
      {children}
    </div>
  );
}

function InfoRow({ label, value, bold }) {
  return (
    <div className="flex justify-between items-start py-1.5 text-sm">
      <span className="text-slate-500 shrink-0 w-36">{label}</span>
      <span className={`text-slate-900 text-right ${bold ? "font-semibold" : ""}`}>{value || "—"}</span>
    </div>
  );
}

function TimelineEntry({ entry, isFirst }) {
  return (
    <div className="flex gap-3 relative">
      <div className={`flex flex-col items-center ${isFirst ? "" : "pt-4"}`}>
        <div className="w-2 h-2 rounded-full bg-primary ring-4 ring-primary/10 shrink-0" />
        {!isFirst && <div className="w-px flex-1 bg-slate-200 min-h-6" />}
      </div>
      <div className="pb-4 flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Badge value={entry.status} map={STATUS_COLORS} />
          {entry.note && (
            <span className="text-sm text-slate-700 bg-white border border-slate-200 rounded-lg px-2 py-0.5">
              {entry.note}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          {entry.changedBy?.fullName || "—"} · {formatDate(entry.createdAt)}
        </p>
      </div>
    </div>
  );
}

function ImageThumb({ src, onClick }) {
  return (
    <button
      onClick={onClick}
      className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 hover:border-primary transition cursor-pointer"
    >
      <img
        src={src}
        alt="evidence"
        className="w-full h-full object-cover"
        onError={(e) => { e.target.style.display = "none"; }}
      />
    </button>
  );
}

function ImageGalleryModal({ images, startIdx, onClose }) {
  const [current, setCurrent] = useState(startIdx);
  if (!images || images.length === 0) return null;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="relative max-w-4xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/80 hover:text-white text-3xl font-bold"
        >
          ×
        </button>
        <img
          src={images[current]}
          alt="evidence full"
          className="w-full max-h-[70vh] object-contain rounded-2xl bg-black"
        />
        {images.length > 1 && (
          <>
            <button
              className="absolute left-0 top-1/2 -translate-y-1/2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-xl transition"
              onClick={() => setCurrent((c) => (c - 1 + images.length) % images.length)}
            >
              ‹
            </button>
            <button
              className="absolute right-0 top-1/2 -translate-y-1/2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white text-xl transition"
              onClick={() => setCurrent((c) => (c + 1) % images.length)}
            >
              ›
            </button>
          </>
        )}
        <div className="flex justify-center gap-2 mt-3 flex-wrap">
          {images.map((src, i) => (
            <button
              key={src}
              onClick={() => setCurrent(i)}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition ${
                i === current ? "border-primary" : "border-transparent opacity-60"
              }`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Drawer ─────────────────────────────────────────────────────────────

export default function CaseDetailDrawer({ open, onClose, disputeCase, onUpdate }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("timeline");
  const [galleryOpen, setGalleryOpen] = useState({ open: false, idx: 0 });
  const [adminList, setAdminList] = useState([]);

  // Action form
  const [actionStatus, setActionStatus] = useState("");
  const [actionAssigned, setActionAssigned] = useState("");
  const [actionNote, setActionNote] = useState("");
  const [actionResolution, setActionResolution] = useState("");

  const caseType = disputeCase?.caseType;
  const caseId = disputeCase?._id;

  const fetchDetail = useCallback(async () => {
    if (!open || !caseType || !caseId) return;
    setLoading(true);
    try {
      const res = await getDisputeDetail(caseType, caseId);
      setDetail(res?.case || res?.data?.case || null);
    } catch (err) {
      console.error("Failed to load case detail:", err);
      toast.error("Không tải được chi tiết case");
    } finally {
      setLoading(false);
    }
  }, [open, caseType, caseId]);

  const fetchAdmins = useCallback(async () => {
    try {
      const res = await getAdminList();
      setAdminList(res?.admins || []);
    } catch (err) {
      console.error("Failed to load admin list:", err);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchDetail();
      fetchAdmins();
      // Reset action form
      setActionStatus(disputeCase?.status || "");
      setActionAssigned(disputeCase?.assignedAdmin?._id || "");
      setActionNote("");
      setActionResolution("");
      setActiveTab("timeline");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, disputeCase?._id]);

  const handleSubmitAction = async () => {
    if (!caseType || !caseId) return;
    const payload = {};
    if (actionStatus) payload.status = actionStatus;
    if (actionAssigned !== undefined) payload.assignedAdminId = actionAssigned || null;
    if (actionNote.trim()) payload.note = actionNote.trim();
    if (actionResolution.trim()) payload.resolutionNote = actionResolution.trim();

    if (!payload.status && payload.assignedAdminId === undefined && !payload.note && !payload.resolutionNote) {
      toast.warn("Chưa có thay đổi nào");
      return;
    }
    if ((payload.status === "RESOLVED" || payload.status === "REJECTED") && !payload.note) {
      toast.warn("Vui lòng nhập ghi chú khi đóng case");
      return;
    }

    setSaving(true);
    try {
      const res = await updateDispute(caseType, caseId, payload);
      toast.success("Cập nhật thành công");
      // Refresh detail
      await fetchDetail();
      if (onUpdate) onUpdate(res?.data || res);
      onClose();
    } catch (err) {
      console.error("Failed to update dispute:", err);
      toast.error(err?.response?.data?.message || "Cập nhật thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setDetail(null);
    setGalleryOpen({ open: false, idx: 0 });
    onClose();
  };

  const CASE = detail || disputeCase || {};
  const STATUS_OPTIONS = ["PROCESSING", "WAITING_EVIDENCE", "RESOLVED", "REJECTED"];
  const hasEvidence = CASE.images && CASE.images.length > 0;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          >
            <motion.div
              className="w-full max-w-xl bg-white h-full overflow-y-auto"
              initial={{ x: "100%" }}
              animate={{ x: 0, transition: { type: "spring", stiffness: 300, damping: 30 } }}
              exit={{ x: "100%", transition: { duration: 0.2 } }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge value={CASE.caseType} map={CASE_TYPE_COLORS} />
                    <Badge value={CASE.status} map={STATUS_COLORS} />
                    {CASE.severity && <Badge value={CASE.severity} map={SEVERITY_COLORS} />}
                    {CASE.reportContext && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        <FiMapPin size={11} />
                        {CASE.reportContext}
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 truncate">
                    Case #{CASE._id ? CASE._id.slice(-8).toUpperCase() : "—"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Rental #{CASE.rentalId} · {formatDate(CASE.createdAt)}
                  </p>
                </div>
                <button
                  onClick={handleClose}
                  className="shrink-0 w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition"
                >
                  <FiX size={18} />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {loading ? (
                  // Skeleton
                  <div className="space-y-4 animate-pulse">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-32 bg-slate-100 rounded-xl" />
                    ))}
                  </div>
                ) : detail ? (
                  <>
                    {/* ── Thumbnail preview ── */}
                    {CASE.thumbnail && (
                      <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 h-40">
                        <img src={CASE.thumbnail} alt="thumbnail" className="w-full h-full object-cover"
                          onError={(e) => { e.target.style.display = "none"; }} />
                      </div>
                    )}

                    {/* ── Rental Info ── */}
                    {CASE.rental && (
                      <SectionCard title="Rental Information" icon={FiPackage}>
                        <div className="divide-y divide-slate-100">
                          <InfoRow label="Status" value={CASE.rental.status} bold />
                          <InfoRow label="Total Price" value={formatCurrency(CASE.rental.rentPriceTotal)} bold />
                          <InfoRow label="Deposit" value={formatCurrency(CASE.rental.depositAmount)} />
                          <InfoRow label="Start Date" value={formatDate(CASE.rental.rentalStartDate)} />
                          <InfoRow label="End Date" value={formatDate(CASE.rental.rentalEndDate)} />
                          <InfoRow
                            label="Address"
                            value={CASE.rental.deliveryAddress?.fullAddress}
                          />
                        </div>
                      </SectionCard>
                    )}

                    {/* ── Customer & Supplier ── */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <SectionCard title="Customer" icon={FiUser}>
                        <div className="space-y-1.5">
                          <p className="font-semibold text-slate-900">{CASE.customer?.fullName || "—"}</p>
                          <p className="text-xs text-slate-500">{CASE.customer?.email || ""}</p>
                          <p className="text-xs text-slate-500">{CASE.customer?.phone || ""}</p>
                        </div>
                      </SectionCard>
                      <SectionCard title="Supplier" icon={FiUser}>
                        <div className="space-y-1.5">
                          <p className="font-semibold text-slate-900">{CASE.supplier?.fullName || "—"}</p>
                          <p className="text-xs text-slate-500">{CASE.supplier?.email || ""}</p>
                        </div>
                      </SectionCard>
                    </div>

                    {/* ── Devices ── */}
                    {CASE.devices && CASE.devices.length > 0 && (
                      <SectionCard title="Devices" icon={FiPackage}>
                        <div className="space-y-3">
                          {CASE.devices.map((d) => (
                            <div key={d._id} className="flex items-start gap-3">
                              {d.images && d.images[0] && (
                                <img
                                  src={d.images[0]}
                                  alt={d.name}
                                  className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                                  onError={(e) => { e.target.style.display = "none"; }}
                                />
                              )}
                              <div>
                                <p className="text-sm font-medium text-slate-900">{d.name}</p>
                                <p className="text-xs text-slate-500">#{d._id?.slice(-6).toUpperCase()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </SectionCard>
                    )}

                    {/* ── Description ── */}
                    <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                      <h4 className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400 mb-2">
                        <FiFileText size={14} />
                        Description
                      </h4>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{CASE.description || "—"}</p>
                      {CASE.issueType && (
                        <p className="text-xs text-slate-500 mt-2">
                          Issue Type: <span className="font-medium">{ISSUE_TYPE_LABELS[CASE.issueType] || CASE.issueType}</span>
                        </p>
                      )}
                    </div>

                    {/* ── Evidence Images ── */}
                    {hasEvidence && (
                      <SectionCard title={`Evidence Images (${CASE.images.length})`} icon={FiImage}>
                        <div className="flex flex-wrap gap-2">
                          {CASE.images.map((src, idx) => (
                            <ImageThumb
                              key={src}
                              src={src}
                              onClick={() => setGalleryOpen({ open: true, idx })}
                            />
                          ))}
                        </div>
                      </SectionCard>
                    )}

                    {/* ── Tab: Timeline / Internal Notes ── */}
                    <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
                      <div className="flex border-b border-slate-100">
                        {["timeline", "notes"].map((tab) => (
                          <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 px-4 py-3 text-sm font-medium transition ${
                              activeTab === tab
                                ? "text-primary border-b-2 border-primary bg-primary/5"
                                : "text-slate-500 hover:text-slate-700"
                            }`}
                          >
                            {tab === "timeline" ? (
                              <span className="flex items-center justify-center gap-1.5">
                                <FiClock size={14} /> Timeline
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-1.5">
                                <FiMessageSquare size={14} /> Internal Notes
                              </span>
                            )}
                          </button>
                        ))}
                      </div>

                      <div className="p-4">
                        {activeTab === "timeline" && (
                          <div>
                            {CASE.statusHistory && CASE.statusHistory.length > 0 ? (
                              CASE.statusHistory.slice().reverse().map((entry, idx) => (
                                <TimelineEntry
                                  key={entry._id || idx}
                                  entry={entry}
                                  isFirst={idx === CASE.statusHistory.length - 1}
                                />
                              ))
                            ) : (
                              <p className="text-sm text-slate-400 text-center py-4">No history yet</p>
                            )}
                          </div>
                        )}

                        {activeTab === "notes" && (
                          <div>
                            {CASE.internalNotes && CASE.internalNotes.length > 0 ? (
                              <div className="space-y-3">
                                {CASE.internalNotes.map((note) => (
                                  <div key={note._id} className="rounded-lg border border-slate-100 p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-semibold text-slate-700">
                                        {note.adminName || note.adminId || "Admin"}
                                      </span>
                                      <span className="text-xs text-slate-400">{formatDate(note.createdAt)}</span>
                                    </div>
                                    <p className="text-sm text-slate-700">{note.content}</p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-slate-400 text-center py-4">No internal notes yet</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Assigned Admin ── */}
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/60">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <FiUser size={16} />
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Assigned Admin</p>
                        <p className="text-sm font-semibold text-slate-900">
                          {CASE.assignedAdmin?.fullName || "Unassigned"}
                        </p>
                      </div>
                    </div>

                    {/* ── Resolution Note ── */}
                    {CASE.resolutionNote && (
                      <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                        <h4 className="flex items-center gap-2 text-xs font-semibold uppercase text-emerald-600 mb-2">
                          <FiCheckCircle size={14} />
                          Resolution Note
                        </h4>
                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{CASE.resolutionNote}</p>
                      </div>
                    )}

                    {/* ═══ ACTION PANEL ═══ */}
                    <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                      <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                        <FiAlertCircle size={16} className="text-primary" />
                        Admin Actions
                      </h3>

                      {/* Status */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                          Change Status
                        </label>
                        <select
                          value={actionStatus}
                          onChange={(e) => setActionStatus(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white text-sm"
                        >
                          <option value="">— Keep current —</option>
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                          ))}
                        </select>
                      </div>

                      {/* Assign Admin */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                          Assign / Reassign Admin
                        </label>
                        <select
                          value={actionAssigned}
                          onChange={(e) => setActionAssigned(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white text-sm"
                        >
                          <option value="">— Unassigned —</option>
                          {adminList.map((a) => (
                            <option key={a._id} value={a._id}>{a.fullName}</option>
                          ))}
                        </select>
                      </div>

                      {/* Note */}
                      <div>
                        <label className="block text-xs font-medium text-slate-600 mb-1.5">
                          Internal Note {((actionStatus === "RESOLVED" || actionStatus === "REJECTED")) && <span className="text-red-500">*</span>}
                        </label>
                        <textarea
                          value={actionNote}
                          onChange={(e) => setActionNote(e.target.value)}
                          placeholder="Add a note (visible in internal history)..."
                          rows={3}
                          className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition resize-none text-sm"
                        />
                      </div>

                      {/* Resolution Note */}
                      {(actionStatus === "RESOLVED" || actionStatus === "REJECTED") && (
                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1.5">
                            Resolution Note <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            value={actionResolution}
                            onChange={(e) => setActionResolution(e.target.value)}
                            placeholder="Describe the resolution..."
                            rows={2}
                            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition resize-none text-sm"
                          />
                        </div>
                      )}

                      <button
                        onClick={handleSubmitAction}
                        disabled={saving}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      >
                        {saving ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <FiCheckCircle size={16} />
                            Apply Changes
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-12 text-slate-400">No data available</div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Image Gallery Modal */}
      {galleryOpen.open && CASE.images && (
        <ImageGalleryModal
          images={CASE.images}
          startIdx={galleryOpen.idx}
          onClose={() => setGalleryOpen({ open: false, idx: 0 })}
        />
      )}
    </>
  );
}
