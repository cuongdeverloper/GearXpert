import React, { useCallback, useMemo, useState, useEffect } from "react";
import { useSelector } from "react-redux";
import {
  ClipboardCheck,
  CircleCheck,
  CircleX,
  Package,
  RefreshCw,
  UserRound,
  MapPin,
  Phone,
  ShieldCheck,
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

const FAILURE_OPTIONS = [
  { value: "NO_SHOW", label: "Khách không có mặt" },
  { value: "CUSTOMER_REJECT", label: "Khách từ chối nhận" },
  { value: "MISSING_ACCESSORY", label: "Thiếu phụ kiện" },
  { value: "DEVICE_MISMATCH", label: "Sai thiết bị / sai serial" },
  { value: "DAMAGED_ITEM_AT_DELIVERY", label: "Thiết bị hư hỏng khi giao" },
  { value: "DELIVERY_BLOCKED", label: "Bị chặn giao / không thể tiếp cận" },
  { value: "OTHER", label: "Khác" },
];

const statusBadge = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
  VOID: "bg-amber-100 text-amber-700 border-amber-200",
};

const mapRentalCard = (rental) => {
  const firstItem = rental.rentalItems?.[0];
  const deviceName = firstItem?.deviceId?.name || "Thiết bị";
  const extraCount = (rental.rentalItems?.length || 0) - 1;

  return {
    id: rental._id,
    code: String(rental._id).slice(-6).toUpperCase(),
    customerName:
      rental.customerId?.fullName || rental.deliveryAddress?.receiverName || "Khách hàng",
    phone: rental.phoneNumber || "-",
    address: rental.deliveryAddress?.fullAddress || "-",
    deviceLabel:
      extraCount > 0 ? `${deviceName} (+${extraCount} thiết bị)` : deviceName,
    raw: rental,
  };
};

const makeInspectionPayload = (handover, inspectionForm) => {
  const fallbackItems = handover?.prefetchedSnapshot?.items || [];
  const currentItems =
    Array.isArray(inspectionForm.items) && inspectionForm.items.length > 0
      ? inspectionForm.items
      : fallbackItems;

  const items = currentItems.map((item) => ({
    rentalItemId: item.rentalItemId,
    deviceId: item.deviceId,
    deliveredDeviceItemIds: Array.isArray(item.deliveredDeviceItemIds)
      ? item.deliveredDeviceItemIds.filter(Boolean)
      : [],
    deliveredSerialNumbers: Array.isArray(item.deliveredSerialNumbers)
      ? item.deliveredSerialNumbers.filter(Boolean)
      : [],
    accessories: Array.isArray(item.accessories) ? item.accessories : [],
    deviceCondition: item.deviceCondition || "UNKNOWN",
    mismatchNote: item.mismatchNote || "",
    operatorNote: item.operatorNote || "",
    evidenceUrls: Array.isArray(item.evidenceUrls) ? item.evidenceUrls : [],
  }));

  return {
    checklist: {
      customerPresent: Boolean(inspectionForm.customerPresent),
      customerIdentityVerified: Boolean(inspectionForm.customerIdentityVerified),
      deliveryAddressMatched: Boolean(inspectionForm.deliveryAddressMatched),
    },
    items,
    operatorNote: inspectionForm.operatorNote || "",
    evidenceUrls: inspectionForm.evidenceUrls
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean),
  };
};

export default function HandoverTab({ selectedRentalIdFromTask = "", onConsumedSelectedRental }) {
  const account = useSelector((state) => state.user.account);
  const currentStaffId = account?.id;
  const [loadingRentals, setLoadingRentals] = useState(false);
  const [rentals, setRentals] = useState([]);
  const [selectedRentalId, setSelectedRentalId] = useState("");
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [attempts, setAttempts] = useState([]);
  const [working, setWorking] = useState(false);

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

    if (!confirmForm.confirmerName.trim()) {
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
          confirmerName: confirmForm.confirmerName.trim(),
          confirmerPhone: confirmForm.confirmerPhone.trim(),
          signatureUrl: confirmForm.signatureUrl.trim(),
          otpVerified: Boolean(confirmForm.otpVerified),
        },
      });

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
            <p className="text-sm text-slate-500 mt-1">
              Quản lý đầy đủ draft, kiểm tra thực tế, xác nhận khách hàng và lịch sử attempt.
            </p>
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="border border-emerald-200 bg-emerald-50 rounded-2xl p-4 space-y-3">
                  <p className="font-semibold text-emerald-800 flex items-center gap-2">
                    <ShieldCheck size={16} /> Xác nhận giao thành công
                  </p>
                  <input
                    value={confirmForm.confirmerName}
                    onChange={(e) =>
                      setConfirmForm((prev) => ({ ...prev, confirmerName: e.target.value }))
                    }
                    className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="Tên người nhận xác nhận"
                  />
                  <input
                    value={confirmForm.confirmerPhone}
                    onChange={(e) =>
                      setConfirmForm((prev) => ({ ...prev, confirmerPhone: e.target.value }))
                    }
                    className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="SĐT người xác nhận"
                  />
                  <input
                    value={confirmForm.signatureUrl}
                    onChange={(e) =>
                      setConfirmForm((prev) => ({ ...prev, signatureUrl: e.target.value }))
                    }
                    className="w-full border border-emerald-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="URL chữ ký / ảnh xác nhận"
                  />
                  <label className="text-sm text-emerald-900 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={confirmForm.otpVerified}
                      onChange={(e) =>
                        setConfirmForm((prev) => ({ ...prev, otpVerified: e.target.checked }))
                      }
                    />
                    OTP đã xác minh
                  </label>

                  <button
                    onClick={handleConfirmSuccess}
                    disabled={working || !activeAttempt || !canProcessHandover}
                    className="w-full px-3 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <CircleCheck size={15} /> Confirm Success
                    </span>
                  </button>
                </div>

                <div className="border border-red-200 bg-red-50 rounded-2xl p-4 space-y-3">
                  <p className="font-semibold text-red-800">Đánh dấu giao thất bại</p>
                  <select
                    value={failureForm.reason}
                    onChange={(e) =>
                      setFailureForm((prev) => ({ ...prev, reason: e.target.value }))
                    }
                    className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="">Chọn lý do thất bại</option>
                    {FAILURE_OPTIONS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                  <textarea
                    value={failureForm.detail}
                    onChange={(e) =>
                      setFailureForm((prev) => ({ ...prev, detail: e.target.value }))
                    }
                    rows={2}
                    className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="Mô tả chi tiết"
                  />
                  <input
                    value={failureForm.noShowWaitMinutes}
                    onChange={(e) =>
                      setFailureForm((prev) => ({ ...prev, noShowWaitMinutes: e.target.value }))
                    }
                    className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="No-show chờ bao nhiêu phút"
                  />
                  <input
                    value={failureForm.missingAccessories}
                    onChange={(e) =>
                      setFailureForm((prev) => ({ ...prev, missingAccessories: e.target.value }))
                    }
                    className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="Thiếu phụ kiện (ngăn cách dấu phẩy)"
                  />
                  <input
                    value={failureForm.mismatchedSerials}
                    onChange={(e) =>
                      setFailureForm((prev) => ({ ...prev, mismatchedSerials: e.target.value }))
                    }
                    className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="Serial sai (ngăn cách dấu phẩy)"
                  />
                  <textarea
                    value={failureForm.evidenceUrls}
                    onChange={(e) =>
                      setFailureForm((prev) => ({ ...prev, evidenceUrls: e.target.value }))
                    }
                    rows={2}
                    className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm"
                    placeholder="Evidence URL (mỗi dòng 1 link)"
                  />
                  <button
                    onClick={handleFail}
                    disabled={working || !activeAttempt || !canProcessHandover}
                    className="w-full px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                  >
                    <span className="inline-flex items-center gap-2">
                      <CircleX size={15} /> Confirm Failed
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-slate-800">Lịch sử attempts</h4>
                {loadingAttempts ? (
                  <p className="text-sm text-slate-500">Đang tải attempts...</p>
                ) : attempts.length === 0 ? (
                  <p className="text-sm text-slate-500">Chưa có biên bản nào.</p>
                ) : (
                  <div className="space-y-2">
                    {attempts.map((attempt) => (
                      <div
                        key={attempt.id}
                        className="rounded-xl border border-slate-200 p-3 flex items-start justify-between gap-3"
                      >
                        <div>
                          <p className="font-semibold text-slate-800 flex items-center gap-2">
                            <Package size={15} /> Attempt #{attempt.attemptNo}
                          </p>
                          <p className="text-sm text-slate-600 mt-1">
                            Kết quả: {attempt.result || "-"}
                            {attempt.failure?.reason ? ` | Lý do: ${attempt.failure.reason}` : ""}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-semibold border ${
                            statusBadge[attempt.status] || "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {attempt.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
