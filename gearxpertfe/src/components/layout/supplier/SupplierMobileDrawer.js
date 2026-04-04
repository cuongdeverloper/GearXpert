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
  FiAlertTriangle,
} from "react-icons/fi";
import { NavLink } from "react-router-dom";
import logo from "../../../assets/logoGearXpert.png";

const sections = [
  {
    id: "dashboard",
    title: "Bảng điều khiển",
    icon: FiHome,
    items: [
      { to: "/supplier/dashboard", label: "Tổng quan" },
      { label: "Doanh thu theo tháng", muted: true },
      { label: "Số đơn thuê", muted: true },
      { label: "Thiết bị đang cho thuê", muted: true },
      { label: "Yêu cầu thuê mới", muted: true },
    ],
  },
  {
    id: "products",
    title: "Sản phẩm cho thuê",
    icon: FiBox,
    items: [
      { to: "/supplier/devices", label: "Danh sách thiết bị", end: true },
      { to: "/supplier/devices/new", label: "Thêm thiết bị mới" },
      { to: "/supplier/inventory", label: "Quản lý kho" },
      { to: "/supplier/vouchers", label: "Mã giảm giá" },
      { to: "/supplier/ai-pricing", label: "Chiến lược giá AI" },
      { label: "Nháp / Chờ duyệt / Đang bán / Đã ẩn", muted: true },
    ],
  },
  {
    id: "calendar",
    title: "Lịch sẵn có",
    icon: FiCalendar,
    items: [
      { to: "/supplier/calendar", label: "Lịch thuê" },
      { label: "Xem theo ngày / tuần / tháng", muted: true },
      { label: "Chặn ngày bận", muted: true },
      { label: "Thiết bị đã được đặt", muted: true },
    ],
  },
  {
    id: "bookings",
    title: "Đơn đặt hàng",
    icon: FiClipboard,
    items: [
      { to: "/supplier/rental-requests", label: "Yêu cầu đặt thuê" },
      { label: "Chờ xác nhận", muted: true },
      { label: "Đã xác nhận", muted: true },
      { label: "Đang thuê", muted: true },
      { label: "Đã trả", muted: true },
      { label: "Đã hủy / Khiếu nại", muted: true },
    ],
  },
  {
    id: "issues",
    title: "Báo cáo sự cố",
    icon: FiAlertTriangle,
    items: [{ to: "/supplier/issues", label: "Tất cả sự cố" }],
  },
  {
    id: "delivery",
    title: "Giao hàng",
    icon: FiTruck,
    items: [
      { to: "/supplier/issues?tab=DELIVERY", label: "Báo cáo sự cố (giao hàng)" },
      { label: "Lịch lấy hàng & giao hàng", muted: true },
      { label: "Danh sách bàn giao", muted: true },
      { label: "Ảnh hiện trạng (trước / sau)", muted: true },
    ],
  },
  {
    id: "finance",
    title: "Tài chính",
    icon: FiDollarSign,
    items: [
      { to: "/supplier/revenue", label: "Doanh thu" },
      { label: "Tiền cọc đang giữ", muted: true },
      { label: "Phí nền tảng", muted: true },
      { label: "Rút tiền", muted: true },
    ],
  },
  {
    id: "verification",
    title: "Hồ sơ & xác minh",
    icon: FiShield,
    items: [
      { to: "/supplier/profile/edit", label: "Hồ sơ cửa hàng" },
      { label: "Xác minh KYC", muted: true },
      { label: "Địa chỉ", muted: true },
      { label: "Tài khoản ngân hàng", muted: true },
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
    issues: true,
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
            <img src={logo} alt="GearXpert" className="h-8 w-auto object-contain" />
            <div>
              <div className="text-sm font-bold text-slate-900">Cổng nhà cung cấp</div>
              <div className="text-xs text-slate-500">GearXpert</div>
            </div>
          </div>
          <button
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            onClick={onClose}
            aria-label="Đóng menu"
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
                              end={!!item.end}
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
