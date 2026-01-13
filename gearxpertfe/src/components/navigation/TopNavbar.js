import { Search, ShoppingCart, Bell, User, Sparkles, MapPin } from 'lucide-react'

export function TopNavbar({ onNavigate = () => {} }) {
  const cartCount = 2
  const notifications = 3

  return (
    <header className="sticky top-0 z-40 px-8 py-4 bg-white/70 backdrop-blur-xl border-b border-slate-100">
      <div className="flex justify-between items-center gap-10">
        
        {/* LEFT: BREADCRUMBS & LOCATION (Thêm vào cho đỡ trống bên trái) */}
        <div className="hidden lg:flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
            <MapPin size={16} className="text-indigo-600" />
            <span className="text-xs font-bold text-slate-600 uppercase tracking-tighter">Hồ Chí Minh</span>
          </div>
        </div>

        {/* CENTER: SEARCH BAR - Nâng cấp bo góc 2xl và hiệu ứng focus */}
        <div className="relative max-w-2xl w-full group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <Search className="text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
          </div>
          <input
            placeholder="Tìm kiếm thiết bị cinematic, lighting, drones..."
            className="w-full pl-12 pr-32 py-3.5 bg-slate-50 border-none rounded-[20px] text-sm font-medium focus:ring-2 focus:ring-indigo-500/20 focus:bg-white transition-all shadow-sm"
          />
          {/* AI Helper Badge (Thành phần mới cho "đủ" bộ) */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-xl cursor-pointer hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100">
            <Sparkles size={14} className="fill-current" />
            <span className="text-[10px] font-black uppercase tracking-widest">AI Planner</span>
          </div>
        </div>

        {/* RIGHT: ACTIONS - Bo góc mạnh và hiệu ứng Glass */}
        <div className="flex items-center gap-4">
          
          {/* Notification - Bo góc 2xl */}
          <button className="relative w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-500 hover:text-indigo-600 hover:shadow-md transition-all group">
            <Bell size={22} className="group-hover:shake" />
            {notifications > 0 && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full" />
            )}
          </button>

          {/* Cart - Bo góc 2xl */}
          <button
            onClick={() => onNavigate('checkout')}
            className="relative w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-500 hover:text-indigo-600 hover:shadow-md transition-all"
          >
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-slate-900 text-[10px] font-black text-white rounded-full flex justify-center items-center shadow-lg">
                {cartCount}
              </span>
            )}
          </button>

          {/* Vertical Divider */}
          <div className="w-[1px] h-8 bg-slate-100 mx-1" />

          {/* User Profile - Bo góc mạnh 18px */}
          <button
            onClick={() => onNavigate('profile')}
            className="flex items-center gap-3 pl-2 pr-4 py-2 bg-white rounded-2xl border border-slate-100 hover:shadow-md transition-all group"
          >
            <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-inner">
              <User size={18} />
            </div>
            <div className="hidden xl:block text-left">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Account</p>
              <p className="text-sm font-bold text-slate-900 leading-none">Văn A</p>
            </div>
          </button>
        </div>
      </div>
    </header>
  )
}