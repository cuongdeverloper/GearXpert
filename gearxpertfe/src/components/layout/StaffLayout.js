import React, { useState } from 'react';
import {
  LayoutDashboard, Truck, PackageCheck, Wrench,
  AlertTriangle, CheckCircle, X, Camera, MapPin, Phone,
  FileText, LogOut, UserCircle, ShieldAlert, Eye,
  QrCode, Bell, User, History
} from 'lucide-react';

// --- MOCK DATA NHIỆM VỤ ---
const MOCK_TASKS = [
  { id: 'T001', type: 'delivery', status: 'pending', customer: 'Nguyễn Văn A', phone: '0901234567', address: '123 Lê Lợi, Q.1, TP.HCM', device: 'Sony A7IV + Lens 24-70', note: 'Giao trước 10h sáng' },
  { id: 'T002', type: 'return', status: 'pending', customer: 'Trần Thị B', phone: '0919876543', address: '456 Nguyễn Huệ, Q.1, TP.HCM', device: 'DJI Mavic 3 Pro', note: 'Thu hồi kèm 3 pin' },
  { id: 'T003', type: 'maintenance', status: 'pending', customer: 'Kho nội bộ', phone: '-', address: 'Kho Tổng GearXpert', device: 'Canon EOS R5', note: 'Vệ sinh sensor rễ tre' },
  { id: 'T004', type: 'delivery', status: 'pending', customer: 'Phạm Thị C', phone: '0922334455', address: '789 Nguyễn Trãi, Q.5, TP.HCM', device: 'Gimbal RS3 Mini', note: 'Gọi trước khi đến' },
];

// --- MOCK DATA BÁO CÁO SỰ CỐ ---
const MOCK_REPORTS = [
  { id: 'REP-001', date: '23/02/2026', taskId: 'T099', device: 'DJI Mavic 3 Pro', customer: 'Lê Văn C', type: 'Hư hỏng vật lý', issue: 'Gãy cánh quạt sau, xước body', status: 'Chờ định giá' },
  { id: 'REP-002', date: '21/02/2026', taskId: 'T085', device: 'Sony A7IV', customer: 'Phạm Thị D', type: 'Thiếu phụ kiện', issue: 'Khách làm mất 1 pin dự phòng', status: 'Đã trừ cọc' },
  { id: 'REP-003', date: '18/02/2026', taskId: 'T072', device: 'Canon Lens 70-200mm', customer: 'Hoàng Văn E', type: 'Từ chối nhận', issue: 'Khách chê lens bụi, không nhận hàng', status: 'Đã hủy đơn' },
];

// --- MOCK DATA LỊCH SỬ ---
const MOCK_HISTORY = [
  { id: 'H001', time: '14:30 - Hôm nay', action: 'Hoàn thành nhiệm vụ', detail: 'T003 - Vệ sinh sensor rễ tre', status: 'success' },
  { id: 'H002', time: '11:15 - Hôm nay', action: 'Báo cáo sự cố', detail: 'REP-001 - Hư hỏng vật lý', status: 'warning' },
  { id: 'H003', time: '09:00 - Hôm nay', action: 'Đăng nhập', detail: 'Ca làm việc sáng', status: 'info' },
];

export default function StaffLayout() {
  const [activeMenu, setActiveMenu] = useState('tasks'); // Quản lý chuyển trang (tasks, qr, reports, profile)
  const [activeTab, setActiveTab] = useState('all'); // Quản lý filter task

  const [selectedTask, setSelectedTask] = useState(null);
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Lọc task theo tab
  const filteredTasks = MOCK_TASKS.filter(task =>
    activeTab === 'all' ? true : task.type === activeTab
  );

  return (
    <div className="flex h-[100dvh] bg-slate-50 text-slate-900 font-sans overflow-hidden">

      {/* SIDEBAR (Desktop Only) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col z-20 shadow-sm h-full">
        <div className="p-6 border-b border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-primary/30">
            GX
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-slate-900 font-display">GearXpert</h1>
            <p className="text-xs text-slate-500">Operation Panel</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button
            onClick={() => setActiveMenu('tasks')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeMenu === 'tasks' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <LayoutDashboard size={20} /> Nhiệm vụ
          </button>

          <button
            onClick={() => setActiveMenu('qr')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeMenu === 'qr' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <QrCode size={20} /> Quét mã QR
          </button>

          <button
            onClick={() => setActiveMenu('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeMenu === 'reports' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <ShieldAlert size={20} /> Báo cáo sự cố
          </button>

          <button
            onClick={() => setActiveMenu('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeMenu === 'history' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <History size={20} /> Lịch sử hoạt động
          </button>

          <button
            onClick={() => setActiveMenu('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${activeMenu === 'profile' ? 'bg-primary/10 text-primary' : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <User size={20} /> Tài khoản
          </button>
        </nav>

      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col h-[100dvh] w-full overflow-hidden relative">

        {/* MOBILE HEADER (App-like Topbar) */}
        <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 z-10 flex items-center justify-between shadow-sm sticky top-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold text-sm">
              GX
            </div>
            <h1 className="font-bold text-lg text-slate-900 leading-none">
              {activeMenu === 'tasks' && 'Nhiệm vụ'}
              {activeMenu === 'qr' && 'Quét mã'}
              {activeMenu === 'reports' && 'Sự cố'}
              {activeMenu === 'profile' && 'Cá nhân'}
              {activeMenu === 'history' && 'Lịch sử'}
            </h1>
          </div>
          <button className="relative p-2 text-slate-600 hover:bg-slate-50 rounded-full">
            <Bell size={20} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
          </button>
        </header>

        {/* CÁC VIEW CONTENT */}
        <div className="flex-1 overflow-y-auto pb-20 md:pb-0 scroll-smooth w-full">

          {/* === VIEW 1: NHIỆM VỤ === */}
          {activeMenu === 'tasks' && (
            <div className="flex flex-col h-full">
              {/* Filter Tabs - Scrollable on mobile */}
              <div className="bg-white border-b border-slate-100 z-0 sticky top-0 md:top-auto">
                <div className="px-4 md:px-8 py-3 md:py-5 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                  <h2 className="hidden md:block text-2xl font-bold text-slate-900 font-display">Hôm nay</h2>

                  {/* Segmented Control Filter */}
                  <div className="flex p-1 bg-slate-100/80 rounded-xl md:rounded-full overflow-x-auto hide-scrollbar w-full md:w-auto shrink-0 snap-x">
                    {[
                      { id: 'all', label: 'Tất cả' },
                      { id: 'delivery', label: 'Giao hàng' },
                      { id: 'return', label: 'Thu hồi' },
                      { id: 'maintenance', label: 'Bảo trì' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 min-w-[90px] md:min-w-fit px-4 py-2 text-sm font-semibold rounded-lg md:rounded-full whitespace-nowrap transition-all snap-center ${activeTab === tab.id ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:text-slate-700'
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Task List/Grid */}
              <div className="p-4 md:p-8 flex-1">
                {filteredTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                    <CheckCircle className="w-12 h-12 mb-3 text-slate-300" />
                    <p>Không có nhiệm vụ nào</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto">
                    {filteredTasks.map(task => (
                      <div key={task.id}
                        className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-primary/30 transition-all flex flex-col overflow-hidden active:scale-[0.99] cursor-pointer"
                        onClick={() => setSelectedTask(task)}>

                        {/* Task Header */}
                        <div className={`px-4 py-3 flex justify-between items-center ${task.type === 'delivery' ? 'bg-blue-50/50' :
                          task.type === 'return' ? 'bg-amber-50/50' : 'bg-purple-50/50'
                          }`}>
                          <div className="flex items-center gap-2">
                            {task.type === 'delivery' && <span className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-100/50 px-2 py-1 rounded-md"><Truck size={14} /> GIAO HÀNG</span>}
                            {task.type === 'return' && <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100/50 px-2 py-1 rounded-md"><PackageCheck size={14} /> THU HỒI</span>}
                            {task.type === 'maintenance' && <span className="flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-100/50 px-2 py-1 rounded-md"><Wrench size={14} /> BẢO TRÌ</span>}
                          </div>
                          <span className="text-xs font-semibold text-slate-500">#{task.id}</span>
                        </div>

                        {/* Task Body */}
                        <div className="p-4 space-y-3 flex-1">
                          <div>
                            <p className="font-bold text-slate-900 text-[15px]">{task.device}</p>
                            <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{task.customer}</p>
                          </div>

                          <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 p-2.5 rounded-lg">
                            <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                            <span className="line-clamp-2 leading-tight">{task.address}</span>
                          </div>
                        </div>

                        {/* Task Action Mobile */}
                        <div className="px-4 pb-4 md:hidden">
                          <button className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold active:bg-slate-800">
                            Xử lý ngay
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* === VIEW 2: QUÉT QR (Dumb view) === */}
          {activeMenu === 'qr' && (
            <div className="flex flex-col h-full bg-slate-900 text-white">
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-64 h-64 border-2 border-dashed border-primary/50 relative mb-6 rounded-3xl flex items-center justify-center bg-black/20 overflow-hidden">
                  {/* Scanner line animation */}
                  <div className="absolute top-0 w-full h-1 bg-primary shadow-[0_0_15px_rgba(99,102,241,1)] animate-[scan_2s_ease-in-out_infinite]"></div>
                  <QrCode size={48} className="text-slate-600" />
                </div>
                <h2 className="text-xl font-bold mb-2">Đưa mã QR vào khung hình</h2>
                <p className="text-slate-400 text-sm max-w-xs">Quét mã trên thiết bị để xác nhận tình trạng hoặc xem chi tiết hợp đồng.</p>
                <button className="mt-8 px-8 py-3 bg-white text-slate-900 rounded-full font-bold hover:bg-slate-100 active:scale-95 transition-all flex items-center gap-2">
                  <Camera size={18} /> Nhập thủ công mã
                </button>
              </div>
            </div>
          )}

          {/* === VIEW 3: BÁO CÁO SỰ CỐ === */}
          {activeMenu === 'reports' && (
            <div className="p-4 md:p-8">
              <h2 className="hidden md:flex text-2xl font-bold mb-6 items-center gap-2 text-slate-900">
                <ShieldAlert className="text-red-500" /> Lịch sử sự cố
              </h2>

              <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6">
                {MOCK_REPORTS.map((report) => (
                  <div key={report.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                      <span className="px-2.5 py-1 bg-red-50 text-red-600 text-xs font-bold rounded-lg">{report.type}</span>
                      <span className="text-xs font-medium text-slate-400">{report.date}</span>
                    </div>
                    <h3 className="font-bold text-slate-900 mb-1">{report.device}</h3>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-4 flex-1">{report.issue}</p>
                    <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${report.status === 'Chờ định giá' ? 'bg-amber-100 text-amber-700' :
                        report.status === 'Đã trừ cọc' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                        {report.status}
                      </span>
                      <span className="text-xs font-semibold text-primary">#{report.id}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === VIEW 4: PROFILE === */}
          {activeMenu === 'profile' && (
            <div className="flex-1 p-4 md:p-8 flex items-start justify-center">
              <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col items-center mb-6">
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-md">
                    <User size={40} className="text-slate-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900">Vy Vận Hành</h2>
                  <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 mt-2 bg-emerald-50 px-3 py-1 rounded-full">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Đang làm việc
                  </div>
                  <div className="mt-6 w-full grid grid-cols-2 gap-4 text-center">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xl font-bold text-slate-900">12</p>
                      <p className="text-xs text-slate-500 font-medium mt-1">Nhiệm vụ xong</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <p className="text-xl font-bold text-slate-900">4.9</p>
                      <p className="text-xs text-slate-500 font-medium mt-1">Điểm đánh giá</p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <div
                    onClick={() => setActiveMenu('history')}
                    className="p-5 border-b border-slate-100 flex items-center gap-4 text-slate-700 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors">
                    <div className="p-2 bg-slate-100 rounded-lg"><History size={20} className="text-slate-600" /></div>
                    <span className="font-bold flex-1">Lịch sử hoạt động</span>
                  </div>
                  <div className="p-5 flex items-center gap-4 text-red-600 hover:bg-red-50 active:bg-red-100 cursor-pointer transition-colors">
                    <div className="p-2 bg-red-100 rounded-lg"><LogOut size={20} className="text-red-600" /></div>
                    <span className="font-bold flex-1">Đăng xuất</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* === VIEW 5: LỊCH SỬ HOẠT ĐỘNG === */}
          {activeMenu === 'history' && (
            <div className="p-4 md:p-8 flex-1">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-6">
                  {/* Nút quay lại dành riêng cho mobile PWA khi ấn từ tab cá nhân */}
                  <button onClick={() => setActiveMenu('profile')} className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full">
                    <X size={20} />
                  </button>
                  <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900">
                    <History className="text-primary hidden md:block" /> Lịch sử hoạt động
                  </h2>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                  <div className="relative border-l-2 border-slate-100 ml-3 md:ml-4 space-y-8">
                    {MOCK_HISTORY.map((item, index) => (
                      <div key={item.id} className="relative pl-6 md:pl-8">
                        {/* Timeline dot */}
                        <div className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white ${item.status === 'success' ? 'bg-emerald-500' :
                          item.status === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                          }`}></div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-4 mb-1">
                          <h3 className="font-bold text-slate-900">{item.action}</h3>
                          <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-md w-fit">
                            {item.time}
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* BOTTOM NAVIGATION (Mobile Only PWA) */}
        <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 pb-safe z-40">
          {/* add env(safe-area-inset-bottom) using pb-[max(0.5rem,env(safe-area-inset-bottom))] in tailwind if possible, simple style for now */}
          <div className="flex justify-around items-center h-16 px-2">
            {[
              { id: 'tasks', label: 'Nhiệm vụ', icon: LayoutDashboard },
              { id: 'qr', label: 'Quét mã', icon: QrCode },
              { id: 'reports', label: 'Sự cố', icon: ShieldAlert },
              { id: 'profile', label: 'Cá nhân', icon: User }
            ].map(item => (
              <button
                key={item.id}
                onClick={() => setActiveMenu(item.id)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${activeMenu === item.id ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                  }`}
              >
                <item.icon size={22} className={activeMenu === item.id ? 'stroke-[2.5px]' : 'stroke-2'} />
                <span className={`text-[10px] font-medium ${activeMenu === item.id ? 'font-bold' : ''}`}>
                  {item.label}
                </span>
                {/* Active Indicator dot */}
                <div className={`w-1 h-1 rounded-full transition-all ${activeMenu === item.id ? 'bg-primary' : 'bg-transparent'}`}></div>
              </button>
            ))}
          </div>
        </nav>

      </main>

      {/* --- CÁC MODALS (Responsive) --- */}
      {/* --- MODAL CHI TIẾT TASK --- */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/40 flex md:items-center items-end justify-center z-50 backdrop-blur-sm p-0 md:p-4">
          <div
            className="bg-white w-full md:max-w-2xl flex flex-col border border-slate-200 animate-slide-up
              h-[85vh] md:h-auto md:max-h-[90vh] rounded-t-3xl md:rounded-2xl overflow-hidden shadow-2xl"
          >
            {/* Mobile Drag Handle */}
            <div className="w-full flex justify-center py-2 md:hidden">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>

            <div className="px-5 md:px-6 py-3 md:py-4 border-b border-slate-200 flex justify-between items-center bg-white md:bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 font-display">
                <span className="hidden md:inline">Chi tiết nhiệm vụ</span> #{selectedTask.id}
              </h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* KHÁCH HÀNG */}
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">Tên khách hàng</p>
                    <p className="font-semibold text-lg text-slate-900">{selectedTask.customer}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">Liên hệ</p>
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-slate-900 text-[15px]">{selectedTask.phone}</p>
                      <button className="p-2 bg-emerald-100 text-emerald-700 rounded-full" title="Gọi ngay"><Phone size={14} className="fill-emerald-700" /></button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">Địa chỉ</p>
                    <div className="flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
                      <p className="font-medium leading-snug text-slate-900 text-sm">{selectedTask.address}</p>
                    </div>
                  </div>
                </div>

                {/* THIẾT BỊ & GHI CHÚ */}
                <div className="bg-slate-50 p-4 md:p-5 rounded-2xl border border-slate-200 space-y-4">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm border-b border-slate-200/60 pb-2 mb-3">Thiết bị cần xử lý</h4>
                    <p className="font-bold text-[17px] text-primary leading-tight">{selectedTask.device}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <p className="text-xs text-slate-400 mb-1.5 font-semibold">Ghi chú từ hệ thống:</p>
                    <p className="text-[15px] font-medium text-slate-800">{selectedTask.note}</p>
                  </div>
                  <button className="w-full mt-2 py-2.5 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-700 flex justify-center items-center gap-2 font-bold hover:bg-slate-50 transition-colors">
                    <FileText size={16} className="text-primary" /> Xem chi tiết biên bản/hợp đồng
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Actions Sticky */}
            <div className="p-4 border-t border-slate-200 bg-white flex flex-col md:flex-row gap-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] shrink-0">
              <button
                onClick={() => setShowIssueModal(true)}
                className="w-full md:w-auto px-6 py-3.5 bg-red-50 text-red-600 rounded-xl font-bold flex justify-center items-center gap-2 active:bg-red-100 transition-colors"
              >
                <AlertTriangle size={18} /> Ghi nhận sự cố
              </button>
              <button className="w-full md:flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-bold flex justify-center items-center gap-2 active:bg-slate-800 shadow-md">
                <CheckCircle size={18} /> Xác nhận hoàn thành
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL BÁO CÁO SỰ CỐ --- */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex md:items-center items-end justify-center z-[60] backdrop-blur-sm p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md flex flex-col rounded-t-3xl md:rounded-2xl overflow-hidden h-fit max-h-[90vh] border border-slate-200 shadow-2xl animate-slide-up">
            <div className="px-5 py-4 bg-red-50 border-b border-red-100 flex justify-between items-center shrink-0">
              <h3 className="text-[17px] font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle size={20} className="fill-red-700/20" /> Lập biên bản sự cố
              </h3>
              <button onClick={() => setShowIssueModal(false)} className="text-red-400 hover:text-red-700 bg-white p-1.5 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Phân loại <span className="text-red-500">*</span></label>
                <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow appearance-none">
                  <option value="">-- Chọn hiện trạng --</option>
                  <option value="missing">Mất / Thiếu phụ kiện</option>
                  <option value="damage">Trầy xước / Rơi vỡ / Cấn móp</option>
                  <option value="software">Lỗi kỹ thuật / Không lên nguồn</option>
                  <option value="reject">Khách từ chối nhận</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Mô tả chi tiết <span className="text-red-500">*</span></label>
                <textarea
                  rows="3"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow resize-none"
                  placeholder="Ghi rõ tình trạng thực tế..."
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Ảnh thực tế / Video <span className="text-red-500">*</span></label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 active:bg-slate-50 transition-colors">
                  <div className="p-3 bg-red-50 text-red-500 rounded-full mb-3">
                    <Camera size={26} />
                  </div>
                  <p className="text-[15px] font-bold text-slate-700">Mở Camera</p>
                  <p className="text-xs mt-1 text-slate-400 text-center">Chụp cận cảnh vết xước hoặc serial</p>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-white flex gap-3 shrink-0">
              <button
                onClick={() => setShowIssueModal(false)}
                className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-bold active:bg-slate-200 transition-colors"
              >
                Hủy
              </button>
              <button className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-600/20">
                Lưu biên bản
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Style for Keyframes */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />

    </div>
  );
}