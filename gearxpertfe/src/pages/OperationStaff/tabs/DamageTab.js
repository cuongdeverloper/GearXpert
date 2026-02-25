// src/pages/staff/tabs/DamageTab.jsx
import React, { useState } from "react";
import {
  XCircle,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  Upload,
  MessageSquare,
  User,X
} from "lucide-react";

const mockData = [
  {
    id: "DR001",
    rentalId: "R125",
    reportedBy: "CUSTOMER",
    severity: "MEDIUM",
    description: "Màn hình bị nứt góc do va chạm trong quá trình sử dụng",
    status: "OPEN",
    compensation: 1500000,
    reportedAt: "2026-02-05",
    images: ["https://via.placeholder.com/150?text=Man+Hinh+Nut", "https://via.placeholder.com/150?text=Man+Hinh+Nut+2"],
    note: "Khách tự báo trong lúc thuê",
    priority: "Trung bình",
  },
  {
    id: "DR002",
    rentalId: "R131",
    reportedBy: "STAFF",
    severity: "HIGH",
    description: "Thân máy bị móp nặng khi kiểm tra lúc trả hàng",
    status: "VERIFIED",
    compensation: 3500000,
    reportedAt: "2026-02-04",
    images: ["https://via.placeholder.com/150?text=Than+May+Mop"],
    note: "Phát hiện khi nhận trả",
    priority: "Cao",
  },
  {
    id: "DR003",
    rentalId: "R132",
    reportedBy: "SUPPLIER",
    severity: "LOW",
    description: "Vết xước nhẹ trên vỏ, có thể do hao mòn",
    status: "RESOLVED",
    compensation: 500000,
    reportedAt: "2026-02-06",
    images: [],
    note: "Đã xử lý, khách đồng ý bồi thường",
    priority: "Thấp",
  },
  {
    id: "DR004",
    rentalId: "R135",
    reportedBy: "CUSTOMER",
    severity: "CRITICAL",
    description: "Máy không lên nguồn sau khi sử dụng 3 ngày",
    status: "OPEN",
    compensation: 8000000,
    reportedAt: "2026-02-07",
    images: [],
    note: "Khách báo hỏng mainboard",
    priority: "Cao",
  },
];

export default function DamageTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedReport, setSelectedReport] = useState(null);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Form states
  const [actionType, setActionType] = useState("ACCEPT"); // ACCEPT, REJECT, MORE_INFO
  const [processNote, setProcessNote] = useState("");
  const [compensationAmount, setCompensationAmount] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [closeNote, setCloseNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const filtered = mockData.filter((report) => {
    const matchesSearch =
      report.rentalId.toLowerCase().includes(search.toLowerCase()) ||
      report.description.toLowerCase().includes(search.toLowerCase()) ||
      report.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || report.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Open modals
  const openDetail = (report) => {
    setSelectedReport(report);
    setShowDetailModal(true);
  };

  const openProcess = (report) => {
    setSelectedReport(report);
    setShowProcessModal(true);
    setActionType("ACCEPT");
    setProcessNote("");
    setCompensationAmount(report.compensation.toString());
    setEvidenceFiles([]);
  };

  // const openClose = (report) => {
  //   setSelectedReport(report);
  //   setShowCloseModal(true);
  //   setCloseNote("");
  // };

  const openCancel = (report) => {
    setSelectedReport(report);
    setShowCancelModal(true);
    setCancelReason("");
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setEvidenceFiles([...evidenceFiles, ...files]);
  };

  // Submit process
  const handleConfirmProcess = () => {
    if (!processNote.trim()) {
      alert("Vui lòng nhập ghi chú xử lý!");
      return;
    }
    let message = `Đã xử lý báo cáo hư hỏng ${selectedReport.id} cho đơn ${selectedReport.rentalId}\nHành động: ${
      actionType === "ACCEPT" ? "Chấp nhận bồi thường" : actionType === "REJECT" ? "Từ chối" : "Yêu cầu thêm thông tin"
    }\nGhi chú: ${processNote}`;
    if (actionType === "ACCEPT" && compensationAmount) {
      message += `\nBồi thường chính thức: ${compensationAmount} VNĐ`;
    }
    alert(message);
    // Gọi API update status + note + compensation + upload ảnh
    setShowProcessModal(false);
  };

  // Submit close
  const handleConfirmClose = () => {
    if (!closeNote.trim()) {
      alert("Vui lòng nhập ghi chú khi đóng báo cáo!");
      return;
    }
    alert(`Đã đóng báo cáo hư hỏng ${selectedReport.id}. Ghi chú: ${closeNote}`);
    // Gọi API close report
    setShowCloseModal(false);
  };

  // Submit cancel
  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) {
      alert("Vui lòng nhập lý do hủy báo cáo!");
      return;
    }
    alert(`Đã hủy báo cáo hư hỏng ${selectedReport.id}. Lý do: ${cancelReason}`);
    // Gọi API cancel report
    setShowCancelModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-2xl font-bold text-gray-900">Báo cáo hư hỏng / Bồi thường</h2>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Tìm mã báo cáo, mã đơn, mô tả..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="OPEN">Mở</option>
            <option value="VERIFIED">Đã xác minh</option>
            <option value="RESOLVED">Đã giải quyết</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            <Filter size={18} />
            Lọc
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mã báo cáo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mã đơn</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Người báo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mức độ</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Ưu tiên</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mô tả</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Bồi thường đề xuất</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Trạng thái</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Ngày báo</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{report.id}</td>
                  <td className="px-6 py-4">{report.rentalId}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-gray-500" />
                      <span className="capitalize">{report.reportedBy.toLowerCase()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        report.severity === "LOW"
                          ? "bg-green-100 text-green-800"
                          : report.severity === "MEDIUM"
                          ? "bg-amber-100 text-amber-800"
                          : report.severity === "HIGH"
                          ? "bg-red-100 text-red-800"
                          : "bg-purple-100 text-purple-800"
                      }`}
                    >
                      {report.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        report.priority === "Cao"
                          ? "bg-red-100 text-red-800"
                          : report.priority === "Trung bình"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {report.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 line-clamp-2">{report.description}</td>
                  <td className="px-6 py-4 font-medium text-red-600">
                    {report.compensation.toLocaleString()} ₫
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        report.status === "OPEN"
                          ? "bg-red-100 text-red-800"
                          : report.status === "VERIFIED"
                          ? "bg-amber-100 text-amber-800"
                          : report.status === "RESOLVED"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {report.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">{report.reportedAt}</td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button
                      onClick={() => openDetail(report)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Xem chi tiết"
                    >
                      <Eye size={18} />
                    </button>
                    {report.status !== "RESOLVED" && (
                      <>
                        <button
                          onClick={() => openProcess(report)}
                          className="text-green-600 hover:text-green-900"
                          title="Xử lý báo cáo"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button
                          onClick={() => openCancel(report)}
                          className="text-red-600 hover:text-red-900"
                          title="Hủy báo cáo"
                        >
                          <XCircle size={18} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Xem chi tiết */}
      {showDetailModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Chi tiết báo cáo hư hỏng: {selectedReport.id}</h3>
              <button onClick={() => setShowDetailModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Mã báo cáo</p>
                <p className="font-semibold">{selectedReport.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Mã đơn</p>
                <p className="font-semibold">{selectedReport.rentalId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Người báo</p>
                <p className="font-semibold capitalize">{selectedReport.reportedBy.toLowerCase()}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Mức độ</p>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedReport.severity === "LOW"
                      ? "bg-green-100 text-green-800"
                      : selectedReport.severity === "MEDIUM"
                      ? "bg-amber-100 text-amber-800"
                      : selectedReport.severity === "HIGH"
                      ? "bg-red-100 text-red-800"
                      : "bg-purple-100 text-purple-800"
                  }`}
                >
                  {selectedReport.severity}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Ưu tiên</p>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedReport.priority === "Cao"
                      ? "bg-red-100 text-red-800"
                      : selectedReport.priority === "Trung bình"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {selectedReport.priority}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Trạng thái</p>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedReport.status === "OPEN"
                      ? "bg-red-100 text-red-800"
                      : selectedReport.status === "VERIFIED"
                      ? "bg-amber-100 text-amber-800"
                      : selectedReport.status === "RESOLVED"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {selectedReport.status}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Ngày báo</p>
                <p className="font-semibold">{selectedReport.reportedAt}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-600">Mô tả chi tiết</p>
                <p className="mt-1">{selectedReport.description}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-600">Ghi chú từ người báo</p>
                <p className="mt-1">{selectedReport.customerNote || "Không có ghi chú"}</p>
              </div>
              {selectedReport.images?.length > 0 && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-600">Ảnh minh chứng</p>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {selectedReport.images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`Minh chứng ${idx + 1}`}
                        className="w-24 h-24 object-cover rounded-md border"
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Đóng
              </button>
              {selectedReport.status !== "RESOLVED" && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openProcess(selectedReport);
                  }}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <MessageSquare size={18} />
                  Xử lý báo cáo
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Xử lý báo cáo */}
      {showProcessModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-indigo-700">Xử lý báo cáo hư hỏng {selectedReport.id}</h3>
              <button onClick={() => setShowProcessModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <p className="text-gray-700 mb-4">
              Báo cáo cho đơn <strong>{selectedReport.rentalId}</strong>
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hành động xử lý <span className="text-red-600">*</span>
              </label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ACCEPT">Chấp nhận bồi thường</option>
                <option value="REJECT">Từ chối bồi thường</option>
                <option value="MORE_INFO">Yêu cầu thêm thông tin</option>
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ghi chú xử lý <span className="text-red-600">*</span>
              </label>
              <textarea
                value={processNote}
                onChange={(e) => setProcessNote(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
                placeholder="Ghi chú chi tiết xử lý (ví dụ: chấp nhận bồi thường 70%, từ chối vì hao mòn tự nhiên...)"
                required
              />
            </div>

            {actionType === "ACCEPT" && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Số tiền bồi thường chính thức (VNĐ) <span className="text-red-600">*</span>
                </label>
                <input
                  type="number"
                  value={compensationAmount}
                  onChange={(e) => setCompensationAmount(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Nhập số tiền bồi thường"
                  required
                />
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ảnh/video minh chứng xử lý (tùy chọn)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="process-evidence-upload"
                />
                <label
                  htmlFor="process-evidence-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload size={32} className="text-indigo-600 mb-2" />
                  <span className="text-indigo-600 font-medium">Click để upload</span>
                </label>
              </div>
              {evidenceFiles.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  Đã chọn {evidenceFiles.length} file
                </p>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowProcessModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmProcess}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <MessageSquare size={18} />
                Xác nhận xử lý
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đóng báo cáo */}
      {showCloseModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-green-700">Đóng báo cáo hư hỏng {selectedReport.id}</h3>
              <button onClick={() => setShowCloseModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <p className="text-gray-700 mb-4">
              Bạn có chắc muốn đóng báo cáo này cho đơn {selectedReport.rentalId}?
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ghi chú kết thúc <span className="text-red-600">*</span>
              </label>
              <textarea
                value={closeNote}
                onChange={(e) => setCloseNote(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={4}
                placeholder="Ghi chú kết thúc (ví dụ: đã bồi thường, thiết bị được bảo trì, khách đồng ý...)"
                required
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowCloseModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmClose}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle2 size={18} />
                Đóng báo cáo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy báo cáo */}
      {showCancelModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-orange-700">Hủy báo cáo hư hỏng {selectedReport.id}</h3>
              <button onClick={() => setShowCancelModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <p className="text-gray-700 mb-4">
              Bạn có chắc muốn hủy báo cáo này cho đơn {selectedReport.rentalId}?
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do hủy <span className="text-red-600">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                rows={4}
                placeholder="Nhập lý do hủy báo cáo (ví dụ: Khách rút báo cáo, lỗi hệ thống, không đủ chứng cứ...)"
                required
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmCancel}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
              >
                <XCircle size={18} />
                Xác nhận hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}