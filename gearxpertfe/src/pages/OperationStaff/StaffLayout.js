import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { LayoutDashboard, ShieldAlert, QrCode, Bell, User, History, ClipboardCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import { useSocket } from '../../SocketContext';
import { OPERATION_STAFF_SOCKET_ROOM } from './operationStaffSocketConstants';import logo from '../../assets/logoGearXpert.png';
import TasksTab from './tabs/TasksTab';
import QRTab from './tabs/QRTab';
import ReportsTab from './tabs/ReportsTab';
import HistoryTab from './tabs/HistoryTab';
import ProfileTab from './tabs/ProfileTab';
import HandoverTab from './tabs/HandoverTab';

export default function StaffLayout() {
  const account = useSelector((state) => state.user.account);
  const { socket } = useSocket();
  const [activeMenu, setActiveMenu] = useState('tasks');
  const [handoverRentalId, setHandoverRentalId] = useState('');
  const [handoverContext, setHandoverContext] = useState('DELIVERY');
  const [realtimeTick, setRealtimeTick] = useState(0);
  const [notifUnread, setNotifUnread] = useState(0);

  const bumpRealtime = useCallback(() => {
    setRealtimeTick((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!socket || account?.role !== 'OPERATION_STAFF') return;

    socket.emit('joinRoom', OPERATION_STAFF_SOCKET_ROOM);

    const onBoard = (data) => {
      bumpRealtime();
      const actorId = data?.actorId;
      const isSelf = actorId && account?.id && String(actorId) === String(account.id);
      if (!isSelf && data?.message) {
        toast.info(data.message, { autoClose: 3800 });
      }
    };

    const onNotif = (notif) => {
      const title = notif?.title || 'Thông báo';
      const body = notif?.message || '';
      toast.info(body ? `${title}: ${body}` : title, { autoClose: 4500 });
      setNotifUnread((n) => n + 1);
    };

    socket.on('operationStaffUpdate', onBoard);
    socket.on('newNotification', onNotif);
    socket.on('getNotification', onNotif);

    return () => {
      socket.emit('leaveRoom', OPERATION_STAFF_SOCKET_ROOM);
      socket.off('operationStaffUpdate', onBoard);
      socket.off('newNotification', onNotif);
      socket.off('getNotification', onNotif);
    };
  }, [socket, account?.role, account?.id, bumpRealtime]);

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
            { id: 'qr', label: 'Quét mã QR', icon: QrCode },
            { id: 'reports', label: 'Báo cáo sự cố', icon: ShieldAlert },
            { id: 'history', label: 'Lịch sử hoạt động', icon: History },
            { id: 'profile', label: 'Tài khoản', icon: User },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                activeMenu === item.id ? 'bg-indigo-50 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
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
        <header className="md:hidden bg-white border-b border-slate-200 px-4 h-16 z-10 flex items-center justify-between shadow-sm sticky top-0">
          <div className="flex items-center gap-3">
            <img src={logo} alt="GearXpert Logo" className="w-[124px] h-auto object-contain shrink-0" />
            <div className="w-0.5 h-6 bg-slate-200 rounded-full"></div>
            <h1 className="font-bold text-[15px] tracking-wide text-slate-800 leading-none truncate">      
              {activeMenu === 'tasks' && 'Nhiệm vụ'}
              {activeMenu === 'handover' && 'Biên bản'}
              {activeMenu === 'qr' && 'Quét mã'}
              {activeMenu === 'reports' && 'Sự cố'}
              {activeMenu === 'profile' && 'Tài khoản'}
              {activeMenu === 'history' && 'Lịch sử'}
            </h1>
          </div>
          <button
            type="button"
            className="relative p-2 text-slate-600 hover:bg-slate-50 rounded-full"
            title="Thông báo (realtime): mở trang chủ hoặc mục Tài khoản để xem đầy đủ"
          >
            <Bell size={20} />
            {notifUnread > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full border-2 border-white">
                {notifUnread > 9 ? '9+' : notifUnread}
              </span>
            )}
          </button>
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
            {activeMenu === 'qr' && <QRTab />}
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
              { id: 'qr', label: 'Quét mã', icon: QrCode },
              { id: 'reports', label: 'Sự cố', icon: ShieldAlert },
              { id: 'profile', label: 'Tài khoản', icon: User },
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                  activeMenu === item.id ? 'text-indigo-700' : 'text-slate-400 hover:text-slate-600'
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
