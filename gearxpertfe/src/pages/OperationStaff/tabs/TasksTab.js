import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Truck, PackageCheck, Wrench,
  AlertTriangle, CheckCircle, X, Camera, MapPin, Phone, FileText, XCircle,
} from 'lucide-react';
import { getDeliveringRentals, getReturningRentals, confirmPickup, confirmDelivery, confirmReturn } from '../../../service/ApiService/RentalApi';
import { createStaffDeliveryIssue } from '../../../service/ApiService/ReportApi';

const mapRentalToTask = (rental) => {
  const items = rental.rentalItems || [];
  const firstItem = items[0];
  const deviceName = firstItem?.deviceId?.name || 'Thiết bị';
  const extraCount = items.length - 1;
  const deviceLabel = extraCount > 0 ? `${deviceName} (+${extraCount} khác)` : deviceName;
  return {
    id: rental._id,
    rentalId: rental._id,
    type: 'delivery',
    status: 'pending',
    customer: rental.customerId?.fullName || rental.deliveryAddress?.receiverName || 'Khách hàng',
    phone: rental.phoneNumber || '—',
    address: rental.deliveryAddress?.fullAddress || '—',
    device: deviceLabel,
    note: rental.notes || 'Không có ghi chú',
    rentalData: rental,
  };
};

const mapRentalToReturnTask = (rental) => {
  const items = rental.rentalItems || [];
  const firstItem = items[0];
  const deviceName = firstItem?.deviceId?.name || 'Thiết bị';
  const extraCount = items.length - 1;
  const deviceLabel = extraCount > 0 ? `${deviceName} (+${extraCount} khác)` : deviceName;
  return {
    id: rental._id,
    rentalId: rental._id,
    type: 'return',
    status: 'pending',
    customer: rental.customerId?.fullName || rental.deliveryAddress?.receiverName || 'Khách hàng',
    phone: rental.phoneNumber || '—',
    address: rental.deliveryAddress?.fullAddress || '—',
    device: deviceLabel,
    note: rental.notes || 'Không có ghi chú',
    rentalData: rental,
  };
};

export default function TasksTab() {
  const [activeTab, setActiveTab] = useState('all');
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [completionLoading, setCompletionLoading] = useState(false);
  const [returnLoading, setReturnLoading] = useState(false);

  // Issue report form state
  const [issueForm, setIssueForm] = useState({ issueType: '', description: '', files: [] });
  const [issueSubmitting, setIssueSubmitting] = useState(false);
  const fileInputRef = useRef(null);

  const resetIssueForm = () => setIssueForm({ issueType: '', description: '', files: [] });

  const handleOpenIssueModal = () => {
    resetIssueForm();
    setShowIssueModal(true);
  };

  const fetchAllTasks = useCallback(async () => {
    setLoadingTasks(true);
    try {
      const [deliveryRes, returnRes] = await Promise.all([
        getDeliveringRentals(),
        getReturningRentals(),
      ]);
      const deliveryTasks = (deliveryRes?.rentals || []).map(mapRentalToTask);
      const returnTasks = (returnRes?.rentals || []).map(mapRentalToReturnTask);
      setTasks([...deliveryTasks, ...returnTasks]);
    } catch (err) {
      console.error('Lỗi tải nhiệm vụ:', err);
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  // Keep legacy name for refresh button compatibility
  const fetchDeliveryTasks = fetchAllTasks;

  useEffect(() => {
    fetchAllTasks();
  }, [fetchAllTasks]);

  const handleConfirmPickup = async () => {
    if (!selectedTask || pickupLoading) return;
    setPickupLoading(true);
    try {
      await confirmPickup(selectedTask.rentalId);
      // Update local state: mark pickedUpAt on the rental
      setTasks(prev => prev.map(t =>
        t.id === selectedTask.id
          ? { ...t, rentalData: { ...t.rentalData, pickedUpAt: new Date().toISOString() } }
          : t
      ));
      setSelectedTask(prev => ({
        ...prev,
        rentalData: { ...prev.rentalData, pickedUpAt: new Date().toISOString() },
      }));
    } catch (err) {
      console.error('Lỗi xác nhận lấy hàng:', err);
      alert(err?.response?.data?.message || 'Không thể xác nhận lấy hàng');
    } finally {
      setPickupLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!selectedTask || completionLoading) return;
    setCompletionLoading(true);
    try {
      await confirmDelivery(selectedTask.rentalId);
      const now = new Date().toISOString();
      setTasks(prev => prev.map(t =>
        t.id === selectedTask.id
          ? { ...t, rentalData: { ...t.rentalData, deliveredAt: now } }
          : t
      ));
      setSelectedTask(prev => ({
        ...prev,
        rentalData: { ...prev.rentalData, deliveredAt: now },
      }));
      alert('Đã xác nhận giao hàng thành công! Đang chờ khách hàng xác nhận nhận hàng.');
    } catch (err) {
      console.error('Lỗi xác nhận giao hàng:', err);
      alert(err?.response?.data?.message || 'Không thể xác nhận giao hàng');
    } finally {
      setCompletionLoading(false);
    }
  };

  const handleConfirmReturn = async () => {
    if (!selectedTask || returnLoading) return;
    setReturnLoading(true);
    try {
      await confirmReturn(selectedTask.rentalId);
      // Xóa task khỏi danh sách vì đơn đã chuyển sang INSPECTING
      setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
      setSelectedTask(null);
      alert('Xác nhận thu hồi thành công! Đơn hàng đã hoàn thành.');
    } catch (err) {
      console.error('Lỗi xác nhận thu hồi:', err);
      alert(err?.response?.data?.message || 'Không thể xác nhận thu hồi');
    } finally {
      setReturnLoading(false);
    }
  };

  const handleSubmitIssue = async () => {
    if (!issueForm.issueType) return alert('Vui lòng chọn phân loại sự cố.');
    if (!issueForm.description.trim()) return alert('Vui lòng mô tả chi tiết sự cố.');
    if (!selectedTask) return;

    setIssueSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('rentalId', selectedTask.rentalId);
      formData.append('issueType', issueForm.issueType);
      formData.append('description', issueForm.description.trim());
      issueForm.files.forEach(file => formData.append('images', file));

      await createStaffDeliveryIssue(formData);

      // Xóa task khỏi danh sách vì đơn đã chuyển sang INSPECTING
      setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
      setShowIssueModal(false);
      setSelectedTask(null);
      resetIssueForm();
      alert('Biên bản sự cố đã được lưu. Đơn hàng chuyển sang trạng thái Kiểm tra.');
    } catch (err) {
      console.error('Lỗi lưu biên bản:', err);
      alert(err?.response?.data?.message || 'Không thể lưu biên bản sự cố.');
    } finally {
      setIssueSubmitting(false);
    }
  };

  const filteredTasks = tasks.filter(task =>
    activeTab === 'all' ? true : task.type === activeTab
  );

  return (
    <div className="flex flex-col h-full">
      {/* Filter Header */}
      <div className="bg-white border-b border-slate-100 z-0 sticky top-0 md:top-auto">
        <div className="px-4 md:px-8 py-3 md:py-5 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div className="hidden md:flex items-center gap-3">
            <h2 className="text-2xl font-bold text-slate-900 font-display">Nhiệm vụ</h2>
            <span className="text-sm font-semibold bg-primary/10 text-primary px-2.5 py-1 rounded-full">
              {tasks.length} đơn
            </span>
            <button
              onClick={fetchDeliveryTasks}
              title="Làm mới"
              className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
            >
              <Truck size={16} />
            </button>
          </div>

          <div className="flex p-1 bg-slate-100/80 rounded-xl md:rounded-full overflow-x-auto hide-scrollbar w-full md:w-auto shrink-0 snap-x">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'delivery', label: 'Giao hàng' },
              { id: 'return', label: 'Thu hồi' },
              { id: 'maintenance', label: 'Bảo trì' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 min-w-[90px] md:min-w-fit px-4 py-2 text-sm font-semibold rounded-lg md:rounded-full whitespace-nowrap transition-all snap-center ${
                  activeTab === tab.id
                    ? 'bg-white text-primary shadow-sm ring-1 ring-slate-200/50'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="p-4 md:p-8 flex-1">
        {loadingTasks ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary mb-3"></div>
            <p className="text-sm font-medium">Đang tải nhiệm vụ...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-slate-400">
            <CheckCircle className="w-12 h-12 mb-3 text-slate-300" />
            <p>Không có nhiệm vụ nào</p>
            <button
              onClick={fetchDeliveryTasks}
              className="mt-3 px-4 py-2 text-sm font-semibold text-primary border border-primary/30 rounded-xl hover:bg-primary/5 transition-colors"
            >
              Tải lại
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 max-w-7xl mx-auto">
            {filteredTasks.map(task => (
              <div
                key={task.id}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 hover:shadow-md hover:border-primary/30 transition-all flex flex-col overflow-hidden active:scale-[0.99] cursor-pointer"
                onClick={() => setSelectedTask(task)}
              >
                <div className={`px-4 py-3 flex justify-between items-center ${
                  task.type === 'delivery' ? 'bg-blue-50/50' :
                  task.type === 'return' ? 'bg-amber-50/50' : 'bg-purple-50/50'
                }`}>
                  <div className="flex items-center gap-2">
                    {task.type === 'delivery' && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-blue-700 bg-blue-100/50 px-2 py-1 rounded-md">
                        <Truck size={14} /> GIAO HÀNG
                      </span>
                    )}
                    {task.type === 'return' && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100/50 px-2 py-1 rounded-md">
                        <PackageCheck size={14} /> THU HỒI
                      </span>
                    )}
                    {task.type === 'maintenance' && (
                      <span className="flex items-center gap-1.5 text-xs font-bold text-purple-700 bg-purple-100/50 px-2 py-1 rounded-md">
                        <Wrench size={14} /> BẢO TRÌ
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    #{String(task.id).slice(-6).toUpperCase()}
                  </span>
                </div>

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

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-900/40 flex md:items-center items-end justify-center z-50 backdrop-blur-sm p-0 md:p-4">
          <div className="bg-white w-full md:max-w-2xl flex flex-col border border-slate-200 animate-slide-up h-[85vh] md:h-auto md:max-h-[90vh] rounded-t-3xl md:rounded-2xl overflow-hidden shadow-2xl">
            <div className="w-full flex justify-center py-2 md:hidden">
              <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
            </div>

            <div className="px-5 md:px-6 py-3 md:py-4 border-b border-slate-200 flex justify-between items-center bg-white md:bg-slate-50 shrink-0">
              <h3 className="text-lg font-bold flex items-center gap-2 text-slate-900 font-display">
                <span className="hidden md:inline">Chi tiết nhiệm vụ</span> #{String(selectedTask.id).slice(-6).toUpperCase()}
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
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">Tên khách hàng</p>
                    <p className="font-semibold text-lg text-slate-900">{selectedTask.customer}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold text-slate-500 mb-1">Liên hệ</p>
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-slate-900 text-[15px]">{selectedTask.phone}</p>
                      <button className="p-2 bg-emerald-100 text-emerald-700 rounded-full" title="Gọi ngay">
                        <Phone size={14} className="fill-emerald-700" />
                      </button>
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

            <div className="p-4 border-t border-slate-200 bg-white flex flex-col md:flex-row gap-3 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] shrink-0">
              {selectedTask?.type === 'delivery' && selectedTask?.rentalData?.pickedUpAt && (
                <button
                  onClick={handleOpenIssueModal}
                  className="w-full md:w-auto px-6 py-3.5 bg-red-50 text-red-600 rounded-xl font-bold flex justify-center items-center gap-2 active:bg-red-100 transition-colors"
                >
                  <AlertTriangle size={18} /> Ghi nhận sự cố
                </button>
              )}
              {selectedTask?.type === 'delivery' && !selectedTask?.rentalData?.pickedUpAt && (
                <button
                  onClick={handleConfirmPickup}
                  disabled={pickupLoading}
                  className="w-full md:w-auto px-6 py-3.5 bg-amber-500 text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-amber-600 active:bg-amber-700 transition-colors disabled:opacity-60 shadow-md shadow-amber-200"
                >
                  <PackageCheck size={18} /> {pickupLoading ? 'Đang xác nhận...' : 'Đã lấy hàng'}
                </button>
              )}
              {selectedTask?.type === 'delivery' && selectedTask?.rentalData?.pickedUpAt && (
                <span className="w-full md:w-auto px-6 py-3.5 bg-amber-50 text-amber-700 rounded-xl font-bold flex justify-center items-center gap-2 border border-amber-200 text-sm">
                  <PackageCheck size={18} /> Đã lấy hàng
                </span>
              )}
              {selectedTask?.type === 'delivery' && selectedTask?.rentalData?.pickedUpAt && selectedTask?.rentalData?.deliveredAt && (
                <span className="w-full md:flex-1 py-3.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold flex justify-center items-center gap-2 border border-emerald-200 text-sm">
                  <CheckCircle size={18} /> Đã giao thành công (chờ khách xác nhận)
                </span>
              )}
              {selectedTask?.type === 'delivery' && selectedTask?.rentalData?.pickedUpAt && !selectedTask?.rentalData?.deliveredAt && (
                <button
                  onClick={handleConfirmDelivery}
                  disabled={completionLoading}
                  className="w-full md:flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-bold flex justify-center items-center gap-2 active:bg-slate-800 shadow-md disabled:opacity-60"
                >
                  <CheckCircle size={18} /> {completionLoading ? 'Đang xác nhận...' : 'Xác nhận hoàn thành'}
                </button>
              )}
              {/* RETURN task actions */}
              {selectedTask?.type === 'return' && (
                <button
                  onClick={handleConfirmReturn}
                  disabled={returnLoading}
                  className="w-full md:flex-1 py-3.5 bg-orange-500 text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-orange-600 active:bg-orange-700 transition-colors disabled:opacity-60 shadow-md shadow-orange-200"
                >
                  <PackageCheck size={18} /> {returnLoading ? 'Đang xác nhận...' : 'Xác nhận đã thu hồi'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Issue Report Modal */}
      {showIssueModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex md:items-center items-end justify-center z-[60] backdrop-blur-sm p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md flex flex-col rounded-t-3xl md:rounded-2xl overflow-hidden h-fit max-h-[90vh] border border-slate-200 shadow-2xl animate-slide-up">
            <div className="px-5 py-4 bg-red-50 border-b border-red-100 flex justify-between items-center shrink-0">
              <h3 className="text-[17px] font-bold text-red-700 flex items-center gap-2">
                <AlertTriangle size={20} className="fill-red-700/20" /> Lập biên bản sự cố
              </h3>
              <button
                onClick={() => setShowIssueModal(false)}
                className="text-red-400 hover:text-red-700 bg-white p-1.5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Phân loại <span className="text-red-500">*</span>
                </label>
                <select
                  value={issueForm.issueType}
                  onChange={e => setIssueForm(f => ({ ...f, issueType: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow appearance-none"
                >
                  <option value="">-- Chọn hiện trạng --</option>
                  <option value="MISSING">Mất / Thiếu phụ kiện</option>
                  <option value="DAMAGED">Trầy xước / Rơi vỡ / Cấn móp</option>
                  <option value="OTHER">Lỗi kỹ thuật / Không lên nguồn</option>
                  <option value="WRONG_ITEM">Khách từ chối nhận</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Mô tả chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows="3"
                  value={issueForm.description}
                  onChange={e => setIssueForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-[15px] focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-shadow resize-none"
                  placeholder="Ghi rõ tình trạng thực tế..."
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Ảnh thực tế / Video
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  className="hidden"
                  onChange={e => {
                    const newFiles = Array.from(e.target.files || []);
                    setIssueForm(f => ({ ...f, files: [...f.files, ...newFiles] }));
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 hover:bg-slate-50 active:bg-slate-100 transition-colors"
                >
                  <div className="p-3 bg-red-50 text-red-500 rounded-full mb-3">
                    <Camera size={26} />
                  </div>
                  <p className="text-[15px] font-bold text-slate-700">Chọn ảnh / video</p>
                  <p className="text-xs mt-1 text-slate-400 text-center">Chụp cận cảnh vết xước hoặc serial</p>
                </button>
                {issueForm.files.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {issueForm.files.map((file, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={URL.createObjectURL(file)}
                          alt="preview"
                          className="w-16 h-16 object-cover rounded-xl border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => setIssueForm(f => ({ ...f, files: f.files.filter((_, i) => i !== idx) }))}
                          className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <XCircle size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 border-t border-slate-100 bg-white flex gap-3 shrink-0">
              <button
                onClick={() => { setShowIssueModal(false); resetIssueForm(); }}
                disabled={issueSubmitting}
                className="flex-1 py-3.5 bg-slate-100 text-slate-700 rounded-xl font-bold active:bg-slate-200 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleSubmitIssue}
                disabled={issueSubmitting}
                className="flex-1 py-3.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 active:scale-95 transition-all shadow-md shadow-red-600/20 disabled:opacity-60"
              >
                {issueSubmitting ? 'Đang lưu...' : 'Lưu biên bản'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
