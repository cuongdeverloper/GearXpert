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
  ChevronRight
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
        collapsed ? 'w-20' : 'w-72'
      } bg-white border-r flex flex-col transition-all duration-300`}
    >
      {/* LOGO */}
      <div className="p-4 border-b flex items-center justify-between">
        {!collapsed && (
          <div>
            <h2 className="text-lg font-semibold">GearXpert</h2>
            <p className="text-sm text-gray-500">Khách hàng</p>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-gray-100"
        >
          {collapsed ? <ChevronRight /> : <ChevronLeft />}
        </button>
      </div>

      {/* USER */}
      {!collapsed && (
        <div className="p-6 border-b">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center text-white">
              <User />
            </div>
            <div>
              <p className="font-medium">{user.fullName}</p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>

          <div className="bg-yellow-500 rounded-lg p-2 mb-2 text-white text-sm">
            🥇 Hạng Gold · {user.loyaltyPoints} điểm
          </div>

          <div className="flex items-center gap-2 bg-green-50 p-2 rounded-lg">
            <Wallet size={16} />
            <span>{user.walletBalance.toLocaleString()}đ</span>
          </div>
        </div>
      )}

      {/* MENU */}
      <nav className="flex-1 p-3 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon
          const active = location.pathname === item.path

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                active
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'hover:bg-gray-100'
              } ${collapsed ? 'justify-center' : ''}`}
            >
              <Icon size={20} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* BOTTOM */}
      <div className="p-3 border-t space-y-2">
        <button
          className={`flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-gray-100 w-full ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <Settings size={18} />
          {!collapsed && 'Cài đặt'}
        </button>

        <button
          onClick={onLogout}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 w-full ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut size={18} />
          {!collapsed && 'Đăng xuất'}
        </button>
      </div>
    </aside>
  )
}
