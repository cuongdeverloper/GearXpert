import { useMemo } from "react";
import { useLocation } from "react-router-dom";

const navGroups = [
  {
    title: "MENU",
    items: [
      { to: "/admin", label: "Dashboards", description: "Monitor system metrics and KPIs" },
      { to: "/admin/users", label: "Users", description: "Manage user accounts and permissions" },
      { to: "/admin/suppliers", label: "Suppliers", description: "Manage supplier accounts" },
      { to: "/admin/devices", label: "Devices", description: "Moderate device listings" },
      { to: "/admin/rentals", label: "Rentals", description: "Monitor rental transactions" },
      { to: "/admin/reports", label: "Reports", description: "View system reports" },
    ],
  },
  {
    title: "SETTINGS",
    items: [{ to: "/admin/settings", label: "System Settings", description: "Configure system settings" }],
  },
];

function isActivePath(pathname, to) {
  if (to === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname.startsWith(to);
}

export default function AdminPageHeader() {
  const location = useLocation();

  const currentPage = useMemo(() => {
    for (const g of navGroups) {
      const hit = g.items.find((it) => isActivePath(location.pathname, it.to));
      if (hit) return hit;
    }
    return { label: "Dashboard", description: "Monitor system operations" };
  }, [location.pathname]);

  return (
    <div className="mb-8">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Admin Portal
      </div>
      <h1 className="mt-2 text-3xl font-bold text-slate-900">{currentPage.label}</h1>
      <p className="mt-1 text-sm text-slate-600">{currentPage.description}</p>
    </div>
  );
}
