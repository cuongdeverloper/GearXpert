import { useNavigate, useLocation } from 'react-router-dom'
import { LogOut, Settings, Wallet, User, FileText, BarChart3, Home } from 'lucide-react'

export function Sidebar({ onLogout = () => {} }) {
  const navigate = useNavigate()
  const location = useLocation()

  const currentPath = location.pathname

  const user = {
    fullName: 'Nguyễn Văn A',
    email: 'user@renthub.vn',
    rank: 'Gold',
    loyaltyPoints: 1240,
    walletBalance: 3500000,
    avatar: null
  }

  const menuItems = [
    { label: 'Trang chủ', icon: Home, path: '/' },
    { label: 'Đơn thuê của tôi', icon: FileText, path: '/rental/manage' },
    { label: 'Ví của tôi', icon: Wallet, path: '/wallet' },
    { label: 'Thống kê', icon: BarChart3, path: '/statistics' } // có thể chưa làm
  ]

  return (
    <aside className="w-72 bg-white border-r flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">GearXpert</h2>
        <p className="text-sm text-gray-500">Khách hàng</p>
      </div>

      {/* User */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-purple-500 flex items-center justify-center text-white">
            <User />
          </div>
          <div>
            <p>{user.fullName}</p>
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

      {/* Menu */}
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map(item => {
          const Icon = item.icon
          const active = currentPath === item.path

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition ${
                active
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white'
                  : 'hover:bg-gray-100'
              }`}
            >
              <Icon size={18} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t space-y-2">
        <button className="flex gap-3 px-4 py-3 hover:bg-gray-100 rounded-xl">
          <Settings size={18} /> Cài đặt
        </button>
        <button
          onClick={onLogout}
          className="flex gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl"
        >
          <LogOut size={18} /> Đăng xuất
        </button>
      </div>
    </aside>
  )
}
