// src/pages/staff/tabs/ContractsTab.jsx
import React, { useState } from "react";
import {
  FileText,
  Search,
  Filter,
  Eye,
  Edit,
  CheckCircle2,
  XCircle,
  Upload,
  Printer,
  AlertTriangle,X
} from "lucide-react";

const mockData = [
  {
    id: "C001",
    rentalId: "R123",
    type: "DELIVERY",
    status: "DRAFT",
    customerSigned: false,
    staffSigned: false,
    created: "2026-02-04",
    items: ["Laptop Dell XPS 13 x1"],
    note: "Hợp đồng giao thiết bị cho khách hàng mới",
    signedAt: null,
  },
  {
    id: "C002",
    rentalId: "R126",
    type: "RETURN",
    status: "SIGNED",
    customerSigned: true,
    staffSigned: true,
    created: "2026-02-03",
    items: ["Canon R5 x2"],
    note: "Khách đã ký nhận trả thiết bị, cần kiểm tra tình trạng",
    signedAt: "2026-02-03 15:45",
  },
  {
    id: "C003",
    rentalId: "R130",
    type: "LIQUIDATION",
    status: "DRAFT",
    customerSigned: false,
    staffSigned: false,
    created: "2026-02-05",
    items: ["DJI Mini 4 Pro x1"],
    note: "Thanh lý thiết bị do hết hạn thuê",
    signedAt: null,
  },
  {
    id: "C004",
    rentalId: "R132",
    type: "DELIVERY",
    status: "SIGNED",
    customerSigned: true,
    staffSigned: false,
    created: "2026-02-06",
    items: ["MacBook Pro M2 x1"],
    note: "Khách đã ký, chờ staff xác nhận",
    signedAt: "2026-02-06 10:20",
  },
];

export default function ContractsTab() {
  const [search, setSearch] = useState("");
  const [selectedContract, setSelectedContract] = useState(null);

  // Modal states
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Form states
  const [signatureFile, setSignatureFile] = useState(null);
  const [editNote, setEditNote] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  const filtered = mockData.filter(
    (contract) =>
      contract.rentalId.toLowerCase().includes(search.toLowerCase()) ||
      contract.type.toLowerCase().includes(search.toLowerCase()) ||
      contract.id.toLowerCase().includes(search.toLowerCase())
  );

  // Open modals
  const openDetail = (contract) => {
    setSelectedContract(contract);
    setShowDetailModal(true);
  };

  const openSign = (contract) => {
    setSelectedContract(contract);
    setShowSignModal(true);
    setSignatureFile(null);
  };

  const openEdit = (contract) => {
    setSelectedContract(contract);
    setShowEditModal(true);
    setEditNote(contract.note || "");
  };

  const openCancel = (contract) => {
    setSelectedContract(contract);
    setShowCancelModal(true);
    setCancelReason("");
  };

  // Handle file upload for signature
  const handleSignatureChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSignatureFile(e.target.files[0]);
    }
  };

  // Submit sign
  const handleConfirmSign = () => {
    if (!signatureFile) {
      alert("Vui lòng upload chữ ký hoặc ảnh xác nhận!");
      return;
    }
    alert(`Đã ký hợp đồng ${selectedContract.id} thành công!`);
    // Gọi API update status + upload chữ ký
    setShowSignModal(false);
  };

  // Submit edit
  const handleConfirmEdit = () => {
    alert(`Đã cập nhật ghi chú cho hợp đồng ${selectedContract.id}: ${editNote}`);
    // Gọi API update contract
    setShowEditModal(false);
  };

  // Submit cancel
  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) {
      alert("Vui lòng nhập lý do hủy hợp đồng!");
      return;
    }
    alert(`Đã hủy hợp đồng ${selectedContract.id}. Lý do: ${cancelReason}`);
    // Gọi API cancel contract
    setShowCancelModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <h2 className="text-2xl font-bold text-gray-900">Quản lý hợp đồng</h2>
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Tìm mã hợp đồng, mã đơn, loại..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mã hợp đồng</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Mã đơn</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Loại</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Trạng thái</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Khách ký</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Staff ký</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Ngày tạo</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.map((contract) => (
                <tr key={contract.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium">{contract.id}</td>
                  <td className="px-6 py-4">{contract.rentalId}</td>
                  <td className="px-6 py-4">{contract.type}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        contract.status === "DRAFT"
                          ? "bg-gray-100 text-gray-800"
                          : contract.status === "SIGNED"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {contract.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    {contract.customerSigned ? (
                      <CheckCircle2 className="text-green-600 mx-auto" size={20} />
                    ) : (
                      <XCircle className="text-red-600 mx-auto" size={20} />
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    {contract.staffSigned ? (
                      <CheckCircle2 className="text-green-600 mx-auto" size={20} />
                    ) : (
                      <XCircle className="text-red-600 mx-auto" size={20} />
                    )}
                  </td>
                  <td className="px-6 py-4">{contract.created}</td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button
                      onClick={() => openDetail(contract)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="Xem chi tiết"
                    >
                      <Eye size={18} />
                    </button>
                    {contract.status === "DRAFT" && (
                      <>
                        <button
                          onClick={() => openSign(contract)}
                          className="text-green-600 hover:text-green-900"
                          title="Ký hợp đồng"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                        <button
                          onClick={() => openEdit(contract)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Chỉnh sửa"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => openCancel(contract)}
                          className="text-red-600 hover:text-red-900"
                          title="Hủy hợp đồng"
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
      {showDetailModal && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Chi tiết hợp đồng: {selectedContract.id}</h3>
              <button onClick={() => setShowDetailModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-600">Mã hợp đồng</p>
                <p className="font-semibold">{selectedContract.id}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Mã đơn</p>
                <p className="font-semibold">{selectedContract.rentalId}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Loại hợp đồng</p>
                <p className="font-semibold">{selectedContract.type}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Trạng thái</p>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    selectedContract.status === "DRAFT"
                      ? "bg-gray-100 text-gray-800"
                      : selectedContract.status === "SIGNED"
                      ? "bg-green-100 text-green-800"
                      : "bg-blue-100 text-blue-800"
                  }`}
                >
                  {selectedContract.status}
                </span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Khách hàng ký</p>
                <p className="font-semibold">
                  {selectedContract.customerSigned ? "Đã ký" : "Chưa ký"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Staff ký</p>
                <p className="font-semibold">
                  {selectedContract.staffSigned ? "Đã ký" : "Chưa ký"}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Ngày tạo</p>
                <p className="font-semibold">{selectedContract.created}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-600">Thiết bị liên quan</p>
                <p className="mt-1">{selectedContract.items.join(", ")}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm font-medium text-gray-600">Ghi chú</p>
                <p className="mt-1">{selectedContract.note || "Không có ghi chú"}</p>
              </div>
              {selectedContract.signedAt && (
                <div className="col-span-2">
                  <p className="text-sm font-medium text-gray-600">Ngày ký</p>
                  <p className="mt-1">{selectedContract.signedAt}</p>
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
              <button className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2">
                <Printer size={18} />
                In hợp đồng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ký hợp đồng */}
      {showSignModal && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-green-700">Ký hợp đồng {selectedContract.id}</h3>
              <button onClick={() => setShowSignModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <p className="text-gray-700 mb-4">
              Bạn đang ký hợp đồng <strong>{selectedContract.type}</strong> cho đơn {selectedContract.rentalId}.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload chữ ký hoặc ảnh xác nhận <span className="text-red-600">*</span>
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleSignatureChange}
                  className="hidden"
                  id="signature-upload"
                />
                <label
                  htmlFor="signature-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload size={32} className="text-indigo-600 mb-2" />
                  <span className="text-indigo-600 font-medium">Click để upload chữ ký</span>
                  <span className="text-sm text-gray-500 mt-1">hoặc ảnh xác nhận ký</span>
                </label>
              </div>

              {signatureFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Đã chọn: {signatureFile.name}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú khi ký (tùy chọn)</label>
              <textarea
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={3}
                placeholder="Ghi chú thêm nếu có (ví dụ: ký tại chỗ, khách đồng ý điều khoản...)"
              />
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowSignModal(false)}
                className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleConfirmSign}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <CheckCircle2 size={18} />
                Xác nhận ký
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Chỉnh sửa hợp đồng */}
      {showEditModal && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-blue-700">Chỉnh sửa hợp đồng {selectedContract.id}</h3>
              <button onClick={() => setShowEditModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Ghi chú / Điều khoản bổ sung</label>
              <textarea
                value={editNote}
                onChange={(e) => setEditNote(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={5}
                placeholder="Cập nhật ghi chú, điều khoản mới, hoặc thay đổi thông tin..."
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

      {/* Modal Hủy hợp đồng */}
      {showCancelModal && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-red-700">Hủy hợp đồng {selectedContract.id}</h3>
              <button onClick={() => setShowCancelModal(false)}>
                <X size={24} className="text-gray-600 hover:text-gray-900" />
              </button>
            </div>

            <p className="text-gray-700 mb-4">
              Bạn có chắc muốn hủy hợp đồng này cho đơn {selectedContract.rentalId}?
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lý do hủy <span className="text-red-600">*</span>
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={4}
                placeholder="Nhập lý do hủy hợp đồng (ví dụ: Khách hủy, lỗi dữ liệu, thay đổi điều khoản...)"
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
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
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