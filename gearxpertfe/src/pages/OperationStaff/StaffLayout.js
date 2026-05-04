import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { LayoutDashboard, ShieldAlert, Bell, User, History, ClipboardCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { useSocket } from '../../SocketContext';
import { OPERATION_STAFF_SOCKET_ROOM } from './operationStaffSocketConstants'; import logo from '../../assets/logoGearXpert.png';
import TasksTab from './tabs/TasksTab';
import ReportsTab from './tabs/ReportsTab';
import HistoryTab from './tabs/HistoryTab';
import ProfileTab from './tabs/ProfileTab';
import HandoverTab from './tabs/HandoverTab';
import { getNotifications, markAllNotificationsAsRead, markNotificationAsRead } from '../../service/ApiService/notificationApi';
import { Package, Clock, CheckCheck, Inbox } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

export default function StaffLayout() {
  const account = useSelector((state) => state.user.account);
  const { socket } = useSocket();
  const [activeMenu, setActiveMenu] = useState('tasks');
  const [handoverRentalId, setHandoverRentalId] = useState('');
  const [handoverContext, setHandoverContext] = useState('DELIVERY');
  const [realtimeTick, setRealtimeTick] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  const bumpRealtime = useCallback(() => {
    setRealtimeTick((t) => t + 1);
  }, []);

  const fetchInitialNotifs = useCallback(async () => {
    if (!account?.id) return;
    try {
      const res = await getNotifications({ limit: 10 });
      if (Array.isArray(res)) {
        setNotifications(res);
        setNotifUnread(res.filter(n => !n.isRead).length);
      }
    } catch (err) {
      console.error("Lỗi tải thông báo:", err);
    }
  }, [account?.id]);

  useEffect(() => {
    fetchInitialNotifs();
  }, [fetchInitialNotifs]);

  useEffect(() => {
    if (!socket || account?.role !== 'OPERATION_STAFF') return;

    const join = () => {
      socket.emit('joinRoom', OPERATION_STAFF_SOCKET_ROOM);
    };

    if (socket.connected) join();
    socket.on('connect', join);

    const onBoard = (data) => {
      console.log("[SOCKET] Operation staff update received:", data);
      bumpRealtime();
      const actorId = data?.actorId;
      const isSelf = actorId && account?.id && String(actorId) === String(account.id);
      if (!isSelf && data?.message) {
        const devicePrefix = data.deviceLabel ? `[${data.deviceLabel}] ` : '';
        toast.info(`🚚 ${devicePrefix}${data.message}`, {
          autoClose: 5000,
          icon: false
        });
      }
    };

    const onNotif = (notif) => {
      console.log("[SOCKET] New notification received:", notif);
      setNotifications(prev => [notif, ...prev.slice(0, 19)]);
      setNotifUnread(n => n + 1);

      const title = notif?.title || 'Thông báo';
      const body = notif?.message || '';
      toast.info(`🔔 ${title}: ${body}`, { autoClose: 4500 });
    };

    socket.on('operationStaffUpdate', onBoard);
    socket.on('newNotification', onNotif);

    return () => {
      socket.off('connect', join);
      socket.emit('leaveRoom', OPERATION_STAFF_SOCKET_ROOM);
      socket.off('operationStaffUpdate', onBoard);
      socket.off('newNotification', onNotif);
    };
  }, [socket, account?.role, account?.id, bumpRealtime]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifDropdown && !event.target.closest('.notification-container')) {
        setShowNotifDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifDropdown]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setNotifUnread(0);
      toast.success("Đã đánh dấu tất cả là đã đọc");
    } catch (err) {
      toast.error("Không thể đánh dấu đã đọc");
    }
  };

  const handleMarkRead = async (id) => {
    try {
      await markNotificationAsRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
      setNotifUnread(n => Math.max(0, n - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const openHandoverForRental = (rentalId, context = 'DELIVERY') => {
    if (!rentalId) return;
    setHandoverRentalId(rentalId);
    setHandoverContext(context);
    setActiveMenu('handover');
  };

  const clearHandoverRental = () => {
    setHandoverRentalId('');
  };

  return (
    <div className="flex h-[100dvh] bg-slate-50 text-slate-900 font-sans overflow-hidden">

      {/* SIDEBAR (Desktop Only) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col z-20 shadow-sm h-full">
        <div className="h-[76px] px-6 border-b border-slate-200 flex items-center">
          <img src={logo} alt="GearXpert Logo" className="w-40 md:w-44 lg:w-[170px] h-auto object-contain" />
        </div>
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">          {[
          { id: 'tasks', label: 'Nhiệm vụ', icon: LayoutDashboard },
          { id: 'handover', label: 'Biên bản', icon: ClipboardCheck },
          { id: 'reports', label: 'Báo cáo sự cố', icon: ShieldAlert },
          { id: 'history', label: 'Lịch sử hoạt động', icon: History },
          { id: 'profile', label: 'Tài khoản', icon: User },
        ].map(item => (
          <button
            key={item.id}
            onClick={() => setActiveMenu(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeMenu === item.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <item.icon size={20} /> {item.label}
          </button>
        ))}
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-[100dvh] w-full overflow-hidden relative">

        {/* MOBILE HEADER (App-like Topbar) */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 h-16 z-50 flex items-center justify-between shadow-sm sticky top-0">
          <div className="flex items-center gap-3">
            <img src={logo} alt="GearXpert Logo" className="w-[124px] h-auto object-contain shrink-0" />
            <div className="w-0.5 h-6 bg-slate-200 rounded-full"></div>
            <h1 className="font-bold text-[15px] tracking-wide text-slate-800 leading-none truncate">
              {activeMenu === 'tasks' && 'Nhiệm vụ'}
              {activeMenu === 'handover' && 'Biên bản'}
              {activeMenu === 'reports' && 'Sự cố'}
              {activeMenu === 'profile' && 'Tài khoản'}
              {activeMenu === 'history' && 'Lịch sử'}
            </h1>
          </div>
          <div className="relative notification-container">
            <button
              type="button"
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              className={`relative p-2 rounded-full transition-colors ${showNotifDropdown ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Bell size={22} />
              {notifUnread > 0 && (
                <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
                  {notifUnread > 9 ? '9+' : notifUnread}
                </span>
              )}
            </button>

            {showNotifDropdown && (
              <NotificationPanel
                notifications={notifications}
                onClose={() => setShowNotifDropdown(false)}
                onMarkAllRead={handleMarkAllRead}
                onMarkRead={handleMarkRead}
              />
            )}
          </div>
        </header>

        {/* DESKTOP HEADER (New) */}
        <header className="hidden md:flex bg-white border-b border-slate-200 px-8 h-[76px] z-50 items-center justify-between shadow-sm shrink-0">
          <div>
            <h1 className="text-xl font-bold text-slate-800 uppercase tracking-tight">
              Hệ thống Vận hành GearXpert
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative notification-container">
              <button
                onClick={() => setShowNotifDropdown(!showNotifDropdown)}
                className={`relative p-2.5 rounded-xl transition-all ${showNotifDropdown ? 'bg-indigo-50 text-indigo-600 shadow-inner' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'}`}
              >
                <Bell size={22} />
                {notifUnread > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1.5 flex items-center justify-center text-[10px] font-bold text-white bg-indigo-600 rounded-full border-2 border-white">
                    {notifUnread > 9 ? '9+' : notifUnread}
                  </span>
                )}
              </button>

              {showNotifDropdown && (
                <NotificationPanel
                  notifications={notifications}
                  onClose={() => setShowNotifDropdown(false)}
                  onMarkAllRead={handleMarkAllRead}
                  onMarkRead={handleMarkRead}
                />
              )}
            </div>
          </div>
        </header>

        {/* CÁC VIEW CONTENT */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0 scroll-smooth w-full md:px-6 md:py-8 bg-slate-50">
          <div className="md:bg-white md:rounded-2xl md:border md:border-slate-200 md:p-6 md:shadow-sm min-h-full">
            {activeMenu === 'tasks' && (
              <TasksTab onOpenHandover={openHandoverForRental} realtimeTick={realtimeTick} />
            )}
            {activeMenu === 'handover' && (
              <HandoverTab
                selectedRentalIdFromTask={handoverRentalId}
                selectedFlowContextFromTask={handoverContext}
                onConsumedSelectedRental={clearHandoverRental}
                realtimeTick={realtimeTick}
              />
            )}
            {activeMenu === 'reports' && <ReportsTab realtimeTick={realtimeTick} />}
            {activeMenu === 'history' && (
              <HistoryTab setActiveMenu={setActiveMenu} realtimeTick={realtimeTick} />
            )}
            {activeMenu === 'profile' && <ProfileTab setActiveMenu={setActiveMenu} />}
          </div>
        </div>

        {/* BOTTOM NAVIGATION (Mobile Only) */}
        <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 pb-safe z-40">
          <div className="flex justify-around items-center h-16 px-2">
            {[
              { id: 'tasks', label: 'Nhiệm vụ', icon: LayoutDashboard },
              { id: 'handover', label: 'Biên bản', icon: ClipboardCheck },
              { id: 'reports', label: 'Sự cố', icon: ShieldAlert },
              { id: 'profile', label: 'Tài khoản', icon: User },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeMenu === item.id ? 'text-indigo-700' : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                <item.icon size={22} className={activeMenu === item.id ? 'stroke-[2.5px]' : 'stroke-2'} />
                <span className={`text-[10px] font-medium ${activeMenu === item.id ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
                <div className={`w-1 h-1 rounded-full transition-all ${activeMenu === item.id ? 'bg-indigo-700' : 'bg-transparent'}`}></div>
              </button>
            ))}
          </div>
        </nav>
      </main>

      {/* Global Keyframe Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}

function NotificationPanel({ notifications, onClose, onMarkAllRead, onMarkRead }) {
  return (
    <>
      {/* Backdrop for mobile to close when clicking outside */}
      <div className="fixed inset-0 z-40 md:hidden" onClick={onClose}></div>

      <div className="absolute right-0 mt-2 w-[calc(100vw-32px)] md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden animate-slide-up md:animate-none">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            Thông báo
            {notifications.filter(n => !n.isRead).length > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                {notifications.filter(n => !n.isRead).length} mới
              </span>
            )}
          </h3>
          <button
            onClick={onMarkAllRead}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
          >
            Đánh dấu tất cả đã đọc
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <Inbox size={40} strokeWidth={1.5} className="mb-2 opacity-20" />
              <p className="text-sm font-medium">Chưa có thông báo nào</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => onMarkRead(notif._id)}
                  className={`px-5 py-4 hover:bg-slate-50 transition-colors cursor-pointer flex gap-3 relative ${!notif.isRead ? 'bg-indigo-50/30' : ''}`}
                >
                  {!notif.isRead && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600"></div>
                  )}
                  <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center ${notif.type === 'ORDER' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-600'}`}>
                    <Package size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 mb-1">
                      <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {notif.type || 'SYSTEM'}
                      </span>
                      <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                        <Clock size={10} />
                        {formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true, locale: vi })}
                      </span>
                    </div>
                    <p className={`text-sm leading-tight mb-1 ${!notif.isRead ? 'font-bold text-slate-900' : 'text-slate-700'}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 text-center bg-slate-50/30">
          <button
            onClick={onClose}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </>
  );
}
