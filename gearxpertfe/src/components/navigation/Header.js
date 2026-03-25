// src/components/Header/Header.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { performLogout } from '../../utils/logout';
import MessengerPopup from '../Message Socket/MessengerPopup/MessengerPopup';

import logo from '../../assets/logoGearXpert.png';

import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../service/ApiService/notificationApi'; // ← import api mới

export default function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMessengerOpen, setIsMessengerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const messengerRef = useRef(null);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);

  const userAccount = useSelector((state) => state.user.account);
  const isAuthenticated = useSelector((state) => state.user.isAuthenticated);
  const socketConnection = useSelector((state) => state.user.account.socketConnection);

  // Fetch notifications using api
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingNotifications(true);
    try {
      const res = await getNotifications();
      const data = res || [];
      setNotifications(data);
    } catch (err) {
      console.error('Fetch notifications error:', err);
      toast.error('Không thể tải danh sách thông báo');
    } finally {
      setLoadingNotifications(false);
    }
  }, [isAuthenticated]);

  // Load notifications khi authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
    }
  }, [isAuthenticated, fetchNotifications]);

  // Socket realtime notification
  useEffect(() => {
    if (!socketConnection) return;

    const handleNewNotification = (newNotif) => {
      // Bỏ thông báo toast cho LIKE và COMMENT, các loại khác (như ORDER) vẫn hiện
      if (newNotif.type !== 'LIKE' && newNotif.type !== 'COMMENT') {
        toast.info(newNotif.message || newNotif.title, { autoClose: 6000 });
      }
      setNotifications((prev) => [newNotif, ...prev]);
    };

    socketConnection.on('getNotification', handleNewNotification);

    return () => {
      socketConnection.off('getNotification', handleNewNotification);
    };
  }, [socketConnection]);

  // Close panels on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (messengerRef.current && !messengerRef.current.contains(event.target)) {
        setIsMessengerOpen(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await performLogout({
      dispatch,
      navigate,
      socketConnection,
      toast,
      onDone: () => setIsDropdownOpen(false),
    });
  };

  const menuItems = [
    ...(userAccount?.role === 'SUPPLIER'
      ? [{ label: 'Dashboard', icon: 'dashboard', path: '/supplier/dashboard' }]
      : []),
      
    ...(userAccount?.role === 'CUSTOMER'
      ? [{ label: 'Trở thành Nhà cung cấp', icon: 'storefront', path: '/become-supplier' }]
      : []),

    { label: 'Đơn thuê của tôi', icon: 'description', path: '/user/myrental' },
    { label: 'Vouchers', icon: 'local_activity', path: '/vouchers' },
    { label: 'Yêu thích', icon: 'favorite', path: '/favorites' },
  ];

  const handleRestrictedNavigation = (path) => {
    navigate(path);
  };

  const handleMenuItemClick = (path) => {
    handleRestrictedNavigation(path);
    setIsDropdownOpen(false);
  };

  // Rank formatting & styling helpers
  const formatRank = (rank) => {
    if (!rank) return 'Gold';
    return rank.charAt(0) + rank.slice(1).toLowerCase();
  };

  const getRankCardClass = (rank) => {
    const r = (rank || 'GOLD').toUpperCase();
    if (r === 'GOLD') return 'rank-card-gold';
    if (r === 'BRONZE') return 'rank-card-bronze';
    if (r === 'SILVER') return 'rank-card-silver';
    return 'rank-card-gold';
  };

  const getRankInnerClass = (rank) => {
    const r = (rank || 'GOLD').toUpperCase();
    if (r === 'GOLD') return 'bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-200';
    if (r === 'BRONZE') return 'bg-gradient-to-br from-amber-800 via-amber-700 to-orange-600';
    if (r === 'SILVER') return 'bg-gradient-to-br from-slate-300 via-slate-200 to-gray-100';
    return 'bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-200';
  };

  const getRankTextClass = (rank) => {
    const r = (rank || 'GOLD').toUpperCase();
    if (r === 'GOLD') return 'text-amber-900';
    if (r === 'BRONZE') return 'text-white';
    if (r === 'SILVER') return 'text-slate-800';
    return 'text-amber-900';
  };

  // Mark as read using api
  const markAsRead = async (notifId) => {
    try {
      await markNotificationAsRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Mark as read error:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Mark all as read error:', err);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-panel bg-white/70 border-b border-slate-200">
      <div className="max-w-[1440px] mx-auto px-6 lg:px-10 h-24 flex items-center justify-between relative">
        {/* Logo */}
        <div
          className="flex items-center cursor-pointer group relative z-10"
          onClick={() => handleRestrictedNavigation('/')}
        >
          <img 
            src={logo} 
            alt="GearXpert Logo" 
            className="h-32 w-auto object-contain transition-transform group-hover:scale-110 absolute top-1/2 -translate-y-1/2 left-0 drop-shadow-lg" 
          />
          {/* Container for alignment spacing */}
          <div className="w-60 h-1"></div>
        </div>

        {/* Navigation - Desktop */}
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
            className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors cursor-pointer bg-transparent border-none"
            onClick={() => handleRestrictedNavigation('/suppliers')}
          >
            Shops
          </button>
          <button
            className="text-sm font-semibold text-slate-600 hover:text-primary transition-colors cursor-pointer bg-transparent border-none"
            onClick={() => handleRestrictedNavigation('/blog')}
          >
            Blog
          </button>
          <button
            className="flex items-center gap-1.5 text-sm font-bold text-primary bg-indigo-50 px-4 py-2 rounded-full border border-indigo-100 cursor-pointer bg-transparent"
            onClick={() => handleRestrictedNavigation('/smartgear')}
          >
            <span className="material-symbols-outlined text-[18px] fill-current">auto_awesome</span>
            AI Discovery
          </button>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-3 md:gap-4">
          {isAuthenticated && (
            <>
              {/* Messenger */}
              <div className="relative" ref={messengerRef}>
                <button
                  onClick={() => setIsMessengerOpen(!isMessengerOpen)}
                  className={`w-10 h-10 flex items-center justify-center rounded-full border transition-colors ${isMessengerOpen
                      ? 'bg-indigo-100 text-primary border-indigo-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${isMessengerOpen ? 'fill-current' : ''}`}>
                    forum
                  </span>
                </button>

                {isMessengerOpen && <MessengerPopup setIsDropdownOpen={setIsMessengerOpen} />}
              </div>

              {/* Notifications */}
              <div className="relative" ref={notificationRef}>
                <button
                  onClick={() => {
                    setIsNotificationOpen(!isNotificationOpen);
                    if (!isNotificationOpen) fetchNotifications();
                  }}
                  className={`w-10 h-10 flex items-center justify-center rounded-full border transition-colors relative ${isNotificationOpen
                      ? 'bg-indigo-100 text-primary border-indigo-200'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                >
                  <span className="material-symbols-outlined text-[20px]">notifications</span>

                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </button>

                {isNotificationOpen && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50 max-h-[70vh] flex flex-col">
                    {/* Header */}
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <h3 className="font-semibold text-slate-900">Thông báo</h3>
                      {unreadCount > 0 && (
                        <button onClick={markAllAsRead} className="text-sm text-primary hover:underline">
                          Đánh dấu tất cả đã đọc
                        </button>
                      )}
                    </div>

                    {/* Content */}
                    <div className="overflow-y-auto flex-1">
                      {loadingNotifications ? (
                        <div className="py-10 text-center text-slate-500">Đang tải thông báo...</div>
                      ) : notifications.length === 0 ? (
                        <div className="py-10 text-center text-slate-500">Chưa có thông báo nào</div>
                      ) : (
                        notifications.map((notif) => (
                          <div
                            key={notif._id}
                            onClick={() => {
                              if (!notif.isRead) markAsRead(notif._id);
                              if (notif.link) navigate(notif.link);
                              setIsNotificationOpen(false);
                            }}
                            className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${!notif.isRead ? 'bg-indigo-50/50' : ''
                              }`}
                          >
                            <div className="flex items-start gap-3">
                              <div
                                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                                  notif.type === 'ORDER' ? 'bg-indigo-100 text-indigo-600' : 
                                  notif.type === 'LIKE' ? 'bg-pink-100 text-pink-600' :
                                  notif.type === 'COMMENT' ? 'bg-blue-100 text-blue-600' :
                                  'bg-slate-100 text-slate-600'
                                }`}
                              >
                                <span className="material-symbols-outlined text-[20px]">
                                  {
                                    notif.type === 'ORDER' ? 'inventory_2' : 
                                    notif.type === 'LIKE' ? 'favorite' :
                                    notif.type === 'COMMENT' ? 'comment' :
                                    'notifications'
                                  }
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-900">{notif.title}</p>
                                <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">{notif.message}</p>
                                <p className="text-xs text-slate-500 mt-1.5">
                                  {new Date(notif.createdAt).toLocaleString('vi-VN', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    day: 'numeric',
                                    month: 'short',
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Cart */}
              <button
                onClick={() => handleRestrictedNavigation('/user/cart')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">shopping_bag</span>
              </button>
            </>
          )}

          {/* User Profile / Auth Buttons */}
          {isAuthenticated ? (
            <div className="relative" ref={dropdownRef}>
              <div
                className="w-10 h-10 rounded-full ring-2 ring-white shadow-md cursor-pointer hover:ring-primary transition-all overflow-hidden flex items-center justify-center bg-gradient-to-r from-indigo-500 to-cyan-400"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              >
                {userAccount.image ? (
                  <img
                    src={userAccount.image}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="material-symbols-outlined text-[20px] text-white">person</span>
                )}
              </div>

              {isDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden z-50">
                  {/* User Info Card */}
                  <div
                    className="p-4 border-b border-slate-100 bg-gradient-to-r from-primary/5 to-accent-cyan/5 cursor-pointer hover:from-primary/10 hover:to-accent-cyan/10 transition-all"
                    onClick={() => {
                      handleRestrictedNavigation('/profile');
                      setIsDropdownOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full ring-2 ring-primary/20 overflow-hidden flex items-center justify-center bg-gradient-to-r from-indigo-500 to-cyan-400">
                        {userAccount.image ? (
                          <img
                            src={userAccount.image}
                            alt="Avatar"
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
                        <p className="text-xs text-slate-500 truncate">{userAccount.email || ''}</p>
                      </div>
                      <span className="material-symbols-outlined text-slate-400 text-[20px]">chevron_right</span>
                    </div>
                  </div>

                  {/* Rank & Wallet */}
                  <div className="p-4 space-y-3 border-b border-slate-100">
                    {/* Rank */}
                    <div className={`${getRankCardClass(userAccount.rank)} cursor-pointer hover:opacity-90 transition-opacity`}>
                      <div className={`${getRankInnerClass(userAccount.rank)} relative rounded-[calc(0.75rem-3px)] w-full h-full flex items-center gap-3 p-3 z-[1]`}>
                        <div className="flex-shrink-0">
                          <span className={`material-symbols-outlined text-[24px] fill-current ${getRankTextClass(userAccount.rank)}`}>
                            military_tech
                          </span>
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

                    {/* Wallet */}
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
                          className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isActive ? 'bg-gradient-to-r from-primary/10 to-accent-cyan/10 text-primary' : 'text-slate-700 hover:bg-slate-50'
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

                  <div className="border-t border-slate-100"></div>

                  {/* Settings & Logout */}
                  <div className="py-2">
                    <button
                      onClick={() => {
                        // TODO: Navigate to settings page
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
