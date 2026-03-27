import React, { useState } from 'react';
import { LayoutDashboard, ShieldAlert, QrCode, Bell, User, History, ClipboardCheck } from 'lucide-react';

import TasksTab from './tabs/TasksTab';
import QRTab from './tabs/QRTab';
import ReportsTab from './tabs/ReportsTab';
import HistoryTab from './tabs/HistoryTab';
import ProfileTab from './tabs/ProfileTab';
import HandoverTab from './tabs/HandoverTab';

export default function StaffLayout() {
  const [activeMenu, setActiveMenu] = useState('tasks');
  const [handoverRentalId, setHandoverRentalId] = useState('');

  const openHandoverForRental = (rentalId) => {
    if (!rentalId) return;
    setHandoverRentalId(rentalId);
    setActiveMenu('handover');
  };

  const clearHandoverRental = () => {
    setHandoverRentalId('');
  };

  return (
    <div className="flex h-[100dvh] bg-slate-50 text-slate-900 font-sans overflow-hidden">

      {/* SIDEBAR (Desktop Only) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col z-20 shadow-sm h-full">
        <div className="p-6 border-b border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/30">
            GX
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-slate-900 font-display">GearXpert</h1>
            <p className="text-xs text-slate-500">Operation Panel</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {[
            { id: 'tasks', label: 'Nhiệm vụ', icon: LayoutDashboard },
            { id: 'handover', label: 'Biên bản bàn giao', icon: ClipboardCheck },
            { id: 'qr', label: 'Quét mã QR', icon: QrCode },
            { id: 'reports', label: 'Báo cáo sự cố', icon: ShieldAlert },
            { id: 'history', label: 'Lịch sử hoạt động', icon: History },
            { id: 'profile', label: 'Tài khoản', icon: User },
          ].map(item => (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                activeMenu === item.id ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'
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
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 z-10 flex items-center justify-between shadow-sm sticky top-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
              GX
            </div>
            <h1 className="font-bold text-lg text-slate-900 leading-none">
              {activeMenu === 'tasks' && 'Nhiệm vụ'}
              {activeMenu === 'handover' && 'Biên bản'}
              {activeMenu === 'qr' && 'Quét mã'}
              {activeMenu === 'reports' && 'Sự cố'}
              {activeMenu === 'profile' && 'Tài khoản'}
              {activeMenu === 'history' && 'Lịch sử'}
            </h1>
          </div>
          <button className="relative p-2 text-slate-600 hover:bg-slate-50 rounded-full">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </header>

        {/* CÃC VIEW CONTENT */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0 scroll-smooth w-full">
          {activeMenu === 'tasks' && <TasksTab onOpenHandover={openHandoverForRental} />}
          {activeMenu === 'handover' && (
            <HandoverTab
              selectedRentalIdFromTask={handoverRentalId}
              onConsumedSelectedRental={clearHandoverRental}
            />
          )}
          {activeMenu === 'qr' && <QRTab />}
          {activeMenu === 'reports' && <ReportsTab />}
          {activeMenu === 'history' && <HistoryTab setActiveMenu={setActiveMenu} />}
          {activeMenu === 'profile' && <ProfileTab setActiveMenu={setActiveMenu} />}
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
                  activeMenu === item.id ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <item.icon size={22} className={activeMenu === item.id ? 'stroke-[2.5px]' : 'stroke-2'} />
                <span className={`text-[10px] font-medium ${activeMenu === item.id ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
                <div className={`w-1 h-1 rounded-full transition-all ${activeMenu === item.id ? 'bg-primary' : 'bg-transparent'}`}></div>
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
