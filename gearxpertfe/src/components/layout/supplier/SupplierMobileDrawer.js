import { useState } from "react";
import {
  FiX,
  FiHome,
  FiBox,
  FiCalendar,
  FiClipboard,
  FiDollarSign,
  FiTruck,
  FiShield,
  FiChevronDown,
} from "react-icons/fi";
import { NavLink } from "react-router-dom";
import logo from "../../../assets/logoGearXpert.png";

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
      { to: "/supplier/vouchers", label: "Vouchers" },
      { to: "/supplier/ai-pricing", label: "Chiến lược giá AI" },
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

export default function SupplierMobileDrawer({ open, onClose }) {
  const [openSections, setOpenSections] = useState({
    dashboard: true,
    products: true,
    calendar: false,
    bookings: true,
    delivery: false,
    finance: true,
    verification: true,
  });

  return open ? (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="absolute left-0 top-0 h-full w-64 bg-white shadow-2xl animate-in slide-in-from-left">
        <div className="flex items-center justify-between border-b border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="GearXpert Logo" className="h-8 w-auto object-contain" />
            <div>
              <div className="text-sm font-bold text-slate-900">Portal</div>
              <div className="text-xs text-slate-500">GearXpert</div>
            </div>
          </div>
          <button
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="p-4">
          <nav className="space-y-2">
            {sections.map((section) => {
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
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                              onClick={onClose}
                              className={({ isActive }) =>
                                classNames(
                                  "block rounded-lg px-3 py-1.5 text-sm font-medium transition-all",
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
                              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm",
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
            })}
          </nav>
        </div>
      </div>
    </div>
  ) : null;
}
