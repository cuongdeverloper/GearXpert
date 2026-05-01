/* eslint-disable react-hooks/exhaustive-deps */
import { useCallback } from "react";
import { toast } from "react-toastify";
import { confirmReturn } from "../../../../../service/ApiService/RentalApi";
import {
  createHandoverDraft,
  createHandoverRedelivery,
  startHandover,
  saveHandoverInspection,
  confirmHandoverSuccess,
  failHandover,
} from "../../../../../service/ApiService/HandoverApi";
import {
  createReturnDraft,
  saveReturnInspection,
  failReturnRecord,
  createReturnRetryAttempt,
} from "../../../../../service/ApiService/ReturnApi";
import { logOperationAction } from "../../../../../service/ApiService/OperationLogApi";
import { makeInspectionPayload } from "../helpers";

export default function useRecordActions({
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
}) {
  const ensureDraftForRental = useCallback(
    async (rentalId, options = {}) => {
      const { silent = false } = options;
      if (!rentalId) return null;

      if (flowContext === "DELIVERY") {
        await createHandoverDraft(rentalId, { deliveryTaskId: selectedRental?.raw?.deliveryTask?._id });
      } else {
        await createReturnDraft(rentalId, {});
      }

      const refreshed = await fetchAttempts(rentalId);
      const nextActive = refreshed.find((x) => ["DRAFT", "IN_PROGRESS"].includes(x.status)) || null;
      if (!silent) {
        toast.info("Đã chuẩn bị biên bản draft.");
      }
      return nextActive;
    },
    [flowContext, fetchAttempts]
  );

  const ensureStartedAttempt = useCallback(
    async (attempt) => {
      if (!attempt) return null;

      // Return flow allows DRAFT for save/fail/confirm, so skip explicit start API call.
      if (flowContext === "RETURN") {
        return attempt;
      }

      if (attempt.status === "IN_PROGRESS") return attempt;

      await startHandover(attempt.id);

      await fetchAttempts(selectedRentalId);
      return { ...attempt, status: "IN_PROGRESS" };
    },
    [flowContext, fetchAttempts, selectedRentalId]
  );

  const resolveReadyAttempt = useCallback(async () => {
    let attempt = activeAttempt;
    if (!attempt) {
      attempt = await ensureDraftForRental(selectedRentalId, { silent: true });
    }
    if (!attempt) return null;
    return ensureStartedAttempt(attempt);
  }, [activeAttempt, ensureDraftForRental, ensureStartedAttempt, selectedRentalId]);

  const handleSaveInspection = useCallback(async () => {
    setWorking(true);
    try {
      const attempt = await resolveReadyAttempt();
      if (!attempt) {
        toast.error("Không thể chuẩn bị biên bản để lưu kiểm tra.");
        return;
      }

      const payload =
        flowContext === "DELIVERY"
          ? makeInspectionPayload(attempt, inspectionForm)
          : makeReturnInspectionPayload(attempt);

      if (flowContext === "DELIVERY") {
        await saveHandoverInspection(attempt.id, payload);
      } else {
        await saveReturnInspection(attempt.id, payload);
      }
      await fetchAttempts(selectedRentalId);
      toast.success("Đã lưu kiểm tra thiết bị/phụ kiện.");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không lưu được kiểm tra");
    } finally {
      setWorking(false);
    }
  }, [
    resolveReadyAttempt,
    flowContext,
    inspectionForm,
    makeReturnInspectionPayload,
    setWorking,
    fetchAttempts,
    selectedRentalId,
  ]);

  const handleConfirmSuccess = useCallback(async () => {
    setWorking(true);
    try {
      const attempt = await resolveReadyAttempt();
      if (!attempt) {
        toast.error("Không thể chuẩn bị biên bản để xác nhận thành công.");
        return;
      }

      if (flowContext === "DELIVERY") {
        const requiredChecklist = [
          ["customerPresent", "Khách có mặt"],
          ["customerIdentityVerified", "Xác minh danh tính"],
          ["deliveryAddressMatched", "Đúng địa chỉ giao"],
        ];
        const missingChecklist = requiredChecklist
          .filter(([key]) => !inspectionForm[key])
          .map(([, label]) => label);

        if (missingChecklist.length > 0) {
          toast.error(
            `Để xác nhận giao thành công, vui lòng hoàn tất Inspection Checklist: ${missingChecklist.join(", ")}.`
          );
          return;
        }
      }

      if (!confirmForm.operatorNote?.trim()) {
        toast.error("Vui lòng ghi chú chi tiết kiểm tra thiết bị/phụ kiện.");
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
        toast.error("Vui lòng nhập tên người xác nhận nhận hàng.");
        return;
      }

      const inspection =
        flowContext === "DELIVERY"
          ? makeInspectionPayload(attempt, inspectionForm)
          : makeReturnInspectionPayload(attempt);

      // Bàn giao: ghi chú bắt buộc nằm ở confirmForm (SuccessConfirmCard), không phải inspectionForm.
      // Phải gộp vào inspection.operatorNote để backend lưu vào biên bản — phần thu hồi đọc inspection.operatorNote khi đối chiếu.
      const deliveryInspection =
        flowContext === "DELIVERY"
          ? {
              ...inspection,
              operatorNote:
                confirmForm.operatorNote?.trim() ||
                inspection.operatorNote ||
                "",
            }
          : inspection;

      if (flowContext === "DELIVERY") {
        const formData = new FormData();
        formData.append("inspection", JSON.stringify(deliveryInspection));
        formData.append(
          "customerConfirmation",
          JSON.stringify({
            confirmed: true,
            confirmerName,
            confirmerPhone,
            operatorNote: confirmForm.operatorNote,
            otpVerified: Boolean(confirmForm.otpVerified),
          })
        );
        (confirmForm.signatureFiles || []).forEach((file) => {
          formData.append("images", file);
        });

        await confirmHandoverSuccess(attempt.id, formData);

        logOperationAction("HANDOVER_CONFIRM_SUCCESS", "RENTAL", selectedRentalId, {
          handoverId: attempt.id,
          confirmerName,
          confirmerPhone,
        }).catch(() => {});
      } else {
        const formData = new FormData();
        formData.append(
          "inspection",
          JSON.stringify({
            ...inspection,
            evidenceUrls: [],
          })
        );
        formData.append(
          "settlement",
          JSON.stringify({
            operatorNote: confirmForm.operatorNote,
          })
        );
        (confirmForm.signatureFiles || []).forEach((file) => {
          formData.append("images", file);
        });

        await confirmReturn(selectedRentalId, formData);
        logOperationAction("RETURN_CONFIRM_SUCCESS", "RENTAL", selectedRentalId, {
          returnRecordId: attempt.id,
          confirmerName,
          confirmerPhone,
        }).catch(() => {});
      }

      await fetchAttempts(selectedRentalId);
      await fetchRentals();
      toast.success(
        flowContext === "DELIVERY"
          ? "Xác nhận bàn giao thành công. Đơn đã chuyển RENTING."
          : "Xác nhận thu hồi thành công. Đơn đã hoàn tất."
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          (flowContext === "DELIVERY"
            ? "Không thể xác nhận bàn giao thành công"
            : "Không thể xác nhận thu hồi thành công")
      );
    } finally {
      setWorking(false);
    }
  }, [
    resolveReadyAttempt,
    flowContext,
    inspectionForm,
    confirmForm,
    selectedRental,
    makeReturnInspectionPayload,
    setWorking,
    selectedRentalId,
    fetchAttempts,
    fetchRentals,
  ]);

  const handleFail = useCallback(async () => {
    setWorking(true);
    try {
      const attempt = await resolveReadyAttempt();
      if (!attempt) {
        toast.error("Không thể chuẩn bị biên bản để ghi nhận thất bại.");
        return;
      }

      if (!failureForm.reason) {
        toast.error("Vui lòng chọn lý do giao thất bại.");
        return;
      }

      const inspection =
        flowContext === "DELIVERY"
          ? makeInspectionPayload(attempt, inspectionForm)
          : makeReturnInspectionPayload(attempt);

      const baseFailurePayload = {
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
        operatorNote: failureForm.operatorNote,
      };

      const formData = new FormData();
      formData.append(
        "failure",
        JSON.stringify({
          ...baseFailurePayload,
          evidenceUrls: [],
        })
      );
      formData.append("inspection", JSON.stringify(inspection));
      (failureForm.evidenceFiles || []).forEach((file) => {
        formData.append("images", file);
      });

      if (flowContext === "DELIVERY") {
        await failHandover(attempt.id, formData);

        logOperationAction("HANDOVER_CONFIRM_FAILED", "RENTAL", selectedRentalId, {
          handoverId: attempt.id,
          customerName: selectedRental?.customerName || "Khách hàng",
          customerPhone: selectedRental?.phone || "-",
          reason: failureForm.reason,
          detail: failureForm.detail,
        }).catch(() => {});
      } else {
        await failReturnRecord(attempt.id, formData);
        logOperationAction("RETURN_CONFIRM_FAILED", "RENTAL", selectedRentalId, {
          returnRecordId: attempt.id,
          customerName: selectedRental?.customerName || "Khách hàng",
          customerPhone: selectedRental?.phone || "-",
          reason: failureForm.reason,
          detail: failureForm.detail,
          operatorNote: failureForm.operatorNote,
        }).catch(() => {});
      }

      await fetchAttempts(selectedRentalId);
      if (flowContext === "RETURN") {
        await fetchRentals();
      }
      toast.success(
        flowContext === "DELIVERY"
          ? "Đã ghi nhận bàn giao thất bại và lưu bằng chứng."
          : "Đã ghi nhận thu hồi thất bại và lưu bằng chứng."
      );
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể ghi nhận thất bại");
    } finally {
      setWorking(false);
    }
  }, [
    resolveReadyAttempt,
    flowContext,
    inspectionForm,
    makeReturnInspectionPayload,
    failureForm,
    setWorking,
    selectedRentalId,
    selectedRental,
    fetchAttempts,
    fetchRentals,
  ]);

  const handleCreateRedelivery = useCallback(async () => {
    if (!selectedRentalId) return;

    setWorking(true);
    try {
      if (flowContext === "DELIVERY") {
        await createHandoverRedelivery(selectedRentalId, {});
      } else {
        await createReturnRetryAttempt(selectedRentalId, {});
      }
      await fetchAttempts(selectedRentalId);
      toast.success(
        flowContext === "DELIVERY"
          ? "Đã tạo attempt giao lại mới."
          : "Đã tạo attempt thu hồi lại mới."
      );
    } catch (error) {
      toast.error(
        error?.response?.data?.message ||
          (flowContext === "DELIVERY"
            ? "Không thể tạo attempt giao lại"
            : "Không thể tạo attempt thu hồi lại")
      );
    } finally {
      setWorking(false);
    }
  }, [flowContext, selectedRentalId, setWorking, fetchAttempts]);

  return {
    ensureDraftForRental,
    handleSaveInspection,
    handleConfirmSuccess,
    handleFail,
    handleCreateRedelivery,
  };
}
