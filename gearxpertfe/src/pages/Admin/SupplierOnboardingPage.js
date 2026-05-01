import { useCallback, useEffect, useState } from "react";
import {
  FiSearch,
  FiCheck,
  FiX,
  FiClock,
  FiFilter,
  FiAlertCircle,
  FiEye,
} from "react-icons/fi";
import {
  getSupplierOnboardingRequests,
  approveSupplierOnboardingRequest,
  rejectSupplierOnboardingRequest,
} from "../../service/ApiService/AdminDashboardApi";
import Pagination from "../../components/common/Pagination";

const STATUS_LABEL = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
};

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("vi-VN");
  } catch {
    return "—";
  }
}

function DetailField({ label, children }) {
  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <div className="text-xs font-medium text-slate-500">{label}</div>
      <div className="mt-0.5 text-sm text-slate-900 break-words">{children ?? "—"}</div>
    </div>
  );
}

export default function SupplierOnboardingPage() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("PENDING");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  const [selected, setSelected] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState({});
  const [notification, setNotification] = useState({ show: false, type: "", message: "" });

  const showToast = (type, message) => {
    setNotification({ show: true, type, message });
    setTimeout(() => setNotification({ show: false, type: "", message: "" }), 3200);
  };

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const res = await getSupplierOnboardingRequests({ status: filterStatus });
      setRequests(res?.requests || []);
    } catch (e) {
      console.error(e);
      setRequests([]);
      showToast("error", "Không tải được danh sách yêu cầu.");
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const filtered = requests.filter((r) => {
    const u = r.user;
    if (!u) return searchTerm.trim() === "";
    const q = searchTerm.toLowerCase();
    return (
      (u.fullName || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phone || "").toLowerCase().includes(q)
    );
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedRequests = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const openDetail = (row) => {
    setDetailRow(row);
    setShowDetailModal(true);
  };

  const openApprove = (row) => {
    setSelected(row);
    setShowApproveModal(true);
  };

  const openReject = (row) => {
    setSelected(row);
    setRejectReason("");
    setShowRejectModal(true);
  };

  const confirmApprove = async () => {
    if (!selected?._id) return;
    const id = selected._id;
    try {
      setActionLoading((p) => ({ ...p, [id]: true }));
      await approveSupplierOnboardingRequest(id);
      showToast("success", "Đã phê duyệt tài khoản nhà cung cấp.");
      setShowApproveModal(false);
      setSelected(null);
      setShowDetailModal(false);
      setDetailRow(null);
      fetchRequests();
    } catch (err) {
      showToast(
        "error",
        err.response?.data?.message || err.message || "Lỗi khi phê duyệt."
      );
    } finally {
      setActionLoading((p) => ({ ...p, [id]: false }));
    }
  };

  const confirmReject = async () => {
    if (!selected?._id) return;
    const id = selected._id;
    const reason = rejectReason.trim();
    if (!reason) {
      showToast("error", "Vui lòng nhập lý do từ chối.");
      return;
    }
    try {
      setActionLoading((p) => ({ ...p, [id]: true }));
      await rejectSupplierOnboardingRequest(id, { rejectionReason: reason });
      showToast("success", "Đã từ chối yêu cầu.");
      setShowRejectModal(false);
      setSelected(null);
      setShowDetailModal(false);
      setDetailRow(null);
      fetchRequests();
    } catch (err) {
      showToast(
        "error",
        err.response?.data?.message || err.message || "Lỗi khi từ chối."
      );
    } finally {
      setActionLoading((p) => ({ ...p, [id]: false }));
    }
  };

  const badgeClass = (status) => {
    if (status === "APPROVED") return "bg-emerald-100 text-emerald-800";
    if (status === "REJECTED") return "bg-red-100 text-red-800";
    return "bg-amber-100 text-amber-800";
  };

  const u = detailRow?.user;
  const reviewer = detailRow?.reviewedBy;

  return (
    <div className="space-y-6">
      {notification.show && (
        <div
          className={`fixed top-4 right-4 z-[60] flex items-center gap-2 rounded-xl px-4 py-3 shadow-lg ${
            notification.type === "success" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {notification.type === "error" && <FiAlertCircle />}
          {notification.message}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap gap-3">
          <div className="relative min-w-[200px] flex-1 max-w-md">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên, email, SĐT..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
            />
          </div>
          <div className="relative flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <FiFilter className="text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="bg-transparent text-sm font-medium text-slate-800 outline-none"
            >
              <option value="PENDING">Chờ duyệt</option>
              <option value="APPROVED">Đã duyệt</option>
              <option value="REJECTED">Đã từ chối</option>
              <option value="ALL">Tất cả</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-slate-500">
            <FiClock className="mr-2 animate-spin" /> Đang tải...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500">Không có yêu cầu nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Người nhận</th>
                  <th className="px-4 py-3 font-semibold">Ngày gửi</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold">Hợp đồng</th>
                  <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedRequests.map((row) => {
                  const user = row.user;
                  const busy = actionLoading[row._id];
                  return (
                    <tr key={row._id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{user?.fullName || "—"}</div>
                        <div className="text-xs text-slate-500">{user?.email}</div>
                        {user?.phone && (
                          <div className="text-xs text-slate-500">{user.phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDate(row.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${badgeClass(
                            row.status
                          )}`}
                        >
                          {STATUS_LABEL[row.status] || row.status}
                        </span>
                        {row.status === "REJECTED" && row.rejectionReason && (
                          <p className="mt-1 max-w-xs text-xs text-red-600 line-clamp-2">
                            {row.rejectionReason}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.signedPdfUrl ? (
                          <a
                            href={row.signedPdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary font-medium hover:underline"
                          >
                            Mở file
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openDetail(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-50"
                          >
                            <FiEye size={14} /> Chi tiết
                          </button>
                          {row.status === "PENDING" && (
                            <>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => openApprove(row)}
                                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                              >
                                <FiCheck /> Duyệt
                              </button>
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => openReject(row)}
                                className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                              >
                                <FiX /> Từ chối
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      {showDetailModal && detailRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-y-auto">
          <div className="my-8 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Chi tiết yêu cầu đăng ký NCC</h3>
                <p className="text-xs text-slate-500 mt-1">Mã hợp đồng: {detailRow._id}</p>
              </div>
              <span
                className={`shrink-0 inline-flex rounded-lg px-2.5 py-1 text-xs font-medium ${badgeClass(
                  detailRow.status
                )}`}
              >
                {STATUS_LABEL[detailRow.status] || detailRow.status}
              </span>
            </div>

            <div className="mt-4 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Người đăng ký
              </p>
              <DetailField label="Họ tên">{u?.fullName}</DetailField>
              <DetailField label="Email">{u?.email}</DetailField>
              <DetailField label="Số điện thoại">{u?.phone || "—"}</DetailField>
              <DetailField label="Vai trò hiện tại">{u?.role || "—"}</DetailField>
              <DetailField label="Trạng thái tài khoản">{u?.status || "—"}</DetailField>
              <DetailField label="eKYC">
                {u?.isVerifiedEkyc ? "Đã xác thực" : "Chưa xác thực"}
              </DetailField>
            </div>

            <div className="mt-6 space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                Hợp đồng & ký số
              </p>
              <DetailField label="Đồng ý điều khoản">
                {detailRow.agreedToTerms ? "Có" : "Không"}
              </DetailField>
              <DetailField label="Người ký (hiển thị)">{detailRow.signerName || "—"}</DetailField>
              <DetailField label="Phiên bản hợp đồng">{detailRow.contractVersion || "—"}</DetailField>
              <DetailField label="Gửi lúc">{formatDate(detailRow.createdAt)}</DetailField>
              <DetailField label="Cập nhật lần cuối">{formatDate(detailRow.updatedAt)}</DetailField>
              <DetailField label="File đã ký">
                {detailRow.signedPdfUrl ? (
                  <a
                    href={detailRow.signedPdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary font-medium hover:underline"
                  >
                    Mở file
                  </a>
                ) : (
                  "—"
                )}
              </DetailField>
            </div>

            {detailRow.signatureDataUrl && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Ảnh chữ ký
                </p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 inline-block max-w-full">
                  <img
                    src={detailRow.signatureDataUrl}
                    alt="Chữ ký"
                    className="max-h-40 max-w-full object-contain"
                  />
                </div>
              </div>
            )}

            {(detailRow.status === "APPROVED" || detailRow.status === "REJECTED") && (
              <div className="mt-6 space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
                  Kết quả xử lý
                </p>
                <DetailField label="Người xử lý">
                  {reviewer
                    ? `${reviewer.fullName || ""} (${reviewer.email || ""})`.trim()
                    : "—"}
                </DetailField>
                {detailRow.status === "REJECTED" && (
                  <DetailField label="Lý do từ chối">
                    <span className="text-red-700">{detailRow.rejectionReason || "—"}</span>
                  </DetailField>
                )}
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(false);
                  setDetailRow(null);
                }}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Đóng
              </button>
              {detailRow.status === "PENDING" && (
                <>
                  <button
                    type="button"
                    disabled={actionLoading[detailRow._id]}
                    onClick={() => {
                      openApprove(detailRow);
                    }}
                    className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Phê duyệt
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading[detailRow._id]}
                    onClick={() => {
                      openReject(detailRow);
                    }}
                    className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    Từ chối
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showApproveModal && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Xác nhận phê duyệt?</h3>
            <p className="mt-2 text-sm text-slate-600">
              Tài khoản <strong>{selected.user?.fullName}</strong> ({selected.user?.email}) sẽ được
              nâng cấp thành <strong>Nhà cung cấp</strong>.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowApproveModal(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmApprove}
                disabled={actionLoading[selected._id]}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Phê duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {showRejectModal && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Từ chối yêu cầu</h3>
            <p className="mt-1 text-sm text-slate-600">{selected.user?.email}</p>
            <div className="mt-4">
              <label className="text-xs font-medium text-slate-800">Lý do</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                placeholder="Nhập lý do người dùng và hệ thống thấy được..."
              />
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={confirmReject}
                disabled={actionLoading[selected._id]}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                Gửi từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
