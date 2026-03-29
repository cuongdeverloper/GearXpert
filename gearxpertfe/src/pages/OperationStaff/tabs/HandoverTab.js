import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  ClipboardCheck,
  RefreshCw,
} from "lucide-react";
import {
  getDeliveringRentals,
  getReturningRentals,
} from "../../../service/ApiService/RentalApi";
import { getHandoverAttemptsByRental } from "../../../service/ApiService/HandoverApi";
import { getReturnRecordsByRental } from "../../../service/ApiService/ReturnApi";
import { mapRentalCard } from "./handover/helpers";
import DeliveryRecordPanel from "./handover/components/DeliveryRecordPanel";
import ReturnRecordPanel from "./handover/components/ReturnRecordPanel";
import RecordContextSidebar from "./handover/components/RecordContextSidebar";
import RecordFlowSwitch from "./handover/components/RecordFlowSwitch";
import useRecordActions from "./handover/hooks/useRecordActions";

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
    signatureFiles: [],
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
    evidenceFiles: [],
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
      if (!rentalId) return [];
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
        return data;
      } catch (error) {
        alert(error?.response?.data?.message || "Không tải được lịch sử bàn giao");
        return [];
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
    onConsumedSelectedRental?.();
  }, [
    selectedRentalIdFromTask,
    selectedFlowContextFromTask,
    onConsumedSelectedRental,
  ]);

  useEffect(() => {
    setResolutionMode("SUCCESS");
  }, [selectedRentalId, flowContext]);

  const {
    ensureDraftForRental,
    handleSaveInspection,
    handleConfirmSuccess,
    handleFail,
    handleCreateRedelivery,
  } = useRecordActions({
    flowContext,
    selectedRentalId,
    selectedRental,
    activeAttempt,
    inspectionForm,
    confirmForm,
    failureForm,
    makeReturnInspectionPayload,
    setWorking,
    fetchAttempts,
    fetchRentals,
  });

  const handleSelectRental = async (rentalId) => {
    setSelectedRentalId(rentalId);
    await ensureDraftForRental(rentalId, { silent: true });
  };

  useEffect(() => {
    if (!selectedRentalId) return;
    ensureDraftForRental(selectedRentalId, { silent: true });
  }, [selectedRentalId, ensureDraftForRental]);

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

      <RecordFlowSwitch
        flowContext={flowContext}
        setFlowContext={setFlowContext}
        setSelectedRentalId={setSelectedRentalId}
        setAttempts={setAttempts}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <RecordContextSidebar
          flowContext={flowContext}
          loadingRentals={loadingRentals}
          rentals={rentals}
          selectedRentalId={selectedRentalId}
          onSelectRental={handleSelectRental}
        />

        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-6">
          {flowContext === "DELIVERY" ? (
            <DeliveryRecordPanel
              selectedRental={selectedRental}
              selectedRentalId={selectedRentalId}
              working={working}
              loadingAttempts={loadingAttempts}
              attempts={attempts}
              activeAttempt={activeAttempt}
              isAssignedToMe={isAssignedToMe}
              canProcessHandover={canProcessHandover}
              resolutionMode={resolutionMode}
              setResolutionMode={setResolutionMode}
              inspectionForm={inspectionForm}
              setInspectionForm={setInspectionForm}
              handleSaveInspection={handleSaveInspection}
              handleCreateRedelivery={handleCreateRedelivery}
              confirmForm={confirmForm}
              setConfirmForm={setConfirmForm}
              handleConfirmSuccess={handleConfirmSuccess}
              failureForm={failureForm}
              setFailureForm={setFailureForm}
              handleFail={handleFail}
            />
          ) : (
            <ReturnRecordPanel
              selectedRental={selectedRental}
              selectedRentalId={selectedRentalId}
              working={working}
              loadingAttempts={loadingAttempts}
              attempts={attempts}
              activeAttempt={activeAttempt}
              isAssignedToMe={isAssignedToMe}
              canProcessHandover={canProcessHandover}
              resolutionMode={resolutionMode}
              setResolutionMode={setResolutionMode}
              handleSaveInspection={handleSaveInspection}
              handleCreateRedelivery={handleCreateRedelivery}
              confirmForm={confirmForm}
              setConfirmForm={setConfirmForm}
              handleConfirmSuccess={handleConfirmSuccess}
              failureForm={failureForm}
              setFailureForm={setFailureForm}
              handleFail={handleFail}
              returnFailureOptions={RETURN_FAILURE_OPTIONS}
            />
          )}
        </div>
      </div>
    </div>
  );
}
