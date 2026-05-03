import { NavLink, useLocation } from "react-router-dom";
import { FiX, FiHome, FiUsers, FiUserCheck, FiBox, FiFileText, FiBarChart2, FiSettings, FiClipboard, FiAlertTriangle, FiInbox } from "react-icons/fi";
import logo from "../../../assets/logoGearXpert.png";

const navGroups = [
  {
    title: "DANH MỤC",
    items: [
      { to: "/admin", label: "Bảng điều khiển", icon: FiHome },
      { to: "/admin/users", label: "Người dùng", icon: FiUsers },
      { to: "/admin/suppliers", label: "Nhà cung cấp", icon: FiUserCheck },
      { to: "/admin/supplier-onboarding", label: "Duyệt đăng ký NCC", icon: FiClipboard },
      { to: "/admin/devices", label: "Thiết bị", icon: FiBox },
      { to: "/admin/rentals", label: "Đơn thuê", icon: FiFileText },
      { to: "/admin/reports", label: "Báo cáo", icon: FiBarChart2 },
      { to: "/admin/pending-issue-reviews", label: "Sự cố chờ xử lý", icon: FiInbox },
      { to: "/admin/compensation-proposals", label: "Duyệt bồi thường", icon: FiAlertTriangle },
    ],
  },
  {
    title: "CÀI ĐẶT",
    items: [{ to: "/admin/settings", label: "Cài đặt hệ thống", icon: FiSettings }],
  },
];

const cx = (...xs) => xs.filter(Boolean).join(" ");

function isActivePath(pathname, to) {
  if (to === "/admin") return pathname === "/admin" || pathname === "/admin/";
  return pathname.startsWith(to);
}

export default function AdminMobileDrawer({ open, onClose }) {
  const location = useLocation();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div className="absolute left-0 top-0 h-full w-[280px] bg-white shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <img src={logo} alt="GearXpert Logo" className="h-9 w-auto object-contain" />
            <div>
              <div className="text-sm font-bold text-slate-900 font-display">GearXpert</div>
              <div className="text-xs text-slate-500 font-medium">Quản trị</div>
            </div>
          </div>
          <button
            className="flex items-center justify-center w-9 h-9 rounded-xl hover:bg-slate-100 text-slate-600 transition-colors"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Navigation */}
        <div className="px-4 py-5">
          {navGroups.map((group) => (
            <div key={group.title} className="mb-6">
              <div className="px-3 pb-2 text-xs font-semibold tracking-wide text-primary">
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
                      onClick={onClose}
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
  );
}
