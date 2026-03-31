// modals/DeliveryReportModal.jsx
import React from "react";
import {
  AlertCircle,
  Camera,
  XCircle,
  Send,
  ChevronDown,
  Check,
} from "lucide-react";
import { toast } from "react-toastify";

export default function DeliveryReportModal({
  DeliReportModal,
  setDeliReportModal,
  handleSubmitDeliReport,
  handleFileUpload,
  toggleSerialSelection,
  REPORT_REASONS,
  REPORT_REASON_MAP,
}) {
  if (!DeliReportModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
        onClick={() =>
          setDeliReportModal({ ...DeliReportModal, isOpen: false })
        }
      />

      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 uppercase italic">
                Báo cáo vấn đề giao hàng
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                Chúng tôi sẽ hỗ trợ trong 24h
              </p>
            </div>
          </div>

          {/* Chọn sản phẩm / serial */}
          <div className="space-y-2 mb-6">
            <label className="text-xs font-bold text-gray-700 ml-3 uppercase tracking-wider">
              Chọn sản phẩm cần báo cáo (
              {DeliReportModal.selectedItems?.length || 0})
            </label>
            <div className="grid gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {(DeliReportModal.order?.items || []).flatMap((item) => {
                if (
                  item.serialNumbers?.length > 0 &&
                  item.deviceItemIds?.length > 0
                ) {
                  return item.serialNumbers.map((serial, idx) => {
                    const deviceItem = item.deviceItemIds[idx];
                    const deviceItemId =
                      deviceItem?._id?.toString?.() ?? deviceItem?.toString?.();
                    if (!deviceItemId) return null;
                    const isSelected =
                      DeliReportModal.selectedItems?.includes(deviceItemId);

                    return (
                      <div
                        key={`${item._id}-${serial}`}
                        onClick={() =>
                          toggleSerialSelection(deviceItemId)
                        }
                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-amber-500 bg-amber-50"
                            : "border-gray-100 bg-white hover:border-gray-200"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? "bg-amber-500 border-amber-500"
                              : "border-gray-300"
                          }`}
                        >
                          {isSelected && (
                            <Check
                              size={12}
                              className="text-white"
                              strokeWidth={4}
                            />
                          )}
                        </div>
                        <img
                          src={item.deviceId?.images?.[0]}
                          className="w-10 h-10 rounded-lg object-cover"
                          alt=""
                        />
                        <div className="flex-1">
                          <p className="text-[11px] font-black text-gray-800 line-clamp-1">
                            {item.deviceId?.name} - {serial}
                          </p>
                        </div>
                      </div>
                    );
                  });
                }
                // Không có serial
                return (
                  <div
                    key={item._id}
                    onClick={() =>
                      toggleSerialSelection(item._id.toString())
                    }
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                      DeliReportModal.selectedItems?.includes(
                        item._id.toString()
                      )
                        ? "border-amber-500 bg-amber-50"
                        : "border-gray-100 bg-white hover:border-gray-200"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        DeliReportModal.selectedItems?.includes(
                          item._id.toString()
                        )
                          ? "bg-amber-500"
                          : "border-gray-300"
                      }`}
                    >
                      {DeliReportModal.selectedItems?.includes(
                        item._id.toString()
                      ) && (
                        <Check
                          size={12}
                          className="text-white"
                          strokeWidth={4}
                        />
                      )}
                    </div>
                    <img
                      src={item.deviceId?.images?.[0]}
                      className="w-10 h-10 rounded-lg object-cover"
                      alt=""
                    />
                    <div className="flex-1">
                      <p className="text-[11px] font-black text-gray-800">
                        {item.deviceId?.name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lý do & Mô tả */}
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 ml-3">
                Vấn đề gặp phải
              </label>
              <div className="relative">
                <select
                  className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none appearance-none font-bold text-sm"
                  value={DeliReportModal.reasonType}
                  onChange={(e) =>
                    setDeliReportModal({
                      ...DeliReportModal,
                      reasonType: e.target.value,
                    })
                  }
                >
                  <option value="">Chọn lý do...</option>
                  {REPORT_REASONS.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={16}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 ml-3">
                Mô tả chi tiết
              </label>
              <textarea
                rows={4}
                placeholder="Vui lòng mô tả chi tiết tình trạng..."
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none resize-none text-sm"
                value={DeliReportModal.description}
                onChange={(e) =>
                  setDeliReportModal({
                    ...DeliReportModal,
                    description: e.target.value,
                  })
                }
              />
            </div>

            {/* Upload file */}
            <div>
              <label className="text-xs font-bold text-gray-700 ml-3 mb-2 block">
                Hình ảnh/Video minh chứng
              </label>
              <div className="flex flex-wrap gap-3">
                {(DeliReportModal.files || []).map((file, idx) => (
                  <div key={idx} className="relative group">
                    {file.type.startsWith("image") ? (
                      <img
                        src={URL.createObjectURL(file)}
                        alt="preview"
                        className="w-20 h-20 rounded-xl object-cover border"
                      />
                    ) : (
                      <video
                        src={URL.createObjectURL(file)}
                        className="w-20 h-20 rounded-xl"
                        controls
                      />
                    )}
                    <button
                      onClick={() =>
                        setDeliReportModal({
                          ...DeliReportModal,
                          files: DeliReportModal.files.filter(
                            (_, i) => i !== idx
                          ),
                        })
                      }
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100"
                    >
                      <XCircle size={12} />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100">
                  <Camera size={20} />
                  <span className="text-[8px] font-bold uppercase mt-1">
                    Thêm ảnh
                  </span>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(e) =>
                      handleFileUpload(e.target.files, setDeliReportModal)
                    }
                  />
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <button
              onClick={() =>
                setDeliReportModal({ ...DeliReportModal, isOpen: false })
              }
              className="py-4 rounded-xl bg-gray-100 text-gray-500 font-bold uppercase text-[11px] hover:bg-gray-200"
            >
              Đóng
            </button>
            <button
              onClick={handleSubmitDeliReport}
              disabled={
                !DeliReportModal.selectedItems?.length ||
                !DeliReportModal.reasonType
              }
              className={`py-4 rounded-xl font-black uppercase italic text-[11px] flex items-center justify-center gap-2 transition-all ${
                DeliReportModal.selectedItems?.length > 0 &&
                DeliReportModal.reasonType
                  ? "bg-amber-500 text-white hover:bg-amber-600"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              Gửi báo cáo <Send size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
