import { FiSend, FiUpload } from "react-icons/fi";

/**
 * Form đề xuất bồi thường thiệt hại (luôn hiển thị đầy đủ trên trang chi tiết sự cố).
 */
export default function CompensationProposalCollapsible({
  issue,
  proposalForm,
  setProposalForm,
  proposalImages,
  isSyntheticReturnIssue,
  proposalSubmitting,
  onSubmit,
  onProposalImagesChange,
  onRemoveProposalImage,
  formatDateTime,
  suggestedResolutionOptions,
  compensationFlowLabels,
}) {
  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Đề xuất bồi thường thiệt hại</h2>
        <p className="text-xs text-slate-500 mt-1">
          Nhập mức, lý do, giải thích — có thể gửi kèm tin nhắn cho khách khi cần.
        </p>
      </div>

      {issue?.compensationProposal?.submittedAt && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800 space-y-1">
          <p>
            Đề xuất gần nhất:{" "}
            <span className="font-semibold">
              {Number(issue.compensationProposal.amount || 0).toLocaleString("vi-VN")} VND
            </span>
          </p>
          <p>Gửi lúc: {formatDateTime(issue.compensationProposal.submittedAt)}</p>
          {issue.compensationProposal.forwardedToCustomerAt ? (
            <p>Đã chuyển khách lúc: {formatDateTime(issue.compensationProposal.forwardedToCustomerAt)}</p>
          ) : null}
          <p>
            Luồng hiện tại:{" "}
            <span className="font-semibold">
              {compensationFlowLabels?.[issue.compensationProposal.flowStatus] ||
                issue.compensationProposal.flowStatus ||
                "—"}
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-700">
              Khách: {issue.compensationProposal.customerDecision || "PENDING"}
            </span>
            <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-700">
              Supplier: {issue.compensationProposal.supplierDecision || "PENDING"}
            </span>
            <span className="px-2 py-0.5 rounded-full border border-slate-200 bg-white text-slate-700">
              Admin: {issue.compensationProposal.adminDecision || "PENDING"}
            </span>
          </div>
          {typeof issue.compensationProposal.approvedCompensationAmount === "number" &&
          issue.compensationProposal.approvedCompensationAmount > 0 ? (
            <p>
              Mức admin duyệt:{" "}
              <span className="font-semibold">
                {Number(issue.compensationProposal.approvedCompensationAmount).toLocaleString("vi-VN")} VND
              </span>
            </p>
          ) : null}
        </div>
      )}

      <div className="space-y-2 text-sm">
        <label className="block">
          <span className="text-slate-600 text-xs">Phương án đề xuất</span>
          <select
            value={proposalForm.suggestedResolution}
            onChange={(e) => setProposalForm((prev) => ({ ...prev, suggestedResolution: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            {suggestedResolutionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-slate-600 text-xs">Số tiền đề xuất bồi thường (VND)</span>
          <input
            type="number"
            min="0"
            value={proposalForm.amount}
            onChange={(e) => setProposalForm((prev) => ({ ...prev, amount: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Ví dụ: 2500000"
          />
        </label>

        <label className="block">
          <span className="text-slate-600 text-xs">Lý do đề xuất</span>
          <input
            type="text"
            value={proposalForm.reason}
            onChange={(e) => setProposalForm((prev) => ({ ...prev, reason: e.target.value }))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Ví dụ: Màn hình bị sọc toàn phần, cần thay panel"
          />
        </label>

        <label className="block">
          <span className="text-slate-600 text-xs">Giải thích chi tiết để thuyết phục khách</span>
          <textarea
            value={proposalForm.explanation}
            onChange={(e) => setProposalForm((prev) => ({ ...prev, explanation: e.target.value }))}
            className="mt-1 w-full min-h-[100px] rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            placeholder="Mô tả tình trạng, căn cứ từ biên bản giao nhận, hướng xử lý và cơ sở chi phí sửa chữa..."
          />
        </label>

        <div>
          <label className="text-slate-600 text-xs">Ảnh chứng cứ bổ sung (tối đa 8 ảnh)</label>
          <label className="mt-1 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 cursor-pointer hover:bg-slate-50">
            <FiUpload size={14} />
            <span className="text-sm text-slate-700">Tải ảnh chứng cứ</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={onProposalImagesChange}
            />
          </label>
          {proposalImages.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {proposalImages.map((file, idx) => (
                <button
                  type="button"
                  key={`${file.name}-${idx}`}
                  onClick={() => onRemoveProposalImage(idx)}
                  className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
                  title="Bấm để xóa ảnh khỏi đề xuất"
                >
                  {file.name.length > 24 ? `${file.name.slice(0, 24)}...` : file.name} ×
                </button>
              ))}
            </div>
          )}
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={proposalForm.sendToCustomer}
            onChange={(e) => setProposalForm((prev) => ({ ...prev, sendToCustomer: e.target.checked }))}
            className="rounded border-slate-300"
          />
          Gửi nội dung đề xuất này qua chat trực tiếp cho khách ngay sau khi lưu
        </label>

        <button
          type="button"
          onClick={onSubmit}
          disabled={proposalSubmitting || isSyntheticReturnIssue}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FiSend size={15} />
          {proposalSubmitting ? "Đang gửi đề xuất..." : "Lưu đề xuất bồi thường"}
        </button>
      </div>
    </section>
  );
}
