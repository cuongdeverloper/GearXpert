import { Search, ShoppingCart, Bell, User } from 'lucide-react'

export function TopNavbar({ onNavigate = () => {} }) {
  // ===== MOCK DATA =====
  const cartCount = 2
  const notifications = 3

  return (
    <header className="bg-white border-b px-8 py-4">
      <div className="flex justify-between items-center">
        {/* Search */}
        <div className="relative max-w-xl w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Tìm kiếm thiết bị..."
            className="w-full pl-12 py-3 bg-gray-50 border rounded-xl"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('checkout')} className="relative">
            <ShoppingCart />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-xs text-white rounded-full flex justify-center items-center">
                {cartCount}
              </span>
            )}
          </button>

          <button className="relative">
            <Bell />
            {notifications > 0 && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>

          <button onClick={() => onNavigate('profile')}>
            <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center text-white">
              <User />
            </div>
          </button>
        </div>
      </div>
    </header>
  )
}
