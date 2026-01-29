import { FiX, FiHome, FiBox, FiClipboard, FiTool, FiDollarSign } from "react-icons/fi";
import { NavLink } from "react-router-dom";

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

export default function SupplierMobileDrawer({ open, onClose }) {
  return open ? (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="absolute left-0 top-0 h-full w-72 bg-white shadow-2xl animate-in slide-in-from-left">
        <div className="flex items-center justify-between border-b border-slate-200 p-6">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-primary to-primary-dark p-2 rounded-xl">
              <span className="text-white font-bold">GX</span>
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900">Portal</div>
              <div className="text-xs text-slate-500">GearXpert</div>
            </div>
          </div>
          <button
            className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6">
          <nav className="space-y-1">
            {menu.map((m) => (
              <NavLink
                key={m.to}
                to={m.to}
                onClick={onClose}
                className={({ isActive }) =>
                  classNames(
                    "flex items-start gap-3 rounded-xl px-3 py-3 transition-all",
                    isActive
                      ? "bg-primary/10 text-primary border border-primary/20"
                      : "text-slate-700 hover:bg-slate-100"
                  )
                }
              >
                {({ isActive }) => {
                  const Icon = m.icon;
                  return (
                    <>
                      <span
                        className={classNames(
                          "mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl flex-shrink-0",
                          isActive ? "bg-primary/20 text-primary" : "bg-slate-100 text-slate-600"
                        )}
                      >
                        <Icon size={18} />
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold text-sm">{m.label}</span>
                        <span className={classNames(
                          "block truncate text-xs",
                          isActive ? "text-primary/70" : "text-slate-500"
                        )}>
                          {m.desc}
                        </span>
                      </span>
                    </>
                  );
                }}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>
    </div>
  ) : null;
}
