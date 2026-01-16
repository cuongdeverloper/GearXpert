import { NavLink, useLocation } from "react-router-dom";
import {
  FiHome,
  FiUsers,
  FiUserCheck,
  FiBox,
  FiFileText,
  FiBarChart2,
  FiSettings,
  FiChevronLeft,
  FiChevronRight,
} from "react-icons/fi";

const navGroups = [
  {
    title: "MENU",
    items: [
      { to: "/admin", label: "Dashboards", icon: FiHome },
      { to: "/admin/users", label: "Users", icon: FiUsers },
      { to: "/admin/suppliers", label: "Suppliers", icon: FiUserCheck },
      { to: "/admin/devices", label: "Devices", icon: FiBox },
      { to: "/admin/rentals", label: "Rentals", icon: FiFileText },
      { to: "/admin/reports", label: "Reports", icon: FiBarChart2 },
    ],
  },
  {
    title: "SETTINGS",
    items: [{ to: "/admin/settings", label: "System Settings", icon: FiSettings }],
  },
];

const cx = (...xs) => xs.filter(Boolean).join(" ");

function isActivePath(pathname, to) {
  if (to === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname.startsWith(to);
}

export default function AdminSidebar({ collapsed, onToggleCollapsed }) {
  const location = useLocation();

  return (
    <aside
      className={cx(
        "hidden lg:flex flex-col border-r border-slate-200 bg-white transition-all duration-500 overflow-hidden",
        collapsed ? "w-24" : "w-[280px]"
      )}
    >
      {/* Sidebar content */}
      <div className="flex-1 px-4 py-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-6">
            <div
              className={cx(
                "px-3 pb-2 text-xs font-semibold tracking-wide text-primary transition-opacity",
                collapsed && "opacity-0"
              )}
            >
              {group.title}
            </div>

            <nav className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(location.pathname, item.to);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={() =>
                      cx(
                        "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-all",
                        isActive
                          ? "bg-primary/10 text-primary shadow-sm shadow-primary/10"
                          : "text-slate-600 hover:bg-slate-100"
                      )
                    }
                    end={item.to === "/admin"}
                  >
                    <span
                      className={cx(
                        "grid h-9 w-9 place-items-center rounded-xl flex-shrink-0",
                        isActive
                          ? "bg-white text-primary shadow-sm shadow-primary/10"
                          : "bg-slate-100 text-slate-600"
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    {!collapsed && (
                      <span className="font-medium whitespace-nowrap">{item.label}</span>
                    )}
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Collapse button */}
      <div className="border-t border-slate-200 px-3 py-3 flex justify-center">
        <button
          onClick={onToggleCollapsed}
          className="flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-primary transition-all"
          title={collapsed ? "Expand" : "Collapse"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <FiChevronRight size={18} />
          ) : (
            <FiChevronLeft size={18} />
          )}
        </button>
      </div>
    </aside>
  );
}
