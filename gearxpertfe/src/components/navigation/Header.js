// src/components/Header/Header.jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { performLogout } from '../../utils/logout';
import MessengerPopup from '../Message Socket/MessengerPopup/MessengerPopup';
import useHeaderTheme from '../../hooks/useHeaderTheme';
import { useTranslation } from 'react-i18next';

import logo from '../../assets/logoGearXpert.png';

import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../../service/ApiService/notificationApi';
import { getMyWallet } from '../../service/ApiService/WalletApi';
import { getCart } from '../../service/ApiService/CartApi';
import { doLogin } from '../../redux/action/userAction';

// Magnetic Island Component for iOS-style hover tracking
const MagneticIsland = ({ children, className, spotlightColor = "rgba(99, 102, 241, 0.12)" }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 20, stiffness: 150 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const handleMouseMove = (e) => {
    const { currentTarget, clientX, clientY } = e;
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  };

  const handleMouseLeave = () => {
    // Reset to center or hide
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative group/island ${className}`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Container for background effects that need clipping */}
      <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none z-0">
        {/* iOS Spotlight Effect */}
        <motion.div
          className="absolute opacity-0 group-hover/island:opacity-100 transition-opacity duration-500"
          style={{
            width: '180px',
            height: '180px',
            borderRadius: '100%',
            background: `radial-gradient(circle, ${spotlightColor} 0%, transparent 70%)`,
            left: smoothX,
            top: smoothY,
            translateX: '-50%',
            translateY: '-50%',
            filter: 'blur(10px)',
          }}
        />

        {/* Subtle border shine tracking */}
        <motion.div
          className="absolute inset-0 border border-white/40 rounded-2xl opacity-0 group-hover/island:opacity-100 transition-opacity duration-500"
          style={{
            background: useSpring(
              useMotionValue('radial-gradient(400px circle at 0px 0px, rgba(255,255,255,0.4), transparent 40%)'),
              { damping: 20, stiffness: 150 }
            ),
            WebkitMaskImage: 'linear-gradient(black, black) content-box, linear-gradient(black, black)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          }}
        />
      </div>

      <div className="relative z-10 flex items-center h-full w-full">
        {children}
      </div>
    </motion.div>
  );
};

// Magnetic Item for individual buttons
const MagneticItem = ({ children, distance = 0.2 }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const smoothX = useSpring(x, { damping: 15, stiffness: 150 });
  const smoothY = useSpring(y, { damping: 15, stiffness: 150 });

  const handleMouseMove = (e) => {
    const { clientX, clientY, currentTarget } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    x.set((clientX - centerX) * distance);
    y.set((clientY - centerY) * distance);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: smoothX, y: smoothY }}
      className="flex items-center justify-center p-1"
    >
      {children}
    </motion.div>
  );
};

export default function Header({ onMenuOpen }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const { t, i18n } = useTranslation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMessengerOpen, setIsMessengerOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const messengerRef = useRef(null);
  const dropdownRef = useRef(null);
  const notificationRef = useRef(null);
  const mobileMenuRef = useRef(null);

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
      toast.error(t('header.fetch_notifications_error') || 'Không thể tải danh sách thông báo');
    } finally {
      setLoadingNotifications(false);
    }
  }, [isAuthenticated, t]);

  // Fetch cart count
  const fetchCartCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await getCart();
      const cartItems = res?.items || res || [];
      setCartCount(cartItems.length);
    } catch (err) {
      console.error('Fetch cart count error:', err);
    }
  }, [isAuthenticated]);

  // Refresh wallet balance when dropdown opens
  const refreshWalletBalance = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const walletRes = await getMyWallet();
      if (walletRes && walletRes.balance !== undefined) {
        dispatch(doLogin({
          data: {
            ...userAccount,
            walletBalance: walletRes.balance,
          }
        }));
      }
    } catch (err) {
      console.error('Refresh wallet error:', err);
    }
  }, [isAuthenticated, userAccount, dispatch]);

  // Load notifications khi authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      fetchCartCount();
    }
  }, [isAuthenticated, fetchNotifications, fetchCartCount]);

  // Real-time: listen for cart updates
  useEffect(() => {
    const handleCartUpdate = () => {
      fetchCartCount();
    };
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, [fetchCartCount]);

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

  // Refresh wallet balance when dropdown opens
  const hasRefreshedWallet = useRef(false);
  useEffect(() => {
    if (isDropdownOpen && !hasRefreshedWallet.current) {
      hasRefreshedWallet.current = true;
      refreshWalletBalance();
    }
    if (!isDropdownOpen) {
      hasRefreshedWallet.current = false;
    }
  }, [isDropdownOpen, refreshWalletBalance]);

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
      ? [{ label: t('header.dashboard'), icon: 'dashboard', path: '/supplier/dashboard' }]
      : []),

    ...(userAccount?.role === 'CUSTOMER'
      ? [{ label: t('header.become_supplier'), icon: 'storefront', path: '/become-supplier' }]
      : []),

    { label: t('header.my_rentals'), icon: 'description', path: '/user/myrental' },
    { label: t('productDetail.my_review'), icon: 'star', path: '/user/my-reviews' },
    { label: t('header.vouchers'), icon: 'local_activity', path: '/vouchers' },
    { label: t('header.favorites'), icon: 'favorite', path: '/favorites' },
  ];

  const navLinks = [
    { label: t('header.home'), path: '/', icon: 'home' },
    { label: t('header.devices'), path: '/products', icon: 'devices' },
    { label: t('header.shops'), path: '/suppliers', icon: 'storefront' },
    { label: t('header.blog'), path: '/blog', icon: 'article' },
    { label: t('header.ai_discover'), path: '/smartgear', icon: 'auto_awesome' },
  ];

  const handleRestrictedNavigation = (path) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleMenuItemClick = (path) => {
    handleRestrictedNavigation(path);
    setIsDropdownOpen(false);
  };

  // Rank formatting & styling helpers
  const formatRank = (rank) => {
    if (!rank) return 'Gold';
    const translatedRank = t(`header.rank_${rank.toLowerCase()}`, { defaultValue: rank });
    return translatedRank.charAt(0).toUpperCase() + translatedRank.slice(1).toLowerCase();
  };

  const getRankCardClass = (rank) => {
    const r = (rank || 'BRONZE').toUpperCase();
    if (r === 'DIAMOND') return 'rank-card-diamond shadow-fuchsia-500/30';
    if (r === 'PLATINUM') return 'rank-card-platinum shadow-blue-500/30';
    if (r === 'GOLD') return 'rank-card-gold shadow-yellow-500/30';
    if (r === 'SILVER') return 'rank-card-silver shadow-slate-400/30';
    return 'rank-card-bronze shadow-orange-500/30';
  };

  const getRankInnerClass = (rank) => {
    const r = (rank || 'BRONZE').toUpperCase();
    if (r === 'DIAMOND') return 'bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500';
    if (r === 'PLATINUM') return 'bg-gradient-to-br from-cyan-600 via-blue-500 to-indigo-400';
    if (r === 'GOLD') return 'bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-200';
    if (r === 'SILVER') return 'bg-gradient-to-br from-slate-300 via-slate-200 to-gray-100';
    return 'bg-gradient-to-br from-amber-800 via-amber-700 to-orange-600';
  };

  const getRankTextClass = (rank) => {
    const r = (rank || 'BRONZE').toUpperCase();
    if (r === 'DIAMOND') return 'text-white';
    if (r === 'PLATINUM') return 'text-white';
    if (r === 'GOLD') return 'text-amber-900';
    if (r === 'SILVER') return 'text-slate-800';
    return 'text-white';
  };

  const getRankIcon = (rank) => {
    const r = (rank || 'BRONZE').toUpperCase();
    if (r === 'DIAMOND') return 'diamond';
    if (r === 'PLATINUM') return 'loyalty';
    if (r === 'GOLD') return 'star';
    if (r === 'SILVER') return 'military_tech';
    return 'workspace_premium';
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

  const headerTheme = useHeaderTheme();
  const isDark = headerTheme === 'dark';

  // Dynamic theme classes
  const islandClass = `glass-panel h-16 lg:h-20 rounded-2xl shadow-xl border ring-1 transition-all duration-300 ${isDark
      ? 'bg-slate-900/60 backdrop-blur-xl border-white/10 ring-white/5 shadow-black/40'
      : 'bg-white/90 backdrop-blur-md border-white/80 ring-white/20 shadow-black/5'
    }`;

  const navItemClass = (isCurrent) => `relative text-sm lg:text-base font-bold transition-all duration-300 cursor-pointer bg-transparent border-none px-2 ${isCurrent
      ? 'text-primary'
      : isDark ? 'text-white/90 hover:text-white' : 'text-slate-700 hover:text-primary'
    }`;

  const iconBtnClass = (isOpen) => `w-10 h-10 lg:w-12 lg:h-12 flex items-center justify-center rounded-xl border transition-all duration-300 ${isOpen
      ? (isDark ? 'bg-white/20 text-white border-white/30' : 'bg-indigo-100 text-primary border-indigo-200')
      : (isDark ? 'bg-white/10 text-white/90 border-white/10 hover:bg-white/20 hover:text-white' : 'bg-slate-50/50 text-slate-600 border-slate-200 hover:bg-slate-100')
    }`;

  const dropdownClass = `absolute right-0 mt-2 rounded-2xl shadow-2xl border overflow-hidden z-50 transition-all duration-300 ${isDark
      ? 'bg-slate-900/95 backdrop-blur-xl border-white/10 text-white'
      : 'bg-white/95 backdrop-blur-xl border-slate-200 text-slate-900'
    }`;

  const dropdownItemClass = (isActive, isDangerous = false) => `w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors ${isActive
      ? 'bg-gradient-to-r from-primary/10 to-accent-cyan/10 text-primary'
      : isDangerous
        ? (isDark ? 'text-red-400 hover:bg-red-500/10' : 'text-red-600 hover:bg-red-50')
        : (isDark ? 'text-white/80 hover:bg-white/5 hover:text-white' : 'text-slate-700 hover:bg-slate-50')
    }`;

  return (
    <>
      <header className="fixed top-4 lg:top-6 z-50 w-full px-4 lg:px-8 pointer-events-none">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-3 lg:gap-4 pointer-events-auto">

          {/* Island 1: Logo & Mobile Toggle */}
          <MagneticIsland className={`${islandClass} px-3 lg:px-6 flex-shrink-0`}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                className={`lg:hidden p-2 rounded-xl transition-colors ${isDark ? 'text-white/70 hover:bg-white/10' : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <span className="material-symbols-outlined text-[24px]">menu</span>
              </button>

              <MagneticItem distance={0.15}>
                <div
                  className="flex items-center cursor-pointer group relative"
                  onClick={() => handleRestrictedNavigation('/')}
                >
                  <img
                    src={logo}
                    alt="GearXpert Logo"
                    className="h-16 lg:h-24 w-auto object-contain transition-all duration-500 group-hover:scale-105"
                    style={{
                      filter: isDark ? 'brightness(0) invert(1)' : 'brightness(1) invert(0)',
                      transition: 'filter 0.5s ease-in-out'
                    }}
                  />
                  <div className="hidden lg:block w-32 xl:w-40 h-1"></div>
                </div>
              </MagneticItem>
            </div>
          </MagneticIsland>

          {/* Island 2: Navigation - Desktop */}
          <MagneticIsland className={`hidden lg:flex gap-6 xl:gap-10 items-center px-6 xl:px-10 ${islandClass}`}>
            {navLinks.slice(0, 4).map((item) => {
              const isCurrent = item.path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.path);

              return (
                <MagneticItem key={item.path} distance={0.25}>
                  <button
                    className={navItemClass(isCurrent)}
                    onClick={() => handleRestrictedNavigation(item.path)}
                  >
                    {item.label}
                  </button>
                </MagneticItem>
              );
            })}

            <div className={`h-6 w-px mx-1 xl:mx-2 transition-colors duration-300 ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}></div>

            <MagneticItem distance={0.2}>
              <button
                className={`flex items-center gap-1.5 text-sm xl:text-base font-bold px-4 xl:px-5 py-2.5 rounded-xl border cursor-pointer transition-all duration-300 ${location.pathname.startsWith('/smartgear')
                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20 scale-105'
                    : (isDark
                      ? 'text-primary bg-primary/10 border-primary/20 hover:bg-primary/20 hover:text-white'
                      : 'text-primary bg-indigo-50/50 border-indigo-100/50 hover:bg-indigo-100')
                  }`}
                onClick={() => handleRestrictedNavigation('/smartgear')}
              >
                <span className={`material-symbols-outlined text-[18px] xl:text-[20px] ${location.pathname.startsWith('/smartgear') ? '' : 'fill-current'}`}>
                  auto_awesome
                </span>
                <span className="hidden sm:inline">{t('header.ai_discover')}</span>
              </button>
            </MagneticItem>
          </MagneticIsland>

          {/* Island 3: Actions */}
          <MagneticIsland className={`${islandClass} px-3 lg:px-5 flex items-center gap-2 lg:gap-4 flex-shrink-0`}>
            <div className="flex items-center gap-1 lg:gap-3 h-full">
              {/* Language Switcher - Desktop */}
              <div className="hidden md:flex items-center gap-1 mr-1 lg:mr-2 px-2 py-1 rounded-lg border border-transparent hover:border-primary/20 transition-all">
                <button
                  onClick={() => i18n.changeLanguage('vi')}
                  className={`text-[10px] lg:text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all ${i18n.language === 'vi' ? 'bg-primary text-white shadow-sm' : (isDark ? 'text-white/60 hover:text-white' : 'text-slate-500 hover:text-primary')}`}
                >
                  VI
                </button>
                <div className={`w-[1px] h-3 ${isDark ? 'bg-white/20' : 'bg-slate-300'}`}></div>
                <button
                  onClick={() => i18n.changeLanguage('en')}
                  className={`text-[10px] lg:text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all ${i18n.language === 'en' ? 'bg-primary text-white shadow-sm' : (isDark ? 'text-white/60 hover:text-white' : 'text-slate-500 hover:text-primary')}`}
                >
                  EN
                </button>
              </div>

              {isAuthenticated && (
                <>
                  {/* Messenger */}
                  <div className="relative" ref={messengerRef}>
                    <MagneticItem distance={0.3}>
                      <button
                        onClick={() => setIsMessengerOpen(!isMessengerOpen)}
                        className={iconBtnClass(isMessengerOpen)}
                      >
                        <span className={`material-symbols-outlined text-[20px] lg:text-[24px] ${isMessengerOpen ? 'fill-current' : ''}`}>
                          forum
                        </span>
                      </button>
                    </MagneticItem>

                    <AnimatePresence>
                      {isMessengerOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="fixed sm:absolute right-4 sm:right-0 mt-2 z-50"
                        >
                          <MessengerPopup setIsDropdownOpen={setIsMessengerOpen} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Notifications */}
                  <div className="relative" ref={notificationRef}>
                    <MagneticItem distance={0.3}>
                      <button
                        onClick={() => {
                          setIsNotificationOpen(!isNotificationOpen);
                          if (!isNotificationOpen) fetchNotifications();
                        }}
                        className={`relative ${iconBtnClass(isNotificationOpen)}`}
                      >
                        <span className="material-symbols-outlined text-[20px] lg:text-[24px]">notifications</span>
                        {unreadCount > 0 && (
                          <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[8px] lg:text-xs font-bold rounded-full min-w-[14px] lg:min-w-[18px] h-[14px] lg:h-[18px] flex items-center justify-center px-1 animate-pulse">
                            {unreadCount > 99 ? '99+' : unreadCount}
                          </span>
                        )}
                      </button>
                    </MagneticItem>

                    <AnimatePresence>
                      {isNotificationOpen && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className={`${dropdownClass} fixed sm:absolute right-4 sm:right-0 w-[calc(100vw-32px)] sm:w-80 md:w-96 max-h-[60vh] flex flex-col`}
                        >
                          {/* Header */}
                          <div className={`p-4 border-b flex items-center justify-between transition-colors ${isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
                            <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>{t('header.notifications')}</h3>
                            {unreadCount > 0 && (
                              <button onClick={markAllAsRead} className="text-sm text-primary hover:underline font-bold">
                                {t('header.mark_all_read')}
                              </button>
                            )}
                          </div>

                          {/* Content */}
                          <div className="overflow-y-auto flex-1 custom-scrollbar">
                            {loadingNotifications ? (
                              <div className="py-10 text-center text-slate-500 text-sm">{t('header.loading')}</div>
                            ) : notifications.length === 0 ? (
                              <div className="py-10 text-center text-slate-500 text-sm">{t('header.no_notifications')}</div>
                            ) : (
                              notifications.map((notif) => (
                                  <div
                                    key={notif._id}
                                    onClick={() => {
                                      if (!notif.isRead) markAsRead(notif._id);
                                      if (notif.link) navigate(notif.link);
                                      setIsNotificationOpen(false);
                                    }}
                                    className={`p-4 border-b cursor-pointer transition-all duration-300 relative group/notif ${
                                      isDark ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'
                                    } ${!notif.isRead ? (isDark ? 'bg-indigo-500/10' : 'bg-indigo-50/60') : ''}`}
                                  >
                                    {!notif.isRead && (
                                      <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-full"></div>
                                    )}
                                    
                                    <div className="flex items-start gap-4">
                                      <div
                                        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm transition-transform group-hover/notif:scale-110 ${(() => {
                                          const t = notif.type;
                                          if (t === 'ORDER') return isDark ? 'bg-indigo-500/20 text-indigo-400 ring-1 ring-indigo-500/30' : 'bg-indigo-100 text-indigo-600 ring-1 ring-indigo-200';
                                          if (t === 'PAYMENT') return isDark ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/30' : 'bg-emerald-100 text-emerald-600 ring-1 ring-emerald-200';
                                          if (t === 'CHAT') return isDark ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/30' : 'bg-cyan-100 text-cyan-600 ring-1 ring-cyan-200';
                                          if (t === 'LIKE') return isDark ? 'bg-pink-500/20 text-pink-400 ring-1 ring-pink-500/30' : 'bg-pink-100 text-pink-600 ring-1 ring-pink-200';
                                          if (t === 'COMMENT') return isDark ? 'bg-blue-500/20 text-blue-400 ring-1 ring-blue-500/30' : 'bg-blue-100 text-blue-600 ring-1 ring-blue-200';
                                          if (t === 'STORE_VOUCHER') return isDark ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/30' : 'bg-amber-100 text-amber-600 ring-1 ring-amber-200';
                                          if (t?.startsWith('STORE_')) return isDark ? 'bg-violet-500/20 text-violet-400 ring-1 ring-violet-500/30' : 'bg-violet-100 text-violet-600 ring-1 ring-violet-200';
                                          if (t?.includes('ISSUE') || t?.includes('REPORT')) return isDark ? 'bg-red-500/20 text-red-400 ring-1 ring-red-500/30' : 'bg-red-100 text-red-600 ring-1 ring-red-200';
                                          return isDark ? 'bg-slate-500/20 text-slate-400 ring-1 ring-slate-500/30' : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200';
                                        })()}`}
                                      >
                                        <span className="material-symbols-outlined text-[24px]">
                                          {(() => {
                                            const t = notif.type;
                                            if (t === 'ORDER') return 'package_2';
                                            if (t === 'PAYMENT') return 'account_balance_wallet';
                                            if (t === 'CHAT') return 'forum';
                                            if (t === 'LIKE') return 'favorite';
                                            if (t === 'COMMENT') return 'comment';
                                            if (t === 'STORE_VOUCHER') return 'local_activity';
                                            if (t?.startsWith('STORE_')) return 'storefront';
                                            if (t?.includes('ISSUE') || t?.includes('REPORT')) return 'report_problem';
                                            if (t === 'SYSTEM' || t === 'ADMIN_BROADCAST') return 'notifications_active';
                                            return 'notifications';
                                          })()}
                                        </span>
                                      </div>

                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                           <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${(() => {
                                             const t = notif.type;
                                             if (t === 'ORDER') return 'bg-indigo-500/10 text-indigo-500';
                                             if (t === 'PAYMENT') return 'bg-emerald-500/10 text-emerald-500';
                                             if (t === 'CHAT') return 'bg-cyan-500/10 text-cyan-500';
                                             if (t === 'STORE_VOUCHER') return 'bg-amber-500/10 text-amber-500';
                                             if (t?.includes('ISSUE') || t?.includes('REPORT')) return 'bg-red-500/10 text-red-500';
                                             return 'bg-slate-500/10 text-slate-500';
                                           })()}`}>
                                             {notif.type?.replace(/_/g, ' ') || 'SYSTEM'}
                                           </span>
                                           <span className={`text-[10px] font-medium ${isDark ? 'text-white/40' : 'text-slate-400'}`}>
                                              {new Date(notif.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                           </span>
                                        </div>
                                        <p className={`text-sm font-bold leading-snug mb-1 ${isDark ? 'text-white' : 'text-slate-900'} ${!notif.isRead ? '' : 'opacity-80'}`}>
                                          {notif.title}
                                        </p>
                                        <p className={`text-xs line-clamp-2 leading-relaxed ${isDark ? 'text-white/60' : 'text-slate-600'}`}>
                                          {notif.message}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Cart */}
                  <MagneticItem distance={0.3}>
                    <button
                      data-cart-icon
                      onClick={() => handleRestrictedNavigation('/user/cart')}
                      className={`${iconBtnClass(location.pathname === '/user/cart')} relative`}
                    >
                      <span className="material-symbols-outlined text-[20px] lg:text-[24px]">shopping_bag</span>
                      <span className={`absolute -top-0.5 -right-0.5 min-w-[14px] lg:min-w-[18px] h-[14px] lg:h-[18px] text-white text-[8px] lg:text-[10px] font-bold rounded-full flex items-center justify-center px-1 ${cartCount > 0 ? 'bg-red-500' : 'bg-slate-400'}`}>
                        {cartCount > 99 ? '99+' : cartCount}
                      </span>
                    </button>
                  </MagneticItem>
                </>
              )}

              {/* User Profile / Auth Buttons */}
              {isAuthenticated ? (
                <div className="relative" ref={dropdownRef}>
                  <MagneticItem distance={0.4}>
                    <div
                      className={`w-12 h-12 rounded-xl ring-2 shadow-md cursor-pointer transition-all duration-300 overflow-hidden flex items-center justify-center bg-gradient-to-r from-indigo-500 to-cyan-400 group/avatar ${isDark ? 'ring-white/20 hover:ring-primary' : 'ring-white hover:ring-primary'
                        }`}
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    >
                      {userAccount.image ? (
                        <img
                          src={userAccount.image}
                          alt="Avatar"
                          className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-[24px] text-white">person</span>
                      )}
                    </div>
                  </MagneticItem>

                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10, originX: 'right', originY: 'top' }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className={`${dropdownClass} w-64`}
                      >
                        {/* User Info Card */}
                        <div
                          className={`p-4 border-b transition-all cursor-pointer ${isDark
                              ? 'border-white/10 bg-white/5 hover:bg-white/10'
                              : 'border-slate-100 bg-gradient-to-r from-primary/5 to-accent-cyan/5 hover:from-primary/10 hover:to-accent-cyan/10'
                            }`}
                          onClick={() => {
                            handleRestrictedNavigation('/profile');
                            setIsDropdownOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl ring-2 ring-primary/20 overflow-hidden flex items-center justify-center bg-gradient-to-r from-indigo-500 to-cyan-400">
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
                              <p className={`font-semibold truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {userAccount.username || userAccount.email || 'User'}
                              </p>
                              <p className={`text-xs truncate ${isDark ? 'text-white/60' : 'text-slate-500'}`}>{userAccount.email || ''}</p>
                            </div>
                            <span className={`material-symbols-outlined text-[20px] ${isDark ? 'text-white/30' : 'text-slate-400'}`}>chevron_right</span>
                          </div>
                        </div>

                        {/* Rank & Wallet */}
                        <div className={`p-4 space-y-3 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                          {/* Rank */}
                          <div
                            className={`${getRankCardClass(userAccount.rank)} cursor-pointer hover:opacity-90 transition-opacity`}
                            onClick={() => {
                              handleRestrictedNavigation('/user/rank');
                              setIsDropdownOpen(false);
                            }}
                          >
                            <div className={`${getRankInnerClass(userAccount.rank)} relative rounded-[calc(0.75rem-3px)] w-full h-full flex items-center gap-3 p-3 z-[1]`}>
                              <div className="flex-shrink-0">
                                <span className={`material-symbols-outlined text-[24px] fill-current ${getRankTextClass(userAccount.rank)}`}>
                                  {getRankIcon(userAccount.rank)}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className={`flex items-center gap-2 flex-wrap ${getRankTextClass(userAccount.rank)}`}>
                                  <span className="font-bold text-sm">{t('header.rank')} {formatRank(userAccount.rank)}</span>
                                  <span className={`${getRankTextClass(userAccount.rank)}/80 text-sm`}>•</span>
                                  <span className="text-sm">{(userAccount.rewardPoints || 0).toLocaleString('vi-VN')} {t('header.points')}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Wallet */}
                          <div
                            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: isDark ? '#064e3b' : '#D1FAE5' }}
                            onClick={() => {
                              handleRestrictedNavigation('/user/wallet');
                              setIsDropdownOpen(false);
                            }}
                          >
                            <div className="flex-shrink-0">
                              <span className={`material-symbols-outlined text-[24px] ${isDark ? 'text-emerald-400' : 'text-slate-900'}`}>account_balance_wallet</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className={`font-bold text-sm ${isDark ? 'text-emerald-100' : 'text-slate-900'}`}>
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
                                className={dropdownItemClass(isActive)}
                              >
                                <span className={`material-symbols-outlined text-[20px] ${isActive ? 'fill-current' : ''}`}>
                                  {item.icon}
                                </span>
                                <span>{item.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        <div className={`border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}></div>

                        {/* Settings & Logout */}
                        <div className="py-2">
                          <button
                            onClick={() => {
                              setIsDropdownOpen(false);
                            }}
                            className={dropdownItemClass(false)}
                          >
                            <span className="material-symbols-outlined text-[20px]">settings</span>
                            <span>{t('header.settings')}</span>
                          </button>
                          <button
                            onClick={handleLogout}
                            className={dropdownItemClass(false, true)}
                          >
                            <span className="material-symbols-outlined text-[20px]">logout</span>
                            <span>{t('header.logout')}</span>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="flex items-center gap-2 md:gap-3">
                  <MagneticItem distance={0.2}>
                    <button
                      onClick={() => navigate('/signin', { state: { isSignUp: true } })}
                      className={`text-sm font-bold px-3 py-2 transition-colors cursor-pointer ${isDark ? 'text-white/80 hover:text-white' : 'text-slate-600 hover:text-primary'
                        }`}
                    >
                      {t('header.signup')}
                    </button>
                  </MagneticItem>
                  <MagneticItem distance={0.2}>
                    <button
                      onClick={() => navigate('/signin', { state: { isSignUp: false } })}
                      className="bg-gradient-to-r from-primary to-accent-cyan text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      {t('header.signin')}
                    </button>
                  </MagneticItem>
                </div>
              )}
            </div>
          </MagneticIsland>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100]"
            />

            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className={`fixed top-0 left-0 bottom-0 w-[280px] sm:w-[320px] z-[101] shadow-2xl flex flex-col ${isDark ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'}`}
              ref={mobileMenuRef}
            >
              {/* Drawer Header */}
              <div className={`p-6 flex items-center justify-between border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
                <img src={logo} alt="Logo" className="h-12 w-auto" style={{ filter: isDark ? 'brightness(0) invert(1)' : 'none' }} />
                <button onClick={() => setIsMobileMenuOpen(false)} className={`p-2 rounded-lg ${isDark ? 'hover:bg-white/10' : 'hover:bg-slate-100'}`}>
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Drawer Nav Links */}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 px-4 mb-4">{t('header.navigation')}</p>
                {navLinks.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => handleRestrictedNavigation(item.path)}
                    className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold transition-all ${location.pathname === item.path
                        ? 'bg-primary text-white shadow-lg shadow-primary/20'
                        : isDark ? 'hover:bg-white/10' : 'hover:bg-slate-50'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[24px]">{item.icon || (item.path === '/' ? 'home' : item.path.includes('product') ? 'devices' : item.path.includes('supplier') ? 'storefront' : 'article')}</span>
                    <span>{item.label}</span>
                  </button>
                ))}

                <div className={`my-6 border-t ${isDark ? 'border-white/10' : 'border-slate-100'}`}></div>

                <p className="text-[10px] font-bold uppercase tracking-widest opacity-50 px-4 mb-4">{t('header.language')}</p>
                <div className="flex gap-2 px-4">
                  <button onClick={() => i18n.changeLanguage('vi')} className={`flex-1 py-2 rounded-xl font-bold border transition-all ${i18n.language === 'vi' ? 'bg-primary text-white border-primary' : (isDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50')}`}>VI</button>
                  <button onClick={() => i18n.changeLanguage('en')} className={`flex-1 py-2 rounded-xl font-bold border transition-all ${i18n.language === 'en' ? 'bg-primary text-white border-primary' : (isDark ? 'border-white/10 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50')}`}>EN</button>
                </div>
              </div>

              {/* Drawer Footer (User Info if Auth) */}
              {isAuthenticated && (
                <div className={`p-6 border-t ${isDark ? 'border-white/10 bg-white/5' : 'border-slate-100 bg-slate-50'}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full overflow-hidden">
                      {userAccount.image ? <img src={userAccount.image} alt="Avt" /> : <div className="w-full h-full bg-primary flex items-center justify-center text-white"><span className="material-symbols-outlined">person</span></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold truncate text-sm">{userAccount.username || userAccount.email}</p>
                      <p className="text-xs opacity-60">{formatRank(userAccount.rank)}</p>
                    </div>
                  </div>
                  <button onClick={handleLogout} className="w-full py-3 rounded-xl font-bold text-red-500 border border-red-500/20 hover:bg-red-500/5 transition-all flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined">logout</span>
                    {t('header.logout')}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

