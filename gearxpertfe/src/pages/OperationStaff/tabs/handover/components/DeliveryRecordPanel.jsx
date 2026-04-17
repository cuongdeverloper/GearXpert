import React from "react";
import { UserRound, MapPin, Phone, CircleCheck, CircleX } from "lucide-react";
import SuccessConfirmCard from "./SuccessConfirmCard";
import FailureConfirmCard from "./FailureConfirmCard";
import AttemptsHistory from "./AttemptsHistory";
import DeviceChecklist from "./DeviceChecklist";

export default function DeliveryRecordPanel({
  selectedRental,
  selectedRentalId,
  working,
  loadingAttempts,
  attempts,
  activeAttempt,
  isAssignedToMe,
  canProcessHandover,
  resolutionMode,
  setResolutionMode,
  inspectionForm,
  setInspectionForm,
  handleSaveInspection,
  handleCreateRedelivery,
  confirmForm,
  setConfirmForm,
  handleConfirmSuccess,
  failureForm,
  setFailureForm,
  handleFail,
}) {
  if (!selectedRental) {
    return (
      <div className="h-[50vh] flex items-center justify-center text-slate-500 text-sm">
        Chọn một đơn đang giao để xử lý biên bản bàn giao.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-500">Khách hàng</p>
          <p className="font-semibold text-slate-800 flex items-center gap-2 mt-1">
            <UserRound size={15} /> {selectedRental.customerName}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
          <p className="text-xs text-slate-500">Liên hệ</p>
          <p className="font-semibold text-slate-800 flex items-center gap-2 mt-1">
            <Phone size={15} /> {selectedRental.phone}
          </p>
        </div>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 md:col-span-2">
          <p className="text-xs text-slate-500">Địa chỉ giao</p>
          <p className="font-semibold text-slate-800 flex items-center gap-2 mt-1">
            <MapPin size={15} /> {selectedRental.address}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleSaveInspection}
          disabled={working || !canProcessHandover}
          className="px-3 py-2 text-sm rounded-xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Lưu kiểm tra
        </button>
        <button
          onClick={handleCreateRedelivery}
          disabled={working || !isAssignedToMe}
          className="px-3 py-2 text-sm rounded-xl border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50"
        >
          Tạo attempt giao lại
        </button>
      </div>

      {!canProcessHandover && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-700 px-3 py-2 text-sm font-medium">
          Bạn chỉ có thể xử lý biên bản khi đơn đã được bạn nhận và đã xác nhận lấy hàng.
        </div>
      )}

      <div className="space-y-3">
        <h4 className="font-semibold text-slate-800">Inspection Checklist</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    ["customerPresent", "Khách có mặt"],
                    ["customerIdentityVerified", "Xác minh danh tính"],
                    ["deliveryAddressMatched", "Đúng địa chỉ giao"],
                  ].map(([key, label]) => (
                    <label
                      key={key}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={inspectionForm[key]}
                        onChange={(e) =>
                          setInspectionForm((prev) => ({ ...prev, [key]: e.target.checked }))
                        }
                      />
                      {label}
                    </label>
                  ))}
                </div>

        {/* Chặn danh sách thiết bị khi là giao bổ sung */}
        {!selectedRental?.raw?.deliveryTask?.isAdditional && (
          <DeviceChecklist
            items={
              selectedRental?.raw?.rentalItems?.map((item) => ({
                rentalItemId: item._id,
                deviceName: item.deviceId?.name || "Thiết bị",
                expectedQuantity: item.quantity || 1,
                expectedSerialNumbers:
                  item.deviceItemIds?.map((di) => di?.serialNumber).filter(Boolean) || [],
              })) || []
            }
          />
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 border border-slate-200">
          <button
            type="button"
            onClick={() => setResolutionMode("SUCCESS")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              resolutionMode === "SUCCESS"
                ? "bg-emerald-600 text-white"
                : "text-slate-700 hover:bg-white"
            }`}
          >
            <CircleCheck size={16} />
            Giao thành công
          </button>
          <button
            type="button"
            onClick={() => setResolutionMode("FAILED")}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
              resolutionMode === "FAILED"
                ? "bg-red-600 text-white"
                : "text-slate-700 hover:bg-white"
            }`}
          >
            <CircleX size={16} />
            Giao thất bại
          </button>
        </div>

        {resolutionMode === "SUCCESS" ? (
          <SuccessConfirmCard
            confirmForm={confirmForm}
            setConfirmForm={setConfirmForm}
            onConfirmSuccess={handleConfirmSuccess}
            working={working}
            activeAttempt={activeAttempt}
            canProcessHandover={canProcessHandover}
            contextType="DELIVERY"
          />
        ) : (
          <FailureConfirmCard
            failureForm={failureForm}
            setFailureForm={setFailureForm}
            onFail={handleFail}
            working={working}
            activeAttempt={activeAttempt}
            canProcessHandover={canProcessHandover}
            contextType="DELIVERY"
          />
        )}
      </div>

      <AttemptsHistory loadingAttempts={loadingAttempts} attempts={attempts} />
    </div>
  );
}
