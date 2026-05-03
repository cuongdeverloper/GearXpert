import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import { 
  FiArrowLeft, 
  FiUser, 
  FiMail, 
  FiMapPin, 
  FiBox, 
  FiLayers, 
  FiShoppingBag, 
  FiStar, 
  FiMessageCircle,
  FiExternalLink,
  FiShield,
  FiCalendar,
  FiPhone
} from "react-icons/fi";
import { getAdminSupplierDetail } from "../../service/ApiService/AdminDashboardApi";
import { toast } from "react-toastify";
import { formatDate } from "../../utils/formatters";

export default function AdminSupplierDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchDetail = async () => {
      dispatch(showAdminLoading());
      try {
        const res = await getAdminSupplierDetail(id);
        if (res?.success) {
          setData(res.data);
        } else {
          toast.error("Không tìm thấy thông tin nhà cung cấp");
          navigate("/admin/suppliers");
        }
      } catch (error) {
        console.error("Failed to load supplier detail:", error);
        toast.error("Lỗi khi tải thông tin chi tiết");
        navigate("/admin/suppliers");
      } finally {
        dispatch(hideAdminLoading());
      }
    };

    fetchDetail();
  }, [id, dispatch, navigate]);

  if (!data) return null;

  const { profile, stats, recentRentals } = data;

  return (
    <div className="space-y-6 pb-10">
      {/* Header with Back Button */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/admin/suppliers")}
            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-100 rounded-xl transition-all text-slate-600 font-semibold group"
          >
            <FiArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>Quay lại</span>
          </button>
          <div className="h-8 w-px bg-slate-200" />
          <div>
            <h2 className="text-xl font-bold text-slate-900 font-display">Chi tiết đối tác</h2>
            <p className="text-[10px] text-slate-400 font-mono">UID: {id}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/supplier/${id}`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-indigo-600 transition-all shadow-lg shadow-slate-100 active:scale-95"
          >
            <FiExternalLink size={16} />
            <span>Xem Storefront</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Basic Info & Profile */}
        <div className="lg:col-span-1 space-y-6">
          {/* User Profile Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
            <div className="px-6 pb-6 -mt-16 text-center">
              <div className="relative inline-block group">
                <img
                  src={data.avatar || "/default-avatar.png"}
                  alt={data.fullName}
                  className="w-32 h-32 rounded-[2rem] border-4 border-white shadow-2xl object-cover bg-white transition-transform group-hover:scale-105"
                />
                <span className={`absolute bottom-2 right-2 w-6 h-6 rounded-full border-4 border-white ${data.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-red-500'} shadow-sm`} />
              </div>
              <h3 className="mt-4 text-2xl font-black text-slate-900 tracking-tight">{data.fullName}</h3>
              <div className="flex items-center justify-center gap-2 mt-1 mb-4 text-slate-400">
                 <FiMail size={14} />
                 <span className="text-sm font-medium">{data.email}</span>
              </div>
              
              <div className="flex justify-center gap-3">
                <div className="flex flex-col items-center px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hạng</span>
                  <span className="text-sm font-black text-indigo-600">{data.rank}</span>
                </div>
                <div className="flex flex-col items-center px-4 py-2 bg-slate-50 rounded-2xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái</span>
                  <span className={`text-sm font-black ${data.status === 'ACTIVE' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {data.status}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="px-8 py-6 border-t border-slate-50 space-y-4">
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                  <FiPhone size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Điện thoại</p>
                  <p className="text-sm font-bold text-slate-700">{data.phone || "Chưa cập nhật"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                  <FiCalendar size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ngày tham gia</p>
                  <p className="text-sm font-bold text-slate-700">{formatDate(data.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 group">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${data.isVerified ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-50 text-slate-300'}`}>
                  <FiShield size={18} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Định danh</p>
                  <p className={`text-sm font-bold ${data.isVerified ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {data.isVerified ? 'Đã xác thực danh tính' : 'Chưa xác thực'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Business Info Card */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 space-y-6">
            <h4 className="text-lg font-black text-slate-900 flex items-center gap-3">
              <div className="w-2 h-6 bg-indigo-600 rounded-full" />
              Thông tin cửa hàng
            </h4>
            <div className="space-y-6">
              <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                <p className="text-[10px] uppercase font-black text-indigo-400 mb-1 tracking-widest">Tên kinh doanh</p>
                <p className="text-base font-bold text-slate-800">{profile?.businessName || "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase font-black text-slate-400 mb-2 tracking-widest">Giới thiệu</p>
                <p className="text-sm text-slate-500 leading-relaxed italic bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  "{profile?.businessDescription || "Cửa hàng chưa có mô tả giới thiệu."}"
                </p>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                  <FiMapPin size={20} />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-black text-slate-400 mb-1 tracking-widest">Địa chỉ kho</p>
                  <p className="text-sm font-bold text-slate-700 leading-tight">
                    {profile?.warehouseAddress?.fullAddress || "Chưa có địa chỉ chi tiết"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Key Stats & Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Indicators Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox 
              icon={<FiLayers size={24} />} 
              value={stats.totalDevices} 
              label="Mẫu thiết bị" 
              color="blue" 
            />
            <StatBox 
              icon={<FiBox size={24} />} 
              value={stats.totalItems} 
              label="Tổng thiết bị" 
              color="indigo" 
            />
            <StatBox 
              icon={<FiShoppingBag size={24} />} 
              value={stats.activeRentals} 
              label="Đơn đang chạy" 
              color="emerald" 
            />
            <StatBox 
              icon={<FiStar size={24} />} 
              value={Number(stats.avgRating || 0).toFixed(1)} 
              label={`${stats.totalReviews} đánh giá`} 
              color="amber" 
            />
          </div>

          {/* Activity Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h4 className="text-lg font-black text-slate-900 tracking-tight">Hoạt động cho thuê</h4>
                <p className="text-xs text-slate-400 font-medium">Lịch sử giao dịch gần nhất</p>
              </div>
              <Link 
                to={`/admin/rentals?search=${data.fullName}`} 
                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold text-slate-600 transition-colors"
              >
                Tất cả đơn thuê
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50">
                  <tr>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Khách hàng</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày tạo</th>
                    <th className="px-4 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Giá trị</th>
                    <th className="px-8 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentRentals && recentRentals.length > 0 ? (
                    recentRentals.map((rental) => (
                      <tr key={rental._id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-xs">
                              {rental.customerId?.fullName?.charAt(0) || "U"}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-slate-700">{rental.customerId?.fullName || "N/A"}</p>
                              <p className="text-[10px] text-slate-400">{rental.customerId?.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-sm text-slate-500 font-medium">
                          {formatDate(rental.createdAt)}
                        </td>
                        <td className="px-4 py-5 text-sm font-black text-slate-900 text-right">
                          {rental.totalAmount.toLocaleString()}đ
                        </td>
                        <td className="px-8 py-5 text-center">
                          <span className={`inline-block px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            rental.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-600' : 
                            rental.status === 'CANCELLED' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                          }`}>
                            {rental.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" className="px-8 py-16 text-center">
                        <div className="flex flex-col items-center opacity-20">
                          <FiShoppingBag size={48} className="mb-4" />
                          <p className="text-sm font-bold">Chưa có giao dịch nào được ghi nhận</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Hub */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              <div className="text-center md:text-left">
                <h4 className="text-2xl font-black mb-2 tracking-tight">Hành động quản trị</h4>
                <p className="text-white/50 text-sm max-w-md font-medium">
                  Quản lý quyền truy cập, gửi thông báo trực tiếp hoặc hỗ trợ xử lý các vấn đề liên quan đến nhà cung cấp này.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-4 shrink-0">
                <button className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-bold transition-all border border-white/10">
                  Gửi thông báo
                </button>
                <button className={`px-8 py-3 rounded-2xl text-sm font-bold transition-all shadow-lg active:scale-95 ${
                  data.isVerified ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                }`}>
                  {data.isVerified ? 'Cập nhật định danh' : 'Yêu cầu xác thực'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon, value, label, color }) {
  const colors = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
  };

  return (
    <div className={`p-6 rounded-[2rem] border ${colors[color]} shadow-sm hover:shadow-md transition-all group`}>
      <div className="mb-4 group-hover:scale-110 transition-transform origin-left">
        {icon}
      </div>
      <p className="text-3xl font-black text-slate-900 tracking-tight">{value}</p>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{label}</p>
    </div>
  );
}
