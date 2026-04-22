import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useSocket } from "../../../SocketContext";
import { getBlogs } from "../../../service/ApiService/BlogApi";
import { toast } from "react-toastify";
import {
  FiHome,
  FiUsers,
  FiUserCheck,
  FiBox,
  FiFileText,
  FiBarChart2,
  FiSettings,
  FiTag,
  FiChevronLeft,
  FiChevronRight,
  FiChevronDown,
  FiChevronUp,
  FiMessageSquare,
  FiBell,
  FiAlertTriangle,
  FiCreditCard,
  FiDollarSign,
  FiClipboard
} from "react-icons/fi";
import { HiOutlineSpeakerphone } from "react-icons/hi";

const navGroups = [
  {
    title: "DANH MỤC",
    items: [
      { to: "/admin", label: "Bảng điều khiển", icon: FiHome },
      {
        to: "/admin/users",
        label: "Người dùng",
        icon: FiUsers,
        subItems: [
          { to: "/admin/advertisements", label: "Quảng cáo", icon: HiOutlineSpeakerphone }
        ]
      },
       {
        to: "/admin/suppliers",
        label: "Nhà cung cấp",
        icon: FiUserCheck,
        subItems: [
          { to: "/admin/suppliers", label: "Danh sách", icon: FiUserCheck },
          { to: "/admin/shop-reports", label: "Báo cáo Shop", icon: FiAlertTriangle },
        ]
      },
      { to: "/admin/suppliers", label: "Nhà cung cấp", icon: FiUserCheck },
      { to: "/admin/supplier-onboarding", label: "Duyệt đăng ký NCC", icon: FiClipboard },
      { to: "/admin/rentals", label: "Đơn thuê", icon: FiFileText },
      { to: "/admin/devices", label: "Thiết bị", icon: FiBox },
      { to: "/admin/vouchers", label: "Mã giảm giá", icon: FiTag },
      { 
        to: "/admin/blogs", 
        label: "Blog", 
        icon: FiFileText,
        subItems: [
          { to: "/admin/blogs", label: "Bài viết", icon: FiFileText },
          { to: "/admin/comments", label: "Quản lý bình luận", icon: FiMessageSquare },
        ]
      },
      { to: "/admin/reports", label: "Báo cáo", icon: FiBarChart2 },
      { to: "/admin/notifications", label: "Thông báo hệ thống", icon: FiBell },
      { to: "/admin/wallet", label: "Ví Admin", icon: FiCreditCard },
      { to: "/admin/withdrawals", label: "Duyệt rút tiền", icon: FiDollarSign },
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

export default function AdminSidebar({ collapsed, onToggleCollapsed }) {
  const location = useLocation();
  const [openSubMenus, setOpenSubMenus] = useState({ 
    "/admin/users": true,
    "/admin/blogs": true,
    "/admin/suppliers": true
  }); // Open by default
  const { socket } = useSocket();
  const [pendingBlogsCount, setPendingBlogsCount] = useState(0);

  useEffect(() => {
    const fetchPendingCount = async () => {
      try {
        const res = await getBlogs({ status: "pending", limit: 1 });
        setPendingBlogsCount(res.data.total);
      } catch (error) {
        console.error("Lỗi khi lấy số lượng blog chờ duyệt:", error);
      }
    };
    fetchPendingCount();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewBlog = (blog) => {
      if (blog.status === "pending") {
        setPendingBlogsCount(prev => prev + 1);
      }
    };

    const handleBlogStatusChange = ({ oldStatus, newStatus }) => {
      if (oldStatus === "pending" && newStatus !== "pending") {
        setPendingBlogsCount(prev => Math.max(0, prev - 1));
      } else if (oldStatus !== "pending" && newStatus === "pending") {
        setPendingBlogsCount(prev => prev + 1);
      }
    };

    socket.on("admin_new_blog_pending", handleNewBlog);
    socket.on("admin_blog_status_changed", handleBlogStatusChange);

    return () => {
      socket.off("admin_new_blog_pending", handleNewBlog);
      socket.off("admin_blog_status_changed", handleBlogStatusChange);
    };
  }, [socket]);

  const toggleSubMenu = (to) => {
    setOpenSubMenus(prev => ({
      ...prev,
      [to]: !prev[to]
    }));
  };

  return (
    <aside
      className={cx(
        "hidden lg:flex flex-col border-r border-slate-200 bg-white transition-all duration-500 overflow-hidden",
        collapsed ? "w-24" : "w-[280px]"
      )}
    >
      {/* Sidebar content */}
      <div className="flex-1 px-4 py-5 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.title} className="mb-6">
            <div
              className={cx(
                "px-3 pb-2 text-xs font-semibold tracking-wide text-primary transition-opacity",
                collapsed && "opacity-0"
              )}
            >
              {group.title}
            </div>

            <nav className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(location.pathname, item.to);
                const hasSubItems = item.subItems && item.subItems.length > 0;
                const isSubMenuOpen = openSubMenus[item.to];

                return (
                  <div key={item.to} className="space-y-1">
                    <div className="relative group/item">
                      <NavLink
                        to={item.to}
                        onClick={(e) => {
                          if (hasSubItems && !collapsed) {
                            // Don't navigate if it's a dropdown, just toggle
                            // e.preventDefault();
                            // setOpenSubMenus(prev => ({ ...prev, [item.to]: !prev[item.to] }));
                          }
                        }}
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
                            "grid h-9 w-9 place-items-center rounded-xl flex-shrink-0 relative",
                            isActive
                              ? "bg-white text-primary shadow-sm shadow-primary/10"
                              : "bg-slate-100 text-slate-600"
                          )}
                        >
                          <Icon size={18} />
                          {collapsed && item.to === "/admin/blogs" && pendingBlogsCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 ring-2 ring-white animate-pulse"></span>
                          )}
                        </span>
                        {!collapsed && (
                          <span className="font-medium whitespace-nowrap flex-1 flex items-center justify-between">
                            {item.label}
                            {item.to === "/admin/blogs" && pendingBlogsCount > 0 && (
                              <span className="flex h-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white shadow-sm animate-pulse ml-2">
                                {pendingBlogsCount > 99 ? '99+' : pendingBlogsCount}
                              </span>
                            )}
                          </span>
                        )}
                        {hasSubItems && !collapsed && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              toggleSubMenu(item.to);
                            }}
                            className="p-1 hover:bg-slate-200 rounded-md transition-colors"
                          >
                            {isSubMenuOpen ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                          </button>
                        )}
                      </NavLink>
                    </div>

                    {/* Submenu Items */}
                    {hasSubItems && isSubMenuOpen && !collapsed && (
                      <div className="ml-12 space-y-1 animate-fade-in-down">
                        {item.subItems.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = location.pathname === subItem.to;
                          return (
                            <NavLink
                              key={subItem.to}
                              to={subItem.to}
                              className={() =>
                                cx(
                                  "flex items-center gap-3 rounded-xl px-3 py-2 text-xs transition-all",
                                  isSubActive
                                    ? "text-primary font-bold"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                                )
                              }
                            >
                              <SubIcon size={14} />
                              <span className="whitespace-nowrap">{subItem.label}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Collapse button */}
      <div className="border-t border-slate-200 px-3 py-3 flex justify-center">
        <button
          onClick={onToggleCollapsed}
          className="flex items-center justify-center w-10 h-10 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-primary transition-all"
          title={collapsed ? "Expand" : "Collapse"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <FiChevronRight size={18} />
          ) : (
            <FiChevronLeft size={18} />
          )}
        </button>
      </div>
    </aside>
  );
}
