import { useEffect, useState, useCallback } from "react";
import { useDispatch } from "react-redux";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import {
  FiDownload, FiBarChart2, FiUsers, FiBox,
  FiSearch, FiAlertTriangle, FiChevronLeft, FiChevronRight,
  FiChevronDown, FiEye, FiUser,
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { getAdminReports, getAdminDashboard } from "../../service/ApiService/AdminDashboardApi";
import { getDisputes } from "../../service/ApiService/AdminDisputeApi";
import CaseDetailDrawer from "../../components/admin/CaseDetailDrawer";
import { formatDate } from "../../utils/formatters";

// ─── Shared badge helpers ─────────────────────────────────────────────────────

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

const STATUS_LABELS = {
  OPEN:             "Open",
  PROCESSING:       "Processing",
  WAITING_EVIDENCE: "Waiting Evidence",
  RESOLVED:         "Resolved",
  REJECTED:         "Rejected",
};

function Badge({ value, map, label }) {
  const cls = map[value] || "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${cls}`}>
      {label || value}
    </span>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, change, color, icon: Icon }) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 ${color || ""}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="text-xs font-medium text-slate-600">{label}</div>
        {Icon && <Icon size={16} className="text-slate-400" />}
      </div>
      <div className="text-2xl font-bold text-slate-900 mb-1">{value ?? "—"}</div>
      {change && <div className="text-xs font-medium text-green-600">{change}</div>}
    </div>
  );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1;
    if (page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        <FiChevronLeft size={16} />
      </button>
      {pages.map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-sm font-medium transition ${
            p === page
              ? "bg-primary text-white shadow-sm"
              : "border border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
      >
        <FiChevronRight size={16} />
      </button>
    </div>
  );
}

// ─── Filter Dropdown ─────────────────────────────────────────────────────────

function FilterSelect({ label, value, onChange, options }) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((o) => o.value === value)?.label || label;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition whitespace-nowrap ${
          value
            ? "border-primary bg-primary/5 text-primary"
            : "border-slate-200 text-slate-700 hover:bg-slate-50"
        }`}
      >
        {selectedLabel}
        <FiChevronDown size={14} className={`transition ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute top-full left-0 mt-1 z-30 w-48 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden"
            >
              {options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition ${
                    value === opt.value
                      ? "bg-primary/5 text-primary font-medium"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const dispatch = useDispatch();

  // ── Overview state ──
  const [stats, setStats] = useState([]);
  const [reports, setReports] = useState([]);

  // ── Dispute cases state ──
  const [cases, setCases] = useState([]);
  const [totalCases, setTotalCases] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casesError, setCasesError] = useState(null);

  // ── Filters ──
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [reportedByFilter, setReportedByFilter] = useState("");

  // ── Drawer ──
  const [selectedCase, setSelectedCase] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const LIMIT = 20;

  // ── Fetch overview ──
  useEffect(() => {
    const fetchReports = async () => {
      dispatch(showAdminLoading());
      try {
        const [reportRes, dashboardRes] = await Promise.all([
          getAdminReports(),
          getAdminDashboard(),
        ]);
        setReports(reportRes?.reports || []);
        setStats(dashboardRes?.stats || []);
      } catch (error) {
        console.error("Failed to load reports:", error);
      } finally {
        dispatch(hideAdminLoading());
      }
    };
    fetchReports();
  }, [dispatch]);

  // ── Fetch dispute cases ──
  const fetchCases = useCallback(async (pg = 1) => {
    setCasesLoading(true);
    setCasesError(null);
    try {
      const params = { page: pg, limit: LIMIT };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      if (typeFilter) params.caseType = typeFilter;
      if (severityFilter && typeFilter !== "DELIVERY") params.severity = severityFilter;
      if (reportedByFilter) params.reportedBy = reportedByFilter;

      const res = await getDisputes(params);
      setCases(res?.cases || []);
      setTotalCases(res?.total || 0);
      setTotalPages(res?.totalPages || 1);
      setPage(pg);
    } catch (err) {
      console.error("Failed to load disputes:", err);
      setCasesError("Không tải được danh sách case. Vui lòng thử lại.");
    } finally {
      setCasesLoading(false);
    }
  }, [search, statusFilter, typeFilter, severityFilter, reportedByFilter]);

  useEffect(() => {
    fetchCases(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter, severityFilter, reportedByFilter]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => fetchCases(1), 400);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleOpenCase = (caseItem) => {
    setSelectedCase(caseItem);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedCase(null), 300);
  };

  const handleAfterUpdate = () => {
    fetchCases(page);
  };

  // ── Dispute KPI cards derived from case data ──
  const openCount = cases.filter((c) => c.status === "OPEN").length;
  const processingCount = cases.filter((c) => c.status === "PROCESSING").length;
  const waitingCount = cases.filter((c) => c.status === "WAITING_EVIDENCE").length;
  const resolvedCount = cases.filter((c) => c.status === "RESOLVED").length;

  return (
    <div className="space-y-6">

      {/* ══ OVERVIEW ═══════════════════════════════════════════════════════════ */}
      <section>
        {/* KPI Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          {stats.length > 0
            ? stats.map((stat, idx) => (
                <StatCard key={idx} {...stat} />
              ))
            : (
                <>
                  <StatCard label="Total Disputes" value={totalCases} icon={FiAlertTriangle} />
                  <StatCard label="Open" value={openCount} />
                  <StatCard label="Processing" value={processingCount} />
                  <StatCard label="Resolved" value={resolvedCount} />
                </>
              )}
        </div>

        {/* Recent Reports Cards */}
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Reports</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reports.length > 0 ? reports.map((report) => (
              <div
                key={report.id}
                className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition"
              >
                <div className="mb-3 flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary">
                    {report.type === "revenue" && <FiBarChart2 size={20} />}
                    {report.type === "device" && <FiBox size={20} />}
                    {report.type === "user" && <FiUsers size={20} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{report.title}</h3>
                    <p className="text-xs text-slate-500">{report.period}</p>
                  </div>
                </div>

                <div className="mb-4 space-y-2 border-t border-slate-200 pt-3 text-sm">
                  {report.type === "revenue" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Revenue:</span>
                        <span className="font-semibold text-slate-900">${report.totalRevenue?.toLocaleString() ?? "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Rentals:</span>
                        <span className="font-semibold text-slate-900">{report.totalRentals ?? "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Active Users:</span>
                        <span className="font-semibold text-slate-900">{report.totalUsers ?? "—"}</span>
                      </div>
                    </>
                  )}
                  {report.type === "device" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Top Device:</span>
                        <span className="font-semibold text-slate-900">{report.topDevice ?? "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total Rentals:</span>
                        <span className="font-semibold text-slate-900">{report.totalRentals ?? "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Avg Rating:</span>
                        <span className="font-semibold text-slate-900">{report.averageRating ?? "—"} ⭐</span>
                      </div>
                    </>
                  )}
                  {report.type === "user" && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-slate-600">New Users:</span>
                        <span className="font-semibold text-slate-900">{report.newUsers ?? "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Active Users:</span>
                        <span className="font-semibold text-slate-900">{report.activeUsers ?? "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Churn Rate:</span>
                        <span className="font-semibold text-slate-900">{report.churnRate ?? "—"}</span>
                      </div>
                    </>
                  )}
                </div>

                <button className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
                  <FiDownload size={16} />
                  Download Report
                </button>
              </div>
            )) : (
              <div className="col-span-full text-center py-8 text-slate-400 text-sm">
                No reports available
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══ DISPUTE CASES ═══════════════════════════════════════════════════════ */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Dispute Cases</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {totalCases > 0 ? `${totalCases} case${totalCases !== 1 ? "s" : ""} total` : "Manage and resolve disputes"}
            </p>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
          <div className="flex flex-1 flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative flex-1 min-w-48 max-w-xs">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={16} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search customer, supplier, rental..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition text-sm bg-white"
              />
            </div>

            {/* Type filter */}
            <FilterSelect
              label="Type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: "", label: "All Types" },
                { value: "DELIVERY", label: "Delivery" },
                { value: "DAMAGE", label: "Damage" },
              ]}
            />

            {/* Status filter */}
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "", label: "All Status" },
                { value: "OPEN", label: "Open" },
                { value: "PROCESSING", label: "Processing" },
                { value: "WAITING_EVIDENCE", label: "Waiting Evidence" },
                { value: "RESOLVED", label: "Resolved" },
                { value: "REJECTED", label: "Rejected" },
              ]}
            />

            {/* Severity filter */}
            <FilterSelect
              label="Severity"
              value={severityFilter}
              onChange={setSeverityFilter}
              options={[
                { value: "", label: "All Severity" },
                { value: "LOW", label: "Low" },
                { value: "MEDIUM", label: "Medium" },
                { value: "HIGH", label: "High" },
              ]}
            />

            {/* Reported By filter */}
            <FilterSelect
              label="Reported By"
              value={reportedByFilter}
              onChange={setReportedByFilter}
              options={[
                { value: "", label: "All Sources" },
                { value: "CUSTOMER", label: "Customer" },
                { value: "STAFF", label: "Staff" },
              ]}
            />

            {/* Clear filters */}
            {(search || statusFilter || typeFilter || severityFilter || reportedByFilter) && (
              <button
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setTypeFilter("");
                  setSeverityFilter("");
                  setReportedByFilter("");
                }}
                className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-5 py-3 text-left font-semibold text-slate-700 whitespace-nowrap">Case</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700 whitespace-nowrap">Type</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700 whitespace-nowrap">Status</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700 whitespace-nowrap">Severity</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700 whitespace-nowrap">Customer</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700 whitespace-nowrap">Supplier</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700 whitespace-nowrap">Reported</th>
                  <th className="px-5 py-3 text-left font-semibold text-slate-700 whitespace-nowrap">Assigned</th>
                  <th className="px-5 py-3 text-center font-semibold text-slate-700 whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {casesLoading ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={9} className="px-5 py-4">
                        <div className="h-4 bg-slate-100 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : cases.length > 0 ? (
                  cases.map((c) => (
                    <tr
                      key={c._id}
                      className="hover:bg-slate-50 transition"
                    >
                      {/* Case ID + desc */}
                      <td className="px-5 py-3 max-w-40">
                        <p className="font-medium text-slate-900 text-xs truncate">#{c._id?.slice(-8).toUpperCase() ?? c._id}</p>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-0.5">{c.description || "—"}</p>
                      </td>

                      {/* Type */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge value={c.caseType} map={CASE_TYPE_COLORS} />
                        {c.reportContext && (
                          <p className="text-[10px] text-slate-400 mt-0.5">{c.reportContext}</p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Badge value={c.status} map={STATUS_COLORS} />
                      </td>

                      {/* Severity */}
                      <td className="px-5 py-3 whitespace-nowrap">
                        {c.severity ? (
                          <Badge value={c.severity} map={SEVERITY_COLORS} />
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>

                      {/* Customer */}
                      <td className="px-5 py-3">
                        <p className="text-slate-900 font-medium text-xs">{c.customerName || "—"}</p>
                      </td>

                      {/* Supplier */}
                      <td className="px-5 py-3">
                        <p className="text-slate-900 font-medium text-xs">{c.supplierName || "—"}</p>
                      </td>

                      {/* Reported */}
                      <td className="px-5 py-3">
                        <p className="text-slate-600 text-xs">{formatDate(c.createdAt)}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">{c.reportedBy || "—"}</p>
                      </td>

                      {/* Assigned */}
                      <td className="px-5 py-3">
                        {c.assignedAdmin ? (
                          <div className="flex items-center gap-1.5">
                            <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                              <FiUser size={11} />
                            </div>
                            <span className="text-xs text-slate-700 truncate max-w-20">{c.assignedAdmin.fullName}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">Unassigned</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-5 py-3 text-center">
                        <button
                          onClick={() => handleOpenCase(c)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-primary hover:text-primary transition"
                        >
                          <FiEye size={13} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9}>
                      <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-slate-100 mb-3">
                          <FiAlertTriangle size={24} className="text-slate-400" />
                        </div>
                        <p className="font-medium text-slate-700">No disputes found</p>
                        <p className="text-sm text-slate-500 mt-1">
                          {casesError || "Try adjusting your filters or search query"}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Error state above table */}
          {casesError && cases.length === 0 && !casesLoading && (
            <div className="px-5 py-3 border-t border-slate-200">
              <p className="text-sm text-red-500">{casesError}</p>
            </div>
          )}

          {/* Pagination */}
          <Pagination page={page} totalPages={totalPages} onChange={(p) => fetchCases(p)} />
        </div>
      </section>

      {/* ── Case Detail Drawer ── */}
      <CaseDetailDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        disputeCase={selectedCase}
        onUpdate={handleAfterUpdate}
      />
    </div>
  );
}
