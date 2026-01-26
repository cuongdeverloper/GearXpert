import { FiMoreVertical, FiFileText } from "react-icons/fi";
import { FiCheck, FiX, FiClock, FiUser, FiMapPin, FiCalendar } from "react-icons/fi";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { getSupplierRentalRequests } from "../../service/ApiService/RentalApi";
import { approveRental, rejectRental } from "../../service/ApiService/RentalActionApi";
import { toast } from "react-toastify";
import { confirmDialog } from "../../utils/confirmDialog";
import RentalDetail from "../../components/common/RentalDetail";
export default function SupplierRentalRequests() {
  // Rental detail modal inline
  const user = useSelector((state) => state.user.account);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [menuOpenIdx, setMenuOpenIdx] = useState(null); // index of open menu
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [sortType, setSortType] = useState('NEWEST');
  const [detailModal, setDetailModal] = useState({ open: false, rental: null });

  const fetchRequests = async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const res = await getSupplierRentalRequests(user.id, { status: "PENDING,APPROVED" });
      setRequests(res?.rentals || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load rental requests");
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [user?.id]);

  const handleApprove = async (req) => {
    const result = await confirmDialog({
      title: "Xác nhận duyệt đơn?",
      text: "Bạn có chắc chắn muốn duyệt đơn thuê này?",
      icon: "question",
      confirmText: "Duyệt đơn",
      cancelText: "Huỷ",
      confirmColor: "#16a34a",
    });
    if (result.isConfirmed) {
      try {
        await approveRental(req._id);
        toast.success("Đã duyệt đơn thuê!");
        fetchRequests();
      } catch (err) {
        toast.error(err?.response?.data?.message || "Approve failed");
      }
    }
  };

  const handleReject = async (req) => {
    const result = await confirmDialog({
      title: "Xác nhận từ chối đơn?",
      text: "Bạn có chắc chắn muốn từ chối đơn thuê này?",
      icon: "warning",
      confirmText: "Từ chối",
      cancelText: "Huỷ",
      confirmColor: "#dc2626",
    });
    if (result.isConfirmed) {
      try {
        await rejectRental(req._id);
        toast.success("Đã từ chối đơn thuê!");
        fetchRequests();
      } catch (err) {
        toast.error(err?.response?.data?.message || "Reject failed");
      }
    }
  };

  // Filter & sort logic
  let filteredRequests = requests;
  if (filterStatus !== 'ALL') {
    filteredRequests = filteredRequests.filter(r => r.status === filterStatus);
  }
  if (sortType === 'NEWEST') {
    filteredRequests = [...filteredRequests].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  } else if (sortType === 'OLDEST') {
    filteredRequests = [...filteredRequests].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  } else if (sortType === 'PRICE_DESC') {
    filteredRequests = [...filteredRequests].sort((a, b) => b.totalAmount - a.totalAmount);
  } else if (sortType === 'PRICE_ASC') {
    filteredRequests = [...filteredRequests].sort((a, b) => a.totalAmount - b.totalAmount);
  }

  // Stats calculation
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const approvedCount = requests.filter(r => r.status === 'APPROVED').length;
  const revenue = requests
    .filter(r => r.status === 'APPROVED')
    .reduce((sum, r) => sum + (typeof r.totalAmount === 'number' ? r.totalAmount : 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Rental Requests</h2>
        <p className="mt-1 text-sm text-slate-600">Review and manage incoming rental bookings</p>
      </div>

      {/* Filter & Sort Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
          <button
            className={`px-3 py-1 rounded-lg border text-sm font-semibold ${filterStatus === 'ALL' ? 'bg-primary text-white border-primary' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
            onClick={() => setFilterStatus('ALL')}
          >Tất cả</button>
          <button
            className={`px-3 py-1 rounded-lg border text-sm font-semibold ${filterStatus === 'PENDING' ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
            onClick={() => setFilterStatus('PENDING')}
          >Pending</button>
          <button
            className={`px-3 py-1 rounded-lg border text-sm font-semibold ${filterStatus === 'APPROVED' ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'}`}
            onClick={() => setFilterStatus('APPROVED')}
          >Approved</button>
        </div>
        <div className="flex gap-2 items-center">
          <span className="text-xs text-slate-500 font-semibold">Sắp xếp:</span>
          <select
            className="px-3 py-1 rounded-lg border border-slate-200 text-sm font-semibold bg-white focus:outline-none"
            value={sortType}
            onChange={e => setSortType(e.target.value)}
          >
            <option value="NEWEST">Mới nhất</option>
            <option value="OLDEST">Cũ nhất</option>
            <option value="PRICE_DESC">Giá cao → thấp</option>
            <option value="PRICE_ASC">Giá thấp → cao</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">Pending</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{pendingCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center text-xl">
              <FiClock size={24} className="text-amber-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">Approved</p>
              <p className="text-3xl font-bold text-slate-900 mt-2">{approvedCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center text-xl">
              <FiCheck size={24} className="text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 font-semibold uppercase tracking-tighter">Revenue</p>
              <p className="text-3xl font-bold text-primary mt-2">{revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}$</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
              💰
            </div>
          </div>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-6">
        {filteredRequests.map((req) => (
          <div
            key={req._id || req.id}
            className="bg-white rounded-2xl border border-slate-200 shadow-md hover:shadow-xl transition-all overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-primary/5 to-slate-50 border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-lg overflow-hidden border-2 border-primary/20">
                  {req.customerId?.avatar ? (
                    <img src={req.customerId.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span role="img" aria-label="avatar">👤</span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-lg">Rental #{req._id?.slice(-6) || req.id?.slice(-6)}</span>
                    <span className={`ml-2 px-2 py-0.5 rounded-lg text-xs font-bold uppercase tracking-wider border ${
                      req.status === "PENDING"
                        ? "bg-amber-100 text-amber-700 border-amber-200"
                        : "bg-green-100 text-green-700 border-green-200"
                    }`}>
                      {req.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-600 mt-1">
                    <FiUser size={14} />
                    <span>{req.customerId?.fullName}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500 font-semibold uppercase tracking-tighter">Total Price</div>
                <div className="text-2xl font-bold text-primary mt-1">{(req.totalAmount).toFixed(1)}$</div>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
              {/* Device Table */}
              <div className="flex-1 min-w-0">
                <div className="mb-2 flex items-center gap-2 text-slate-500 text-xs">
                  <FiMapPin size={14} />
                  <span className="truncate">{req.deliveryAddress?.fullAddress}</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-separate border-spacing-y-1">
                    <thead>
                      <tr className="text-slate-500 text-xs uppercase">
                        <th className="text-left font-semibold">Device</th>
                        <th className="text-left font-semibold">Rental Period</th>
                        <th className="text-center font-semibold">Qty</th>
                        <th className="text-right font-semibold">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {req.rentalItems?.map((item, idx) => (
                        <tr key={item._id || idx} className="bg-slate-50 hover:bg-primary/10 rounded-xl">
                          <td className="py-2 pr-2 font-medium text-slate-900 max-w-[180px] truncate">
                            {item.deviceId?.name || 'Device'}
                          </td>
                          <td className="py-2 pr-2 whitespace-nowrap">
                            <span className="inline-flex items-center gap-1">
                              <FiCalendar size={12} />
                              {item.rentalStartDate?.slice(0,10)} → {item.rentalEndDate?.slice(0,10)}
                            </span>
                          </td>
                          <td className="py-2 text-center">{item.quantity}</td>
                          <td className="py-2 text-right text-primary font-semibold">{(item.rentPrice).toFixed(0)}$</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-4 min-w-[180px] md:items-end">
                {req.status === "APPROVED" && (
                  <button
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all text-sm font-semibold"
                    onClick={() => setDetailModal({ open: true, rental: req })}
                  >
                    <FiFileText size={16} /> View Details
                  </button>
                )}
                {req.status === "PENDING" && (
                  <div>
                    <button
                      className="p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-primary focus:outline-none"
                      onClick={() => setMenuOpenIdx(menuOpenIdx === req._id ? null : req._id)}
                      title="Actions"
                    >
                      <FiMoreVertical size={22} />
                    </button>
                    {menuOpenIdx === req._id && (
                      <div className="absolute right-1 z-100 mt-2 w-44 bg-white border border-slate-200 rounded-xl drop-shadow-lg py-2 animate-fade-in">
                        <button
                          className="w-full flex items-center gap-2 px-4 py-2 text-green-700 hover:bg-green-50 text-sm font-semibold"
                          onClick={() => { setMenuOpenIdx(null); handleApprove(req); }}
                        >
                          <FiCheck size={16} />Approve
                        </button>
                        <button
                          className="w-full flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 text-sm font-semibold"
                          onClick={() => { setMenuOpenIdx(null); handleReject(req); }}
                        >
                          <FiX size={16} /> Reject
                        </button>
                        <button
                          className="w-full flex items-center gap-2 px-4 py-2 text-slate-700 hover:bg-slate-50 text-sm font-semibold"
                          onClick={() => { setMenuOpenIdx(null); setDetailModal({ open: true, rental: req }); }}
                        >
                          <FiFileText size={16} /> View Details
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {req.status === "APPROVED" && (
                  <div className="px-4 py-2.5 bg-green-50 rounded-xl border border-green-200 text-green-700 text-sm font-semibold">
                    ✓ Approved
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Rental Detail Modal */}
      <RentalDetail
        open={detailModal.open}
        onClose={() => setDetailModal({ open: false, rental: null })}
        rental={detailModal.rental}
      />
    </div>
  );
}
