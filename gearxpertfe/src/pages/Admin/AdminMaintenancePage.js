import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import {
  getAdminMaintenanceWorkOrders,
  getAdminMaintenanceWorkOrderDetail,
  reviewAdminMaintenanceWorkOrder,
} from "../../service/ApiService/AdminMaintenanceApi";
import AdminPageHeader from "../../components/layout/admin/AdminPageHeader";

const AdminMaintenancePage = () => {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("PENDING_REVIEW");

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal State
  const [selectedWO, setSelectedWO] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    fetchWorkOrders();
  }, [filterStatus, page]);

  const fetchWorkOrders = async () => {
    setLoading(true);
    try {
      const res = await getAdminMaintenanceWorkOrders({
        status: filterStatus === "ALL" ? "" : filterStatus,
        page,
        limit: 10,
      });
      if (res && res.success) {
        setWorkOrders(res.data);
        setTotalPages(res.pagination.totalPages || 1);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Lỗi tải danh sách bảo trì");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = async (id) => {
    setDetailLoading(true);
    try {
      const res = await getAdminMaintenanceWorkOrderDetail(id);
      if (res && res.success) {
        setSelectedWO(res.data);
        setReviewNote("");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Lỗi tải chi tiết bảo trì");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    setSelectedWO(null);
    setReviewNote("");
  };

  const handleReview = async (decision) => {
    if (!reviewNote.trim() && decision !== "APPROVE") {
      toast.warning("Vui lòng nhập lý do/nhận xét khi không duyệt");
      return;
    }
    setReviewLoading(true);
    try {
      const res = await reviewAdminMaintenanceWorkOrder(selectedWO._id, decision, reviewNote);
      if (res && res.success) {
        toast.success("Duyệt thành công");
        handleCloseDetail();
        fetchWorkOrders();
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Lỗi xử lý duyệt");
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <AdminPageHeader
        title="Nghiệm thu bảo trì"
        description="Quản lý và xét duyệt các báo cáo bảo trì từ nhà cung cấp"
      />

      <div className="mt-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Filters */}
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2">
            {["PENDING_REVIEW", "INFO_REQUIRED", "COMPLETED", "ALL"].map((st) => (
              <button
                key={st}
                onClick={() => {
                  setFilterStatus(st);
                  setPage(1);
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  filterStatus === st
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 outline outline-1 outline-slate-300 hover:bg-slate-200"
                }`}
              >
                {st === "PENDING_REVIEW"
                  ? "Chờ nghiệm thu"
                  : st === "INFO_REQUIRED"
                  ? "Yêu cầu bổ sung"
                  : st === "COMPLETED"
                  ? "Đã hoàn tất"
                  : "Tất cả"}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-sm string text-slate-500 uppercase">
              <tr>
                <th className="px-6 py-4 font-semibold">Thiết bị</th>
                <th className="px-6 py-4 font-semibold">Nhà cung cấp</th>
                <th className="px-6 py-4 font-semibold">Ngày thực hiện</th>
                <th className="px-6 py-4 font-semibold">Chi phí ước tính</th>
                <th className="px-6 py-4 font-semibold">Trạng thái</th>
                <th className="px-6 py-4 font-semibold text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : workOrders.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-slate-500">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                workOrders.map((wo) => (
                  <tr key={wo._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{wo.deviceId?.name || "N/A"}</div>
                      <div className="text-sm text-slate-500 mt-1">S/N: {wo.deviceItemId?.serialNumber || "N/A"}</div>
                      <div className="text-xs text-indigo-600 mt-1 uppercase font-semibold">{wo.maintenanceType}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{wo.supplierId?.username || "N/A"}</div>
                      <div className="text-sm text-slate-500 mt-1">{wo.supplierId?.phone || "N/A"}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900">{new Date(wo.updatedAt).toLocaleDateString("vi-VN")}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-slate-900 font-medium">{wo.cost?.toLocaleString("vi-VN")} VND</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                          wo.status === "PENDING_REVIEW"
                            ? "bg-amber-100 text-amber-700"
                            : wo.status === "INFO_REQUIRED"
                            ? "bg-cyan-100 text-cyan-700"
                            : wo.status === "COMPLETED"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {wo.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleOpenDetail(wo._id)}
                        className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 font-medium transition-colors text-sm"
                      >
                        Xem chi tiết
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination placeholder */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 disabled:opacity-50"
            >
              Trang trước
            </button>
            <span className="px-4 py-2 text-slate-600">Trang {page} / {totalPages}</span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 disabled:opacity-50"
            >
              Trang sau
            </button>
          </div>
        )}
      </div>

      {/* Modal Detail */}
      {selectedWO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 overflow-y-auto w-full h-full p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">Căn cứ Nghiệm thu Bảo trì</h2>
              <button
                onClick={handleCloseDetail}
                className="px-3 py-1 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 font-medium"
              >
                Đóng X
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 flex flex-col lg:flex-row gap-8">
              {/* Cột trái: Thông tin */}
              <div className="flex-1 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase text-slate-500 tracking-wider mb-3">Thông tin chung</h3>
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Loại bảo trì</p>
                      <p className="font-semibold text-slate-800">{selectedWO.maintenanceType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Chi phí báo cáo</p>
                      <p className="font-bold text-red-600">{selectedWO.cost?.toLocaleString("vi-VN")} VND</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Thiết bị</p>
                      <p className="font-semibold text-slate-800">{selectedWO.deviceId?.name || "N/A"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Số Serial</p>
                      <p className="font-semibold text-slate-800">{selectedWO.deviceItemId?.serialNumber || "N/A"}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase text-slate-500 tracking-wider mb-2">Ghi chú từ NCC</h3>
                  <div className="bg-blue-50 text-blue-900 border border-blue-100 p-4 rounded-xl whitespace-pre-wrap text-sm leading-relaxed">
                    {selectedWO.notes || "Không có ghi chú"}
                  </div>
                </div>

                {selectedWO.status === "PENDING_REVIEW" && (
                  <div>
                    <h3 className="text-sm font-semibold uppercase text-slate-500 tracking-wider mb-2">Nhận xét của Ban quản trị</h3>
                    <textarea
                      value={reviewNote}
                      onChange={(e) => setReviewNote(e.target.value)}
                      placeholder="Nhập yêu cầu bổ sung hoặc lý do từ chối (bắt buộc nếu không đạt)..."
                      className="w-full border border-slate-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none h-32"
                    />
                  </div>
                )}
              </div>

              {/* Cột phải: Hình ảnh minh chứng */}
              <div className="lg:w-[400px] flex flex-col gap-6">
                <div>
                  <h3 className="text-sm font-semibold uppercase text-slate-500 tracking-wider mb-3">Tình trạng trước</h3>
                  {selectedWO.imagesBefore && selectedWO.imagesBefore.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedWO.imagesBefore.map((img, idx) => (
                        <div key={idx} className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                          <img src={img} alt={`Before ${idx}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">Không có hình chụp</p>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-semibold uppercase text-slate-500 tracking-wider mb-3">Tình trạng sau (Kết quả)</h3>
                  {selectedWO.imagesAfter && selectedWO.imagesAfter.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {selectedWO.imagesAfter.map((img, idx) => (
                        <div key={idx} className="aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                          <img src={img} alt={`After ${idx}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">Không có hình chụp</p>
                  )}
                </div>
              </div>
            </div>

            {selectedWO.status === "PENDING_REVIEW" && (
              <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button
                  disabled={reviewLoading}
                  onClick={() => handleReview("REJECT")}
                  className="px-6 py-2.5 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors"
                >
                  Không đạt (Làm lại)
                </button>
                <button
                  disabled={reviewLoading}
                  onClick={() => handleReview("REQUEST_INFO")}
                  className="px-6 py-2.5 bg-white shadow-sm border border-cyan-200 text-cyan-700 hover:bg-cyan-50 rounded-xl font-medium transition-colors"
                >
                  Yêu cầu bổ sung
                </button>
                <button
                  disabled={reviewLoading}
                  onClick={() => handleReview("APPROVE")}
                  className="px-8 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 shadow-md rounded-xl font-semibold transition-colors"
                >
                  Duyệt Đạt
                </button>
              </div>
            )}
            
            {/* Show notes if not PENDING_REVIEW */}
            {selectedWO.status !== "PENDING_REVIEW" && (
              <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end gap-3 shrink-0">
                 <button
                  onClick={handleCloseDetail}
                  className="px-6 py-2.5 bg-slate-200 text-slate-700 rounded-xl hover:bg-slate-300 font-medium"
                >
                  Đóng cửa sổ
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMaintenancePage;
