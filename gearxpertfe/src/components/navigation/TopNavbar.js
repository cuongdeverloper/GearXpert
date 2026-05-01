/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import { useState, useEffect, useRef, useCallback } from 'react'
import { useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Search, ShoppingCart, Bell, User, Sparkles, MapPin, Check, Store } from 'lucide-react'
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../service/ApiService/notificationApi'
import { getCart } from '../../service/ApiService/CartApi'
import { useSocket } from '../../SocketContext'

const timeAgo = (date) => {
  if (!date) return ''
  const s = Math.floor((Date.now() - new Date(date)) / 1000)
  if (s < 60) return 'Vừa xong'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m} phút trước`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} giờ trước`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d} ngày trước`
  return new Date(date).toLocaleDateString('vi-VN')
}

export function TopNavbar({ onNavigate = () => {} }) {
  const navigate = useNavigate()
  const { isAuthenticated, account } = useSelector((state) => state.user)
  const { socket } = useSocket()
  const [cartCount, setCartCount] = useState(0)
  const [notifications, setNotifications] = useState([])
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const panelRef = useRef(null)

  const unreadCount = notifications.filter((n) => !n.isRead).length

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

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications()
      fetchCartCount()
    }
  }, [isAuthenticated])

  // Real-time: listen for new notifications via Socket.IO
  useEffect(() => {
    if (!socket) return

    const handleNewNotif = (notif) => {
      setNotifications((prev) => [notif, ...prev])
    }

    socket.on('newNotification', handleNewNotif)
    return () => socket.off('newNotification', handleNewNotif)
  }, [socket])

  // Real-time: listen for cart updates
  useEffect(() => {
    const handleCartUpdate = () => {
      fetchCartCount()
    }
    window.addEventListener('cartUpdated', handleCartUpdate)
    return () => window.removeEventListener('cartUpdated', handleCartUpdate)
  }, [fetchCartCount])

  // Close panel on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setShowNotifPanel(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await getNotifications()
      const list = Array.isArray(res) ? res : (res?.data?.notifications || res?.notifications || [])
      setNotifications(list)
    } catch {
      // silent
    }
  }

  const handleMarkRead = async (notifId) => {
    try {
      await markNotificationAsRead(notifId)
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n))
      )
    } catch {
      // silent
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsAsRead()
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    } catch {
      // silent
    }
  }

  const handleNotifClick = (notif) => {
    if (!notif.isRead) handleMarkRead(notif._id)
    if (notif.link) navigate(notif.link)
    setShowNotifPanel(false)
  }

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
          <div className="relative" ref={panelRef}>
            <button
              onClick={() => setShowNotifPanel(!showNotifPanel)}
              className="relative w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-500 hover:text-indigo-600 hover:shadow-md transition-all group"
            >
              <Bell size={22} className="group-hover:shake" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-[10px] font-bold text-white rounded-full flex items-center justify-center border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {showNotifPanel && (
              <div className="absolute right-0 top-14 w-80 max-h-[420px] bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <span className="font-bold text-sm text-slate-800">Thông báo</span>
                  {unreadCount > 0 && (
                    <button onClick={handleMarkAllRead} className="text-xs text-indigo-600 font-semibold hover:underline flex items-center gap-1">
                      <Check size={12} /> Đọc tất cả
                    </button>
                  )}
                </div>

                <div className="overflow-y-auto max-h-[340px]">
                  {notifications.length === 0 ? (
                    <p className="text-center text-sm text-slate-400 py-10">Không có thông báo</p>
                  ) : (
                    notifications.map((n) => (
                      <button
                        key={n._id}
                        onClick={() => handleNotifClick(n)}
                        className={`w-full text-left px-4 py-3 flex gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 ${!n.isRead ? 'bg-indigo-50/40' : ''}`}
                      >
                        {n.image ? (
                          <img src={n.image} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5" />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Bell size={16} className="text-slate-400" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800 truncate">{n.title}</p>
                          <p className="text-xs text-slate-500 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                        </div>
                        {!n.isRead && <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />}
                      </button>
                    ))
                  )}
                </div>

                {/* Footer: link to followed stores */}
                <div className="border-t border-slate-100 px-4 py-2">
                  <button
                    onClick={() => { navigate('/user/followed-stores'); setShowNotifPanel(false) }}
                    className="w-full text-center text-xs text-indigo-600 font-semibold hover:underline flex items-center justify-center gap-1 py-1"
                  >
                    <Store size={12} /> Cửa hàng đang theo dõi
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Cart - Bo góc 2xl */}
          <button
            data-cart-icon
            onClick={() => onNavigate('checkout')}
            className="relative w-12 h-12 flex items-center justify-center rounded-2xl bg-white border border-slate-100 text-slate-500 hover:text-indigo-600 hover:shadow-md transition-all"
          >
            <ShoppingCart size={22} />
            <span className={`absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 text-[10px] font-black text-white rounded-full flex justify-center items-center shadow-lg transition-colors ${cartCount > 0 ? 'bg-slate-900' : 'bg-slate-400'}`}>
              {cartCount}
            </span>
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