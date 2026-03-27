import { FiBell, FiSearch, FiUser, FiMenu, FiLogOut } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { performLogout } from "../../../utils/logout";
import logo from "../../../assets/logoGearXpert.png";
import LanguageSwitcher from "../../common/LanguageSwitcher";
import { useI18n } from "../../../i18n/I18nContext";

export default function AdminTopbar({ onMenuOpen, me }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const account = useSelector((state) => state.user.account);
  const { t } = useI18n();

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
              <div className="text-xs text-slate-500 font-medium">{t("topbar.adminPortal")}</div>
            </div>
          </div>
        </div>

        {/* Center: Search bar (hidden on mobile/tablet) */}
        <div className="hidden lg:flex flex-1 max-w-sm items-center gap-2 rounded-2xl bg-slate-50 px-4 py-2.5 border border-slate-200 text-sm text-slate-600 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
          <FiSearch className="text-slate-400 shrink-0" size={18} />
          <input
            className="w-full bg-transparent outline-none placeholder:text-slate-400 text-sm"
            placeholder={t("topbar.searchAdminPlaceholder")}
          />
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 lg:gap-3 ml-auto">
          <LanguageSwitcher className="hidden md:inline-flex" />
          {/* Notifications */}
          <button
            className="relative w-10 h-10 flex items-center justify-center rounded-2xl bg-white border border-slate-200 text-slate-600 hover:text-primary hover:shadow-md transition-all shrink-0"
            aria-label="Notifications"
          >
            <FiBell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>

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
            <span className="hidden lg:inline text-sm font-semibold">{t("topbar.logout")}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
