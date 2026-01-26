import { NavLink } from "react-router-dom";
import {
  FiChevronLeft,
  FiChevronRight,
  FiUser,
  FiHome,
  FiBox,
  FiClipboard,
  FiTool,
  FiDollarSign,
} from "react-icons/fi";

const menu = [
  { to: "/supplier/dashboard", label: "Dashboard", icon: FiHome, desc: "Overview & quick actions" },
  { to: "/supplier/devices", label: "Devices", icon: FiBox, desc: "Manage listings & inventory" },
  { to: "/supplier/rental-requests", label: "Rental Requests", icon: FiClipboard, desc: "Approve / reject bookings" },
  { to: "/supplier/maintenance", label: "Maintenance", icon: FiTool, desc: "Handle maintenance workflow" },
  { to: "/supplier/revenue", label: "Revenue", icon: FiDollarSign, desc: "Track earnings & payouts" },
];

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function SupplierSidebar({ collapsed, onCollapse, me }) {
  return (
    <aside className={classNames(
      "hidden lg:flex flex-col border-r border-slate-200 bg-white transition-all duration-500",
      collapsed ? "w-[100px]" : "w-[320px]"
    )}>
      <div className="flex-1 flex flex-col p-6 overflow-y-auto">
        {/* User Card */}
        {!collapsed && (
          <div className="mb-8">
            <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-800 p-5 shadow-xl shadow-slate-900/10 border border-slate-700 relative overflow-hidden group">
              {/* Background effect */}
              <div className="absolute -right-4 -top-4 w-20 h-20 bg-primary/20 rounded-full blur-2xl group-hover:bg-primary/30 transition-all duration-700"></div>

              <div className="flex items-center gap-3 mb-4 relative z-10">
                <div className="w-12 h-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-inner">
                  <FiUser size={24} />
                </div>
                <div className="overflow-hidden min-w-0">
                  <p className="font-bold text-white truncate text-sm">{me?.name || "Supplier"}</p>
                  <p className="text-xs text-slate-300/70 truncate uppercase font-medium tracking-widest">Supplier</p>
                </div>
              </div>

              <div className="space-y-2 relative z-10">
                <div className="flex gap-2">
                  <div className="flex-1 bg-white/10 backdrop-blur-sm p-2.5 rounded-xl border border-white/10 text-center">
                    <div className="text-xs font-bold text-white">{me?.activeListings || 24}</div>
                    <div className="text-[10px] text-slate-300/70 uppercase tracking-tighter">Active</div>
                  </div>
                  <div className="flex-1 bg-white/10 backdrop-blur-sm p-2.5 rounded-xl border border-white/10 text-center">
                    <div className="text-xs font-bold text-yellow-400">★ {me?.rating || 4.8}</div>
                    <div className="text-[10px] text-slate-300/70 uppercase tracking-tighter">Rating</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Menu */}
        <nav className="space-y-1">
          <div className={classNames(
            "px-3 pb-3 text-xs font-bold uppercase tracking-wide text-slate-400 transition-all",
            collapsed && "hidden"
          )}>
            Navigation
          </div>

          {menu.map((m) => (
            <NavLink
              key={m.to}
              to={m.to}
              className={({ isActive }) =>
                classNames(
                  "flex items-start gap-3 rounded-2xl px-3 py-3 transition-all group",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm shadow-primary/10 border border-primary/20"
                    : "text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200"
                )
              }
            >
              {({ isActive }) => {
                const Icon = m.icon;
                return (
                  <>
                    <span
                      className={classNames(
                        "mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl transition-all flex-shrink-0",
                        isActive
                          ? "bg-primary/20 text-primary shadow-sm shadow-primary/20"
                          : "bg-slate-100 text-slate-600 group-hover:bg-slate-200"
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    {!collapsed && (
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-sm">{m.label}</span>
                        <span
                          className={classNames(
                            "block truncate text-xs",
                            isActive ? "text-primary/70" : "text-slate-500"
                          )}
                        >
                          {m.desc}
                        </span>
                      </span>
                    )}
                  </>
                );
              }}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Collapse button */}
      <div className="border-t border-slate-200 p-4 flex justify-end">
        <button
          onClick={onCollapse}
          className="p-2.5 rounded-xl bg-slate-100 text-slate-600 hover:text-primary hover:bg-slate-200 transition-all"
        >
          {collapsed ? <FiChevronRight size={18} /> : <FiChevronLeft size={18} />}
        </button>
      </div>
    </aside>
  );
}
