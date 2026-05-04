import { FiBell, FiSearch, FiUser, FiMenu, FiLogOut, FiCheck } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "react-toastify";
import { performLogout } from "../../../utils/logout";
import { useSocket } from "../../../SocketContext";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "../../../service/ApiService/notificationApi";
import logo from "../../../assets/logoGearXpert.png";

export default function AdminTopbar({ onMenuOpen, me }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const account = useSelector((state) => state.user.account);
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const panelRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await getNotifications();
      const list = Array.isArray(res) ? res : (res?.data?.notifications || res?.notifications || []);
      setNotifications(list);
    } catch (err) {
      console.error("Fetch notifications error:", err);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotif = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      toast.info(notif.message || "Bạn có thông báo mới", {
        onClick: () => {
          if (notif.link) navigate(notif.link);
        },
      });
    };

    socket.on("newNotification", handleNewNotif);
    return () => socket.off("newNotification", handleNewNotif);
  }, [socket, navigate]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleMarkRead = async (notifId) => {
    try {
      await markNotificationAsRead(notifId);
      setNotifications((prev) => prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n)));
    } catch (err) {
      console.error("Mark read error:", err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error("Mark all read error:", err);
    }
  };

  const handleNotifClick = (notif) => {
    if (!notif.isRead) handleMarkRead(notif._id);
    if (notif.link) navigate(notif.link);
    setShowNotifPanel(false);
  };

  const handleLogout = async () => {
    await performLogout({
      dispatch,
      navigate,
      socketConnection: account?.socketConnection,
      toast,
    });
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1500px] items-center justify-between px-6 lg:px-10 gap-6">
        {/* Left: Mobile menu + Brand */}
        <div className="flex items-center gap-3 min-w-0">
          {/* Mobile menu button */}
          <button
            className="inline-flex items-center justify-center rounded-2xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden transition-colors"
            onClick={onMenuOpen}
            aria-label="Open sidebar"
          >
            <FiMenu size={20} />
          </button>

          {/* Brand */}
          <div className="flex items-center gap-3">
            <img src={logo} alt="GearXpert Logo" className="h-9 w-auto object-contain" />
            <div className="hidden sm:block">
              <div className="text-sm font-bold text-slate-900 font-display">GearXpert</div>
              <div className="text-xs text-slate-500 font-medium">Admin Portal</div>
            </div>
          </div>
        </div>

        {/* Center: Search bar (hidden on mobile/tablet) */}
        <div className="hidden lg:flex flex-1 max-w-sm items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5 border border-slate-200 text-sm text-slate-600 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
          <FiSearch className="text-slate-400 shrink-0" size={18} />
          <input
            className="w-full bg-transparent outline-none placeholder:text-slate-400 text-sm"
            placeholder="Tìm kiếm người dùng, nhà cung cấp..."
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 lg:gap-3 ml-auto">
          {/* Notifications */}
          <div className="relative" ref={panelRef}>
            <button
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="relative w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-primary hover:shadow-md transition-all shrink-0"
              aria-label="Notifications"
            >
              <FiBell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white ring-1 ring-red-200 animate-pulse"></span>
              )}
            </button>

            {/* Notification dropdown panel */}
            {showNotifPanel && (
              <div className="absolute right-0 mt-3 w-80 max-h-[480px] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                  <span className="font-bold text-sm text-slate-800">Thông báo ({unreadCount})</span>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-primary font-bold hover:underline flex items-center gap-1">
                      <FiCheck size={14} /> Đọc tất cả
                    </button>
                  )}
                </div>

                <div className="overflow-y-auto max-h-[380px] custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                        <FiBell size={20} className="text-slate-300" />
                      </div>
                      <p className="text-sm text-slate-400 font-medium">Bạn chưa có thông báo nào</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n._id}
                        onClick={() => handleNotifClick(n)}
                        className={`w-full text-left px-5 py-4 flex gap-4 hover:bg-slate-50 transition-all border-b border-slate-50 group ${
                          !n.isRead ? "bg-primary/5" : ""
                        }`}
                      >
                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 group-hover:bg-white group-hover:shadow-sm transition-all">
                          <FiBell size={18} className={!n.isRead ? "text-primary" : "text-slate-400"} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm mb-0.5 truncate ${!n.isRead ? "font-bold text-slate-900" : "font-medium text-slate-600"}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-2 font-medium">
                            {new Date(n.createdAt).toLocaleString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                            })}
                          </p>
                        </div>
                        {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
                      </button>
                    ))
                  )}
                </div>
                
                <div className="px-4 py-3 bg-slate-50/50 border-t border-slate-100 text-center">
                   <button 
                     onClick={() => { navigate('/admin/notifications'); setShowNotifPanel(false) }}
                     className="text-[11px] font-bold text-slate-500 hover:text-primary transition-colors uppercase tracking-wider"
                   >
                     Xem tất cả thông báo
                   </button>
                </div>
              </div>
            )}
          </div>

          {/* Divider (desktop only) */}
          <div className="w-px h-8 bg-slate-200 hidden lg:block" />

          {/* User Profile */}
          <button className="flex items-center gap-2 pl-2 pr-3 py-1.5 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all shrink-0">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-dark rounded-lg flex items-center justify-center text-white flex-shrink-0">
              <FiUser size={16} />
            </div>
            <span className="hidden lg:inline text-sm font-semibold text-slate-900 truncate max-w-[120px]">{me?.name || "Admin"}</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
            title="Logout"
            aria-label="Logout"
          >
            <FiLogOut size={18} />
            <span className="hidden lg:inline text-sm font-semibold">Đăng xuất</span>
          </button>
        </div>
      </div>
    </header>
  );
}
