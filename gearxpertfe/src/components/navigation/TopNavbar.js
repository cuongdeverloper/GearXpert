import { Search, ShoppingCart, Bell, User } from 'lucide-react'

export function TopNavbar({ onNavigate = () => {} }) {
  const cartCount = 2
  const notifications = 3

  return (
    <header className="bg-white border-b px-8 py-4">
      <div className="flex justify-between items-center gap-6">
        {/* SEARCH */}
        <div className="relative max-w-xl w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Tìm kiếm thiết bị, phụ kiện..."
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* ACTIONS */}
        <div className="flex items-center gap-5">
          <button
            onClick={() => onNavigate('checkout')}
            className="relative hover:text-purple-600"
          >
            <ShoppingCart size={22} />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-xs text-white rounded-full flex justify-center items-center">
                {cartCount}
              </span>
            )}
          </button>

          <button className="relative hover:text-purple-600">
            <Bell size={22} />
            {notifications > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          <button
            onClick={() => onNavigate('profile')}
            className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full flex items-center justify-center text-white"
          >
            <User size={20} />
          </button>
        </div>
      </div>
    </header>
  )
}
