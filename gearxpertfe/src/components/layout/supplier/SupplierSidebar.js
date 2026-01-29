import { NavLink } from "react-router-dom";
import { useMemo, useState } from "react";
import {
  FiChevronLeft,
  FiChevronRight,
  FiHome,
  FiBox,
  FiCalendar,
  FiClipboard,
  FiDollarSign,
  FiTruck,
  FiShield,
  FiChevronDown,
} from "react-icons/fi";

const sections = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: FiHome,
    items: [
      { to: "/supplier/dashboard", label: "Dashboard" },
      { label: "Monthly Revenue", muted: true },
      { label: "Rental Volume", muted: true },
      { label: "Active Listings", muted: true },
      { label: "New Rental Requests", muted: true },
    ],
  },
  {
    id: "products",
    title: "Rental Products",
    icon: FiBox,
    items: [
      { to: "/supplier/devices", label: "Product List" },
      { to: "/supplier/devices/new", label: "Add New Product" },
      { to: "/supplier/inventory", label: "Inventory Management" },
      { label: "Status: Draft / Pending / Live / Hidden", muted: true },
    ],
  },
  {
    id: "calendar",
    title: "Availability Calendar",
    icon: FiCalendar,
    items: [
      { label: "Day / Week / Month View", muted: true },
      { label: "Block Busy Dates", muted: true },
      { label: "See Booked Devices", muted: true },
    ],
  },
  {
    id: "bookings",
    title: "Bookings",
    icon: FiClipboard,
    items: [
      { to: "/supplier/rental-requests", label: "Booking Requests" },
      { label: "Pending Confirmation", muted: true },
      { label: "Confirmed", muted: true },
      { label: "Renting", muted: true },
      { label: "Returned", muted: true },
      { label: "Canceled / Disputes", muted: true },
    ],
  },
  {
    id: "delivery",
    title: "Delivery",
    icon: FiTruck,
    items: [
      { label: "Pickup & Delivery Schedule", muted: true },
      { label: "Handover Checklist", muted: true },
      { label: "Condition Photos (Before / After)", muted: true },
    ],
  },
  {
    id: "finance",
    title: "Finance",
    icon: FiDollarSign,
    items: [
      { to: "/supplier/revenue", label: "Revenue" },
      { label: "Deposits Held", muted: true },
      { label: "Platform Fees", muted: true },
      { label: "Withdrawals", muted: true },
    ],
  },
  {
    id: "verification",
    title: "Profile & Verification",
    icon: FiShield,
    items: [
      { label: "KYC Verification", muted: true },
      { label: "Address", muted: true },
      { label: "Bank Account", muted: true },
    ],
  },
];

function classNames(...xs) {
  return xs.filter(Boolean).join(" ");
}

export default function SupplierSidebar({ collapsed, onCollapse, me }) {
  const [openSections, setOpenSections] = useState({
    dashboard: true,
    products: true,
    calendar: false,
    bookings: true,
    delivery: false,
    finance: true,
    verification: true,
  });

  const flatLinks = useMemo(() => {
    return sections.flatMap((section) =>
      section.items.filter((item) => item.to).map((item) => ({
        ...item,
        icon: section.icon,
      }))
    );
  }, []);

  return (
    <aside className={classNames(
      "hidden lg:flex flex-col border-r border-slate-200 bg-white transition-all duration-500",
      collapsed ? "w-[88px]" : "w-[280px]"
    )}>
      <div className="flex-1 flex flex-col p-4 overflow-y-auto">
        {/* Menu */}
        <nav className="space-y-2">
          {collapsed ? (
            flatLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    classNames(
                      "flex items-center justify-center rounded-xl px-2 py-2.5 transition-all group",
                      isActive
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200"
                    )
                  }
                  title={item.label}
                >
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-slate-200">
                    <Icon size={16} />
                  </span>
                </NavLink>
              );
            })
          ) : (
            sections.map((section) => {
              const Icon = section.icon;
              const isOpen = openSections[section.id];
              return (
                <div key={section.id} className="space-y-1">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenSections((prev) => ({
                        ...prev,
                        [section.id]: !prev[section.id],
                      }))
                    }
                    className="w-full flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all"
                  >
                    <span className="flex items-center gap-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                        <Icon size={15} />
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {section.title}
                      </span>
                    </span>
                    <FiChevronDown
                      size={14}
                      className={classNames(
                        "text-slate-400 transition-transform",
                        isOpen && "rotate-180"
                      )}
                    />
                  </button>

                  {isOpen && (
                    <div className="space-y-1 pl-8">
                      {section.items.map((item) => {
                        if (item.to) {
                          return (
                            <NavLink
                              key={item.to}
                              to={item.to}
                              className={({ isActive }) =>
                                classNames(
                                  "block rounded-lg px-3 py-1.5 text-[13px] font-medium transition-all",
                                  isActive
                                    ? "bg-primary/10 text-primary"
                                    : "text-slate-600 hover:bg-slate-100"
                                )
                              }
                            >
                              {item.label}
                            </NavLink>
                          );
                        }

                        return (
                          <div
                            key={`${section.id}-${item.label}`}
                            className={classNames(
                              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-[13px]",
                              item.muted ? "text-slate-400" : "text-slate-600"
                            )}
                          >
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span className="truncate">{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </nav>
      </div>

      {/* Collapse button */}
      <div className="border-t border-slate-200 p-3 flex justify-end">
        <button
          onClick={onCollapse}
          className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-primary hover:bg-slate-200 transition-all"
        >
          {collapsed ? <FiChevronRight size={16} /> : <FiChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
