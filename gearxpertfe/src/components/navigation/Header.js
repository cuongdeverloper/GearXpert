import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { doLogout } from '../../redux/action/userAction';
import { persistor } from '../../redux/store';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const userAccount = useSelector((state) => state.user.account);
  const isAuthenticated = useSelector((state) => state.user.isAuthenticated);
  const socketConnection = useSelector((state) => state.user.account.socketConnection);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      // Disconnect socket if connected
      if (socketConnection) {
        socketConnection.disconnect();
      }

      // Dispatch logout action to clear Redux state
      dispatch(doLogout());

      // Remove cookies
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');

      // Purge Redux persist storage
      await persistor.purge();

      // Show success message
      toast.success('Đăng xuất thành công');

      // Close dropdown
      setIsDropdownOpen(false);

      // Navigate to login page
      navigate('/signin');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Có lỗi xảy ra khi đăng xuất');
    }
  };

  const menuItems = [
    { label: 'Trang chủ', icon: 'home', path: '/' },
    { label: 'Đơn thuê của tôi', icon: 'description', path: '/user/myrental' },
    { label: 'Vouchers', icon: 'local_activity', path: '/vouchers' },
    { label: 'Yêu thích', icon: 'favorite', path: '/favorites' },
  ];

  const handleRestrictedNavigation = (path) => {
    if (location.pathname === '/profile' && !userAccount.phone && !userAccount.phoneNumber) {
      toast.warning("Vui lòng cập nhật số điện thoại trước khi tiếp tục!");
      const phoneInput = document.getElementById('phone-input');
      if (phoneInput) {
        phoneInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        phoneInput.focus();
      }
      return;
    }
    navigate(path);
  };

  const handleMenuItemClick = (path) => {
    handleRestrictedNavigation(path);
    setIsDropdownOpen(false);
  };

  // Format rank display (GOLD -> Gold)
  const formatRank = (rank) => {
    if (!rank) return 'Gold';
    return rank.charAt(0) + rank.slice(1).toLowerCase();
  };

  // Get rank card class based on rank
  const getRankCardClass = (rank) => {
    if (!rank) return 'rank-card-gold';
    const rankUpper = rank.toUpperCase();
    if (rankUpper === 'GOLD') return 'rank-card-gold';
    if (rankUpper === 'BRONZE') return 'rank-card-bronze';
    if (rankUpper === 'SILVER') return 'rank-card-silver';
    return 'rank-card-gold'; // Default to gold
  };

  // Get rank inner background class based on rank
  const getRankInnerClass = (rank) => {
    if (!rank) return 'bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-200';
    const rankUpper = rank.toUpperCase();
    if (rankUpper === 'GOLD') return 'bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-200';
    if (rankUpper === 'BRONZE') return 'bg-gradient-to-br from-amber-800 via-amber-700 to-orange-600';
    if (rankUpper === 'SILVER') return 'bg-gradient-to-br from-slate-300 via-slate-200 to-gray-100';
    return 'bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-200'; // Default to gold
  };

  // Get rank text color class based on rank
  const getRankTextClass = (rank) => {
    if (!rank) return 'text-amber-900';
    const rankUpper = rank.toUpperCase();
    if (rankUpper === 'GOLD') return 'text-amber-900';
    if (rankUpper === 'BRONZE') return 'text-white';
    if (rankUpper === 'SILVER') return 'text-slate-800';
    return 'text-amber-900'; // Default to gold
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-panel bg-white/70 border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 h-[72px] flex items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => handleRestrictedNavigation('/')}
        >
          <div className="bg-primary rounded-xl p-2 text-white shadow-lg shadow-indigo-200">
            <span className="material-symbols-outlined text-[24px] block">videocam</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 font-display">GearXpert</h2>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <button
            className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors cursor-pointer bg-transparent border-none"
            onClick={() => handleRestrictedNavigation('/')}
          >
            Marketplace
          </button>
          <button
            className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors cursor-pointer bg-transparent border-none"
            onClick={() => handleRestrictedNavigation('/products')}
          >
            Productions
          </button>
          <button
            className="flex items-center gap-1.5 text-sm font-bold text-primary bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100 cursor-pointer bg-transparent"
            onClick={() => { }}
          >
            <span className="material-symbols-outlined text-[18px] fill-current">auto_awesome</span>
            AI Discovery
          </button>
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-3 md:gap-4">
          {isAuthenticated && (
            <>
              <button className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors">
                <span className="material-symbols-outlined text-[20px]">notifications</span>
              </button>

              <button
                onClick={() => handleRestrictedNavigation('/user/cart')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
              </button>
            </>
          )}

          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <div
                className="w-10 h-10 rounded-full ring-2 ring-white shadow-md cursor-pointer hover:ring-primary transition-all overflow-hidden flex items-center justify-center bg-gradient-to-r from-indigo-500 to-cyan-400"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {userAccount.image ? (
                  <img
                    src={userAccount.image}
                    alt="User Avatar"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="material-symbols-outlined text-[20px] text-white">person</span>
                )}
              </div>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                  {/* User Info */}
                  <div
                    className="p-4 border-b border-slate-100 bg-gradient-to-r from-primary/5 to-accent-cyan/5 cursor-pointer hover:from-primary/10 hover:to-accent-cyan/10 transition-all"
                    onClick={() => {
                      handleRestrictedNavigation('/profile');
                      setIsDropdownOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-full ring-2 ring-primary/20 overflow-hidden flex items-center justify-center bg-gradient-to-r from-indigo-500 to-cyan-400"
                      >
                        {userAccount.image ? (
                          <img
                            src={userAccount.image}
                            alt="User Avatar"
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <span className="material-symbols-outlined text-[24px] text-white">person</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 truncate">
                          {userAccount.username || userAccount.email || 'User'}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {userAccount.email || ''}
                        </p>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 text-[20px]">chevron_right</span>
                    </div>
                  </div>

                  {/* Rank & Wallet Cards */}
                  <div className="p-4 space-y-3 border-b border-slate-100">
                    {/* Rank Card */}
                    <div
                      className={`${getRankCardClass(userAccount.rank)} cursor-pointer hover:opacity-90 transition-opacity`}
                    >
                      <div className={`${getRankInnerClass(userAccount.rank)} relative rounded-[calc(0.75rem-3px)] w-full h-full flex items-center gap-3 p-3 z-[1]`}>
                        <div className="flex-shrink-0">
                          <span className={`material-symbols-outlined text-[24px] fill-current ${getRankTextClass(userAccount.rank)}`}>military_tech</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`flex items-center gap-2 flex-wrap ${getRankTextClass(userAccount.rank)}`}>
                            <span className="font-bold text-sm">Hạng {formatRank(userAccount.rank)}</span>
                            <span className={`${getRankTextClass(userAccount.rank)}/80 text-sm`}>•</span>
                            <span className="text-sm">{(userAccount.rewardPoints || 0).toLocaleString('vi-VN')} điểm</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Wallet Card */}
                    <div
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: '#D1FAE5' }}
                      onClick={() => {
                        handleRestrictedNavigation('/user/wallet');
                        setIsDropdownOpen(false);
                      }}
                    >
                      <div className="flex-shrink-0">
                        <span className="material-symbols-outlined text-[24px] text-slate-900">account_balance_wallet</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-slate-900 text-sm">
                          {(userAccount.walletBalance || 0).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">
                    {menuItems.map((item) => {
                      const isActive = location.pathname === item.path;
                      return (
                        <button
                          key={item.path}
                          onClick={() => handleMenuItemClick(item.path)}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isActive
                            ? 'bg-gradient-to-r from-primary/10 to-accent-cyan/10 text-primary'
                            : 'text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                          <span className={`material-symbols-outlined text-[20px] ${isActive ? 'fill-current' : ''}`}>
                            {item.icon}
                          </span>
                          <span>{item.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Divider */}
                  <div className="border-t border-slate-100"></div>

                  {/* Settings & Logout */}
                  <div className="py-2">
                    <button
                      onClick={() => {
                        // TODO: Navigate to settings
                        setIsDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">settings</span>
                      <span>Cài đặt</span>
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[20px]">logout</span>
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 md:gap-3">
              <button
                onClick={() => navigate('/signin', { state: { isSignUp: true } })}
                className="text-sm font-bold text-slate-600 hover:text-primary px-3 py-2 transition-colors cursor-pointer"
              >
                Đăng ký
              </button>
              <button
                onClick={() => navigate('/signin', { state: { isSignUp: false } })}
                className="bg-gradient-to-r from-primary to-accent-cyan text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
              >
                Đăng nhập
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
