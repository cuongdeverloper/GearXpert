import React, { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import { FiSearch, FiEye, FiCheckCircle, FiXCircle, FiFilter, FiAlertTriangle, FiCalendar, FiUser, FiHome, FiPackage } from "react-icons/fi";
import { adminGetAllShopReports } from "../../service/ApiService/ReportApi";
import { toast } from "react-toastify";
import ShopReportDetailModal from "../../components/admin/ShopReportDetailModal";

export default function AdminShopReports() {
  const dispatch = useDispatch();
  const [reports, setReports] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      dispatch(showAdminLoading());
      const response = await adminGetAllShopReports();
      if (response && response.success) {
        setReports(response.data);
      }
    } catch (error) {
      console.error("Fetch reports error:", error);
      toast.error("Không thể tải danh sách báo cáo");
    } finally {
      setLoading(false);
      dispatch(hideAdminLoading());
    }
  }, [dispatch]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const filteredReports = reports.filter((report) => {
    const searchTermLower = searchTerm.toLowerCase();
    const matchesSearch =
      (report.shop?.businessName || "").toLowerCase().includes(searchTermLower) ||
      (report.reporter?.fullName || "").toLowerCase().includes(searchTermLower) ||
      (report.reason || "").toLowerCase().includes(searchTermLower);
    const matchesStatus = statusFilter === "ALL" || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "PENDING": return "bg-amber-100 text-amber-700 border-amber-200";
      case "RECEIVED": return "bg-blue-100 text-blue-700 border-blue-200";
      case "RESOLVED": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "REJECTED": return "bg-rose-100 text-rose-700 border-rose-200";
      default: return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "PENDING": return "Đang chờ";
      case "RECEIVED": return "Đã nhận";
      case "RESOLVED": return "Đã xử lý";
      case "REJECTED": return "Đã bác bỏ";
      default: return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-4 mb-8 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.05] transition-opacity pointer-events-none">
            <FiAlertTriangle size={120} />
        </div>
        <div className="p-3.5 bg-rose-500 text-white rounded-2xl shadow-lg shadow-rose-100 ring-4 ring-rose-50">
          <FiAlertTriangle size={28} />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-800 m-0 tracking-tight">Báo cáo Shop</h1>
          <p className="text-slate-500 font-medium text-sm">Quản lý và giải quyết các khiếu nại của người dùng về cửa hàng.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex flex-1 gap-3">
          <div className="relative flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên shop, người báo, lý do..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition bg-slate-50/50"
            />
          </div>

          <div className="relative">
            <FiFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition bg-slate-50/50 appearance-none cursor-pointer font-medium text-slate-600 min-w-[160px]"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING">Đang chờ</option>
              <option value="RECEIVED">Đã nhận</option>
              <option value="RESOLVED">Đã xử lý</option>
              <option value="REJECTED">Đã bác bỏ</option>
            </select>
          </div>
        </div>
        
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">
            Hiển thị {filteredReports.length} báo cáo
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase tracking-wider text-[10px]">Ngày gửi</th>
                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase tracking-wider text-[10px]">Cửa hàng / Người báo</th>
                <th className="px-6 py-4 text-left font-bold text-slate-500 uppercase tracking-wider text-[10px]">Lý do</th>
                <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase tracking-wider text-[10px]">Bằng chứng</th>
                <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase tracking-wider text-[10px]">Trạng thái</th>
                <th className="px-6 py-4 text-center font-bold text-slate-500 uppercase tracking-wider text-[10px]">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="6" className="px-6 py-8">
                      <div className="h-4 bg-slate-100 rounded-lg w-full"></div>
                    </td>
                  </tr>
                ))
              ) : filteredReports.length > 0 ? (
                filteredReports.map((report) => (
                  <tr key={report._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600 font-medium">
                        <FiCalendar className="text-slate-400" />
                        {new Date(report.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                      <div className="text-[10px] text-slate-400 ml-6">
                        {new Date(report.createdAt).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
                                <FiHome size={12} />
                            </div>
                            <span className="font-bold text-slate-800">{report.shop?.businessName}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-70">
                            <div className="p-1.5 bg-slate-100 text-slate-500 rounded-lg">
                                <FiUser size={12} />
                            </div>
                            <span className="text-xs text-slate-600">{report.reporter?.fullName}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-rose-50 text-rose-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-100">
                        {report.reason}
                      </span>
                      {report.purchasedProduct && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-500 font-bold bg-slate-50 w-fit px-2 py-0.5 rounded-lg border border-slate-100">
                            <FiPackage size={10} />
                            {report.purchasedProduct.deviceName}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                        {report.evidence?.length || 0} files
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusColor(report.status)}`}>
                        {report.status === "PENDING" && <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />}
                        {report.status === "RECEIVED" && <FiCheckCircle size={12} />}
                        {report.status === "RESOLVED" && <FiCheckCircle size={12} />}
                        {report.status === "REJECTED" && <FiXCircle size={12} />}
                        {getStatusLabel(report.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center text-sm">
                      <button
                        onClick={() => setSelectedReport(report)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white border-2 border-slate-100 text-slate-700 rounded-xl font-bold hover:border-primary hover:text-primary hover:bg-primary/5 transition-all shadow-sm active:scale-95"
                      >
                        <FiEye size={16} />
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                        <FiAlertTriangle size={64} />
                        <p className="text-lg font-bold">Không tìm thấy báo cáo nào</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ShopReportDetailModal 
        report={selectedReport} 
        onClose={() => setSelectedReport(null)} 
        onSuccess={fetchReports}
      />
    </div>
  );
}
