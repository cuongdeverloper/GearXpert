import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  FiBox,
  FiClipboard,
  FiTool,
  FiDollarSign,
  FiMenu,
  FiX,
  FiLogOut,
  FiBell,
  FiSearch,
} from "react-icons/fi";

const menu = [
  { to: "/supplier/devices", label: "Devices", icon: FiBox, desc: "Manage listings & inventory" },
  { to: "/supplier/rental-requests", label: "Rental Requests", icon: FiClipboard, desc: "Approve / reject bookings" },
  { to: "/supplier/maintenance", label: "Maintenance", icon: FiTool, desc: "Handle maintenance workflow" },
  { to: "/supplier/revenue", label: "Revenue", icon: FiDollarSign, desc: "Track earnings & payouts" },
];

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function SupplierLayout() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const current = useMemo(() => {
    return menu.find((m) => location.pathname.startsWith(m.to));
  }, [location.pathname]);

  // Mock user info (sau này lấy từ auth store)
  const me = { name: "Supplier", email: "supplier@gearxpert.com" };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <header className="sticky top-0 z-30 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4">
          {/* Mobile toggle */}
          <button
            className="inline-flex items-center justify-center rounded-lg border bg-white p-2 text-gray-700 hover:bg-gray-50 lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open sidebar"
          >
            <FiMenu />
          </button>

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white">
              <span className="text-sm font-semibold">GX</span>
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold text-gray-900">GearXpert</div>
              <div className="text-xs text-gray-500">Supplier Portal</div>
            </div>
          </div>

          {/* Search (optional UI) */}
          <div className="ml-auto hidden w-full max-w-md items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm text-gray-600 lg:flex">
            <FiSearch className="text-gray-400" />
            <input
              className="w-full bg-transparent outline-none"
              placeholder="Search devices, rentals..."
            />
          </div>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <button
              className="inline-flex items-center justify-center rounded-lg border bg-white p-2 text-gray-700 hover:bg-gray-50"
              aria-label="Notifications"
              title="Notifications"
            >
              <FiBell />
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              aria-label="Logout"
              title="Logout"
              onClick={() => {
                // TODO: logout logic
                console.log("logout");
              }}
            >
              <FiLogOut />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Layout */}
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-0 lg:grid-cols-[280px_1fr]">
        {/* Desktop sidebar */}
        <aside className="hidden border-r bg-white lg:block">
          <div className="p-4">
            {/* User card */}
            <div className="rounded-2xl border bg-gray-50 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-white border text-gray-900">
                  <span className="text-sm font-semibold">
                    {me.name?.slice(0, 1)?.toUpperCase() || "S"}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gray-900">{me.name}</div>
                  <div className="truncate text-xs text-gray-500">{me.email}</div>
                </div>
              </div>
            </div>

            {/* Menu */}
            <div className="mt-4">
              <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Navigation
              </div>
              <nav className="space-y-1">
                {menu.map((m) => {
                  const Icon = m.icon;
                  return (
                    <NavLink
                      key={m.to}
                      to={m.to}
                      className={({ isActive }) =>
                        classNames(
                          "group flex items-start gap-3 rounded-xl px-3 py-3 text-sm transition",
                          isActive
                            ? "bg-black text-white"
                            : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span
                            className={classNames(
                              "mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg border transition",
                              isActive ? "border-white/20 bg-white/10" : "border-gray-200 bg-white"
                            )}
                          >
                            <Icon className={classNames(isActive ? "text-white" : "text-gray-700")} />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-medium">{m.label}</span>
                            <span
                              className={classNames(
                                "block truncate text-xs",
                                isActive ? "text-white/70" : "text-gray-500"
                              )}
                            >
                              {m.desc}
                            </span>
                          </span>
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>
          </div>
        </aside>

        {/* Mobile sidebar drawer */}
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-[280px] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b p-4">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-black text-white">
                    <span className="text-sm font-semibold">GX</span>
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-semibold text-gray-900">Supplier Portal</div>
                    <div className="text-xs text-gray-500">GearXpert</div>
                  </div>
                </div>
                <button
                  className="inline-flex items-center justify-center rounded-lg border bg-white p-2 text-gray-700 hover:bg-gray-50"
                  onClick={() => setOpen(false)}
                  aria-label="Close sidebar"
                >
                  <FiX />
                </button>
              </div>

              <div className="p-4">
                <nav className="space-y-1">
                  {menu.map((m) => {
                    const Icon = m.icon;
                    return (
                      <NavLink
                        key={m.to}
                        to={m.to}
                        onClick={() => setOpen(false)}
                        className={({ isActive }) =>
                          classNames(
                            "flex items-center gap-3 rounded-xl px-3 py-3 text-sm transition",
                            isActive
                              ? "bg-black text-white"
                              : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                          )
                        }
                      >
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white">
                          <Icon />
                        </span>
                        <span className="font-medium">{m.label}</span>
                      </NavLink>
                    );
                  })}
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="p-4 lg:p-8">
          {/* Page header */}
          <div className="mb-6">
            <div className="text-sm text-gray-500">Supplier</div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {current?.label || "Dashboard"}
            </h1>
            <div className="mt-1 text-sm text-gray-600">
              {current?.desc || "Manage your supply operations on GearXpert."}
            </div>
          </div>

          {/* Outlet */}
          <div className="rounded-2xl border bg-white p-4 lg:p-6 shadow-sm">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
