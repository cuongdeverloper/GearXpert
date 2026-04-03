import { useEffect, useMemo, useState, useCallback } from "react";
import { useSelector } from "react-redux";
import { getSupplierRentalRequests } from "../../service/ApiService/RentalApi";
import {
  FiChevronLeft,
  FiChevronRight,
  FiCalendar,
  FiMapPin,
  FiPhone,
  FiAlertTriangle,
  FiClock,
  FiPackage,
  FiUser,
  FiX,
} from "react-icons/fi";

/* ─── constants ─── */
const ACTIVE_STATUSES = "DELIVERING,RENTING,RETURNING,INSPECTING,PENDING_RESOLUTION";

const STATUS_CFG = {
  DELIVERING:         { label: "Đang giao",           color: "bg-blue-500",   text: "text-blue-700",   bg: "bg-blue-50",   border: "border-blue-200",   dot: "bg-blue-400" },
  RENTING:            { label: "Đang thuê",           color: "bg-emerald-500",text: "text-emerald-700",bg: "bg-emerald-50",border: "border-emerald-200",dot: "bg-emerald-400" },
  RETURNING:          { label: "Đang hoàn trả",       color: "bg-amber-500",  text: "text-amber-700",  bg: "bg-amber-50",  border: "border-amber-200",  dot: "bg-amber-400" },
  INSPECTING:         { label: "Đang kiểm tra",       color: "bg-purple-500", text: "text-purple-700", bg: "bg-purple-50", border: "border-purple-200", dot: "bg-purple-400" },
  PENDING_RESOLUTION: { label: "Chờ xử lý",           color: "bg-red-500",    text: "text-red-700",    bg: "bg-red-50",    border: "border-red-200",    dot: "bg-red-400" },
  PENDING:            { label: "Chờ xác nhận",        color: "bg-slate-400",  text: "text-slate-600",  bg: "bg-slate-50",  border: "border-slate-200",  dot: "bg-slate-400" },
};

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

/* ─── date helpers ─── */
const isSameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const toDateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("vi-VN", { day: "2-digit", month: "short", year: "numeric" });

const fmtVND = (v) => (v || 0).toLocaleString("vi-VN") + "₫";

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const startDayOffset = (year, month) => {
  const d = new Date(year, month, 1).getDay(); // 0=Sun
  return d === 0 ? 6 : d - 1; // shift so Mon=0
};

/* ─── build event list from rental data ─── */
function buildEvents(rentals) {
  const events = [];
  for (const rental of rentals) {
    const items = rental.rentalItems || [];
    for (const item of items) {
      const device = item.deviceId;
      if (!device) continue;
      const start = new Date(item.rentalStartDate || rental.rentalStartDate);
      const end = new Date(item.rentalEndDate || rental.rentalEndDate);
      const hasIssue =
        rental.status === "PENDING_RESOLUTION" ||
        item.status === "DAMAGED" ||
        item.status === "DELIVERY_ISSUE";

      events.push({
        id: `${rental._id}-${item._id}`,
        rentalId: rental._id,
        deviceName: device.name,
        deviceImage: device.images?.[0],
        category: device.category,
        customer: rental.customerId?.fullName || "Khách hàng",
        customerEmail: rental.customerId?.email,
        phone: rental.phoneNumber,
        address: rental.deliveryAddress?.fullAddress,
        status: rental.status,
        itemStatus: item.status,
        start,
        end,
        totalDays: item.totalDays,
        amount: rental.totalAmount,
        hasIssue,
        quantity: item.quantity || 1,
      });
    }
  }
  return events;
}

/* ─── group events by date key ─── */
function indexByDate(events) {
  const map = {};
  for (const ev of events) {
    const cur = new Date(ev.start);
    const endDay = new Date(ev.end);
    endDay.setHours(23, 59, 59);
    while (cur <= endDay) {
      const key = toDateKey(cur);
      if (!map[key]) map[key] = [];
      map[key].push(ev);
      cur.setDate(cur.getDate() + 1);
    }
  }
  return map;
}

/* ═══════════════════════════════════════════ */
/*                  COMPONENT                  */
/* ═══════════════════════════════════════════ */
export default function SupplierCalendarPage() {
  const userId = useSelector((s) => s.user?.account?.id);

  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);

  // calendar state
  const today = useMemo(() => new Date(), []);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [filterStatus, setFilterStatus] = useState("ALL");

  /* ─── fetch ─── */
  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await getSupplierRentalRequests(userId, { status: ACTIVE_STATUSES });
      setRentals(res?.data?.rentals || res?.rentals || []);
    } catch (err) {
      console.error("Calendar fetch:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ─── derived data ─── */
  const allEvents = useMemo(() => buildEvents(rentals), [rentals]);

  const filteredEvents = useMemo(
    () => filterStatus === "ALL" ? allEvents : allEvents.filter((e) => e.status === filterStatus),
    [allEvents, filterStatus]
  );

  const dateIndex = useMemo(() => indexByDate(filteredEvents), [filteredEvents]);

  const selectedEvents = useMemo(() => {
    if (!selectedDate) return [];
    return dateIndex[toDateKey(selectedDate)] || [];
  }, [selectedDate, dateIndex]);

  /* ─── stats ─── */
  const stats = useMemo(() => {
    const s = { total: allEvents.length, issues: 0, returningToday: 0 };
    const todayKey = toDateKey(today);
    for (const ev of allEvents) {
      if (ev.hasIssue) s.issues++;
      if (toDateKey(ev.end) === todayKey) s.returningToday++;
    }
    return s;
  }, [allEvents, today]);

  /* ─── calendar grid ─── */
  const offset = startDayOffset(viewYear, viewMonth);
  const totalDays = daysInMonth(viewYear, viewMonth);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };
  const goToday = () => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedDate(today); };

  const monthLabel = new Date(viewYear, viewMonth).toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

  /* ═══════════ RENDER ═══════════ */
  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-[1400px] mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FiCalendar className="text-primary" /> Lịch thuê
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Theo dõi đơn thuê đang chạy, ngày trả và sự cố
          </p>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Đơn đang thuê" value={stats.total} icon={FiPackage} color="primary" />
        <StatCard label="Trả hàng hôm nay" value={stats.returningToday} icon={FiClock} color="amber" />
        <StatCard label="Có sự cố" value={stats.issues} icon={FiAlertTriangle} color="red" />
      </div>

      {/* ── Status filter chips ── */}
      <div className="flex flex-wrap gap-2">
        <FilterChip active={filterStatus === "ALL"} onClick={() => setFilterStatus("ALL")} label="Tất cả" />
        {Object.entries(STATUS_CFG).filter(([k]) => k !== "PENDING").map(([key, cfg]) => (
          <FilterChip
            key={key}
            active={filterStatus === key}
            onClick={() => setFilterStatus(key)}
            label={cfg.label}
            dotColor={cfg.dot}
          />
        ))}
      </div>

      {/* ── Main area: Calendar + Side panel ── */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Calendar */}
        <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Month nav */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"><FiChevronLeft size={18} /></button>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-slate-900">{monthLabel}</h2>
              <button onClick={goToday} className="text-xs font-semibold text-primary hover:underline">Hôm nay</button>
            </div>
            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"><FiChevronRight size={18} /></button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">Đang tải…</div>
          ) : (
            <div className="p-3">
              {/* Weekday header */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="text-center text-[11px] font-semibold text-slate-400 uppercase py-1">{d}</div>
                ))}
              </div>

              {/* Day cells */}
              <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl overflow-hidden">
                {Array.from({ length: offset }).map((_, i) => (
                  <div key={`empty-${i}`} className="bg-white min-h-[80px]" />
                ))}
                {Array.from({ length: totalDays }).map((_, i) => {
                  const day = i + 1;
                  const date = new Date(viewYear, viewMonth, day);
                  const key = toDateKey(date);
                  const dayEvents = dateIndex[key] || [];
                  const isToday = isSameDay(date, today);
                  const isSelected = selectedDate && isSameDay(date, selectedDate);
                  const hasIssue = dayEvents.some((e) => e.hasIssue);
                  const hasReturn = dayEvents.some((e) => isSameDay(new Date(e.end), date));

                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(date)}
                      className={`bg-white min-h-[80px] p-1.5 text-left transition-all hover:bg-slate-50 relative group
                        ${isSelected ? "ring-2 ring-primary ring-inset bg-primary/5" : ""}
                      `}
                    >
                      <span className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full
                        ${isToday ? "bg-primary text-white" : "text-slate-700"}
                      `}>
                        {day}
                      </span>

                      {/* Event dots */}
                      {dayEvents.length > 0 && (
                        <div className="mt-0.5 space-y-0.5">
                          {dayEvents.slice(0, 3).map((ev) => {
                            const cfg = STATUS_CFG[ev.status] || STATUS_CFG.PENDING;
                            return (
                              <div key={ev.id} className={`${cfg.color} text-white text-[9px] leading-tight px-1 py-0.5 rounded truncate`}>
                                {ev.deviceName}
                              </div>
                            );
                          })}
                          {dayEvents.length > 3 && (
                            <div className="text-[9px] text-slate-400 px-1">+{dayEvents.length - 3} khác</div>
                          )}
                        </div>
                      )}

                      {/* Indicators */}
                      <div className="absolute top-1 right-1 flex gap-0.5">
                        {hasIssue && <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" title="Có sự cố" />}
                        {hasReturn && <span className="w-2 h-2 rounded-full bg-amber-400" title="Đến hạn trả" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="px-5 py-3 border-t border-slate-100 flex flex-wrap gap-3">
            {Object.entries(STATUS_CFG).filter(([k]) => k !== "PENDING").map(([key, cfg]) => (
              <div key={key} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <span className={`w-2.5 h-2.5 rounded-sm ${cfg.color}`} />
                {cfg.label}
              </div>
            ))}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-red-400" /> Sự cố
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Đến hạn trả
            </div>
          </div>
        </div>

        {/* ── Side panel ── */}
        <div className="lg:w-[360px] shrink-0">
          {selectedDate ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h3 className="font-bold text-slate-900 text-sm">
                  {selectedDate.toLocaleDateString("vi-VN", { weekday: "short", month: "short", day: "numeric" })}
                </h3>
                <button onClick={() => setSelectedDate(null)} className="p-1 rounded hover:bg-slate-100 text-slate-400">
                  <FiX size={16} />
                </button>
              </div>

              {selectedEvents.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  <FiCalendar className="mx-auto mb-2 text-slate-300" size={28} />
                  Không có đơn thuê trong ngày này
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[calc(100vh-340px)] overflow-y-auto">
                  {selectedEvents.map((ev) => (
                    <EventCard key={ev.id} event={ev} selectedDate={selectedDate} />
                  ))}
                </div>
              )}

              {selectedEvents.length > 0 && (
                <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 text-center">
                  {selectedEvents.length} đơn trong ngày này
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 text-center">
              <FiCalendar className="mx-auto mb-3 text-slate-300" size={32} />
              <p className="text-sm text-slate-500 font-medium">Chọn một ngày</p>
              <p className="text-xs text-slate-400 mt-1">Nhấn vào ngày trên lịch để xem chi tiết đơn thuê</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════ Sub-components ═══════════ */

function StatCard({ label, value, icon: Icon, color }) {
  const colors = {
    primary: "bg-indigo-50 text-indigo-600 border-indigo-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    red: "bg-red-50 text-red-600 border-red-100",
  };
  return (
    <div className={`rounded-xl border p-3 ${colors[color] || colors.primary}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon size={14} />
        <span className="text-[11px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
      </div>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  );
}

function FilterChip({ active, onClick, label, dotColor }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border
        ${active ? "bg-primary text-white border-primary" : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"}
      `}
    >
      {dotColor && !active && <span className={`w-2 h-2 rounded-full ${dotColor}`} />}
      {label}
    </button>
  );
}

function EventCard({ event: ev, selectedDate }) {
  const cfg = STATUS_CFG[ev.status] || STATUS_CFG.PENDING;
  const isReturnDay = isSameDay(new Date(ev.end), selectedDate);
  const isStartDay = isSameDay(new Date(ev.start), selectedDate);

  return (
    <div className={`p-3 hover:bg-slate-50 transition-colors ${ev.hasIssue ? "border-l-2 border-l-red-400" : ""}`}>
      {/* Device row */}
      <div className="flex items-start gap-2.5">
        {ev.deviceImage ? (
          <img
            src={ev.deviceImage}
            alt={ev.deviceName}
            className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            <FiPackage size={16} className="text-slate-400" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-900 truncate">{ev.deviceName}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${cfg.bg} ${cfg.text} ${cfg.border} border`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </span>
            {ev.quantity > 1 && (
              <span className="text-[10px] text-slate-400">×{ev.quantity}</span>
            )}
          </div>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mt-2">
        {isStartDay && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-semibold border border-blue-100">
            <FiPackage size={10} /> Lấy hàng
          </span>
        )}
        {isReturnDay && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 text-[10px] font-semibold border border-amber-100">
            <FiClock size={10} /> Đến hạn trả
          </span>
        )}
        {ev.hasIssue && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[10px] font-semibold border border-red-100">
            <FiAlertTriangle size={10} /> Sự cố
          </span>
        )}
      </div>

      {/* Details */}
      <div className="mt-2 space-y-1 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <FiUser size={11} /> <span className="truncate">{ev.customer}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FiClock size={11} /> {fmtDate(ev.start)} → {fmtDate(ev.end)} ({ev.totalDays} ngày)
        </div>
        {ev.address && (
          <div className="flex items-start gap-1.5">
            <FiMapPin size={11} className="mt-0.5 shrink-0" /> <span className="truncate">{ev.address}</span>
          </div>
        )}
        {ev.phone && (
          <div className="flex items-center gap-1.5">
            <FiPhone size={11} /> {ev.phone}
          </div>
        )}
        <div className="text-xs font-bold text-primary mt-1">{fmtVND(ev.amount)}</div>
      </div>
    </div>
  );
}
