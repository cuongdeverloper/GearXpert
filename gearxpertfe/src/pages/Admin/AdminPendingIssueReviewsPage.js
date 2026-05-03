import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FiEdit3, FiEye, FiClock, FiInbox, FiRefreshCw, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import { adminGetIssuesAwaitingGx, adminGetCompensationProposals } from "../../service/ApiService/ReportApi";
import AdminGxMediationForm from "../../components/admin/AdminGxMediationForm";

function formatDate(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getApiErrorMessage(err, fallback) {
  if (!err) return fallback;
  const m =
    err?.response?.data?.message ??
    err?.response?.data?.error ??
    (typeof err?.message === "string" && err.message !== "Network Error" ? err.message : null);
  const s = m != null ? String(m).trim() : "";
  return s || fallback;
}

function issueTypeLabel(row) {
  if (row.referenceModel === "DamageReport") {
    return `Hư hỏng${row.severity ? ` · ${row.severity}` : ""}`;
  }
  return `Giao / sự cố${row.issueType ? ` · ${row.issueType}` : ""}`;
}

export default function AdminPendingIssueReviewsPage() {
  const [rows, setRows] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("PENDING"); // 'PENDING' | 'HISTORY'
  const [composeTarget, setComposeTarget] = useState(null);

  const fetchList = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === "PENDING") {
        const res = await adminGetIssuesAwaitingGx();
        const list = res?.issues || res?.data?.issues || [];
        setRows(Array.isArray(list) ? list : []);
      } else {
        const res = await adminGetCompensationProposals({ page: 1, limit: 50, flowStatus: "ALL" });
        const list = res?.proposals || res?.data?.proposals || [];
        setHistoryRows(Array.isArray(list) ? list : []);
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Không tải được danh sách"));
      if (activeTab === "PENDING") setRows([]);
      else setHistoryRows([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Sự cố chờ admin xử lý</h2>
          <p className="text-sm text-slate-500 mt-1">
            Case sau khi NCC nhờ GearXpert (AWAITING_ADMIN_GX), chưa có đề xuất mở. Soạn đề xuất tại đây, sau đó mở{" "}
            <strong className="text-slate-800">Hồ sơ điều tra</strong> để xem <strong className="text-slate-800">tạm tính</strong>{" "}
            và bấm xác nhận quyết toán (đóng case).
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-1">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab("PENDING")}
            className={`flex items-center gap-2 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "PENDING"
                ? "text-indigo-600 border-indigo-600"
                : "text-slate-500 border-transparent hover:text-slate-700"
            }`}
          >
            <FiInbox size={18} />
            Chờ tạo đề xuất
            {rows.length > 0 && activeTab === "PENDING" && (
              <span className="ml-1 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-[10px]">
                {rows.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`flex items-center gap-2 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "HISTORY"
                ? "text-indigo-600 border-indigo-600"
                : "text-slate-500 border-transparent hover:text-slate-700"
            }`}
          >
            <FiClock size={18} />
            Lịch sử xử lý
          </button>
        </div>
        <button
          type="button"
          onClick={() => fetchList()}
          disabled={loading}
          className="mb-2 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          <FiRefreshCw className={loading ? "animate-spin" : ""} size={16} />
          {loading ? "Đang tải…" : "Làm mới"}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading && (activeTab === "PENDING" ? rows.length === 0 : historyRows.length === 0) ? (
          <div className="px-4 py-12 text-center text-sm text-slate-500">Đang tải danh sách…</div>
        ) : activeTab === "PENDING" ? (
          rows.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-500">
              Không có sự cố nào đang chờ admin xử lý theo tiêu chí hiện tại.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-700">
                    <th className="px-4 py-3">Case</th>
                    <th className="px-4 py-3">Loại</th>
                    <th className="px-4 py-3">Khách / Shop</th>
                    <th className="px-4 py-3">Đơn</th>
                    <th className="px-4 py-3">Cập nhật</th>
                    <th className="px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => {
                    const id = String(row.issueId ?? "");
                    return (
                      <tr key={`${row.referenceModel}-${id}`} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 align-top">
                          <span className="font-mono font-semibold text-slate-900">#{id.slice(-8)}</span>
                          <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 max-w-[240px]">
                            {row.description || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-slate-700">{issueTypeLabel(row)}</td>
                        <td className="px-4 py-3 align-top text-xs">
                          <div>Khách: {row.rental?.customer?.fullName || "—"}</div>
                          <div className="mt-0.5">Shop: {row.rental?.supplier?.fullName || "—"}</div>
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-slate-600 font-mono">
                          #{String(row.rentalId || "").slice(-6)}
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-slate-500">{formatDate(row.updatedAt)}</td>
                        <td className="px-4 py-3 text-center align-top">
                          <div className="flex flex-col items-stretch gap-1.5 min-w-[132px]">
                            <Link
                              to={`/admin/issue-investigation/${encodeURIComponent(id)}?referenceModel=${encodeURIComponent(row.referenceModel)}`}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50"
                            >
                              <FiEye size={12} />
                              Hồ sơ điều tra
                            </Link>
                            <button
                              type="button"
                              onClick={() => {
                                setComposeTarget({ issueId: id, referenceModel: row.referenceModel });
                                requestAnimationFrame(() => {
                                  document.getElementById("admin-gx-mediation-form-pending")?.scrollIntoView({
                                    behavior: "smooth",
                                    block: "start",
                                  });
                                });
                              }}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-[11px] font-semibold text-indigo-900 hover:bg-indigo-100"
                            >
                              <FiEdit3 size={12} />
                              Soạn đề xuất
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        ) : (
          /* Tab Lịch sử (HISTORY) */
          historyRows.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-500">
              Chưa có lịch sử đề xuất nào được ghi nhận.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-700">
                    <th className="px-4 py-3">Case / Đề xuất</th>
                    <th className="px-4 py-3">Trạng thái luồng</th>
                    <th className="px-4 py-3">Số tiền</th>
                    <th className="px-4 py-3">Người đề xuất</th>
                    <th className="px-4 py-3">Cập nhật</th>
                    <th className="px-4 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {historyRows.map((row) => {
                    const id = String(row.referenceId ?? "");
                    return (
                      <tr key={row._id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 align-top">
                          <span className="font-mono font-semibold text-slate-900">#{id.slice(-8)}</span>
                          <p className="text-[11px] text-slate-600 mt-1 line-clamp-1 italic">
                            Lý do: {row.reason || "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            row.flowStatus === 'ADMIN_APPROVED' ? 'bg-green-50 text-green-700 border-green-200' :
                            row.flowStatus === 'PENDING_ADMIN_REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                            'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {row.flowStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-top font-semibold text-indigo-700">
                          {Number(row.amount || 0).toLocaleString("vi-VN")}₫
                        </td>
                        <td className="px-4 py-3 align-top text-xs">
                          {row.origin === "ADMIN_GX" ? "Admin GX" : "NCC"}
                        </td>
                        <td className="px-4 py-3 align-top text-xs text-slate-500">
                          {formatDate(row.updatedAt || row.submittedAt)}
                        </td>
                        <td className="px-4 py-3 text-center align-top">
                          <Link
                            to={`/admin/issue-investigation/${encodeURIComponent(id)}?referenceModel=${encodeURIComponent(row.referenceModel)}`}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50"
                          >
                            <FiEye size={12} />
                            Hồ sơ điều tra
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {composeTarget ? (
        <section className="rounded-2xl border border-indigo-200 bg-white p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Soạn đề xuất trung gian</h3>
              <p className="text-sm text-slate-500 mt-1">
                Đề xuất lưu vào hệ thống — sau khi gửi, vào{" "}
                <Link
                  to={`/admin/issue-investigation/${encodeURIComponent(composeTarget.issueId)}?referenceModel=${encodeURIComponent(composeTarget.referenceModel)}`}
                  className="text-indigo-600 font-medium hover:underline"
                >
                  Hồ sơ điều tra
                </Link>
                .
              </p>
            </div>
            <button
              type="button"
              onClick={() => setComposeTarget(null)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              <FiX size={14} /> Đóng form
            </button>
          </div>
          <AdminGxMediationForm
            formId="admin-gx-mediation-form-pending"
            initialIssueId={composeTarget.issueId}
            issueIdReadOnly
            referenceModel={composeTarget.referenceModel}
            onSuccess={() => {
              fetchList();
              setComposeTarget(null);
              toast.info("Đã tạo đề xuất thành công! Bạn có thể xem lại tại Tab «Lịch sử xử lý» hoặc mở «Hồ sơ điều tra».");
            }}
          />
        </section>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-4 py-8 text-center text-sm text-slate-600">
          Chọn <strong className="text-slate-900">Soạn đề xuất</strong> trên một dòng trong bảng để mở form tại đây.
        </div>
      )}
    </div>
  );
}
