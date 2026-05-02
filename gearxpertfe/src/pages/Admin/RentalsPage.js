import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import { 
  FiSearch, FiCheckCircle, FiAlertCircle, FiClock, FiX, 
  FiCalendar, FiHash, FiUser, FiBox, FiDollarSign, FiFilter,
  FiChevronRight, FiMapPin, FiTruck, FiRefreshCw, FiExternalLink
} from "react-icons/fi";
import { getAdminRentals } from "../../service/ApiService/AdminDashboardApi";
import Pagination from "../../components/common/Pagination";
import { toast } from "react-toastify";

export default function RentalsPage() {
  const dispatch = useDispatch();
  
  // State
  const [rentals, setRentals] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const ITEMS_PER_PAGE = 10;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchRentals = useCallback(async () => {
    dispatch(showAdminLoading());
    try {
      const params = {
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch,
        status: statusFilter
      };
      const res = await getAdminRentals(params);
      if (res) {
        setRentals(res.rentals || []);
        setTotal(res.total || 0);
      }
    } catch (error) {
      console.error("Failed to load rentals:", error);
      toast.error("Không thể tải danh sách đơn thuê");
    } finally {
      dispatch(hideAdminLoading());
    }
  }, [dispatch, currentPage, debouncedSearch, statusFilter]);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  const formatVND = (amount) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  };

  const calculateDuration = (start, end) => {
    if (!start || !end) return 0;
    const s = new Date(start);
    const e = new Date(end);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  };

  const formatDate = (dateString, showTime = false) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A";
    
    const options = { 
      day: "2-digit", 
      month: "2-digit", 
      year: "numeric",
      ...(showTime && { hour: "2-digit", minute: "2-digit" })
    };
    return date.toLocaleDateString("vi-VN", options);
  };

  const getStatusConfig = (status) => {
    const configs = {
      PENDING: {
        label: "Chờ xử lý",
        color: "bg-amber-50 text-amber-600 border-amber-100",
        icon: <FiClock className="w-3.5 h-3.5" />,
      },
      APPROVED: {
        label: "Đã duyệt",
        color: "bg-blue-50 text-blue-600 border-blue-100",
        icon: <FiCheckCircle className="w-3.5 h-3.5" />,
      },
      PAID: {
        label: "Đã thanh toán",
        color: "bg-emerald-50 text-emerald-600 border-emerald-100",
        icon: <FiDollarSign className="w-3.5 h-3.5" />,
      },
      DELIVERING: {
        label: "Đang giao",
        color: "bg-indigo-50 text-indigo-600 border-indigo-100",
        icon: <FiTruck className="w-3.5 h-3.5" />,
      },
      RENTING: {
        label: "Đang thuê",
        color: "bg-violet-50 text-violet-600 border-violet-100",
        icon: <FiBox className="w-3.5 h-3.5" />,
      },
      RETURNING: {
        label: "Đang trả",
        color: "bg-orange-50 text-orange-600 border-orange-100",
        icon: <FiRefreshCw className="w-3.5 h-3.5" />,
      },
      COMPLETED: {
        label: "Hoàn tất",
        color: "bg-green-50 text-green-600 border-green-100",
        icon: <FiCheckCircle className="w-3.5 h-3.5" />,
      },
      CANCELLED: {
        label: "Đã hủy",
        color: "bg-rose-50 text-rose-600 border-rose-100",
        icon: <FiX className="w-3.5 h-3.5" />,
      },
    };
    return configs[status] || {
      label: status,
      color: "bg-slate-50 text-slate-600 border-slate-100",
      icon: <FiAlertCircle className="w-3.5 h-3.5" />,
    };
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <div className="p-4 sm:p-6 space-y-6 bg-[#f8fafc] min-h-full">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý đơn thuê</h1>
          <p className="text-sm text-slate-500 mt-1">Giám sát và quản lý giao dịch toàn sàn</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Tổng cộng:</span>
            <span className="text-lg font-bold text-primary">{total}</span>
          </div>
          <button 
            onClick={fetchRentals}
            className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-primary transition-all shadow-sm active:scale-95 bg-white"
          >
            <FiRefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1 group">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm theo mã đơn, khách hàng, shop hoặc thiết bị..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border border-slate-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm shadow-sm"
          />
        </div>

        <div className="relative min-w-[220px]">
          <FiFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none w-5 h-5" />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
            className="w-full pl-12 pr-10 py-3.5 bg-white rounded-2xl border border-slate-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm appearance-none cursor-pointer shadow-sm"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">Chờ xử lý</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="PAID">Đã thanh toán</option>
            <option value="DELIVERING">Đang giao hàng</option>
            <option value="RENTING">Đang trong thời gian thuê</option>
            <option value="RETURNING">Đang thực hiện trả hàng</option>
            <option value="COMPLETED">Đã hoàn tất</option>
            <option value="CANCELLED">Đã hủy đơn</option>
          </select>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto min-h-[400px]">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Mã đơn & Thiết bị</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Đối tác liên quan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Thời gian thuê</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Giá trị & T.Toán</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center whitespace-nowrap px-10">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rentals.map((rental) => {
                const status = getStatusConfig(rental.status);
                const duration = rental.totalDays || calculateDuration(rental.rentalStartDate, rental.rentalEndDate);
                
                return (
                  <tr key={rental.id} className="hover:bg-slate-50/80 transition-colors group">
                    {/* Order & Device */}
                    <td className="px-6 py-5">
                      <div className="flex flex-col gap-1.5">
                        <span className="text-sm font-bold text-slate-900 tracking-tight">#{rental.orderCode || rental.id.toString().slice(-6).toUpperCase()}</span>
                        <div className="flex items-center gap-1.5 py-1 px-2.5 bg-blue-50 text-blue-700 rounded-lg border border-blue-100 w-fit">
                          <FiBox className="w-4 h-4 shrink-0" />
                          <span className="text-xs font-bold truncate max-w-[180px]">{rental.devices?.join(", ") || "N/A"}</span>
                        </div>
                      </div>
                    </td>

                    {/* Parties */}
                    <td className="px-6 py-5">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                            <FiUser className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">K: {rental.customerName}</div>
                            <div className="text-[10px] text-slate-400 truncate">{rental.customerEmail}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                            <FiTruck className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-700 truncate">S: {rental.supplierName}</div>
                            <div className="text-[10px] text-slate-400 truncate">{rental.supplierEmail}</div>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Timeline */}
                    <td className="px-6 py-5 text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-100 mb-1.5">
                          <FiCalendar className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-bold text-slate-700">
                            {formatDate(rental.rentalStartDate)} → {formatDate(rental.rentalEndDate)}
                          </span>
                        </div>
                        <span className="px-3 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-full uppercase tracking-widest">
                          {duration} Ngày thuê
                        </span>
                      </div>
                    </td>

                    {/* Amount & Payment */}
                    <td className="px-6 py-5 text-right">
                      <div className="text-sm font-black text-slate-900 mb-1">
                        {formatVND(rental.totalAmount)}
                      </div>
                      {rental.paymentStatus === "PAID" ? (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          <FiCheckCircle className="w-3 h-3" />
                          ĐÃ THANH TOÁN
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                          <FiClock className="w-3 h-3" />
                          CHỜ THANH TOÁN
                        </div>
                      )}
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-5 text-center px-10">
                      <div className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-black shadow-sm ${status.color}`}>
                        {status.icon}
                        {status.label}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty States */}
        {rentals.length === 0 && (
          <div className="py-24 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 border border-dashed border-slate-200">
              <FiBox className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Không tìm thấy dữ liệu</h3>
            <p className="text-sm text-slate-500 mt-1">Vui lòng kiểm tra lại bộ lọc hoặc từ khóa tìm kiếm</p>
          </div>
        )}
      </div>

      {/* Footer / Pagination */}
      {total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm gap-4">
          <span className="text-sm text-slate-500">
            Hiển thị <span className="font-bold text-slate-900">{rentals.length}</span> / <span className="font-bold text-slate-900">{total}</span> đơn thuê
          </span>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}
