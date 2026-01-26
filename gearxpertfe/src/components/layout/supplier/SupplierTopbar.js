import { FiMenu, FiBell, FiSearch, FiUser, FiLogOut } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { performLogout } from "../../../utils/logout";

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

          <button
            className={`flex items-center gap-2 pl-2 pr-4 py-2 bg-white rounded-2xl border border-slate-200 hover:shadow-md transition-all group relative ${RANK_STYLES[me?.rank]?.border || ''}`}
            style={{
              borderColor: RANK_STYLES[me?.rank]?.color || undefined,
              animationDuration: me?.rank && me.rank !== 'BRONZE' ? '2s' : undefined
            }}
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