import { Outlet } from 'react-router-dom'
import { Sidebar } from '../navigation/Sidebar'
import { TopNavbar } from '../navigation/TopNavbar'

export default function DashboardLayout() {

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
        />

        {/* 👇 CÁC PAGE DASHBOARD SẼ RENDER Ở ĐÂY */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
