import React, { useState } from "react";
import { FiX, FiSend, FiLoader, FiShield, FiAlertTriangle } from "react-icons/fi";
import { toast } from "react-toastify";
import { supplierEscalateIssue } from "../../service/ApiService/ReportApi";

export default function EscalateIssueDialog({ issue, onClose, onSuccess }) {
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await supplierEscalateIssue(issue._id, { note: note.trim() });
      toast.success("Đã gửi yêu cầu can thiệp tới GearXpert");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Không thể gửi yêu cầu can thiệp");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-violet-100 text-violet-700 rounded-xl">
              <FiShield size={20} />
            </div>
            <h3 className="font-bold text-lg text-slate-800">Nhờ GearXpert can thiệp</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
            <FiAlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={18} />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-amber-900">Lưu ý điều tra</p>
              <p className="text-xs text-amber-800 leading-relaxed">
                Khi nhờ GearXpert can thiệp, đội ngũ admin sẽ trực tiếp điều tra hồ sơ sự cố và đưa ra quyết định cuối cùng dựa trên bằng chứng của hai bên.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 ml-1">
              Lý do hoặc nội dung cần hỗ trợ
            </label>
            <textarea
              className="w-full border-2 border-slate-100 bg-slate-50/50 rounded-2xl p-4 text-sm focus:outline-none focus:border-violet-400 focus:bg-white transition-all min-h-[120px] resize-none"
              placeholder="Mô tả ngắn gọn tại sao bạn cần GearXpert can thiệp (ví dụ: Không thống nhất được với khách hàng, khách hàng không phản hồi...)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        <div className="px-6 py-5 bg-slate-50/50 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 font-bold text-sm text-slate-600 bg-white border-2 border-slate-100 hover:border-slate-200 hover:bg-slate-50 rounded-2xl transition-all active:scale-95"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 font-bold text-sm text-white bg-violet-600 hover:bg-violet-700 rounded-2xl transition-all shadow-lg shadow-violet-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? <FiLoader className="animate-spin" size={18} /> : <FiSend size={18} />}
            Gửi yêu cầu
          </button>
        </div>
      </div>
    </div>
  );
}
