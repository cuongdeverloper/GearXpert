import { useLocation } from "react-router-dom";
import { useMemo } from "react";

const menu = [
  { to: "/supplier/dashboard", label: "Dashboard", desc: "Overview & quick actions" },
  { to: "/supplier/devices", label: "Devices", desc: "Manage listings & inventory" },
  { to: "/supplier/rental-requests", label: "Rental Requests", desc: "Approve / reject bookings" },
  { to: "/supplier/maintenance", label: "Maintenance", desc: "Handle maintenance workflow" },
  { to: "/supplier/revenue", label: "Revenue", desc: "Track earnings & payouts" },
];

export default function SupplierPageHeader() {
  const location = useLocation();

  const current = useMemo(() => {
    return menu.find((m) => location.pathname.startsWith(m.to));
  }, [location.pathname]);

  return (
    <div className="mb-8">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
        Supplier Dashboard
      </div>
      <h1 className="text-3xl font-bold text-slate-900 font-display tracking-tight mb-2">
        {current?.label || "Dashboard"}
      </h1>
      <p className="text-sm text-slate-600">
        {current?.desc || "Manage your supply operations on GearXpert."}
      </p>
    </div>
  );
}
