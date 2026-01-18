import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  LogOut,
  Settings,
  Wallet,
  User,
  FileText,
  BarChart3,
  Home,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react'

export function Sidebar({ onLogout = () => {} }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const user = {
    fullName: 'Nguyễn Văn A',
    email: 'user@renthub.vn',
    rank: 'Gold',
    loyaltyPoints: 1240,
    walletBalance: 3500000
  }

  const menuItems = [
    { label: 'Trang chủ', icon: Home, path: '/' },
    { label: 'Đơn thuê của tôi', icon: FileText, path: '/rental/manage' },
    { label: 'Ví của tôi', icon: Wallet, path: '/wallet' },
    { label: 'Thống kê', icon: BarChart3, path: '/statistics' }
  ]

  return (
    <aside
      className={`${
        collapsed ? 'w-24' : 'w-80'
      } bg-white/70 backdrop-blur-xl border-r border-slate-200 flex flex-col transition-all duration-500 ease-in-out sticky top-0 h-screen`}
    >
      {/* LOGO SECTION - Bo góc 3xl cho container */}
      <div className="p-6 mb-2 flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 p-1.5 rounded-xl">
               <span className="material-symbols-outlined text-white text-[20px] block">videocam</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 font-display tracking-tight">GearXpert</h2>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2.5 rounded-2xl bg-slate-50 text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-md transition-all border border-transparent hover:border-slate-100"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      {/* USER PROFILE CARD - Sử dụng glass-panel style */}
      {!collapsed && (
        <div className="px-6 mb-6">
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[32px] p-5 shadow-xl shadow-indigo-100 relative overflow-hidden group">
            {/* Hiệu ứng nền nhẹ */}
            <div className="absolute -right-4 -top-4 w-20 h-20 bg-white/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all duration-700"></div>
            
            <div className="flex items-center gap-3 mb-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
                <User size={24} />
              </div>
              <div className="overflow-hidden">
                <p className="font-bold text-white truncate">{user.fullName}</p>
                <p className="text-[11px] text-indigo-200/70 truncate uppercase font-black tracking-widest">{user.rank} Member</p>
              </div>
            </div>

            <div className="space-y-2 relative z-10">
              {/* Badge Rank LED style từ CSS bạn gửi */}
              <div className="rank-card-gold text-[11px] font-bold flex items-center justify-center gap-1 py-1.5 bg-black/20 rounded-xl text-yellow-100 border border-white/5">
                <Sparkles size={12} className="text-yellow-400" />
                {user.loyaltyPoints} Points
              </div>

              <div className="flex items-center justify-between bg-white/10 backdrop-blur-sm p-3 rounded-2xl border border-white/10">
                <div className="flex items-center gap-2 text-white">
                  <Wallet size={14} className="text-indigo-300" />
                  <span className="text-sm font-bold">{user.walletBalance.toLocaleString()}đ</span>
                </div>
                <button className="text-[10px] font-black text-indigo-300 hover:text-white uppercase tracking-tighter">Nạp</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MENU - Bo góc 2xl cho các items */}
      <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto hide-scroll">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = location.pathname === item.path

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-[20px] transition-all duration-300 group relative ${
                active
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 font-bold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              {/* Thanh chỉ thị Active */}
              {active && !collapsed && (
                <div className="absolute left-0 w-1 h-6 bg-white rounded-full ml-1"></div>
              )}
              
              <Icon size={22} className={`${active ? 'scale-110' : 'group-hover:scale-110'} transition-transform`} />
              
              {!collapsed && (
                <span className="font-display tracking-tight">{item.label}</span>
              )}
            </button>
          )
        })}
      </nav>

      {/* BOTTOM ACTIONS - Bo góc 2xl */}
      <div className="p-4 border-t border-slate-100 space-y-2 mb-4">
        <button
          className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-slate-500 hover:bg-slate-50 hover:text-slate-900 transition-all w-full group ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <Settings size={20} className="group-hover:rotate-45 transition-transform" />
          {!collapsed && <span className="font-bold font-display tracking-tight text-sm">Cài đặt</span>}
        </button>

        <button
          onClick={onLogout}
          className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-red-500 hover:bg-red-50 transition-all w-full font-bold group ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
          {!collapsed && <span className="font-display tracking-tight text-sm">Đăng xuất</span>}
        </button>
      </div>
    </aside>
  )
}