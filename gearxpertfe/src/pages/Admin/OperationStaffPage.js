import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useDispatch } from "react-redux";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import { FiSearch, FiEye, FiUser, FiBox, FiClock, FiMapPin, FiPhone, FiCalendar } from "react-icons/fi";
import { getOperationStaff, getStaffTasks } from "../../service/ApiService/AdminUserApi";
import { toast } from "react-toastify";
import Pagination from "../../components/common/Pagination";
import { X } from "lucide-react";

const StaffTaskModal = ({ staff, isOpen, onClose }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && staff) {
      const fetchTasks = async () => {
        try {
          setLoading(true);
          const response = await getStaffTasks(staff._id);
          if (response && response.success) {
            setTasks(response.tasks);
          }
        } catch (error) {
          toast.error("Không thể tải danh sách nhiệm vụ");
        } finally {
          setLoading(false);
        }
      };
      fetchTasks();
    }
  }, [isOpen, staff]);

  if (!isOpen) return null;

  return createPortal(
    <div 
      className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[9999] backdrop-blur-md p-4 animate-in fade-in duration-300" 
      onClick={onClose}
    >
      <div 
        className="bg-white/95 w-full max-w-3xl rounded-[32px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.25)] overflow-hidden flex flex-col max-h-[85vh] border border-white animate-in zoom-in-95 duration-300" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-sm shrink-0">
          <div>
            <h3 className="text-2xl font-black text-slate-900 italic tracking-tight uppercase">Nhiệm vụ của nhân viên</h3>
            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">{staff?.fullName}</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-all border border-transparent hover:border-slate-200 group">
            <X size={24} className="text-slate-400 group-hover:text-slate-900 group-hover:rotate-90 transition-all duration-300" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100"></div>
                <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
              </div>
              <p className="text-sm font-black uppercase tracking-[0.2em] animate-pulse">Đang tải nhiệm vụ...</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-20 text-slate-400 bg-slate-50/50 rounded-[32px] border-2 border-dashed border-slate-200">
              <FiBox className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="font-bold text-lg">Nhân viên chưa có nhiệm vụ nào</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tasks.map((task) => (
                <div key={task._id} className="bg-white border border-slate-100 rounded-[24px] p-6 hover:border-primary/40 transition-all hover:shadow-[0_20px_40px_-12px_rgba(0,0,0,0.1)] group relative overflow-hidden">
                  {/* Status Indicator */}
                  <div className={`absolute top-0 left-0 w-1.5 h-full ${
                    task.type === 'DELIVERY' ? 'bg-blue-500' : 'bg-amber-500'
                  }`}></div>

                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      task.type === 'DELIVERY' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-amber-50 text-amber-600 border border-amber-100'
                    }`}>
                      {task.type === 'DELIVERY' ? 'Giao hàng' : 'Thu hồi'}
                    </span>
                    <span className="text-[11px] font-black text-slate-300 group-hover:text-primary transition-colors">#{task.orderCode}</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 opacity-60">Thiết bị</p>
                      <p className="font-black text-slate-900 text-lg leading-tight group-hover:text-primary transition-colors line-clamp-2">{task.deviceName}</p>
                    </div>
                    
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center gap-3 text-xs text-slate-600 font-bold">
                        <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                          <FiUser size={12} />
                        </div>
                        <span>{task.customerName}</span>
                      </div>
                      <div className="flex items-start gap-3 text-xs text-slate-500 font-medium">
                        <div className="w-6 h-6 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                          <FiMapPin size={12} />
                        </div>
                        <span className="line-clamp-2">{task.address}</span>
                      </div>
                    </div>

                    <div className="pt-4 mt-2 border-t border-slate-50 flex justify-between items-center">
                       <div className="flex items-center gap-2">
                         <div className={`w-2 h-2 rounded-full animate-pulse ${
                           task.status === 'COMPLETED' ? 'bg-emerald-500' : 
                           task.status === 'CANCELLED' ? 'bg-rose-500' : 'bg-indigo-500'
                         }`}></div>
                         <span className={`text-[10px] font-black uppercase tracking-widest ${
                           task.status === 'COMPLETED' ? 'text-emerald-600' : 
                           task.status === 'CANCELLED' ? 'text-rose-600' : 'text-indigo-600'
                         }`}>
                           {task.status}
                         </span>
                       </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default function OperationStaffPage() {
  const dispatch = useDispatch();
  const [staff, setStaff] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);
      dispatch(showAdminLoading());
      const response = await getOperationStaff();
      if (response && response.success) {
        setStaff(response.staff);
      }
    } catch (error) {
      console.error("Fetch staff error:", error);
      toast.error("Không thể tải danh sách nhân viên");
    } finally {
      setLoading(false);
      dispatch(hideAdminLoading());
    }
  }, [dispatch]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const filteredStaff = staff.filter((s) => {
    return (
      s.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredStaff.length / ITEMS_PER_PAGE);
  const paginatedStaff = filteredStaff.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm nhân viên..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition bg-white"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-xl border border-indigo-100">
          <FiUser className="text-indigo-600" />
          <span className="text-sm font-bold text-indigo-700">{staff.length} nhân viên vận hành</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="animate-pulse bg-white rounded-2xl border border-slate-200 h-48"></div>
          ))
        ) : paginatedStaff.map((s) => (
          <div 
            key={s._id} 
            className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-xl hover:border-primary/30 transition-all group cursor-pointer relative overflow-hidden"
            onClick={() => {
              setSelectedStaff(s);
              setIsModalOpen(true);
            }}
          >
            {/* Background pattern */}
            <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <FiUser size={100} />
            </div>

            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                {s.avatar ? (
                  <img src={s.avatar} alt={s.fullName} className="w-full h-full object-cover rounded-2xl" />
                ) : (
                  <FiUser size={24} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-slate-900 text-lg truncate group-hover:text-primary transition-colors">{s.fullName}</h3>
                <p className="text-sm text-slate-500 truncate">{s.email}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <FiPhone size={14} />
                </div>
                <span className="text-sm font-medium">{s.phone || 'Chưa cập nhật'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-600">
                <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
                  <FiClock size={14} />
                </div>
                <span className="text-sm font-medium">Tham gia: {new Date(s.createdAt).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 flex justify-between items-center">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nhiệm vụ đang nhận</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={`text-lg font-black ${s.activeTaskCount > 0 ? 'text-primary' : 'text-slate-400'}`}>
                    {s.activeTaskCount}
                  </span>
                  <span className="text-xs font-bold text-slate-500">nhiệm vụ</span>
                </div>
              </div>
              
              <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-primary transition-colors shadow-lg shadow-slate-200">
                <FiEye /> Chi tiết
              </button>
            </div>
          </div>
        ))}
      </div>

      {!loading && filteredStaff.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {!loading && filteredStaff.length === 0 && (
        <div className="text-center py-24 bg-white rounded-3xl border border-dashed border-slate-200">
          <FiUser size={48} className="mx-auto mb-4 text-slate-200" />
          <p className="text-slate-500 font-medium text-lg">Không tìm thấy nhân viên nào</p>
        </div>
      )}

      <StaffTaskModal 
        staff={selectedStaff} 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setSelectedStaff(null);
        }} 
      />
    </div>
  );
}
