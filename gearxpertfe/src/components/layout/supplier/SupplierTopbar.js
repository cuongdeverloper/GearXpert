import { FiMenu, FiBell, FiSearch, FiUser } from "react-icons/fi";

export default function SupplierTopbar({ onMenuOpen, me }) {
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
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-primary to-primary-dark p-2 rounded-2xl shadow-lg shadow-primary/20">
            <span className="text-white font-bold text-lg">GX</span>
          </div>
          <div className="hidden sm:block">
            <div className="text-sm font-bold text-slate-900 font-display">GearXpert</div>
            <div className="text-xs text-slate-500 font-medium">Supplier Portal</div>
          </div>
        </div>

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
          <button
            className="relative w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-primary hover:shadow-md transition-all"
            aria-label="Notifications"
          >
            <FiBell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

          <div className="w-px h-8 bg-slate-200 hidden lg:block" />

          <button className="flex items-center gap-2 pl-2 pr-4 py-2 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all group">
            <div className="w-9 h-9 bg-gradient-to-br from-primary to-primary-dark rounded-xl flex items-center justify-center text-white">
              <FiUser size={18} />
            </div>
            <span className="hidden xl:inline text-sm font-semibold text-slate-900">{me?.name || "Supplier"}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
