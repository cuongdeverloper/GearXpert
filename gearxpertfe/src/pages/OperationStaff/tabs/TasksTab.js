import React, { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  Truck, PackageCheck, Wrench,
  CheckCircle, X, MapPin, Phone, FileText, User, Laptop
} from 'lucide-react';
import { getDeliveringRentals, getReturningRentals, claimDeliveryTask, confirmPickup } from '../../../service/ApiService/RentalApi';
import { logOperationAction } from '../../../service/ApiService/OperationLogApi';

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
    deliveryTaskId: rental.deliveryTask?._id || null,
    assignedOperationStaffId: rental.assignedOperationStaffId?._id || rental.assignedOperationStaffId || null,
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
    assignedOperationStaffId: rental.assignedOperationStaffId?._id || rental.assignedOperationStaffId || null,
    rentalData: rental,
  };
};

export default function TasksTab({ onOpenHandover, realtimeTick = 0 }) {
  const account = useSelector((state) => state.user.account);
  const currentStaffId = account?.id;
  const [activeTab, setActiveTab] = useState('all');
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [claimLoading, setClaimLoading] = useState(false);

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

  useEffect(() => {
    fetchAllTasks();
  }, [fetchAllTasks, realtimeTick]);

  const handleConfirmPickup = async () => {
    if (!selectedTask || pickupLoading) return;

    if (selectedTask.type === 'delivery' && selectedTask.assignedOperationStaffId && String(selectedTask.assignedOperationStaffId) !== String(currentStaffId)) {
      toast.error('Đơn này đã được lock cho staff khác.');
      return;
    }

    setPickupLoading(true);
    try {
      await confirmPickup(selectedTask.rentalId);
      const now = new Date().toISOString();
      setTasks(prev => prev.map(t =>
        t.id === selectedTask.id
          ? {
              ...t,
              rentalData: { ...t.rentalData, pickedUpAt: now },
              assignedOperationStaffId: t.assignedOperationStaffId || currentStaffId,
            }
          : t
      ));
      setSelectedTask(prev => ({
        ...prev,
        rentalData: { ...prev.rentalData, pickedUpAt: now },
        assignedOperationStaffId: prev.assignedOperationStaffId || currentStaffId,
      }));
      logOperationAction('CONFIRM_PICKUP', 'RENTAL', selectedTask.rentalId, {
        device: selectedTask.device,
        customer: selectedTask.customer,
        address: selectedTask.address,
      }).catch(() => {});
    } catch (err) {
      console.error('Lỗi xác nhận lấy hàng:', err);
      toast.error(err?.response?.data?.message || 'Không thể xác nhận lấy hàng');
    } finally {
      setPickupLoading(false);
    }
  };


  const filteredTasks = tasks.filter(task =>
    activeTab === 'all' ? true : task.type === activeTab
  );

  const isSelectedLockedByOther =
    selectedTask?.assignedOperationStaffId &&
    String(selectedTask.assignedOperationStaffId) !== String(currentStaffId);

  const isDeliveryTask = selectedTask?.type === 'delivery';
  const isReturnTask = selectedTask?.type === 'return';
  const hasOwner = Boolean(selectedTask?.assignedOperationStaffId);
  const pickedUp = Boolean(selectedTask?.rentalData?.pickedUpAt);
  const delivered = Boolean(selectedTask?.rentalData?.deliveredAt);
  const showHandoverAsPrimaryCta =
    isDeliveryTask && hasOwner && pickedUp && !delivered && !isSelectedLockedByOther;

  const handleOpenRecord = (context) => {
    if (!selectedTask?.rentalId) return;
    onOpenHandover?.(selectedTask.rentalId, context);
    setSelectedTask(null);
  };

  const openRecordButtonBaseClass =
    'w-full px-6 py-3.5 rounded-xl font-bold flex justify-center items-center gap-2 transition-colors';

  const handleClaimTask = async () => {
    if (!selectedTask || selectedTask.type !== 'delivery') return;
    if (!selectedTask.deliveryTaskId) {
      toast.error('Task giao hàng chưa sẵn sàng để nhận.');
      return;
    }

    if (isSelectedLockedByOther) {
      toast.error('Đơn đã được lock cho staff khác.');
      return;
    }

    setClaimLoading(true);
    try {
      await claimDeliveryTask(selectedTask.deliveryTaskId);

      setTasks((prev) =>
        prev.map((t) =>
          t.id === selectedTask.id
            ? {
                ...t,
                assignedOperationStaffId: currentStaffId,
                rentalData: {
                  ...t.rentalData,
                  assignedOperationStaffId: currentStaffId,
                },
              }
            : t
        )
      );

      setSelectedTask((prev) =>
        prev
          ? {
              ...prev,
              assignedOperationStaffId: currentStaffId,
              rentalData: {
                ...prev.rentalData,
                assignedOperationStaffId: currentStaffId,
              },
            }
          : prev
      );

      toast.success('Nhận đơn thành công. Đơn đã lock cho bạn.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Không thể nhận đơn');
    } finally {
      setClaimLoading(false);
    }
  };

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
              onClick={fetchAllTasks}
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
              onClick={fetchAllTasks}
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
                <span className="hidden md:inline">Chi tiết nhiệm vụ</span>
              </h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

<div className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-6 space-y-4">
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {selectedTask.type === 'delivery' && (
                    <div className="bg-indigo-100 text-indigo-700 p-2 rounded-xl">
                      <Truck size={20} />
                    </div>
                  )}
                  {selectedTask.type === 'return' && (
                    <div className="bg-amber-100 text-amber-700 p-2 rounded-xl">
                      <PackageCheck size={20} />
                    </div>
                  )}
                  {selectedTask.type === 'maintenance' && (
                    <div className="bg-purple-100 text-purple-700 p-2 rounded-xl">
                      <Wrench size={20} />
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Loại nhiệm vụ</p>
                    <p className="font-bold text-slate-900 text-sm">
                      {selectedTask.type === 'delivery' ? 'GIAO HÀNG' : selectedTask.type === 'return' ? 'THU HỒI' : 'BẢO TRÌ'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border ${selectedTask.assignedOperationStaffId ? isSelectedLockedByOther ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                    {selectedTask.assignedOperationStaffId
                      ? isSelectedLockedByOther
                        ? 'Staff khác xử lý'
                        : 'Đã nhận đơn'
                      : 'Đang mở'}
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <User size={18} className="text-primary"/> 
                  <h4 className="font-bold text-slate-800 text-[15px]">Thông tin khách hàng</h4>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-lg text-slate-900">{selectedTask.customer}</p>
                    <p className="font-medium text-slate-600 text-[15px] mt-0.5">{selectedTask.phone}</p>
                  </div>
                  <a href={`tel:${selectedTask.phone}`} className="w-10 h-10 bg-emerald-100/80 text-emerald-700 rounded-full flex justify-center items-center hover:bg-emerald-200 transition-colors" title="Gọi khách hàng">
                    <Phone size={18} className="fill-emerald-700" />
                  </a>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-start gap-3">
                  <MapPin size={20} className="text-primary shrink-0 mt-0.5" />
                  <p className="font-medium leading-snug text-slate-800 text-[14px]">{selectedTask.address}</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Laptop size={18} className="text-primary"/> 
                  <h4 className="font-bold text-slate-800 text-[15px]">Chi tiết thiết bị</h4>
                </div>
                <div className="space-y-4">
                  <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                    <p className="font-bold text-[16px] text-indigo-900 leading-tight">{selectedTask.device}</p>
                    
                    <div className="mt-3 bg-white p-3 rounded-lg border border-indigo-100 shadow-sm">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1">Ghi chú hệ thống</p>
                      <p className="text-sm font-medium text-slate-800">{selectedTask.note && selectedTask.note !== '' ? selectedTask.note : 'Không có ghi chú'}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      onOpenHandover?.(
                        selectedTask.rentalId,
                        selectedTask.type === 'return' ? 'RETURN' : 'DELIVERY'  
                      );
                      setSelectedTask(null);
                    }}
                    className="w-full py-2.5 bg-white border border-indigo-200 text-indigo-700 rounded-xl text-[14px] flex justify-center items-center gap-2 font-bold hover:bg-indigo-50 transition-colors shadow-sm"
                  >
                    <FileText size={18} /> Xem chi tiết biên bản/hợp đồng
                  </button>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-white shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] shrink-0">
              <div className="grid grid-cols-1 sm:grid-cols-2  gap-3">
              {isDeliveryTask && !hasOwner && (
                <button
                  onClick={handleClaimTask}
                  disabled={claimLoading}
                  className="w-full px-6 py-3.5 bg-indigo-600 text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-indigo-700 transition-colors disabled:opacity-60"
                >
                  <PackageCheck size={18} /> {claimLoading ? 'Đang nhận đơn...' : 'Nhận đơn'}
                </button>
              )}

              {isDeliveryTask && hasOwner && !isSelectedLockedByOther && (
                <button
                  onClick={() => handleOpenRecord('DELIVERY')}
                  className={`${openRecordButtonBaseClass} ${
                    showHandoverAsPrimaryCta
                      ? 'bg-indigo-600 text-white border border-indigo-600 hover:bg-indigo-700 sm:col-span-2  shadow-md shadow-indigo-200'
                      : 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                  }`}
                >
                  <FileText size={18} /> {showHandoverAsPrimaryCta ? 'Mở biên bản để hoàn tất' : 'Mở biên bản'}
                </button>
              )}

              {isDeliveryTask && !pickedUp && (
                <button
                  onClick={handleConfirmPickup}
                  disabled={pickupLoading || isSelectedLockedByOther || !hasOwner}
                  className="w-full px-6 py-3.5 bg-amber-500 text-white rounded-xl font-bold flex justify-center items-center gap-2 hover:bg-amber-600 active:bg-amber-700 transition-colors disabled:opacity-60 shadow-md shadow-amber-200"
                >
                  <PackageCheck size={18} /> {pickupLoading ? 'Đang xác nhận...' : 'Đã lấy hàng'}
                </button>
              )}

              {isDeliveryTask && pickedUp && !delivered && !isSelectedLockedByOther && (
                <span className="w-full px-2 py-1 text-slate-500 font-medium flex justify-center items-center text-sm sm:col-span-2 ">
                  Xác nhận thành công hoặc ghi nhận sự cố được xử lý trong Biên bản.
                </span>
              )}

              {isDeliveryTask && delivered && (
                <span className="w-full px-6 py-3.5 bg-emerald-50 text-emerald-700 rounded-xl font-bold flex justify-center items-center gap-2 border border-emerald-200 text-sm sm:col-span-2 ">
                  <CheckCircle size={18} /> Đã giao thành công (chờ khách xác nhận)
                </span>
              )}

              {isDeliveryTask && isSelectedLockedByOther && (
                <span className="w-full px-6 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-semibold flex justify-center items-center border border-slate-200 text-sm sm:col-span-2 ">
                  Đơn đang được staff khác xử lý, bạn không thể thao tác.
                </span>
              )}

              {isReturnTask && (
                <button
                  onClick={() => handleOpenRecord('RETURN')}
                  disabled={isSelectedLockedByOther}
                  className={`${openRecordButtonBaseClass} bg-orange-600 text-white border border-orange-600 hover:bg-orange-700 disabled:opacity-60 shadow-md shadow-orange-200 sm:col-span-2 `}
                >
                  <FileText size={18} /> Mở biên bản để xác nhận thu hồi
                </button>
              )}

              {isReturnTask && isSelectedLockedByOther && (
                <span className="w-full px-6 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-semibold flex justify-center items-center border border-slate-200 text-sm sm:col-span-2 ">
                  Đơn thu hồi đang được staff khác xử lý.
                </span>
              )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}