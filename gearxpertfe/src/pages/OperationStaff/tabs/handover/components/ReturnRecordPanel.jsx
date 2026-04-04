import React from "react";
import { UserRound, MapPin, Phone, CircleCheck, CircleX } from "lucide-react";
import SuccessConfirmCard from "./SuccessConfirmCard";
import FailureConfirmCard from "./FailureConfirmCard";
import AttemptsHistory from "./AttemptsHistory";
import DeviceChecklist from "./DeviceChecklist";

export default function ReturnRecordPanel({
  selectedRental,
  selectedRentalId,
  deliveryReference,
  working,
  loadingAttempts,
  attempts,
  activeAttempt,
  isAssignedToMe,
  canProcessHandover,
  resolutionMode,
  setResolutionMode,
  handleSaveInspection,
  handleCreateRedelivery,
  confirmForm,
  setConfirmForm,
  handleConfirmSuccess,
  failureForm,
  setFailureForm,
  handleFail,
  returnFailureOptions,
}) {
  const deliveryOperatorNote =
    deliveryReference?.inspection?.operatorNote?.trim() ||
    deliveryReference?.customerConfirmation?.operatorNote?.trim() ||
    "";
  const signatureSource =
    deliveryReference?.customerConfirmation?.signatureUrls ||
    deliveryReference?.customerConfirmation?.signatureUrl ||
    [];
  const deliverySignatureUrls = Array.isArray(signatureSource)
    ? signatureSource.filter(Boolean)
    : [signatureSource].filter(Boolean);

  if (!selectedRental) {
    return (
      <div className="h-[50vh] flex items-center justify-center text-slate-500 text-sm">
        Chọn một đơn đang thu hồi để xử lý biên bản thu hồi.
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
          disabled={working || !isAssignedToMe || !activeAttempt}
          className="px-3 py-2 text-sm rounded-xl border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-50"
        >
          Tạo attempt thu hồi lại
        </button>
      </div>

      {!canProcessHandover && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-700 px-3 py-2 text-sm font-medium">
          Bạn chỉ có thể xử lý biên bản khi đơn thu hồi đã được lock cho bạn.
        </div>
      )}

      <div className="space-y-3">
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
      </div>

      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 space-y-3">
        <h4 className="font-semibold text-slate-900">Đối chiếu từ biên bản bàn giao</h4>

        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-700">Ghi chú kiểm tra thiết bị/phụ kiện</p>
          <div className="rounded-xl border border-blue-100 bg-white p-3 text-sm text-slate-700 min-h-16 whitespace-pre-wrap">
            {deliveryOperatorNote || "Chưa có ghi chú từ biên bản bàn giao."}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Hình ảnh xác nhận</p>
          {deliverySignatureUrls.length === 0 ? (
            <div className="rounded-xl border border-blue-100 bg-white p-3 text-sm text-slate-500">
              Chưa có hình ảnh xác nhận từ biên bản bàn giao.
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {deliverySignatureUrls.map((url, index) => (
                <a
                  key={`${url}-${index}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="block rounded-xl overflow-hidden border border-blue-100 bg-white"
                >
                  <img
                    src={url}
                    alt={`Xác nhận bàn giao ${index + 1}`}
                    className="w-full h-28 object-cover"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
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
            Thu hồi thành công
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
            Thu hồi thất bại
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
            contextType="RETURN"
          />
        ) : (
          <FailureConfirmCard
            failureForm={failureForm}
            setFailureForm={setFailureForm}
            onFail={handleFail}
            working={working}
            activeAttempt={activeAttempt}
            canProcessHandover={canProcessHandover}
            contextType="RETURN"
            failureOptions={returnFailureOptions}
          />
        )}
      </div>

      <AttemptsHistory
        loadingAttempts={loadingAttempts}
        attempts={attempts}
        fallbackCustomerName={selectedRental?.customerName || "Khách hàng"}
        fallbackPhone={selectedRental?.phone || "-"}
      />
    </div>
  );
}
