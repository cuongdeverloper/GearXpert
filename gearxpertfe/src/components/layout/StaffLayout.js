// src/layouts/StaffLayout.jsx
import React, { useState } from 'react';
import { 
  LayoutDashboard, Truck, PackageCheck, Wrench, 
  AlertTriangle, CheckCircle, X, Camera, MapPin, Phone, 
  FileText, LogOut, UserCircle, ShieldAlert, Eye
} from 'lucide-react';

// --- MOCK DATA NHIỆM VỤ ---
const MOCK_TASKS = [
  { id: 'T001', type: 'delivery', status: 'pending', customer: 'Nguyễn Văn A', phone: '0901234567', address: '123 Lê Lợi, Q.1, TP.HCM', device: 'Sony A7IV + Lens 24-70', note: 'Giao trước 10h sáng' },
  { id: 'T002', type: 'return', status: 'pending', customer: 'Trần Thị B', phone: '0919876543', address: '456 Nguyễn Huệ, Q.1, TP.HCM', device: 'DJI Mavic 3 Pro', note: 'Thu hồi kèm 3 pin' },
  { id: 'T003', type: 'maintenance', status: 'pending', customer: 'Kho nội bộ', phone: '-', address: 'Kho Tổng GearXpert', device: 'Canon EOS R5', note: 'Vệ sinh sensor rễ tre' },
];

// --- MOCK DATA BÁO CÁO SỰ CỐ ---
const MOCK_REPORTS = [
  { id: 'REP-001', date: '23/02/2026', taskId: 'T099', device: 'DJI Mavic 3 Pro', customer: 'Lê Văn C', type: 'Hư hỏng vật lý', issue: 'Gãy cánh quạt sau, xước body', status: 'Chờ định giá' },
  { id: 'REP-002', date: '21/02/2026', taskId: 'T085', device: 'Sony A7IV', customer: 'Phạm Thị D', type: 'Thiếu phụ kiện', issue: 'Khách làm mất 1 pin dự phòng', status: 'Đã trừ cọc' },
  { id: 'REP-003', date: '18/02/2026', taskId: 'T072', device: 'Canon Lens 70-200mm', customer: 'Hoàng Văn E', type: 'Từ chối nhận', issue: 'Khách chê lens bụi, không nhận hàng', status: 'Đã hủy đơn' },
];

export default function StaffLayout() {
  const [activeMenu, setActiveMenu] = useState('tasks'); // Quản lý chuyển trang ở Sidebar
  const [activeTab, setActiveTab] = useState('all'); // Quản lý filter task (Tất cả, Giao, Nhận)
  
  const [selectedTask, setSelectedTask] = useState(null);
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Lọc task theo tab
  const filteredTasks = MOCK_TASKS.filter(task => 
    activeTab === 'all' ? true : task.type === activeTab
  );

  return (
    <div className="flex h-screen bg-background-light text-slate-900 font-sans">
      
      {/* SIDEBAR (Desktop) */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col z-10 shadow-sm">
        <div className="p-6 border-b border-slate-200 flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-200">
            GX
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-slate-900 font-display">GearXpert</h1>
            <p className="text-xs text-slate-500">Operation Panel</p>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveMenu('tasks')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
              activeMenu === 'tasks' ? 'bg-gradient-to-r from-primary/10 to-accent-cyan/10 text-primary' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <LayoutDashboard size={20} /> Danh sách nhiệm vụ
          </button>
          
          <button 
            onClick={() => setActiveMenu('reports')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
              activeMenu === 'reports' ? 'bg-gradient-to-r from-primary/10 to-accent-cyan/10 text-primary' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ShieldAlert size={20} /> Lịch sử báo cáo
          </button>

          <button 
            onClick={() => setActiveMenu('history')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
              activeMenu === 'history' ? 'bg-gradient-to-r from-primary/10 to-accent-cyan/10 text-primary' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileText size={20} /> Lịch sử hoạt động
          </button>
        </nav>

        <div className="p-4 border-t border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3 mb-4">
            <UserCircle size={36} className="text-slate-400" />
            <div>
              <p className="font-medium text-sm text-slate-900">Nhân viên Vận hành</p>
              <p className="text-xs text-emerald-600 flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Online
              </p>
            </div>
          </div>
          <button className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-red-600 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-100 rounded-xl transition-colors shadow-sm">
            <LogOut size={16} /> Đăng xuất
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col overflow-hidden bg-background-light">
        
        {/* === VIEW 1: DANH SÁCH NHIỆM VỤ === */}
        {activeMenu === 'tasks' && (
          <>
            {/* Header Task */}
            <header className="bg-white border-b border-slate-200 px-6 lg:px-10 py-5 flex justify-between items-center shadow-sm z-0">
              <h2 className="text-2xl font-bold text-slate-900 font-display">Nhiệm vụ hôm nay</h2>
              <div className="flex bg-slate-100 p-1 rounded-full">
                {[
                  { id: 'all', label: 'Tất cả' },
                  { id: 'delivery', label: 'Giao hàng' },
                  { id: 'return', label: 'Thu hồi' },
                  { id: 'maintenance', label: 'Bảo trì' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-5 py-2.5 text-sm font-bold rounded-full transition-all duration-200 ${
                      activeTab === tab.id ? 'bg-primary text-white shadow-md' : 'text-slate-600 hover:text-primary hover:bg-slate-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </header>

            {/* Task Grid */}
            <div className="flex-1 overflow-auto p-6 lg:p-10">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-[1440px] mx-auto">
                {filteredTasks.map(task => (
                  <div key={task.id} className="bg-white rounded-2xl shadow-lg border border-slate-100 hover:shadow-glow-indigo hover:border-primary/20 transition-all duration-300">
                    <div className={`p-4 border-b border-slate-100 flex justify-between items-center rounded-t-2xl ${
                      task.type === 'delivery' ? 'bg-blue-50/80' : 
                      task.type === 'return' ? 'bg-amber-50/80' : 'bg-purple-50/80'
                    }`}>
                      <span className="flex items-center gap-2 font-semibold text-sm">
                        {task.type === 'delivery' && <><Truck size={16} className="text-blue-600"/> Giao hàng</>}
                        {task.type === 'return' && <><PackageCheck size={16} className="text-amber-600"/> Thu hồi</>}
                        {task.type === 'maintenance' && <><Wrench size={16} className="text-purple-600"/> Bảo trì</>}
                      </span>
                      <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded-lg shadow-sm border border-slate-100">#{task.id}</span>
                    </div>
                    
                    <div className="p-6 space-y-4">
                      <div>
                        <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Thiết bị</p>
                        <p className="font-semibold text-slate-900 font-display">{task.device}</p>
                      </div>
                      <div className="flex gap-4">
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1 font-semibold uppercase tracking-wider">Khách hàng / Vị trí</p>
                          <p className="font-medium text-sm truncate text-slate-900">{task.customer}</p>
                        </div>
                      </div>
                      
                      <button 
                        onClick={() => setSelectedTask(task)}
                        className="w-full py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors shadow-md"
                      >
                        Xem chi tiết & Xử lý
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* === VIEW 2: LỊCH SỬ BÁO CÁO SỰ CỐ === */}
        {activeMenu === 'reports' && (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            <header className="bg-white border-b border-slate-200 px-6 lg:px-10 py-5 shadow-sm z-0">
              <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-900 font-display">
                <ShieldAlert className="text-red-500" size={28} />
                Lịch sử báo cáo sự cố & Thiệt hại
              </h2>
              <p className="text-sm text-slate-500 mt-1">Quản lý và theo dõi tiến độ các biên bản bạn đã lập.</p>
            </header>
            
            <div className="flex-1 overflow-auto p-6 lg:p-10">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-lg overflow-hidden max-w-[1440px] mx-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                      <th className="py-4 px-6 font-semibold">Mã báo cáo</th>
                      <th className="py-4 px-6 font-semibold">Ngày lập</th>
                      <th className="py-4 px-6 font-semibold">Thiết bị / Khách hàng</th>
                      <th className="py-4 px-6 font-semibold">Nội dung sự cố</th>
                      <th className="py-4 px-6 font-semibold">Trạng thái xử lý</th>
                      <th className="py-4 px-6 font-semibold text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {MOCK_REPORTS.map((report) => (
                      <tr key={report.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-6 font-medium text-primary">{report.id}</td>
                        <td className="py-4 px-6 text-slate-600">{report.date}</td>
                        <td className="py-4 px-6">
                          <p className="font-semibold text-slate-900">{report.device}</p>
                          <p className="text-slate-500 text-xs mt-0.5">{report.customer}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-block px-2 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-lg mb-1">{report.type}</span>
                          <p className="text-slate-600 line-clamp-1">{report.issue}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                            report.status === 'Chờ định giá' ? 'bg-amber-100 text-amber-700' :
                            report.status === 'Đã trừ cọc' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-xl transition-colors" title="Xem chi tiết">
                            <Eye size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* --- CÁC MODALS GIỮ NGUYÊN --- */}
      {/* --- MODAL CHI TIẾT TASK --- */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 font-display">
                Chi tiết nhiệm vụ #{selectedTask.id}
              </h3>
              <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-slate-700 p-1 hover:bg-slate-200 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-5">
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">Tên khách hàng</p>
                    <p className="font-semibold text-lg text-slate-900">{selectedTask.customer}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">Số điện thoại</p>
                    <p className="font-medium flex items-center gap-2 text-slate-900">
                      <div className="p-1.5 bg-slate-100 rounded-lg"><Phone size={14} className="text-slate-600"/></div>
                      {selectedTask.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">Địa chỉ</p>
                    <p className="font-medium flex items-start gap-2 leading-snug text-slate-900">
                      <div className="p-1.5 bg-slate-100 rounded-lg shrink-0"><MapPin size={14} className="text-slate-600"/></div>
                      {selectedTask.address}
                    </p>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                  <div>
                    <h4 className="font-semibold text-slate-700 text-sm uppercase tracking-wider border-b border-slate-200 pb-2 mb-3">Thông tin thiết bị</h4>
                    <p className="font-bold text-lg text-primary leading-tight">{selectedTask.device}</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <p className="text-xs text-slate-500 mb-1">Ghi chú nhiệm vụ:</p>
                    <p className="text-sm font-medium text-slate-800">{selectedTask.note}</p>
                  </div>
                  <button className="mt-2 text-sm text-primary flex items-center gap-1.5 font-medium hover:text-primary-dark transition-colors">
                    <FileText size={16} /> Xem hợp đồng điện tử
                  </button>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-200 bg-white flex gap-3 justify-end shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] relative z-10">
              <button 
                onClick={() => setShowIssueModal(true)}
                className="px-6 py-2.5 bg-white border-2 border-red-200 text-red-600 rounded-xl font-bold flex items-center gap-2 hover:bg-red-50 hover:border-red-300 transition-all"
              >
                <AlertTriangle size={18} /> Báo cáo sự cố
              </button>
              <button className="px-8 py-2.5 bg-gradient-to-r from-primary to-accent-cyan text-white rounded-xl font-bold flex items-center gap-2 hover:shadow-lg hover:shadow-glow-indigo transition-all">
                <CheckCircle size={18} /> Xác nhận hoàn tất
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL BÁO CÁO SỰ CỐ --- */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[60] backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-slate-200">
            <div className="px-6 py-4 bg-red-50 border-b border-red-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-red-700 flex items-center gap-2 font-display">
                <AlertTriangle size={20} /> Lập biên bản sự cố
              </h3>
              <button onClick={() => setShowIssueModal(false)} className="text-red-400 hover:text-red-700 p-1 hover:bg-red-100 rounded-xl transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Loại sự cố <span className="text-red-500">*</span></label>
                <select className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow bg-white">
                  <option value="">-- Chọn tình trạng phát sinh --</option>
                  <option value="missing">Thiếu phụ kiện</option>
                  <option value="damage">Hư hỏng ngoại quan (Xước, vỡ, móp...)</option>
                  <option value="software">Lỗi phần mềm / Không lên nguồn</option>
                  <option value="reject">Khách từ chối nhận hàng</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Mô tả chi tiết <span className="text-red-500">*</span></label>
                <textarea 
                  rows="3" 
                  className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow resize-none"
                  placeholder="Ghi rõ hiện trạng thiết bị hoặc lý do khách từ chối..."
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Hình ảnh / Video minh chứng <span className="text-red-500">*</span></label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-slate-500 hover:bg-red-50 hover:border-red-300 hover:text-red-500 cursor-pointer transition-colors group">
                  <div className="p-3 bg-slate-100 rounded-full group-hover:bg-red-100 transition-colors mb-3">
                    <Camera size={24} />
                  </div>
                  <p className="text-sm font-bold">Bấm để mở Camera hoặc Tải ảnh</p>
                  <p className="text-xs mt-1 text-slate-400">Yêu cầu chụp rõ Serial và chỗ hỏng</p>
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button 
                onClick={() => setShowIssueModal(false)}
                className="flex-1 py-3 border border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-100 transition-colors"
              >
                Hủy bỏ
              </button>
              <button className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-md shadow-red-600/20 transition-all">
                Lưu biên bản
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}