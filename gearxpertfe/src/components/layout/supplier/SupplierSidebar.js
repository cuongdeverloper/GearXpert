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
  FiAlertTriangle,
} from "react-icons/fi";

const sections = [
  {
    id: "dashboard",
    title: "Bảng điều khiển",
    icon: FiHome,
    items: [
      { to: "/supplier/dashboard", label: "Tổng quan" },
    ],
  },
  {
    id: "products",
    title: "Sản phẩm cho thuê",
    icon: FiBox,
    items: [
      { to: "/supplier/devices", label: "Danh sách thiết bị" },
      { to: "/supplier/devices/new", label: "Thêm thiết bị mới" },
      { to: "/supplier/inventory", label: "Quản lý kho" },
      { to: "/supplier/vouchers", label: "Mã giảm giá" },
      { to: "/supplier/ai-pricing", label: "Chiến lược giá AI" },
    ],
  },
  {
    id: "calendar",
    title: "Lịch sẵn dụng",
    icon: FiCalendar,
    items: [
      { to: "/supplier/calendar", label: "Lịch thuê" },
    ],
  },
  {
    id: "bookings",
    title: "Đơn đặt hàng",
    icon: FiClipboard,
    items: [
      { to: "/supplier/rental-requests", label: "Yêu cầu đặt thuê" },
    ],
  },
  {
    id: "issues",
    title: "Báo cáo sự cố",
    icon: FiAlertTriangle,
    items: [
      { to: "/supplier/issues", label: "Tất cả sự cố" },
    ],
  },
  {
    id: "delivery",
    title: "Giao hàng",
    icon: FiTruck,
    items: [],
  },
  {
    id: "finance",
    title: "Tài chính",
    icon: FiDollarSign,
    items: [
      { to: "/supplier/revenue", label: "Doanh thu" },
    ],
  },
  {
    id: "verification",
    title: "Hồ sơ & Xác minh",
    icon: FiShield,
    items: [
      { to: "/supplier/profile/edit", label: "Hồ sơ cửa hàng" },
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
    issues: true,
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
                  end
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
                              end
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
