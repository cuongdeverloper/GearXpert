// src/pages/staff/tabs/MaintenanceTab.jsx
import React, { useState } from "react";
import {
  Wrench,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Calendar,
  Upload,
  DollarSign,
  AlertTriangle,
  Edit,
  Camera,X
} from "lucide-react";

const mockData = [
  {
    id: "MT001",
    deviceId: "D001",
    device: "Laptop Dell XPS 13",
    type: "ROUTINE",
    status: "PENDING",
    scheduled: "2026-02-10",
    estimatedCost: "500.000 ₫",
    actualCost: null,
    note: "Bảo dưỡng định kỳ 6 tháng/lần",
    priority: "Trung bình",
  },
  {
    id: "MT002",
    deviceId: "D002",
    device: "Sony A7 IV",
    type: "REPAIR",
    status: "IN_PROGRESS",
    scheduled: "2026-02-08",
    estimatedCost: "2.500.000 ₫",
    actualCost: null,
    note: "Sửa lỗi ống kính không focus",
    priority: "Cao",
  },
  {
    id: "MT003",
    deviceId: "D003",
    device: "Canon R5",
    type: "INSPECTION",
    status: "COMPLETED",
    scheduled: "2026-02-05",
    estimatedCost: "300.000 ₫",
    actualCost: "280.000 ₫",
    note: "Kiểm tra cảm biến sau khi trả hàng",
    priority: "Thấp",
  },
  {
    id: "MT004",
    deviceId: "D004",
    device: "DJI Mini 4 Pro",
    type: "REPAIR",
    status: "PENDING",
    scheduled: "2026-02-12",
    estimatedCost: "1.800.000 ₫",
    actualCost: null,
    note: "Thay pin và cánh quạt sau khi va chạm",
    priority: "Cao",
  },
];

export default function MaintenanceTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedTask, setSelectedTask] = useState(null);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Form states
  const [beforeFiles, setBeforeFiles] = useState([]);
  const [afterFiles, setAfterFiles] = useState([]);
  const [actualCost, setActualCost] = useState("");
  const [completeNote, setCompleteNote] = useState("");
  const [editScheduled, setEditScheduled] = useState("");
  const [editEstimatedCost, setEditEstimatedCost] = useState("");
  const [editNote, setEditNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const filtered = mockData.filter((task) => {
    const matchesSearch =
      task.device.toLowerCase().includes(search.toLowerCase()) ||
      task.type.toLowerCase().includes(search.toLowerCase()) ||
      task.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || task.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Open modals
  const openDetail = (task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };

  const openComplete = (task) => {
    setSelectedTask(task);
    setShowCompleteModal(true);
    setBeforeFiles([]);
    setAfterFiles([]);
    setActualCost(task.estimatedCost.replace(/[^0-9]/g, ""));
    setCompleteNote("");
  };

  const openEdit = (task) => {
    setSelectedTask(task);
    setShowEditModal(true);
    setEditScheduled(task.scheduled);
    setEditEstimatedCost(task.estimatedCost.replace(/[^0-9]/g, ""));
    setEditNote(task.note || "");
  };

  const openCancel = (task) => {
    setSelectedTask(task);
    setShowCancelModal(true);
    setCancelReason("");
  };

  // Handle file upload
  const handleBeforeFileChange = (e) => {
    const files = Array.from(e.target.files);
    setBeforeFiles([...beforeFiles, ...files]);
  };

  const handleAfterFileChange = (e) => {
    const files = Array.from(e.target.files);
    setAfterFiles([...afterFiles, ...files]);
  };

  // Submit complete
  const handleConfirmComplete = () => {
    if (beforeFiles.length === 0 || afterFiles.length === 0) {
      alert("Vui lòng upload ít nhất 1 ảnh trước và 1 ảnh sau bảo trì!");
      return;
    }
    if (!completeNote.trim()) {
      alert("Vui lòng nhập ghi chú kết quả bảo trì!");
      return;
    }
    alert(
      `Đã hoàn thành task bảo trì ${selectedTask.id} cho thiết bị ${selectedTask.device}\nChi phí thực tế: ${actualCost} VNĐ\nGhi chú: ${completeNote}`
    );
    // Gọi API update status + upload ảnh + actual cost
    setShowCompleteModal(false);
  };

  // Submit edit
  const handleConfirmEdit = () => {
    if (!editScheduled || !editEstimatedCost) {
      alert("Vui lòng nhập lịch và chi phí dự kiến!");
      return;
    }
    alert(
      `Đã cập nhật task ${selectedTask.id}\nLịch mới: ${editScheduled}\nChi phí dự kiến: ${editEstimatedCost} VNĐ\nGhi chú: ${editNote}`
    );
    // Gọi API update task
    setShowEditModal(false);
  };

  // Submit cancel
  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) {
      alert("Vui lòng nhập lý do hủy task!");
      return;
    }
    alert(`Đã hủy task bảo trì ${selectedTask.id}. Lý do: ${cancelReason}`);
    // Gọi API cancel task
    setShowCancelModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý bảo trì thiết bị</h2>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Tìm thiết bị, loại bảo trì, mã task..."
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
            <option value="PENDING">Chờ thực hiện</option>
            <option value="IN_PROGRESS">Đang thực hiện</option>
            <option value="COMPLETED">Hoàn thành</option>
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Thiết bị ID</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Thiết bị</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Loại</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Ưu tiên</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Trạng thái</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Lịch bảo trì</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Chi phí dự kiến</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Chi phí thực tế</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{task.id}</td>
                  <td className="px-6 py-4">{task.deviceId}</td>
                  <td className="px-6 py-4">{task.device}</td>
                  <td className="px-6 py-4">{task.type}</td>
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
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        task.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : task.status === "IN_PROGRESS"
                          ? "bg-blue-100 text-blue-800"
                          : task.status === "COMPLETED"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {task.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar size={16} />
                      {task.scheduled}
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-indigo-600">{task.estimatedCost}</td>
                  <td className="px-6 py-4 font-medium text-indigo-600">
                    {task.actualCost || "-"}
                  </td>
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
                          onClick={() => openEdit(task)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Chỉnh sửa task"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => openCancel(task)}
                          className="text-red-600 hover:text-red-900"
                          title="Hủy task"
                        >
                          <XCircle size={18} />
                        </button>
                      </>
                    )}
                    {task.status === "IN_PROGRESS" && (
                      <button
                        onClick={() => openComplete(task)}
                        className="text-green-600 hover:text-green-900"
                        title="Hoàn thành task"
                      >
                        <CheckCircle2 size={18} />
                      </button>
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
              <h3 className="text-xl font-bold">Chi tiết bảo trì: {selectedTask.id}</h3>
              <button onClick={() => setShowDetailModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Mã task</p>
                <p className="font-semibold">{selectedTask.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Thiết bị ID</p>
                <p className="font-semibold">{selectedTask.deviceId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Thiết bị</p>
                <p className="font-semibold">{selectedTask.device}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Loại bảo trì</p>
                <p className="font-semibold">{selectedTask.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Trạng thái</p>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedTask.status === "PENDING"
                      ? "bg-yellow-100 text-yellow-800"
                      : selectedTask.status === "IN_PROGRESS"
                      ? "bg-blue-100 text-blue-800"
                      : selectedTask.status === "COMPLETED"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
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
                <p className="text-sm font-medium text-gray-600">Lịch bảo trì</p>
                <p className="font-semibold">{selectedTask.scheduled}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Chi phí dự kiến</p>
                <p className="font-semibold text-indigo-600">{selectedTask.estimatedCost}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Chi phí thực tế</p>
                <p className="font-semibold text-indigo-600">{selectedTask.actualCost || "-"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-600">Ghi chú</p>
                <p className="mt-1">{selectedTask.note || "Không có ghi chú"}</p>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-4">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Đóng
              </button>
              {selectedTask.status === "PENDING" && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openEdit(selectedTask);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Edit size={18} />
                  Chỉnh sửa
                </button>
              )}
              {selectedTask.status === "IN_PROGRESS" && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openComplete(selectedTask);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Hoàn thành
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Hoàn thành task */}
      {showCompleteModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-green-700">Hoàn thành task bảo trì {selectedTask.id}</h3>
              <button onClick={() => setShowCompleteModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <p className="text-gray-700 mb-4">
              Thiết bị: <strong>{selectedTask.device}</strong>
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ảnh trước bảo trì <span className="text-red-600">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleBeforeFileChange}
                  className="hidden"
                  id="before-upload"
                />
                <label
                  htmlFor="before-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Camera size={32} className="text-indigo-600 mb-2" />
                  <span className="text-indigo-600 font-medium">Upload ảnh/video trước</span>
                </label>
              </div>
              {beforeFiles.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  Đã chọn {beforeFiles.length} file
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ảnh sau bảo trì <span className="text-red-600">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleAfterFileChange}
                  className="hidden"
                  id="after-upload"
                />
                <label
                  htmlFor="after-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Camera size={32} className="text-indigo-600 mb-2" />
                  <span className="text-indigo-600 font-medium">Upload ảnh/video sau</span>
                </label>
              </div>
              {afterFiles.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  Đã chọn {afterFiles.length} file
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chi phí thực tế (VNĐ) <span className="text-red-600">*</span>
              </label>
              <input
                type="number"
                value={actualCost}
                onChange={(e) => setActualCost(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Nhập chi phí thực tế"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ghi chú kết quả <span className="text-red-600">*</span>
              </label>
              <textarea
                value={completeNote}
                onChange={(e) => setCompleteNote(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                rows={4}
                placeholder="Ghi chú kết quả bảo trì (ví dụ: thay pin mới, vệ sinh cảm biến, hoạt động bình thường...)"
                required
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmComplete}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle2 size={18} />
                Xác nhận hoàn thành
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa task */}
      {showEditModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-blue-700">Chỉnh sửa task bảo trì {selectedTask.id}</h3>
              <button onClick={() => setShowEditModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lịch bảo trì mới
              </label>
              <input
                type="date"
                value={editScheduled}
                onChange={(e) => setEditScheduled(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chi phí dự kiến (VNĐ)
              </label>
              <input
                type="number"
                value={editEstimatedCost}
                onChange={(e) => setEditEstimatedCost(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nhập chi phí dự kiến"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú chỉnh sửa</label>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Ghi chú chỉnh sửa (ví dụ: thay đổi loại bảo trì, thêm yêu cầu...)"
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmEdit}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Lưu thay đổi
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
              <h3 className="text-xl font-bold text-orange-700">Hủy task bảo trì {selectedTask.id}</h3>
              <button onClick={() => setShowCancelModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <p className="text-gray-700 mb-4">
              Bạn có chắc muốn hủy task bảo trì cho thiết bị {selectedTask.device}?
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
                placeholder="Nhập lý do hủy task (ví dụ: Thiết bị đã bán, khách hủy thuê, lỗi hệ thống...)"
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