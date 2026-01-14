import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  FiHome,
  FiUsers,
  FiUserCheck,
  FiBox,
  FiFileText,
  FiBarChart2,
  FiSettings,
  FiSearch,
  FiBell,
  FiMenu,
  FiX,
  FiChevronDown,
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

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const currentLabel = useMemo(() => {
    for (const g of navGroups) {
      const hit = g.items.find((it) => isActivePath(location.pathname, it.to));
      if (hit) return hit.label;
    }
    return "Dashboard";
  }, [location.pathname]);

  // mock user (sau lấy từ auth store)
  const me = { name: "Alina Mcloud", role: "Admin" };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* TOPBAR giống UI mẫu */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4">
          {/* Mobile menu */}
          <button
            className="inline-flex items-center justify-center rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open sidebar"
          >
            <FiMenu size={20} />
          </button>

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="text-xl font-semibold text-slate-900">
              GearXpert
              <span className="ml-2 text-xs font-medium text-slate-500">Admin</span>
            </div>
          </div>

          {/* Search pill */}
          <div className="ml-4 hidden w-full max-w-md items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600 lg:flex">
            <FiSearch className="text-slate-400" />
            <input
              className="w-full bg-transparent outline-none placeholder:text-slate-400"
              placeholder="Search users, suppliers, devices..."
            />
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2">
            <button className="grid h-10 w-10 place-items-center rounded-full hover:bg-slate-100">
              <FiBell className="text-slate-600" />
            </button>

            {/* user chip giống UI mẫu */}
            <button className="flex items-center gap-3 rounded-full px-2 py-1 hover:bg-slate-100">
              <div className="h-9 w-9 overflow-hidden rounded-full bg-slate-200" />
              <div className="hidden text-left sm:block">
                <div className="text-sm font-semibold text-slate-900">{me.name}</div>
                <div className="text-xs text-slate-500">{me.role}</div>
              </div>
              <FiChevronDown className="hidden text-slate-500 sm:block" />
            </button>
          </div>
        </div>
      </header>

      {/* BODY */}
      <div className="mx-auto grid max-w-[1500px] grid-cols-1 lg:grid-cols-[280px_1fr]">
        {/* SIDEBAR Desktop */}
        <aside className="hidden border-r border-slate-200 bg-white lg:block">
          <div className="px-4 py-5">
            {navGroups.map((group) => (
              <div key={group.title} className="mb-6">
                <div className="px-3 pb-2 text-xs font-semibold tracking-wide text-indigo-600">
                  {group.title}
                </div>

                <nav className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.to}
                        to={item.to}
                        className={({ isActive }) =>
                          cx(
                            "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                            isActive
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-slate-700 hover:bg-slate-100"
                          )
                        }
                        end={item.to === "/admin"}
                      >
                        <span
                          className={cx(
                            "grid h-9 w-9 place-items-center rounded-xl",
                            isActivePath(location.pathname, item.to)
                              ? "bg-white text-indigo-700 shadow-sm"
                              : "bg-slate-100 text-slate-700"
                          )}
                        >
                          <Icon />
                        </span>
                        <span className="font-medium">{item.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </aside>

        {/* SIDEBAR Mobile drawer */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="absolute left-0 top-0 h-full w-[280px] bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4">
                <div className="text-base font-semibold text-slate-900">GearXpert Admin</div>
                <button
                  className="grid h-10 w-10 place-items-center rounded-xl hover:bg-slate-100"
                  onClick={() => setOpen(false)}
                  aria-label="Close sidebar"
                >
                  <FiX />
                </button>
              </div>

              <div className="px-4 py-5">
                {navGroups.map((group) => (
                  <div key={group.title} className="mb-6">
                    <div className="px-3 pb-2 text-xs font-semibold tracking-wide text-indigo-600">
                      {group.title}
                    </div>
                    <nav className="space-y-1">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        return (
                          <NavLink
                            key={item.to}
                            to={item.to}
                            onClick={() => setOpen(false)}
                            className={({ isActive }) =>
                              cx(
                                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                                isActive
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "text-slate-700 hover:bg-slate-100"
                              )
                            }
                            end={item.to === "/admin"}
                          >
                            <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100">
                              <Icon />
                            </span>
                            <span className="font-medium">{item.label}</span>
                          </NavLink>
                        );
                      })}
                    </nav>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MAIN CONTENT */}
        <main className="px-4 py-6 lg:px-8">
          {/* Page header giống mẫu */}
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Admin Dashboard
            </div>
            <div className="mt-1 text-2xl font-semibold text-slate-900">{currentLabel}</div>
            <div className="mt-1 text-sm text-slate-500">
              Manage platform operations and monitor system performance.
            </div>
          </div>

          {/* Content container giống card trắng */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
