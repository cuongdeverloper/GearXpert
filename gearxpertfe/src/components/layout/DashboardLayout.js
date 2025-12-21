import { Outlet } from 'react-router-dom'
import { Sidebar } from '../navigation/Sidebar'
import { TopNavbar } from '../navigation/TopNavbar'

export default function DashboardLayout() {
  // ===== MOCK DATA =====
  const cart = [
    { id: 'cam-01', name: 'Canon R6' },
    { id: 'mic-01', name: 'Rode Wireless Go' }
  ]

  const notifications = 3
  const currentPage = 'dashboard'

  const onNavigate = (page) => {
    console.log('Navigate to:', page)
  }

  const onLogout = () => {
    console.log('Logout')
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        onLogout={onLogout}
      />

      <div className="flex-1 flex flex-col">
        <TopNavbar
          onNavigate={onNavigate}
          cartCount={cart.length}
          notifications={notifications}
        />

        {/* 👇 CÁC PAGE DASHBOARD SẼ RENDER Ở ĐÂY */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
