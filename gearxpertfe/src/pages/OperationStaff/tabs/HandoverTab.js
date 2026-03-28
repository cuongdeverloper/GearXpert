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
import {
  getDeliveringRentals,
  getReturningRentals,
  confirmReturn,
} from "../../../service/ApiService/RentalApi";
import {
  createHandoverDraft,
  createHandoverRedelivery,
  getHandoverAttemptsByRental,
  startHandover,
  saveHandoverInspection,
  confirmHandoverSuccess,
  failHandover,
} from "../../../service/ApiService/HandoverApi";
import {
  createReturnDraft,
  getReturnRecordsByRental,
  startReturnRecord,
  saveReturnInspection,
  failReturnRecord,
  createReturnRetryAttempt,
} from "../../../service/ApiService/ReturnApi";
import { logOperationAction } from "../../../service/ApiService/OperationLogApi";
import { mapRentalCard, makeInspectionPayload } from "./handover/helpers";
import SuccessConfirmCard from "./handover/components/SuccessConfirmCard";
import FailureConfirmCard from "./handover/components/FailureConfirmCard";
import AttemptsHistory from "./handover/components/AttemptsHistory";
import DeviceChecklist from "./handover/components/DeviceChecklist";

const RETURN_FAILURE_OPTIONS = [
  { value: "CUSTOMER_NO_SHOW", label: "Khách không có mặt" },
  { value: "CUSTOMER_REJECT_RETURN", label: "Khách từ chối trả" },
  { value: "CONTACT_FAILED", label: "Không liên hệ được khách" },
  { value: "LOCATION_BLOCKED", label: "Không thể tiếp cận điểm thu hồi" },
  { value: "ORDER_CLOSED_ELSEWHERE", label: "Đơn đã đóng ở nhánh khác" },
  { value: "OTHER", label: "Khác" },
];

export default function HandoverTab({
  selectedRentalIdFromTask = "",
  selectedFlowContextFromTask = "DELIVERY",
  onConsumedSelectedRental,
}) {
  const account = useSelector((state) => state.user.account);
  const currentStaffId = account?.id;
  const [flowContext, setFlowContext] = useState(selectedFlowContextFromTask || "DELIVERY");
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
    signatureUrls: [],
    operatorNote: "",
    otpVerified: false,
  });

  const [failureForm, setFailureForm] = useState({
    reason: "",
    detail: "",
    noShowWaitMinutes: "",
    missingAccessories: "",
    mismatchedSerials: "",
    evidenceUrls: [],
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
    flowContext === "DELIVERY"
      ? selectedRental?.raw?.pickedUpAt && isAssignedToMe
      : isAssignedToMe
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
        attempt?.inspection?.checklist?.customerIdentityVerified ||
          attempt?.inspection?.checklist?.receivedAtAddress
      ),
      deliveryAddressMatched: Boolean(
        attempt?.inspection?.checklist?.deliveryAddressMatched ||
          attempt?.inspection?.checklist?.accessoriesChecked
      ),
      operatorNote: attempt?.inspection?.operatorNote || "",
      evidenceUrls: (attempt?.inspection?.evidenceUrls || []).join("\n"),
      items: sourceItems,
    }));
  }, []);

  const makeReturnInspectionPayload = useCallback(
    (attempt) => {
      const sourceItems =
        Array.isArray(inspectionForm.items) && inspectionForm.items.length > 0
          ? inspectionForm.items
          : attempt?.inspection?.items || attempt?.prefetchedSnapshot?.items || [];

      return {
        checklist: {
          customerPresent: Boolean(inspectionForm.customerPresent),
          receivedAtAddress: Boolean(inspectionForm.customerIdentityVerified),
          accessoriesChecked: Boolean(inspectionForm.deliveryAddressMatched),
        },
        items: sourceItems,
        operatorNote: inspectionForm.operatorNote || "",
        evidenceUrls: inspectionForm.evidenceUrls
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean),
      };
    },
    [inspectionForm]
  );

  const fetchRentals = useCallback(async () => {
    setLoadingRentals(true);
    try {
      const res =
        flowContext === "DELIVERY"
          ? await getDeliveringRentals()
          : await getReturningRentals();
      const mapped = (res?.rentals || []).map(mapRentalCard);
      const mineOnly = mapped.filter((item) => {
        const owner = item.raw?.assignedOperationStaffId?._id || item.raw?.assignedOperationStaffId;
        return owner && currentStaffId && String(owner) === String(currentStaffId);
      });
      setRentals(mineOnly);
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          (flowContext === "DELIVERY"
            ? "Không tải được danh sách đơn đang giao"
            : "Không tải được danh sách đơn đang thu hồi")
      );
    } finally {
      setLoadingRentals(false);
    }
  }, [currentStaffId, flowContext]);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  const fetchAttempts = useCallback(
    async (rentalId) => {
      if (!rentalId) return;
      setLoadingAttempts(true);
      try {
        const res =
          flowContext === "DELIVERY"
            ? await getHandoverAttemptsByRental(rentalId)
            : await getReturnRecordsByRental(rentalId);
        const data =
          flowContext === "DELIVERY"
            ? res?.handovers || []
            : res?.returnRecords || [];
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
    [hydrateInspectionFromAttempt, flowContext]
  );

  useEffect(() => {
    if (!selectedRentalIdFromTask) return;

    setFlowContext(selectedFlowContextFromTask || "DELIVERY");
    setSelectedRentalId(selectedRentalIdFromTask);
    fetchAttempts(selectedRentalIdFromTask);
    onConsumedSelectedRental?.();
  }, [
    selectedRentalIdFromTask,
    selectedFlowContextFromTask,
    fetchAttempts,
    onConsumedSelectedRental,
  ]);

  useEffect(() => {
    setResolutionMode("SUCCESS");
  }, [selectedRentalId, flowContext]);

  const handleSelectRental = async (rentalId) => {
    setSelectedRentalId(rentalId);
    await fetchAttempts(rentalId);
  };

  const ensureDraft = async () => {
    if (!selectedRentalId) return;

    setWorking(true);
    try {
      if (flowContext === "DELIVERY") {
        await createHandoverDraft(selectedRentalId, {});
      } else {
        await createReturnDraft(selectedRentalId, {});
      }
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
      if (flowContext === "DELIVERY") {
        await startHandover(activeAttempt.id);
      } else {
        await startReturnRecord(activeAttempt.id);
      }
      await fetchAttempts(selectedRentalId);
      alert(
        flowContext === "DELIVERY"
          ? "Biên bản đã chuyển sang trạng thái đang giao."
          : "Biên bản đã chuyển sang trạng thái đang thu hồi."
      );
    } catch (error) {
      alert(error?.response?.data?.message || "Không thể bắt đầu bàn giao");
    } finally {
      setWorking(false);
    }
  };

  const handleSaveInspection = async () => {
    if (!activeAttempt) return;

    const payload =
      flowContext === "DELIVERY"
        ? makeInspectionPayload(activeAttempt, inspectionForm)
        : makeReturnInspectionPayload(activeAttempt);
    setWorking(true);
    try {
      if (flowContext === "DELIVERY") {
        await saveHandoverInspection(activeAttempt.id, payload);
      } else {
        await saveReturnInspection(activeAttempt.id, payload);
      }
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

    const requiredChecklist = [
      ["customerPresent", "Khách có mặt"],
      ["customerIdentityVerified", "Xác minh danh tính"],
      ["deliveryAddressMatched", "Đúng địa chỉ giao"],
    ];
    const missingChecklist = requiredChecklist
      .filter(([key]) => !inspectionForm[key])
      .map(([, label]) => label);

    if (missingChecklist.length > 0) {
      alert(
        `Để xác nhận giao thành công, vui lòng hoàn tất Inspection Checklist: ${missingChecklist.join(", ")}.`
      );
      return;
    }

    if (!confirmForm.operatorNote?.trim()) {
      alert("Vui lòng ghi chú chi tiết kiểm tra thiết bị/phụ kiện.");
      return;
    }

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

    const inspection =
      flowContext === "DELIVERY"
        ? makeInspectionPayload(activeAttempt, inspectionForm)
        : makeReturnInspectionPayload(activeAttempt);

    setWorking(true);
    try {
      if (flowContext === "DELIVERY") {
        await confirmHandoverSuccess(activeAttempt.id, {
          inspection,
          customerConfirmation: {
            confirmed: true,
            confirmerName,
            confirmerPhone,
            signatureUrls: Array.isArray(confirmForm.signatureUrls)
              ? confirmForm.signatureUrls
              : [],
            operatorNote: confirmForm.operatorNote,
            otpVerified: Boolean(confirmForm.otpVerified),
          },
        });

        logOperationAction("HANDOVER_CONFIRM_SUCCESS", "RENTAL", selectedRentalId, {
          handoverId: activeAttempt.id,
          confirmerName,
          confirmerPhone,
        }).catch(() => {});
      } else {
        await confirmReturn(selectedRentalId);
        logOperationAction("RETURN_CONFIRM_SUCCESS", "RENTAL", selectedRentalId, {
          returnRecordId: activeAttempt.id,
          confirmerName,
          confirmerPhone,
        }).catch(() => {});
      }

      await fetchAttempts(selectedRentalId);
      await fetchRentals();
      alert(
        flowContext === "DELIVERY"
          ? "Xác nhận bàn giao thành công. Đơn đã chuyển RENTING."
          : "Xác nhận thu hồi thành công. Đơn đã hoàn tất."
      );
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          (flowContext === "DELIVERY"
            ? "Không thể xác nhận bàn giao thành công"
            : "Không thể xác nhận thu hồi thành công")
      );
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

    const inspection =
      flowContext === "DELIVERY"
        ? makeInspectionPayload(activeAttempt, inspectionForm)
        : makeReturnInspectionPayload(activeAttempt);

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
        evidenceUrls: Array.isArray(failureForm.evidenceUrls)
          ? failureForm.evidenceUrls
          : failureForm.evidenceUrls
              .split("\n")
              .map((x) => x.trim())
              .filter(Boolean),
        operatorNote: failureForm.operatorNote,
      },
    };

    setWorking(true);
    try {
      if (flowContext === "DELIVERY") {
        await failHandover(activeAttempt.id, payload);

        logOperationAction("HANDOVER_CONFIRM_FAILED", "RENTAL", selectedRentalId, {
          handoverId: activeAttempt.id,
          reason: failureForm.reason,
          detail: failureForm.detail,
        }).catch(() => {});
      } else {
        await failReturnRecord(activeAttempt.id, payload);
        logOperationAction("RETURN_CONFIRM_FAILED", "RENTAL", selectedRentalId, {
          returnRecordId: activeAttempt.id,
          reason: failureForm.reason,
          detail: failureForm.detail,
        }).catch(() => {});
      }

      await fetchAttempts(selectedRentalId);
      alert(
        flowContext === "DELIVERY"
          ? "Đã ghi nhận bàn giao thất bại và lưu bằng chứng."
          : "Đã ghi nhận thu hồi thất bại và lưu bằng chứng."
      );
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
      if (flowContext === "DELIVERY") {
        await createHandoverRedelivery(selectedRentalId, {});
      } else {
        await createReturnRetryAttempt(selectedRentalId, {});
      }
      await fetchAttempts(selectedRentalId);
      alert(
        flowContext === "DELIVERY"
          ? "Đã tạo attempt giao lại mới."
          : "Đã tạo attempt thu hồi lại mới."
      );
    } catch (error) {
      alert(
        error?.response?.data?.message ||
          (flowContext === "DELIVERY"
            ? "Không thể tạo attempt giao lại"
            : "Không thể tạo attempt thu hồi lại")
      );
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
              <ClipboardCheck size={20} className="text-primary" /> Biên bản
            </h2>
          </div>
          <button
            onClick={fetchRentals}
            className="px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            disabled={loadingRentals}
          >
            <RefreshCw size={15} className={loadingRentals ? "animate-spin" : ""} /> Làm mới
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm flex gap-2">
        <button
          type="button"
          onClick={() => {
            setFlowContext("DELIVERY");
            setSelectedRentalId("");
            setAttempts([]);
          }}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
            flowContext === "DELIVERY"
              ? "bg-indigo-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Biên bản bàn giao
        </button>
        <button
          type="button"
          onClick={() => {
            setFlowContext("RETURN");
            setSelectedRentalId("");
            setAttempts([]);
          }}
          className={`flex-1 px-3 py-2 rounded-xl text-sm font-semibold transition-colors ${
            flowContext === "RETURN"
              ? "bg-orange-600 text-white"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          Biên bản thu hồi
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 text-sm font-semibold text-slate-700">
            {flowContext === "DELIVERY" ? "Đơn đang giao" : "Đơn đang thu hồi"}
          </div>
          <div className="max-h-[65vh] overflow-y-auto p-3 space-y-2">
            {loadingRentals ? (
              <p className="text-sm text-slate-500 p-2">Đang tải...</p>
            ) : rentals.length === 0 ? (
              <p className="text-sm text-slate-500 p-2">
                {flowContext === "DELIVERY"
                  ? "Không có đơn DELIVERING."
                  : "Không có đơn RETURNING."}
              </p>
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
              {flowContext === "DELIVERY"
                ? "Chọn một đơn đang giao để xử lý biên bản bàn giao."
                : "Chọn một đơn đang thu hồi để xử lý biên bản thu hồi."}
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
                  {flowContext === "DELIVERY" ? "Bắt đầu giao" : "Bắt đầu thu hồi"}
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
                  {flowContext === "DELIVERY" ? "Tạo attempt giao lại" : "Tạo attempt thu hồi lại"}
                </button>
              </div>

              {!canProcessHandover && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 text-amber-700 px-3 py-2 text-sm font-medium">
                  {flowContext === "DELIVERY"
                    ? "Bạn chỉ có thể xử lý biên bản khi đơn đã được bạn nhận và đã xác nhận lấy hàng."
                    : "Bạn chỉ có thể xử lý biên bản khi đơn thu hồi đã được lock cho bạn."}
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

                <DeviceChecklist
                  items={selectedRental?.raw?.rentalItems?.map((item) => ({
                    rentalItemId: item._id,
                    deviceName: item.deviceId?.name || "Thiết bị",
                    expectedQuantity: item.quantity || 1,
                    expectedSerialNumbers:
                      item.deviceItemIds?.map((di) => di?.serialNumber).filter(Boolean) || [],
                  })) || []}
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
                    <CircleCheck size={16} />
                    {flowContext === "DELIVERY" ? "Giao thành công" : "Thu hồi thành công"}
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
                    {flowContext === "DELIVERY" ? "Giao thất bại" : "Thu hồi thất bại"}
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
                    contextType={flowContext}
                  />
                ) : (
                  <FailureConfirmCard
                    failureForm={failureForm}
                    setFailureForm={setFailureForm}
                    onFail={handleFail}
                    working={working}
                    activeAttempt={activeAttempt}
                    canProcessHandover={canProcessHandover}
                    contextType={flowContext}
                    failureOptions={flowContext === "DELIVERY" ? undefined : RETURN_FAILURE_OPTIONS}
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
