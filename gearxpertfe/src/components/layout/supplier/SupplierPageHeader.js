import { useLocation } from "react-router-dom";
import { useMemo } from "react";

const menu = [
  {
    to: "/supplier/dashboard",
    label: "Overview",
    desc: "Monthly revenue, rentals, listings, and new requests.",
  },
  {
    to: "/supplier/devices",
    label: "Products",
    desc: "Manage your rental products, inventory, and status.",
  },
  {
    to: "/supplier/inventory",
    label: "Inventory",
    desc: "Track stock levels, rentals, and availability.",
  },
  {
    to: "/supplier/rental-requests",
    label: "Bookings",
    desc: "Review, approve, and track booking requests.",
  },
  {
    to: "/supplier/maintenance",
    label: "Maintenance",
    desc: "Handle maintenance and availability workflow.",
  },
  {
    to: "/supplier/revenue",
    label: "Finance",
    desc: "Revenue, deposits held, fees, and withdrawals.",
  },
];

export default function SupplierPageHeader() {
  const location = useLocation();

  const current = useMemo(() => {
    return menu.find((m) => location.pathname.startsWith(m.to));
  }, [location.pathname]);

  return (
    <div className="mb-8">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
        Supplier Center
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
