import { Outlet, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Sidebar } from '../navigation/Sidebar'
import { TopNavbar } from '../navigation/TopNavbar'
import { doLogout } from '../../redux/action/userAction'
import { persistor } from '../../redux/store'
import Cookies from 'js-cookie'
import { toast } from 'react-toastify'

export default function DashboardLayout() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const socketConnection = useSelector((state) => state.user.account.socketConnection)

  const currentPage = 'dashboard'

  const onNavigate = (path) => navigate(path)

  const onLogout = async () => {
    try {
      // Disconnect socket if connected
      if (socketConnection) {
        socketConnection.disconnect()
      }

      // Dispatch logout action to clear Redux state
      dispatch(doLogout())

      // Remove cookies
      Cookies.remove('accessToken')
      Cookies.remove('refreshToken')

      // Purge Redux persist storage
      await persistor.purge()

      // Show success message
      toast.success('Đăng xuất thành công')

      // Navigate to login page
      navigate('/signin')
    } catch (error) {
      console.error('Logout error:', error)
      toast.error('Có lỗi xảy ra khi đăng xuất')
    }
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
