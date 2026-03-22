import { useState, useEffect, useRef } from "react";
import { FiMenu, FiBell, FiSearch, FiUser, FiLogOut, FiCheck } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { performLogout } from "../../../utils/logout";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from "../../../service/ApiService/notificationApi";
import { useSocket } from "../../../SocketContext";
import logo from "../../../assets/logoGearXpert.png";

const timeAgo = (date) => {
  if (!date) return "";
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return "Vừa xong";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} phút trước`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} giờ trước`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} ngày trước`;
  return new Date(date).toLocaleDateString("vi-VN");
};

// Rank color mapping
const RANK_STYLES = {
  BRONZE: {
    border: "border-[3px] border-[#cd7f32] animate-spin-slow",
    label: "Bronze",
    color: "#cd7f32"
  },
  SILVER: {
    border: "border-[3px] border-[#c0c0c0] animate-spin-slow",
    label: "Silver",
    color: "#c0c0c0"
  },
  GOLD: {
    border: "border-[3px] border-[#ffd700] animate-spin-slow",
    label: "Gold",
    color: "#ffd700"
  },
  PLATINUM: {
    border: "border-[3px] border-[#e5e4e2] animate-spin-slow",
    label: "Platinum",
    color: "#e5e4e2"
  },
  DIAMOND: {
    border: "border-[3px] border-[#00bfff] animate-spin-slow",
    label: "Diamond",
    color: "#00bfff"
  }
};

export default function SupplierTopbar({ onMenuOpen, me }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const account = useSelector((state) => state.user.account);
  const { socket } = useSocket();

  const [notifications, setNotifications] = useState([]);
  const [showPanel, setShowPanel] = useState(false);
  const panelRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Real-time: listen for new notifications via Socket.IO
  useEffect(() => {
    if (!socket) return;

    const handleNewNotif = (notif) => {
      setNotifications((prev) => [notif, ...prev]);
    };

    socket.on("newNotification", handleNewNotif);
    return () => socket.off("newNotification", handleNewNotif);
  }, [socket]);

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowPanel(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications();
      const list = Array.isArray(res) ? res : (res?.data?.notifications || res?.notifications || []);
      setNotifications(list);
    } catch {
      // silent
    }
  };

  const handleMarkRead = async (notifId) => {
    try {
      await markNotificationAsRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n))
      );
    } catch {
      // silent
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch {
      // silent
    }
  };

  const handleNotifClick = (notif) => {
    if (!notif.isRead) handleMarkRead(notif._id);
    if (notif.link) navigate(notif.link);
    setShowPanel(false);
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
      <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-4 px-6 lg:px-10">
        {/* Mobile menu button */}
        <button
          className="inline-flex items-center justify-center rounded-2xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden transition-colors"
          onClick={onMenuOpen}
          aria-label="Open sidebar"
        >
          <FiMenu size={20} />
        </button>

        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <img src={logo} alt="GearXpert Logo" className="h-9 w-auto object-contain" />
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-slate-900 font-display">GearXpert</div>
            <div className="text-xs text-slate-500 font-medium">Supplier Portal</div>
          </div>
        </Link>

        {/* Search bar */}
        <div className="ml-auto hidden lg:flex w-full max-w-md items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5 border border-slate-200 text-sm text-slate-600 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
          <FiSearch className="text-slate-400" size={18} />
          <input
            className="w-full bg-transparent outline-none placeholder:text-slate-400 text-sm"
            placeholder="Search devices, rentals..."
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <div className="relative" ref={panelRef}>
            <button
              onClick={() => setShowPanel(!showPanel)}
              className="relative w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-primary hover:shadow-md transition-all"
              aria-label="Notifications"
            >
              <FiBell size={20} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center border-2 border-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showPanel && (
              <div className="absolute right-0 top-12 w-80 max-h-[420px] bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="font-bold text-sm text-slate-800">Thông báo</span>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                      <FiCheck size={12} /> Đọc tất cả
                    </button>
                  )}
                </div>

                <div className="overflow-y-auto max-h-[360px]">
                  {notifications.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-10">Không có thông báo</p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n._id}
                        onClick={() => handleNotifClick(n)}
                        className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 ${!n.isRead ? "bg-primary/5" : ""}`}
                      >
                        {n.image ? (
                          <img src={n.image} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <FiBell size={16} className="text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">{n.title}</p>
                          <p className="text-xs text-slate-500 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.isRead && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-8 bg-slate-200 hidden lg:block" />

          <button
            className={`flex items-center gap-2 pl-2 pr-4 py-2 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all group relative ${RANK_STYLES[me?.rank]?.border || ''}`}  
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 border border-slate-200">
                {me?.image ? (
                  <img
                    src={me.image}
                    alt={me.username || "avatar"}
                    className="w-8 h-8 rounded-lg object-cover"
                  />
                ) : (
                  <FiUser size={18} className="text-primary" />
                )}
              </div>
              {/* {me?.rank && (
                <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-bold shadow bg-white border border-slate-200" style={{color: RANK_STYLES[me.rank]?.color}}>
                  {RANK_STYLES[me.rank]?.label || me.rank}
                </span>
              )} */}
            </div>
            <span className="hidden xl:inline text-sm font-semibold text-slate-900">{me?.username || "Supplier"}</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
            title="Logout"
            aria-label="Logout"
          >
            <FiLogOut size={18} />
            <span className="hidden lg:inline text-sm font-semibold">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
}