import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  ClipboardCheck,
  RefreshCw,
  UserRound,
  MapPin,
  Phone,
  CircleCheck,
  CircleX,
} from "lucide-react";
import { getDeliveringRentals } from "../../../service/ApiService/RentalApi";
import {
  createHandoverDraft,
  createHandoverRedelivery,
  getHandoverAttemptsByRental,
  startHandover,
  saveHandoverInspection,
  confirmHandoverSuccess,
  failHandover,
} from "../../../service/ApiService/HandoverApi";
import { logOperationAction } from "../../../service/ApiService/OperationLogApi";
import { mapRentalCard, makeInspectionPayload } from "./handover/helpers";
import SuccessConfirmCard from "./handover/components/SuccessConfirmCard";
import FailureConfirmCard from "./handover/components/FailureConfirmCard";
import AttemptsHistory from "./handover/components/AttemptsHistory";

export default function HandoverTab({ selectedRentalIdFromTask = "", onConsumedSelectedRental }) {
  const account = useSelector((state) => state.user.account);
  const currentStaffId = account?.id;
  const [loadingRentals, setLoadingRentals] = useState(false);
  const [rentals, setRentals] = useState([]);
  const [selectedRentalId, setSelectedRentalId] = useState("");
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [working, setWorking] = useState(false);
  const [resolutionMode, setResolutionMode] = useState("SUCCESS");

  const [inspectionForm, setInspectionForm] = useState({
    customerPresent: false,
    customerIdentityVerified: false,
    deliveryAddressMatched: false,
    operatorNote: "",
    evidenceUrls: "",
    items: [],
  });

  const [confirmForm, setConfirmForm] = useState({
    confirmerName: "",
    confirmerPhone: "",
    signatureUrl: "",
    otpVerified: false,
  });

  const [failureForm, setFailureForm] = useState({
    reason: "",
    detail: "",
    noShowWaitMinutes: "",
    missingAccessories: "",
    mismatchedSerials: "",
    evidenceUrls: "",
    operatorNote: "",
  });

  const selectedRental = useMemo(
    () => rentals.find((x) => x.id === selectedRentalId) || null,
    [rentals, selectedRentalId]
  );

  useEffect(() => {
    if (!selectedRental) return;

    setConfirmForm((prev) => ({
      ...prev,
      confirmerName: selectedRental.customerName && selectedRental.customerName !== "Khách hàng"
        ? selectedRental.customerName
        : "",
      confirmerPhone: selectedRental.phone && selectedRental.phone !== "-" ? selectedRental.phone : "",
    }));
  }, [selectedRental]);

  const isAssignedToMe = useMemo(() => {
    const owner = selectedRental?.raw?.assignedOperationStaffId?._id || selectedRental?.raw?.assignedOperationStaffId;
    if (!owner || !currentStaffId) return false;
    return String(owner) === String(currentStaffId);
  }, [selectedRental, currentStaffId]);

  const canProcessHandover = Boolean(
    selectedRental?.raw?.pickedUpAt &&
      isAssignedToMe
  );

  const activeAttempt = useMemo(
    () => attempts.find((x) => ["DRAFT", "IN_PROGRESS"].includes(x.status)) || null,
    [attempts]
  );

  const hydrateInspectionFromAttempt = useCallback((attempt) => {
    const sourceItems = attempt?.inspection?.items?.length
      ? attempt.inspection.items
      : attempt?.prefetchedSnapshot?.items || [];

    setInspectionForm((prev) => ({
      ...prev,
      customerPresent: Boolean(attempt?.inspection?.checklist?.customerPresent),
      customerIdentityVerified: Boolean(
        attempt?.inspection?.checklist?.customerIdentityVerified
      ),
      deliveryAddressMatched: Boolean(
        attempt?.inspection?.checklist?.deliveryAddressMatched
      ),
      operatorNote: attempt?.inspection?.operatorNote || "",
      evidenceUrls: (attempt?.inspection?.evidenceUrls || []).join("\n"),
      items: sourceItems,
    }));
  }, []);

  const fetchDeliveringRentals = useCallback(async () => {
    setLoadingRentals(true);
    try {
      const res = await getDeliveringRentals();
      const mapped = (res?.rentals || []).map(mapRentalCard);
      const mineOnly = mapped.filter((item) => {
        const owner = item.raw?.assignedOperationStaffId?._id || item.raw?.assignedOperationStaffId;
        return owner && currentStaffId && String(owner) === String(currentStaffId);
      });
      setRentals(mineOnly);
    } catch (error) {
      alert(error?.response?.data?.message || "Không tải được danh sách đơn đang giao");
    } finally {
      setLoadingRentals(false);
    }
  }, [currentStaffId]);

  useEffect(() => {
    fetchDeliveringRentals();
  }, [fetchDeliveringRentals]);

  const fetchAttempts = useCallback(
    async (rentalId) => {
      if (!rentalId) return;
      setLoadingAttempts(true);
      try {
        const res = await getHandoverAttemptsByRental(rentalId);
        const data = res?.handovers || [];
        setAttempts(data);

        const active = data.find((x) => ["DRAFT", "IN_PROGRESS"].includes(x.status));
        if (active) {
          hydrateInspectionFromAttempt(active);
        }
      } catch (error) {
        alert(error?.response?.data?.message || "Không tải được lịch sử bàn giao");
      } finally {
        setLoadingAttempts(false);
      }
    },
    [hydrateInspectionFromAttempt]
  );

  useEffect(() => {
    if (!selectedRentalIdFromTask) return;

    setSelectedRentalId(selectedRentalIdFromTask);
    fetchAttempts(selectedRentalIdFromTask);
    onConsumedSelectedRental?.();
  }, [selectedRentalIdFromTask, fetchAttempts, onConsumedSelectedRental]);

  useEffect(() => {
    setResolutionMode("SUCCESS");
  }, [selectedRentalId]);

  const handleSelectRental = async (rentalId) => {
    setSelectedRentalId(rentalId);
    await fetchAttempts(rentalId);
  };

  const ensureDraft = async () => {
    if (!selectedRentalId) return;

    setWorking(true);
    try {
      await createHandoverDraft(selectedRentalId, {});
      await fetchAttempts(selectedRentalId);
      alert("Đã chuẩn bị biên bản draft.");
    } catch (error) {
      alert(error?.response?.data?.message || "Không tạo được draft biên bản");
    } finally {
      setWorking(false);
    }
  };

  const handleStart = async () => {
    if (!activeAttempt) return;

    setWorking(true);
    try {
      await startHandover(activeAttempt.id);
      await fetchAttempts(selectedRentalId);
      alert("Biên bản đã chuyển sang trạng thái đang giao.");
    } catch (error) {
      alert(error?.response?.data?.message || "Không thể bắt đầu bàn giao");
    } finally {
      setWorking(false);
    }
  };

  const handleSaveInspection = async () => {
    if (!activeAttempt) return;

    const payload = makeInspectionPayload(activeAttempt, inspectionForm);
    setWorking(true);
    try {
      await saveHandoverInspection(activeAttempt.id, payload);
      await fetchAttempts(selectedRentalId);
      alert("Đã lưu kiểm tra thiết bị/phụ kiện.");
    } catch (error) {
      alert(error?.response?.data?.message || "Không lưu được kiểm tra");
    } finally {
      setWorking(false);
    }
  };

  const handleConfirmSuccess = async () => {
    if (!activeAttempt) return;

    const confirmerName =
      confirmForm.confirmerName.trim() ||
      (selectedRental?.customerName && selectedRental.customerName !== "Khách hàng"
        ? selectedRental.customerName.trim()
        : "");
    const confirmerPhone =
      confirmForm.confirmerPhone.trim() ||
      (selectedRental?.phone && selectedRental.phone !== "-" ? selectedRental.phone.trim() : "");

    if (!confirmerName) {
      alert("Vui lòng nhập tên người xác nhận nhận hàng.");
      return;
    }

    const inspection = makeInspectionPayload(activeAttempt, inspectionForm);

    setWorking(true);
    try {
      await confirmHandoverSuccess(activeAttempt.id, {
        inspection,
        customerConfirmation: {
          confirmed: true,
          confirmerName,
          confirmerPhone,
          signatureUrl: confirmForm.signatureUrl.trim(),
          otpVerified: Boolean(confirmForm.otpVerified),
        },
      });

      logOperationAction("HANDOVER_CONFIRM_SUCCESS", "RENTAL", selectedRentalId, {
        handoverId: activeAttempt.id,
        confirmerName,
        confirmerPhone,
      }).catch(() => {});

      await fetchAttempts(selectedRentalId);
      await fetchDeliveringRentals();
      alert("Xác nhận bàn giao thành công. Đơn đã chuyển RENTING.");
    } catch (error) {
      alert(error?.response?.data?.message || "Không thể xác nhận bàn giao thành công");
    } finally {
      setWorking(false);
    }
  };

  const handleFail = async () => {
    if (!activeAttempt) return;
    if (!failureForm.reason) {
      alert("Vui lòng chọn lý do giao thất bại.");
      return;
    }

    const inspection = makeInspectionPayload(activeAttempt, inspectionForm);

    const payload = {
      inspection,
      failure: {
        reason: failureForm.reason,
        detail: failureForm.detail,
        noShowWaitMinutes: failureForm.noShowWaitMinutes
          ? Number(failureForm.noShowWaitMinutes)
          : undefined,
        missingAccessories: failureForm.missingAccessories
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        mismatchedSerials: failureForm.mismatchedSerials
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean),
        evidenceUrls: failureForm.evidenceUrls
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
        operatorNote: failureForm.operatorNote,
      },
    };

    setWorking(true);
    try {
      await failHandover(activeAttempt.id, payload);

      logOperationAction("HANDOVER_CONFIRM_FAILED", "RENTAL", selectedRentalId, {
        handoverId: activeAttempt.id,
        reason: failureForm.reason,
        detail: failureForm.detail,
      }).catch(() => {});

      await fetchAttempts(selectedRentalId);
      alert("Đã ghi nhận bàn giao thất bại và lưu bằng chứng.");
    } catch (error) {
      alert(error?.response?.data?.message || "Không thể ghi nhận thất bại");
    } finally {
      setWorking(false);
    }
  };

  const handleCreateRedelivery = async () => {
    if (!selectedRentalId) return;
    setWorking(true);
    try {
      await createHandoverRedelivery(selectedRentalId, {});
      await fetchAttempts(selectedRentalId);
      alert("Đã tạo attempt giao lại mới.");
    } catch (error) {
      alert(error?.response?.data?.message || "Không thể tạo attempt giao lại");
    } finally {
      setWorking(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="bg-white border border-slate-200 rounded-2xl p-4 md:p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <ClipboardCheck size={20} className="text-primary" /> Biên bản bàn giao
            </h2>
          </div>
          <button
            onClick={fetchDeliveringRentals}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            disabled={loadingRentals}
          >
            <RefreshCw size={15} className={loadingRentals ? "animate-spin" : ""} /> Làm mới
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">
            Đơn đang giao
          </div>
          <div className="max-h-[65vh] overflow-y-auto p-3 space-y-2">
            {loadingRentals ? (
              <p className="text-sm text-slate-500 p-2">Đang tải...</p>
            ) : rentals.length === 0 ? (
              <p className="text-sm text-slate-500 p-2">Không có đơn DELIVERING.</p>
            ) : (
              rentals.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelectRental(item.id)}
                  className={`w-full text-left p-3 rounded-xl border transition ${
                    selectedRentalId === item.id
                      ? "bg-primary/5 border-primary/30"
                      : "bg-white border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <p className="text-xs text-slate-500 mb-1">#{item.code}</p>
                  <p className="font-semibold text-slate-800 line-clamp-1">{item.deviceLabel}</p>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-1">{item.customerName}</p>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6">
          {!selectedRental ? (
            <div className="h-[50vh] flex items-center justify-center text-slate-500 text-sm">
              Chọn một đơn đang giao để xử lý biên bản bàn giao.
            </div>
          ) : (
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
                  onClick={ensureDraft}
                  disabled={working || !canProcessHandover}
                  className="px-3 py-2 text-sm rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Tạo/Lấy Draft
                </button>
                <button
                  onClick={handleStart}
                  disabled={working || !activeAttempt || !canProcessHandover}
                  className="px-3 py-2 text-sm rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  Bắt đầu giao
                </button>
                <button
                  onClick={handleSaveInspection}
                  disabled={working || !activeAttempt || !canProcessHandover}
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

                <textarea
                  value={inspectionForm.operatorNote}
                  onChange={(e) =>
                    setInspectionForm((prev) => ({ ...prev, operatorNote: e.target.value }))
                  }
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  placeholder="Ghi chú kiểm tra thực tế thiết bị/phụ kiện"
                />

                <textarea
                  value={inspectionForm.evidenceUrls}
                  onChange={(e) =>
                    setInspectionForm((prev) => ({ ...prev, evidenceUrls: e.target.value }))
                  }
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                  placeholder="Evidence URL (mỗi dòng 1 link)"
                />
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
                    <CircleCheck size={16} /> Giao thành công
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
                    <CircleX size={16} /> Giao thất bại
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
                  />
                ) : (
                  <FailureConfirmCard
                    failureForm={failureForm}
                    setFailureForm={setFailureForm}
                    onFail={handleFail}
                    working={working}
                    activeAttempt={activeAttempt}
                    canProcessHandover={canProcessHandover}
                  />
                )}
              </div>

              <AttemptsHistory loadingAttempts={loadingAttempts} attempts={attempts} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
