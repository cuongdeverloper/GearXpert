import React from "react";
import {
  Wrench,
  Camera,
  XCircle,
  Send,
  ChevronDown,
  Check,
} from "lucide-react";

export default function DamageReportModal({
  damageReportModal,
  setDamageReportModal,
  handleSubmitDamageReport,
  handleFileUpload,
  toggleSerialSelection,
}) {
  if (!damageReportModal.isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-gray-900/80 backdrop-blur-md"
        onClick={() =>
          setDamageReportModal({ ...damageReportModal, isOpen: false })
        }
      />

      <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
        <div className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
              <Wrench size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900 uppercase italic">
                Báo cáo hư hỏng / sự cố
              </h3>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                Chúng tôi sẽ hỗ trợ trong 24h
              </p>
            </div>
          </div>

          {/* Chọn sản phẩm / serial */}
          <div className="space-y-2 mb-6">
            <label className="text-xs font-bold text-gray-700 ml-3 uppercase tracking-wider">
              Chọn thiết bị/serial bị hỏng (
              {damageReportModal.selectedItems?.length || 0})
            </label>
            <div className="grid gap-2 max-h-[200px] overflow-y-auto pr-2 custom-scrollbar">
              {damageReportModal.order?.items?.flatMap((item) => {
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
                      damageReportModal.selectedItems?.includes(deviceItemId);

                    return (
                      <div
                        key={`${item._id}-${serial}`}
                        onClick={() =>
                          toggleSerialSelection(deviceItemId, setDamageReportModal)
                        }
                        className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                          isSelected
                            ? "border-red-500 bg-red-50"
                            : "border-gray-100 bg-white hover:border-gray-200"
                        }`}
                      >
                        <div
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            isSelected
                              ? "bg-red-500 border-red-500"
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
                const rentalItemId = item._id?.toString();
                if (!rentalItemId) return null;
                const isSelected =
                  damageReportModal.selectedItems?.includes(rentalItemId);

                return (
                  <div
                    key={rentalItemId}
                    onClick={() =>
                      toggleSerialSelection(rentalItemId, setDamageReportModal)
                    }
                    className={`flex items-center gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "border-red-500 bg-red-50"
                        : "border-gray-100 bg-white hover:border-gray-200"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "bg-red-500 border-red-500" : "border-gray-300"
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
                      <p className="text-[11px] font-black text-gray-800">
                        {item.deviceId?.name}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Severity */}
          <div className="space-y-2 mb-4">
            <label className="text-xs font-bold text-gray-700 ml-3">
              Mức độ hư hỏng
            </label>
            <div className="relative">
              <select
                className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none appearance-none font-bold text-sm"
                value={damageReportModal.severity}
                onChange={(e) =>
                  setDamageReportModal({
                    ...damageReportModal,
                    severity: e.target.value,
                  })
                }
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
              </select>
              <ChevronDown
                className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                size={16}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2 mb-6">
            <label className="text-xs font-bold text-gray-700 ml-3">
              Mô tả chi tiết
            </label>
            <textarea
              rows={4}
              placeholder="Vui lòng mô tả chi tiết tình trạng..."
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none outline-none resize-none text-sm"
              value={damageReportModal.description}
              onChange={(e) =>
                setDamageReportModal({
                  ...damageReportModal,
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
              {(damageReportModal.files || []).map((file, i) => (
                <div key={i} className="relative">
                  <img
                    src={URL.createObjectURL(file)}
                    className="w-20 h-20 object-cover rounded-xl"
                    alt=""
                  />
                  <button
                    onClick={() =>
                      setDamageReportModal({
                        ...damageReportModal,
                        files: damageReportModal.files.filter((_, idx) => idx !== i),
                      })
                    }
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              ))}
              <label className="w-20 h-20 rounded-xl bg-gray-50 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer">
                <Camera size={20} />
                <span className="text-[10px] mt-1">Add</span>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files, setDamageReportModal)}
                />
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <button
              onClick={() =>
                setDamageReportModal({ ...damageReportModal, isOpen: false })
              }
              className="py-4 rounded-2xl bg-gray-100 text-gray-600 font-bold uppercase text-[11px] hover:bg-gray-200"
            >
              Hủy bỏ
            </button>
            <button
              onClick={handleSubmitDamageReport}
              disabled={
                !damageReportModal.description?.trim() ||
                !(damageReportModal.selectedItems?.length > 0)
              }
              className="py-4 rounded-2xl bg-red-600 text-white font-black uppercase italic text-[11px] disabled:bg-gray-300 flex items-center justify-center gap-2"
            >
              Gửi báo cáo <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}