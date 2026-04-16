import React, { useState } from "react";
import { FiX, FiUpload, FiSend, FiLoader } from "react-icons/fi";
import { toast } from "react-toastify";
import { supplierIssueAdditionalDelivery } from "../../service/ApiService/ReportApi";
import { RiImageAddFill } from "react-icons/ri";

export default function AdditionalDeliveryDialog({ issue, onClose, onSuccess }) {
  const [notes, setNotes] = useState("");
  const [images, setImages] = useState([]); // will store objects: { file: File, preview: string }
  const [submitting, setSubmitting] = useState(false);

  const handleUploadImage = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const newImages = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file), // will store { file: File, preview: string }
    }));

    setImages((prev) => [...prev, ...newImages].slice(0, 5)); // Limit to 5 images
    e.target.value = null; // reset
  };

  const handleRemoveImage = (idx) => {
    setImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[idx].preview); // Clean up memory
      newImages.splice(idx, 1);
      return newImages;
    });
  };

  const handleSubmit = async () => {
    if (!notes.trim()) {
      toast.warning("Vui lòng nhập ghi chú (nội dung cần giao bổ sung)");
      return;
    }
    
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("notes", notes.trim());
      images.forEach((img) => {
        formData.append("images", img.file);
      });

      await supplierIssueAdditionalDelivery(issue._id, formData);
      toast.success("Đã ghi nhận tạo biên bản giao hàng bổ sung thành công.");
      onSuccess?.();
      onClose?.();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50">
          <h3 className="font-bold text-slate-800">Xác nhận giao hàng bổ sung</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <FiX size={20} />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-2">
            <p className="text-sm">
              <span className="font-semibold text-slate-700">Khách hàng:</span>{" "}
              {issue._customerName} {issue._customerPhone && `- ${issue._customerPhone}`}
            </p>
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-700">Thiết bị đã giao thiếu:</span><br/>
              {issue._devices?.join(", ") || "—"}
            </p>
            <p className="text-xs text-indigo-700">
              Hành động này sẽ tạo một chuyến giao hàng mới gán cho NV đã phụ trách đơn hiện tại để đem đồ đến cho khách.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ghi chú cho Operation Staff <span className="text-rose-500">*</span>
            </label>
            <textarea
              className="w-full border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 min-h-[100px] resize-none pb-4"
              placeholder="Vd: Giao bổ sung 2 pin LP-E6, 1 sạc cho chiếc Canon R6. Xin lỗi khách vì sự sơ suất."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Đính kèm ảnh minh họa (tối đa 5 ảnh)</label>
            <div className="flex flex-wrap gap-2">
              {images.map((img, idx) => (
                <div key={idx} className="relative group w-20 h-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-50">
                  <img src={img.preview} alt="Đính kèm" className="w-full h-full object-cover" />
                  <button
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <FiX size={12} />
                  </button>
                </div>
              ))}
              {images.length < 5 && (
                <label className="flex flex-col items-center justify-center w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-indigo-600 hover:border-indigo-300 transition-colors cursor-pointer">
                  <RiImageAddFill size={20} />
                  <span className="text-[10px] font-medium mt-1">Thêm ảnh</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleUploadImage} disabled={submitting} />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 font-medium text-sm text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {submitting ? <FiLoader className="animate-spin" size={16} /> : <FiSend size={16} />}
            Xác nhận
          </button>
        </div>
      </div>
    </div>
  );
}
