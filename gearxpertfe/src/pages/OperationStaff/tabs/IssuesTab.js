// src/pages/staff/tabs/IssuesTab.jsx
import React, { useState } from "react";
import {
  AlertTriangle,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  XCircle,
  Upload,
  Clock,
  MessageSquare,
  DollarSign,
  Truck,
  RefreshCw,
  Printer,X
} from "lucide-react";

const mockData = [
  {
    id: "DI001",
    rentalId: "R124",
    issueType: "DAMAGED",
    description: "Máy bị xước vỏ nặng, vỏ nhôm bị móp",
    status: "OPEN",
    priority: "Cao",
    reportedAt: "2026-02-05",
    images: ["https://via.placeholder.com/150?text=Xuoc+Vo", "https://via.placeholder.com/150?text=Mop+Nang"],
    customerNote: "Giao đến đã bị hỏng, mong được bồi thường",
  },
  {
    id: "DI002",
    rentalId: "R130",
    issueType: "MISSING",
    description: "Thiếu 1 pin dự phòng và túi đựng",
    status: "PROCESSING",
    priority: "Trung bình",
    reportedAt: "2026-02-04",
    images: [],
    customerNote: "Hộp chỉ có máy, không có phụ kiện đầy đủ",
    proposedSolution: "Giao bổ sung phụ kiện",
  },
  {
    id: "DI003",
    rentalId: "R131",
    issueType: "WRONG_ITEM",
    description: "Giao nhầm model, khách đặt bản 512GB nhưng nhận 256GB",
    status: "OPEN",
    priority: "Cao",
    reportedAt: "2026-02-06",
    images: ["https://via.placeholder.com/150?text=Nhầm+Model"],
    customerNote: "Yêu cầu đổi đúng model ngay",
  },
  {
    id: "DI004",
    rentalId: "R132",
    issueType: "OTHER",
    description: "Giao chậm 2 ngày, ảnh hưởng lịch trình chụp ảnh",
    status: "RESOLVED",
    priority: "Thấp",
    reportedAt: "2026-02-03",
    images: [],
    customerNote: "Đã chấp nhận bồi thường 500k",
    proposedSolution: "Bồi thường tiền",
  },
];

export default function IssuesTab() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedIssue, setSelectedIssue] = useState(null);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Form states for process
  const [solutionType, setSolutionType] = useState("RESEND"); // RESEND, REFUND, COMPENSATE, REJECT, MORE_INFO
  const [solutionNote, setSolutionNote] = useState("");
  const [compensationAmount, setCompensationAmount] = useState("");
  const [resendItems, setResendItems] = useState("");
  const [evidenceFiles, setEvidenceFiles] = useState([]);
  const [closeNote, setCloseNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const filtered = mockData.filter((issue) => {
    const matchesSearch =
      issue.rentalId.toLowerCase().includes(search.toLowerCase()) ||
      issue.description.toLowerCase().includes(search.toLowerCase()) ||
      issue.id.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || issue.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Open modals
  const openDetail = (issue) => {
    setSelectedIssue(issue);
    setShowDetailModal(true);
  };

  const openProcess = (issue) => {
    setSelectedIssue(issue);
    setShowProcessModal(true);
    setSolutionType("RESEND");
    setSolutionNote("");
    setCompensationAmount("");
    setResendItems("");
    setEvidenceFiles([]);
  };

  const openClose = (issue) => {
    setSelectedIssue(issue);
    setShowCloseModal(true);
    setCloseNote("");
  };

  const openCancel = (issue) => {
    setSelectedIssue(issue);
    setShowCancelModal(true);
    setCancelReason("");
  };

  // Handle file upload
  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setEvidenceFiles([...evidenceFiles, ...files]);
  };

  // Submit process (giải quyết khiếu nại)
  const handleConfirmProcess = () => {
    if (!solutionNote.trim()) {
      alert("Vui lòng nhập ghi chú giải pháp!");
      return;
    }

    let message = `Đã xử lý khiếu nại ${selectedIssue.id} cho đơn ${selectedIssue.rentalId}\nGiải pháp: `;

    switch (solutionType) {
      case "RESEND":
        if (!resendItems.trim()) {
          alert("Vui lòng nhập thông tin hàng giao bổ sung!");
          return;
        }
        message += `Giao bổ sung: ${resendItems}\n`;
        break;
      case "REFUND":
        message += "Hoàn tiền (toàn bộ hoặc một phần)\n";
        break;
      case "COMPENSATE":
        if (!compensationAmount.trim()) {
          alert("Vui lòng nhập số tiền bồi thường!");
          return;
        }
        message += `Bồi thường thêm: ${compensationAmount} VNĐ\n`;
        break;
      case "REJECT":
        message += "Từ chối khiếu nại\n";
        break;
      case "MORE_INFO":
        message += "Yêu cầu thêm thông tin/ảnh từ khách\n";
        break;
      default:
        break;
    }

    message += `Ghi chú: ${solutionNote}`;

    alert(message);
    // Gọi API update status + solution + note + compensation + upload ảnh
    setShowProcessModal(false);
  };

  // Submit close
  const handleConfirmClose = () => {
    if (!closeNote.trim()) {
      alert("Vui lòng nhập ghi chú khi đóng khiếu nại!");
      return;
    }
    alert(`Đã đóng khiếu nại ${selectedIssue.id}. Ghi chú: ${closeNote}`);
    // Gọi API close issue
    setShowCloseModal(false);
  };

  // Submit cancel
  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) {
      alert("Vui lòng nhập lý do hủy khiếu nại!");
      return;
    }
    alert(`Đã hủy khiếu nại ${selectedIssue.id}. Lý do: ${cancelReason}`);
    // Gọi API cancel issue
    setShowCancelModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-2xl font-bold text-gray-900">Khiếu nại giao hàng</h2>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Tìm mã khiếu nại, mã đơn, mô tả..."
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
            <option value="PROCESSING">Đang xử lý</option>
            <option value="RESOLVED">Đã giải quyết</option>
            <option value="REJECTED">Từ chối</option>
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mã khiếu nại</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mã đơn</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Loại</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mô tả</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Ưu tiên</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Trạng thái</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Giải pháp đề xuất</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Ngày báo</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((issue) => (
                <tr key={issue.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{issue.id}</td>
                  <td className="px-6 py-4">{issue.rentalId}</td>
                  <td className="px-6 py-4">{issue.issueType}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 line-clamp-2">{issue.description}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        issue.priority === "Cao"
                          ? "bg-red-100 text-red-800"
                          : issue.priority === "Trung bình"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {issue.priority}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        issue.status === "OPEN"
                          ? "bg-red-100 text-red-800"
                          : issue.status === "PROCESSING"
                          ? "bg-amber-100 text-amber-800"
                          : issue.status === "RESOLVED"
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {issue.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {issue.proposedSolution || "-"}
                  </td>
                  <td className="px-6 py-4">{issue.reportedAt}</td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button
                      onClick={() => openDetail(issue)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Xem chi tiết"
                    >
                      <Eye size={18} />
                    </button>
                    {issue.status !== "RESOLVED" && issue.status !== "REJECTED" && (
                      <>
                        <button
                          onClick={() => openProcess(issue)}
                          className="text-green-600 hover:text-green-900"
                          title="Xử lý khiếu nại"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button
                          onClick={() => openCancel(issue)}
                          className="text-red-600 hover:text-red-900"
                          title="Hủy khiếu nại"
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
      {showDetailModal && selectedIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Chi tiết khiếu nại: {selectedIssue.id}</h3>
              <button onClick={() => setShowDetailModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Mã khiếu nại</p>
                <p className="font-semibold">{selectedIssue.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Mã đơn</p>
                <p className="font-semibold">{selectedIssue.rentalId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Loại khiếu nại</p>
                <p className="font-semibold">{selectedIssue.issueType}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Ưu tiên</p>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedIssue.priority === "Cao"
                      ? "bg-red-100 text-red-800"
                      : selectedIssue.priority === "Trung bình"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {selectedIssue.priority}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Trạng thái</p>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedIssue.status === "OPEN"
                      ? "bg-red-100 text-red-800"
                      : selectedIssue.status === "PROCESSING"
                      ? "bg-amber-100 text-amber-800"
                      : selectedIssue.status === "RESOLVED"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {selectedIssue.status}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Ngày báo</p>
                <p className="font-semibold">{selectedIssue.reportedAt}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-600">Mô tả chi tiết</p>
                <p className="mt-1">{selectedIssue.description}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-600">Ghi chú từ khách</p>
                <p className="mt-1">{selectedIssue.customerNote || "Không có ghi chú"}</p>
              </div>
              {selectedIssue.images?.length > 0 && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-600">Ảnh minh chứng</p>
                  <div className="mt-2 flex gap-2 flex-wrap">
                    {selectedIssue.images.map((img, idx) => (
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
              {selectedIssue.proposedSolution && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-600">Giải pháp đề xuất</p>
                  <p className="mt-1 font-semibold">{selectedIssue.proposedSolution}</p>
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
              {selectedIssue.status !== "RESOLVED" && selectedIssue.status !== "REJECTED" && (
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    openProcess(selectedIssue);
                  }}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                >
                  <MessageSquare size={18} />
                  Xử lý khiếu nại
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Xử lý khiếu nại - Có giải pháp giao thêm */}
      {showProcessModal && selectedIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-indigo-700">Xử lý khiếu nại {selectedIssue.id}</h3>
              <button onClick={() => setShowProcessModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <p className="text-gray-700 mb-4">
              Khiếu nại <strong>{selectedIssue.issueType}</strong> cho đơn {selectedIssue.rentalId}
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Chọn giải pháp <span className="text-red-600">*</span>
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="solution"
                    value="RESEND"
                    checked={solutionType === "RESEND"}
                    onChange={() => setSolutionType("RESEND")}
                  />
                  <span>Giao bổ sung / thay thế sản phẩm</span>
                </label>
                {solutionType === "RESEND" && (
                  <input
                    type="text"
                    value={resendItems}
                    onChange={(e) => setResendItems(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nhập sản phẩm sẽ giao bổ sung (ví dụ: pin dự phòng 1 cái, túi đựng...)"
                  />
                )}

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="solution"
                    value="REFUND"
                    checked={solutionType === "REFUND"}
                    onChange={() => setSolutionType("REFUND")}
                  />
                  <span>Hoàn tiền (toàn bộ hoặc một phần)</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="solution"
                    value="COMPENSATE"
                    checked={solutionType === "COMPENSATE"}
                    onChange={() => setSolutionType("COMPENSATE")}
                  />
                  <span>Bồi thường thêm (không giao lại)</span>
                </label>
                {solutionType === "COMPENSATE" && (
                  <input
                    type="number"
                    value={compensationAmount}
                    onChange={(e) => setCompensationAmount(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Nhập số tiền bồi thường (VNĐ)"
                  />
                )}

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="solution"
                    value="REJECT"
                    checked={solutionType === "REJECT"}
                    onChange={() => setSolutionType("REJECT")}
                  />
                  <span>Từ chối khiếu nại</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="solution"
                    value="MORE_INFO"
                    checked={solutionType === "MORE_INFO"}
                    onChange={() => setSolutionType("MORE_INFO")}
                  />
                  <span>Yêu cầu thêm thông tin/ảnh từ khách</span>
                </label>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ghi chú giải pháp <span className="text-red-600">*</span>
              </label>
              <textarea
                value={solutionNote}
                onChange={(e) => setSolutionNote(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={4}
                placeholder="Ghi chú chi tiết giải pháp (ví dụ: giao bổ sung pin dự phòng trong 24h, hoàn 50% giá trị đơn...)"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ảnh minh chứng xử lý (tùy chọn)
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
                Xác nhận giải pháp
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Đóng khiếu nại */}
      {showCloseModal && selectedIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-green-700">Đóng khiếu nại {selectedIssue.id}</h3>
              <button onClick={() => setShowCloseModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <p className="text-gray-700 mb-4">
              Bạn có chắc muốn đóng khiếu nại này cho đơn {selectedIssue.rentalId}?
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
                placeholder="Ghi chú kết thúc khiếu nại (ví dụ: đã giao bổ sung, khách hài lòng, từ chối vì không đủ chứng cứ...)"
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
                Đóng khiếu nại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy khiếu nại */}
      {showCancelModal && selectedIssue && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-orange-700">Hủy khiếu nại {selectedIssue.id}</h3>
              <button onClick={() => setShowCancelModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <p className="text-gray-700 mb-4">
              Bạn có chắc muốn hủy khiếu nại này cho đơn {selectedIssue.rentalId}?
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
                placeholder="Nhập lý do hủy khiếu nại (ví dụ: Khách rút khiếu nại, lỗi hệ thống, không đủ chứng cứ...)"
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