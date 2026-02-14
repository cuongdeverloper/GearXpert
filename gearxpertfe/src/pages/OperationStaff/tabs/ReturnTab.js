// src/pages/staff/tabs/ReturnTab.jsx
import React, { useState } from "react";
import {
  PackageCheck,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Camera,
  Upload,
  AlertTriangle,
  DollarSign,X
} from "lucide-react";

const mockData = [
  {
    id: "RT001",
    rentalId: "R125",
    customer: "Lê Văn C",
    phone: "0987345678",
    items: "Canon R5 x2",
    address: "78 Hai Bà Trưng, Q.3, TP.HCM",
    status: "PENDING",
    scheduled: "2026-02-07 10:00",
    condition: "Chờ kiểm tra",
    priority: "Cao",
    note: "Khách yêu cầu kiểm tra kỹ thân máy và ống kính",
  },
  {
    id: "RT002",
    rentalId: "R128",
    customer: "Phạm Thị D",
    phone: "0934567890",
    items: "DJI Mini 4 Pro x1",
    address: "101 Pasteur, Q.3, TP.HCM",
    status: "RECEIVED",
    scheduled: "2026-02-06 15:00",
    condition: "Đã nhận",
    priority: "Trung bình",
    note: "Thiết bị có dấu hiệu va đập nhẹ",
  },
  {
    id: "RT003",
    rentalId: "R130",
    customer: "Hoàng Văn E",
    phone: "0912345678",
    items: "MacBook Pro M2 x1",
    address: "56 Nguyễn Trãi, Q.5, TP.HCM",
    status: "PENDING",
    scheduled: "2026-02-08 13:30",
    condition: "Chờ kiểm tra",
    priority: "Cao",
    note: "Khách báo có vết xước trên vỏ",
  },
  {
    id: "RT004",
    rentalId: "R132",
    customer: "Vũ Thị F",
    phone: "0908765432",
    items: "GoPro Hero 11 x3",
    address: "22 Trần Hưng Đạo, Q.1, TP.HCM",
    status: "FAILED",
    scheduled: "2026-02-05 16:00",
    condition: "Khách không có nhà",
    priority: "Thấp",
    note: "Đã gọi 3 lần không liên lạc được",
  },
];

export default function ReturnTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedTask, setSelectedTask] = useState(null);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Form states
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [issueDescription, setIssueDescription] = useState("");
  const [compensationAmount, setCompensationAmount] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const filtered = mockData.filter((task) => {
    const matchesSearch =
      task.customer.toLowerCase().includes(search.toLowerCase()) ||
      task.rentalId.toLowerCase().includes(search.toLowerCase()) ||
      task.phone.includes(search);
    const matchesStatus = statusFilter === "ALL" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Open modals
  const openDetail = (task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const openSuccess = (task) => {
    setSelectedTask(task);
    setShowSuccessModal(true);
    setEvidenceFiles([]);
  };

  const openIssue = (task) => {
    setSelectedTask(task);
    setShowIssueModal(true);
    setIssueDescription("");
    setCompensationAmount("");
    setEvidenceFiles([]);
  };

  const openCancel = (task) => {
    setSelectedTask(task);
    setShowCancelModal(true);
    setCancelReason("");
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setEvidenceFiles([...evidenceFiles, ...files]);
  };

  // Submit success
  const handleConfirmSuccess = () => {
    if (evidenceFiles.length === 0) {
      alert("Vui lòng upload ít nhất 1 ảnh tình trạng thiết bị sau khi nhận!");
      return;
    }
    alert(`Đã xác nhận nhận hàng thành công cho đơn ${selectedTask.rentalId}`);
    // Gọi API update status + upload ảnh
    setShowSuccessModal(false);
  };

  // Submit issue
  const handleConfirmIssue = () => {
    if (!issueDescription.trim()) {
      alert("Vui lòng mô tả chi tiết vấn đề khi nhận hàng!");
      return;
    }
    alert(
      `Đã báo cáo vấn đề khi nhận hàng cho đơn ${selectedTask.rentalId}.\nMô tả: ${issueDescription}\nBồi thường đề xuất: ${compensationAmount || "Không"}`
    );
    // Gọi API tạo DamageReport + upload ảnh
    setShowIssueModal(false);
  };

  // Submit cancel
  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) {
      alert("Vui lòng nhập lý do hủy task!");
      return;
    }
    alert(`Đã hủy task trả hàng ${selectedTask.id}. Lý do: ${cancelReason}`);
    // Gọi API cancel task
    setShowCancelModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý trả hàng</h2>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Tìm khách hàng, mã đơn, SĐT..."
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
            <option value="PENDING">Chờ nhận</option>
            <option value="RECEIVED">Đã nhận</option>
            <option value="FAILED">Thất bại</option>
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mã task</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mã đơn</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Khách hàng</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">SĐT</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Thiết bị</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Địa chỉ</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Trạng thái</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Ưu tiên</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Lịch nhận</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tình trạng</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{task.id}</td>
                  <td className="px-6 py-4">{task.rentalId}</td>
                  <td className="px-6 py-4">{task.customer}</td>
                  <td className="px-6 py-4">{task.phone}</td>
                  <td className="px-6 py-4">{task.items}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-gray-500" />
                      {task.address}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        task.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : task.status === "RECEIVED"
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        task.priority === "Cao"
                          ? "bg-red-100 text-red-800"
                          : task.priority === "Trung bình"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock size={16} />
                      {task.scheduled}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{task.condition}</td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button
                      onClick={() => openDetail(task)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Xem chi tiết"
                    >
                      <Eye size={18} />
                    </button>
                    {task.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => openSuccess(task)}
                          className="text-green-600 hover:text-green-900"
                          title="Xác nhận nhận thành công"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button
                          onClick={() => openIssue(task)}
                          className="text-red-600 hover:text-red-900"
                          title="Có vấn đề khi nhận"
                        >
                          <AlertTriangle size={18} />
                        </button>
                        <button
                          onClick={() => openCancel(task)}
                          className="text-orange-600 hover:text-orange-900"
                          title="Hủy task"
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
      {showDetailModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Chi tiết trả hàng: {selectedTask.id}</h3>
              <button onClick={() => setShowDetailModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Mã đơn</p>
                <p className="font-semibold">{selectedTask.rentalId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Khách hàng</p>
                <p className="font-semibold">{selectedTask.customer} - {selectedTask.phone}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Thiết bị</p>
                <p className="font-semibold">{selectedTask.items}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Địa chỉ</p>
                <p className="font-semibold">{selectedTask.address}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Trạng thái</p>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedTask.status === "PENDING"
                      ? "bg-yellow-100 text-yellow-800"
                      : selectedTask.status === "RECEIVED"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {selectedTask.status}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Ưu tiên</p>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedTask.priority === "Cao"
                      ? "bg-red-100 text-red-800"
                      : selectedTask.priority === "Trung bình"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {selectedTask.priority}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Lịch nhận</p>
                <p className="font-semibold">{selectedTask.scheduled}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-600">Ghi chú</p>
                <p className="mt-1">{selectedTask.note || "Không có ghi chú"}</p>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận nhận hàng thành công */}
      {showSuccessModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-green-700">Xác nhận nhận hàng thành công</h3>
              <button onClick={() => setShowSuccessModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <p className="text-gray-700 mb-4">
              Đơn <strong>{selectedTask.rentalId}</strong> - {selectedTask.customer}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bằng chứng nhận hàng (ảnh/video tình trạng thiết bị) <span className="text-red-600">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="success-evidence-upload"
                />
                <label
                  htmlFor="success-evidence-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload size={32} className="text-indigo-600 mb-2" />
                  <span className="text-indigo-600 font-medium">Click để upload</span>
                  <span className="text-sm text-gray-500 mt-1">Ảnh/video tình trạng thiết bị sau khi nhận</span>
                </label>
              </div>

              {evidenceFiles.length > 0 && (
                <div className="mt-4">
                  <p className="text-sm font-medium">Đã chọn {evidenceFiles.length} file:</p>
                  <ul className="mt-2 space-y-1 text-sm text-gray-700">
                    {evidenceFiles.map((file, idx) => (
                      <li key={idx}>{file.name}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú (tùy chọn)</label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Ghi chú thêm (ví dụ: thiết bị nguyên vẹn, có hộp đầy đủ...)"
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowSuccessModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmSuccess}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle2 size={18} />
                Xác nhận thành công
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Báo cáo có vấn đề khi nhận */}
      {showIssueModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-red-700">Báo cáo vấn đề khi nhận hàng</h3>
              <button onClick={() => setShowIssueModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <p className="text-gray-700 mb-4">
              Đơn <strong>{selectedTask.rentalId}</strong> - {selectedTask.customer}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mô tả vấn đề <span className="text-red-600">*</span>
              </label>
              <textarea
                value={issueDescription}
                onChange={(e) => setIssueDescription(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={4}
                placeholder="Mô tả chi tiết vấn đề (ví dụ: vỏ máy bị móp, thiếu phụ kiện, màn hình lỗi...)"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Đề xuất bồi thường (nếu có)
              </label>
              <input
                type="number"
                value={compensationAmount}
                onChange={(e) => setCompensationAmount(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Số tiền đề xuất bồi thường (VNĐ)"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ảnh minh chứng vấn đề
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="issue-evidence-upload"
                />
                <label
                  htmlFor="issue-evidence-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload size={32} className="text-indigo-600 mb-2" />
                  <span className="text-indigo-600 font-medium">Click để upload ảnh</span>
                </label>
              </div>
              {evidenceFiles.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  Đã chọn {evidenceFiles.length} ảnh
                </p>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowIssueModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmIssue}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
              >
                <AlertTriangle size={18} />
                Báo cáo vấn đề
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy task */}
      {showCancelModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-orange-700">Hủy task trả hàng</h3>
              <button onClick={() => setShowCancelModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <p className="text-gray-700 mb-4">
              Bạn có chắc muốn hủy task <strong>{selectedTask.id}</strong> cho đơn {selectedTask.rentalId}?
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
                placeholder="Nhập lý do hủy task (ví dụ: Khách hủy, thiết bị không còn, lỗi hệ thống...)"
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