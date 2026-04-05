const mongoose = require("mongoose");
const Rental = require("../models/Rental");
const RentalItem = require("../models/RentalItem");
const DeliveryTask = require("../models/DeliveryTask");
const DeviceItem = require("../models/DeviceItem");
const DeliveryIssueReport = require("../models/DeliveryIssueReport");
const {
  HandoverRecord,
  HANDOVER_STATUS,
  HANDOVER_RESULT,
  HANDOVER_FAILURE_REASON,
} = require("../models/HandoverRecord");

class DomainError extends Error {
  constructor(message, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "DomainError";
    this.status = status;
    this.code = code;
  }
}

const ensureObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new DomainError(`${fieldName} không hợp lệ`, 400, "INVALID_ID");
  }
};

const ACTIVE_HANDOVER_STATUSES = [HANDOVER_STATUS.DRAFT, HANDOVER_STATUS.IN_PROGRESS];
const FINAL_HANDOVER_STATUSES = [
  HANDOVER_STATUS.COMPLETED,
  HANDOVER_STATUS.FAILED,
  HANDOVER_STATUS.VOID,
];

const FAIL_REASON_NEEDS_DETAIL = new Set([
  HANDOVER_FAILURE_REASON.OTHER,
  HANDOVER_FAILURE_REASON.DELIVERY_BLOCKED,
]);

const mapFailureReasonToIssueType = (reason) => {
  switch (reason) {
    case HANDOVER_FAILURE_REASON.MISSING_ACCESSORY:
      return "MISSING";
    case HANDOVER_FAILURE_REASON.CUSTOMER_REJECT:
    case HANDOVER_FAILURE_REASON.DEVICE_MISMATCH:
      return "WRONG_ITEM";
    case HANDOVER_FAILURE_REASON.DAMAGED_ITEM_AT_DELIVERY:
      return "DAMAGED";
    default:
      return "OTHER";
  }
};

/**
 * Sau .lean() + .populate(), ref có thể là document { _id, ... } hoặc vẫn là ObjectId.
 * Dùng sai dạng khiến path?.._id = undefined và validate HandoverRecord fail.
 */
const resolveRefId = (ref) => {
  if (ref == null) return null;
  if (typeof ref === "object" && ref._id != null) return ref._id;
  return ref;
};

const mapFailureReasonToLabel = (reason) => {
  switch (reason) {
    case HANDOVER_FAILURE_REASON.NO_SHOW:
      return "Khách không có mặt";
    case HANDOVER_FAILURE_REASON.CUSTOMER_REJECT:
      return "Khách từ chối nhận";
    case HANDOVER_FAILURE_REASON.MISSING_ACCESSORY:
      return "Thiếu phụ kiện";
    case HANDOVER_FAILURE_REASON.DEVICE_MISMATCH:
      return "Sai thiết bị / sai serial";
    case HANDOVER_FAILURE_REASON.DAMAGED_ITEM_AT_DELIVERY:
      return "Thiết bị hư hỏng khi giao";
    case HANDOVER_FAILURE_REASON.DELIVERY_BLOCKED:
      return "Bị chặn giao / không thể tiếp cận";
    default:
      return "Khác";
  }
};

const mapRentalItemsToSnapshot = async (rentalId, session) => {
  let q = RentalItem.find({ rentalId })
    .populate("deviceId", "name")
    .populate("deviceItemIds", "serialNumber");
  if (session) q = q.session(session);
  const items = await q.lean();

  return items.map((item) => {
    const deviceId = resolveRefId(item.deviceId);
    const deviceDoc =
      item.deviceId && typeof item.deviceId === "object" && item.deviceId._id != null
        ? item.deviceId
        : null;

    if (!deviceId) {
      throw new DomainError(
        `Dòng đơn thiếu thiết bị (rentalItem ${item._id}). Kiểm tra RentalItem.deviceId.`,
        400,
        "INVALID_RENTAL_ITEM"
      );
    }

    return {
    rentalItemId: item._id,
    deviceId,
    deviceName: deviceDoc?.name || item.deviceSnapshot?.name || "Thiết bị",
    expectedQuantity: item.quantity,
    expectedDeviceItemIds:
      (item.deviceItemIds || []).map((x) => resolveRefId(x)).filter(Boolean),
    expectedSerialNumbers:
      (item.deviceItemIds || [])
        .map((x) => (x && typeof x === "object" && x.serialNumber ? x.serialNumber : null))
        .filter(Boolean),
    deliveredDeviceItemIds: [],
    deliveredSerialNumbers: [],
    accessories: [],
    deviceCondition: "UNKNOWN",
    mismatchNote: "",
    operatorNote: "",
    evidenceUrls: [],
    };
  });
};

const getNextAttemptNo = async (rentalId, session) => {
  let q = HandoverRecord.findOne({ rentalId })
    .sort({ attemptNo: -1 })
    .select("attemptNo");
  if (session) q = q.session(session);
  const latest = await q.lean();

  return (latest?.attemptNo || 0) + 1;
};

const resolveDeliveryTask = async (deliveryTaskId, session) => {
  if (!deliveryTaskId) return null;
  let q = DeliveryTask.findById(deliveryTaskId);
  if (session) q = q.session(session);
  const task = await q;
  if (!task) {
    throw new DomainError("Không tìm thấy delivery task", 404, "TASK_NOT_FOUND");
  }
  return task;
};

const serialize = (record) => {
  const plain = typeof record.toObject === "function" ? record.toObject() : record;
  return {
    id: plain._id,
    rentalId: plain.rentalId,
    deliveryTaskId: plain.deliveryTaskId,
    attemptNo: plain.attemptNo,
    status: plain.status,
    result: plain.result,
    operatorStaffId: plain.operatorStaffId,
    prefetchedSnapshot: plain.prefetchedSnapshot,
    inspection: plain.inspection,
    failure: plain.failure,
    customerConfirmation: plain.customerConfirmation,
    startedAt: plain.startedAt,
    finishedAt: plain.finishedAt,
    voidedAt: plain.voidedAt,
    voidReason: plain.voidReason,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

const assertAssignableStaff = (record, staffId) => {
  if (!record.operatorStaffId) return;
  if (String(record.operatorStaffId) !== String(staffId)) {
    throw new DomainError("Biên bản này thuộc operation staff khác", 403, "FORBIDDEN");
  }
};

const assertRentalCanStartHandover = (rental) => {
  if (!rental) {
    throw new DomainError("Không tìm thấy rental", 404, "RENTAL_NOT_FOUND");
  }

  if (rental.status !== "DELIVERING") {
    throw new DomainError(
      "Rental chưa ở trạng thái DELIVERING để tạo/khởi động biên bản",
      409,
      "INVALID_RENTAL_STATUS"
    );
  }
};

const ensureDraftForDelivery = async ({
  rentalId,
  deliveryTaskId,
  staffId,
  actorId,
  session,
}) => {
  ensureObjectId(rentalId, "rentalId");
  if (deliveryTaskId) ensureObjectId(deliveryTaskId, "deliveryTaskId");
  if (staffId) ensureObjectId(staffId, "staffId");

  /**
   * Không tự mở transaction khi không có session từ caller: trên Atlas dễ gặp
   * WriteConflict (112) / TransientTransactionError khi insert + unique index.
   */
  const sess = session || null;

  try {
    let rq = Rental.findById(rentalId);
    if (sess) rq = rq.session(sess);
    const rental = await rq.lean();
    assertRentalCanStartHandover(rental);

    const task = await resolveDeliveryTask(deliveryTaskId, sess);
    if (task && String(task.rentalId) !== String(rentalId)) {
      throw new DomainError("Delivery task không thuộc rental này", 400, "TASK_RENTAL_MISMATCH");
    }

    let eq = HandoverRecord.findOne({
      rentalId,
      status: { $in: ACTIVE_HANDOVER_STATUSES },
    }).sort({ attemptNo: -1 });
    if (sess) eq = eq.session(sess);
    const existingActive = await eq;

    if (existingActive) {
      return existingActive;
    }

    const attemptNo = await getNextAttemptNo(rentalId, sess);
    const snapshotItems = await mapRentalItemsToSnapshot(rentalId, sess);

    const createOpts = sess ? { session: sess } : {};
    const [created] = await HandoverRecord.create(
      [
        {
          rentalId,
          deliveryTaskId: task?._id,
          attemptNo,
          status: HANDOVER_STATUS.DRAFT,
          operatorStaffId: staffId || task?.deliveryStaffId || undefined,
          prefetchedSnapshot: {
            orderStatusAtDraft: rental.status,
            customerId: rental.customerId,
            supplierId: rental.supplierId,
            deliveryAddress: rental.deliveryAddress,
            phoneNumber: rental.phoneNumber,
            rentalStartDate: rental.rentalStartDate,
            rentalEndDate: rental.rentalEndDate,
            items: snapshotItems,
          },
          createdBy: actorId || staffId || task?.deliveryStaffId,
          updatedBy: actorId || staffId || task?.deliveryStaffId,
        },
      ],
      createOpts
    );

    return created;
  } catch (error) {
    if (error?.code === 11000) {
      const existingActive = await HandoverRecord.findOne({
        rentalId,
        status: { $in: ACTIVE_HANDOVER_STATUSES },
      })
        .sort({ attemptNo: -1 })
        .lean();

      if (existingActive) return existingActive;
    }

    throw error;
  }
};

const getDraftByTask = async ({ deliveryTaskId, staffId, actorId }) => {
  ensureObjectId(deliveryTaskId, "deliveryTaskId");

  const task = await DeliveryTask.findById(deliveryTaskId).lean();
  if (!task) {
    throw new DomainError("Không tìm thấy delivery task", 404, "TASK_NOT_FOUND");
  }

  if (
    task.deliveryStaffId &&
    String(task.deliveryStaffId) !== String(staffId)
  ) {
    throw new DomainError("Bạn không được phân công task này", 403, "FORBIDDEN");
  }

  const draft = await ensureDraftForDelivery({
    rentalId: task.rentalId,
    deliveryTaskId: task._id,
    staffId,
    actorId,
  });

  return draft;
};

const getById = async (handoverId) => {
  ensureObjectId(handoverId, "handoverId");
  const record = await HandoverRecord.findById(handoverId)
    .populate({
      path: "rentalId",
      populate: {
        path: "customerId",
        select: "fullName phoneNumber",
      },
    })
    .populate("prefetchedSnapshot.customerId", "fullName phoneNumber")
    .lean();
  if (!record) {
    throw new DomainError("Không tìm thấy biên bản bàn giao", 404, "HANDOVER_NOT_FOUND");
  }
  return record;
};

const listByRental = async (rentalId) => {
  ensureObjectId(rentalId, "rentalId");
  const list = await HandoverRecord.find({ rentalId })
    .sort({ attemptNo: -1 })
    .lean();
  return list;
};

const startHandover = async ({ handoverId, staffId, actorId }) => {
  ensureObjectId(handoverId, "handoverId");
  ensureObjectId(staffId, "staffId");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const current = await HandoverRecord.findById(handoverId).session(session);
    if (!current) {
      throw new DomainError("Không tìm thấy biên bản bàn giao", 404, "HANDOVER_NOT_FOUND");
    }

    assertAssignableStaff(current, staffId);

    if (current.status === HANDOVER_STATUS.IN_PROGRESS) {
      await session.commitTransaction();
      return { idempotent: true, record: current };
    }

    if (FINAL_HANDOVER_STATUSES.includes(current.status)) {
      throw new DomainError("Biên bản đã kết thúc, không thể bắt đầu lại", 409, "INVALID_TRANSITION");
    }

    const rental = await Rental.findById(current.rentalId).session(session);
    assertRentalCanStartHandover(rental);

    const updated = await HandoverRecord.findOneAndUpdate(
      {
        _id: handoverId,
        status: HANDOVER_STATUS.DRAFT,
      },
      {
        $set: {
          status: HANDOVER_STATUS.IN_PROGRESS,
          startedAt: new Date(),
          operatorStaffId: current.operatorStaffId || staffId,
          updatedBy: actorId || staffId,
        },
      },
      { new: true, session }
    );

    if (!updated) {
      const latest = await HandoverRecord.findById(handoverId).session(session);
      if (latest && latest.status === HANDOVER_STATUS.IN_PROGRESS) {
        await session.commitTransaction();
        return { idempotent: true, record: latest };
      }
      throw new DomainError("Không thể chuyển biên bản sang IN_PROGRESS", 409, "STATE_RACE_CONFLICT");
    }

    await session.commitTransaction();
    return { idempotent: false, record: updated };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const validateInspectionPayload = (inspection) => {
  if (!inspection || typeof inspection !== "object") {
    throw new DomainError("inspection payload là bắt buộc", 400, "VALIDATION_ERROR");
  }

  const items = Array.isArray(inspection.items) ? inspection.items : [];
  if (items.length === 0) {
    throw new DomainError("inspection.items phải có ít nhất 1 item", 400, "VALIDATION_ERROR");
  }

  for (const item of items) {
    if (!item.rentalItemId || !item.deviceId) {
      throw new DomainError("inspection.items thiếu rentalItemId hoặc deviceId", 400, "VALIDATION_ERROR");
    }
  }
};

const saveInspection = async ({ handoverId, inspection, staffId, actorId }) => {
  ensureObjectId(handoverId, "handoverId");
  ensureObjectId(staffId, "staffId");
  validateInspectionPayload(inspection);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const current = await HandoverRecord.findById(handoverId).session(session);
    if (!current) {
      throw new DomainError("Không tìm thấy biên bản bàn giao", 404, "HANDOVER_NOT_FOUND");
    }

    assertAssignableStaff(current, staffId);

    if (FINAL_HANDOVER_STATUSES.includes(current.status)) {
      throw new DomainError("Biên bản đã kết thúc, không thể cập nhật inspection", 409, "INVALID_TRANSITION");
    }

    const rental = await Rental.findById(current.rentalId).session(session);
    if (!rental || ["CANCELLED", "COMPLETED"].includes(rental.status)) {
      throw new DomainError("Rental đã kết thúc/cancel, không thể cập nhật inspection", 409, "RENTAL_FINALIZED");
    }

    const normalized = {
      checklist: {
        customerPresent: Boolean(inspection.checklist?.customerPresent),
        customerIdentityVerified: Boolean(inspection.checklist?.customerIdentityVerified),
        deliveryAddressMatched: Boolean(inspection.checklist?.deliveryAddressMatched),
      },
      items: inspection.items,
      operatorNote: inspection.operatorNote || "",
      evidenceUrls: Array.isArray(inspection.evidenceUrls) ? inspection.evidenceUrls : [],
    };

    const updated = await HandoverRecord.findOneAndUpdate(
      { _id: handoverId, status: { $in: [HANDOVER_STATUS.DRAFT, HANDOVER_STATUS.IN_PROGRESS] } },
      {
        $set: {
          inspection: normalized,
          status: HANDOVER_STATUS.IN_PROGRESS,
          startedAt: current.startedAt || new Date(),
          operatorStaffId: current.operatorStaffId || staffId,
          updatedBy: actorId || staffId,
        },
      },
      { new: true, session }
    );

    if (!updated) {
      throw new DomainError("Biên bản bị thay đổi đồng thời, vui lòng tải lại", 409, "STATE_RACE_CONFLICT");
    }

    await session.commitTransaction();
    return updated;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const ensureDeliverySerialsExist = async (inspectionItems, session) => {
  const ids = [];
  for (const item of inspectionItems) {
    if (Array.isArray(item.deliveredDeviceItemIds)) {
      ids.push(...item.deliveredDeviceItemIds);
    }
  }

  if (ids.length === 0) return;

  const uniqueIds = [...new Set(ids.map((id) => String(id)))];
  const existed = await DeviceItem.countDocuments({ _id: { $in: uniqueIds } }).session(session);
  if (existed !== uniqueIds.length) {
    throw new DomainError("Có deliveredDeviceItemIds không tồn tại", 400, "INVALID_DEVICE_ITEM");
  }
};

const confirmSuccess = async ({
  handoverId,
  customerConfirmation,
  inspection,
  staffId,
  actorId,
}) => {
  ensureObjectId(handoverId, "handoverId");
  ensureObjectId(staffId, "staffId");

  if (!customerConfirmation?.confirmed) {
    throw new DomainError("Thiếu xác nhận nhận hàng từ khách", 400, "VALIDATION_ERROR");
  }

  if (!customerConfirmation?.confirmerName) {
    throw new DomainError("confirmerName là bắt buộc", 400, "VALIDATION_ERROR");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const current = await HandoverRecord.findById(handoverId).session(session);
    if (!current) {
      throw new DomainError("Không tìm thấy biên bản bàn giao", 404, "HANDOVER_NOT_FOUND");
    }

    assertAssignableStaff(current, staffId);

    if (current.status === HANDOVER_STATUS.COMPLETED) {
      await session.commitTransaction();
      return { idempotent: true, record: current };
    }

    if ([HANDOVER_STATUS.FAILED, HANDOVER_STATUS.VOID].includes(current.status)) {
      throw new DomainError("Biên bản đã FAILED/VOID, không thể confirm success", 409, "INVALID_TRANSITION");
    }

    const inspectionData = inspection || current.inspection;
    validateInspectionPayload(inspectionData);
    await ensureDeliverySerialsExist(inspectionData.items, session);

    const rentalUpdate = await Rental.updateOne(
      { _id: current.rentalId, status: "DELIVERING" },
      {
        $set: {
          status: "RENTING",
          deliveredAt: new Date(),
        },
      },
      { session }
    );

    if (rentalUpdate.modifiedCount === 0) {
      const rental = await Rental.findById(current.rentalId).session(session).lean();

      if (rental?.status === "RENTING") {
        const refreshed = await HandoverRecord.findById(handoverId).session(session);
        if (refreshed?.status === HANDOVER_STATUS.COMPLETED) {
          await session.commitTransaction();
          return { idempotent: true, record: refreshed };
        }
      }

      if (rental?.status === "CANCELLED") {
        throw new DomainError("Rental đã bị cancel trong lúc xác nhận bàn giao", 409, "RENTAL_CANCELED");
      }

      throw new DomainError("Rental không còn ở trạng thái DELIVERING", 409, "INVALID_RENTAL_STATUS");
    }

    const updated = await HandoverRecord.findOneAndUpdate(
      {
        _id: handoverId,
        status: { $in: [HANDOVER_STATUS.DRAFT, HANDOVER_STATUS.IN_PROGRESS] },
      },
      {
        $set: {
          status: HANDOVER_STATUS.COMPLETED,
          result: HANDOVER_RESULT.SUCCESS,
          inspection: inspectionData,
          customerConfirmation: {
            confirmed: true,
            confirmedAt: customerConfirmation.confirmedAt || new Date(),
            confirmerName: customerConfirmation.confirmerName,
            confirmerPhone: customerConfirmation.confirmerPhone || "",
            operatorNote: (customerConfirmation.operatorNote || "").trim(),
            signatureUrl: customerConfirmation.signatureUrl || "",
            otpVerified: Boolean(customerConfirmation.otpVerified),
          },
          startedAt: current.startedAt || new Date(),
          finishedAt: new Date(),
          updatedBy: actorId || staffId,
        },
      },
      { new: true, session }
    );

    if (!updated) {
      throw new DomainError("Biên bản bị thay đổi đồng thời, vui lòng tải lại", 409, "STATE_RACE_CONFLICT");
    }

    await session.commitTransaction();
    return { idempotent: false, record: updated };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const failHandover = async ({
  handoverId,
  failure,
  inspection,
  staffId,
  actorId,
}) => {
  ensureObjectId(handoverId, "handoverId");
  ensureObjectId(staffId, "staffId");

  if (!failure?.reason) {
    throw new DomainError("failure.reason là bắt buộc", 400, "VALIDATION_ERROR");
  }

  if (!Object.values(HANDOVER_FAILURE_REASON).includes(failure.reason)) {
    throw new DomainError("failure.reason không hợp lệ", 400, "VALIDATION_ERROR");
  }

  if (FAIL_REASON_NEEDS_DETAIL.has(failure.reason) && !failure.detail?.trim()) {
    throw new DomainError("failure.detail là bắt buộc cho reason đã chọn", 400, "VALIDATION_ERROR");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const current = await HandoverRecord.findById(handoverId).session(session);
    if (!current) {
      throw new DomainError("Không tìm thấy biên bản bàn giao", 404, "HANDOVER_NOT_FOUND");
    }

    assertAssignableStaff(current, staffId);

    if (current.status === HANDOVER_STATUS.FAILED) {
      await session.commitTransaction();
      return { idempotent: true, record: current };
    }

    if ([HANDOVER_STATUS.COMPLETED, HANDOVER_STATUS.VOID].includes(current.status)) {
      throw new DomainError("Biên bản đã COMPLETED/VOID, không thể fail", 409, "INVALID_TRANSITION");
    }

    if (inspection) {
      validateInspectionPayload(inspection);
      await ensureDeliverySerialsExist(inspection.items, session);
    }

    const normalizedFailure = {
      reason: failure.reason,
      detail: failure.detail || "",
      noShowWaitMinutes:
        failure.reason === HANDOVER_FAILURE_REASON.NO_SHOW
          ? Number(failure.noShowWaitMinutes || 0)
          : undefined,
      missingAccessories: Array.isArray(failure.missingAccessories)
        ? failure.missingAccessories
        : [],
      mismatchedSerials: Array.isArray(failure.mismatchedSerials)
        ? failure.mismatchedSerials
        : [],
      damagedItems: Array.isArray(failure.damagedItems) ? failure.damagedItems : [],
      evidenceUrls: Array.isArray(failure.evidenceUrls) ? failure.evidenceUrls : [],
      operatorNote: failure.operatorNote || "",
    };

    const updated = await HandoverRecord.findOneAndUpdate(
      {
        _id: handoverId,
        status: { $in: [HANDOVER_STATUS.DRAFT, HANDOVER_STATUS.IN_PROGRESS] },
      },
      {
        $set: {
          status: HANDOVER_STATUS.FAILED,
          result: HANDOVER_RESULT.FAILED,
          failure: normalizedFailure,
          inspection: inspection || current.inspection,
          customerConfirmation: {
            confirmed: false,
          },
          startedAt: current.startedAt || new Date(),
          finishedAt: new Date(),
          updatedBy: actorId || staffId,
        },
      },
      { new: true, session }
    );

    if (!updated) {
      throw new DomainError("Biên bản bị thay đổi đồng thời, vui lòng tải lại", 409, "STATE_RACE_CONFLICT");
    }

    await Rental.updateOne(
      {
        _id: current.rentalId,
        status: { $nin: ["CANCELLED", "COMPLETED"] },
      },
      {
        $set: {
          status: "PENDING_RESOLUTION",
        },
      },
      { session }
    );

    const rentalItems = await RentalItem.find({ rentalId: current.rentalId })
      .select("_id deviceId deviceItemIds")
      .session(session)
      .lean();

    const deviceItemIdsToUpdate = rentalItems.flatMap(item => item.deviceItemIds || []);
    if (deviceItemIdsToUpdate.length > 0) {
      await mongoose.model("DeviceItem").updateMany(
        { _id: { $in: deviceItemIdsToUpdate } },
        { $set: { status: "PENDING_RESOLUTION" } },
        { session }
      );
      // Manually trigger count sync since updateMany with _id bypasses the deviceId hook
      const uniqueDeviceIds = [...new Set(rentalItems.map(i => i.deviceId?.toString()).filter(Boolean))];
      for (const dId of uniqueDeviceIds) {
        await mongoose.model("DeviceItem").updateDeviceCounts(dId, session);
      }
    }

    const issueType = mapFailureReasonToIssueType(normalizedFailure.reason);
    const failureReasonLabel = mapFailureReasonToLabel(normalizedFailure.reason);
    const descriptionParts = [
      `Đơn hàng không thành công vì lý do: ${failureReasonLabel}`,
      normalizedFailure.detail,
      normalizedFailure.operatorNote,
      normalizedFailure.noShowWaitMinutes
        ? `No-show chờ ${normalizedFailure.noShowWaitMinutes} phút`
        : "",
    ].filter(Boolean);

    await DeliveryIssueReport.create(
      [
        {
          rentalId: current.rentalId,
          rentalItemIds: rentalItems.map((item) => item._id),
          deviceIds: rentalItems.map((item) => item.deviceId).filter(Boolean),
          customerId: updated?.prefetchedSnapshot?.customerId,
          staffId,
          reportedBy: "STAFF",
          reportContext: "DELIVERY",
          issueType,
          description: descriptionParts.join(" | "),
          images: normalizedFailure.evidenceUrls,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return { idempotent: false, record: updated };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const createRedeliveryAttempt = async ({
  rentalId,
  deliveryTaskId,
  staffId,
  actorId,
}) => {
  ensureObjectId(rentalId, "rentalId");
  if (deliveryTaskId) ensureObjectId(deliveryTaskId, "deliveryTaskId");
  ensureObjectId(staffId, "staffId");

  const rental = await Rental.findById(rentalId).lean();
  if (!rental) {
    throw new DomainError("Không tìm thấy rental", 404, "RENTAL_NOT_FOUND");
  }

  if (["CANCELLED", "COMPLETED", "RENTING"].includes(rental.status)) {
    throw new DomainError(
      "Rental đang ở trạng thái không thể tạo redelivery",
      409,
      "INVALID_RENTAL_STATUS"
    );
  }

  const active = await HandoverRecord.findOne({
    rentalId,
    status: { $in: ACTIVE_HANDOVER_STATUSES },
  }).lean();

  if (active) {
    throw new DomainError("Đã có handover attempt đang active", 409, "ACTIVE_ATTEMPT_EXISTS");
  }

  const task = await resolveDeliveryTask(deliveryTaskId, null);
  if (task && String(task.rentalId) !== String(rentalId)) {
    throw new DomainError("Delivery task không thuộc rental này", 400, "TASK_RENTAL_MISMATCH");
  }

  const attemptNo = await getNextAttemptNo(rentalId, null);
  const snapshotItems = await mapRentalItemsToSnapshot(rentalId, null);

  try {
    const [created] = await HandoverRecord.create([
      {
        rentalId,
        deliveryTaskId: task?._id,
        attemptNo,
        status: HANDOVER_STATUS.DRAFT,
        operatorStaffId: staffId || task?.deliveryStaffId || undefined,
        prefetchedSnapshot: {
          orderStatusAtDraft: rental.status,
          customerId: rental.customerId,
          supplierId: rental.supplierId,
          deliveryAddress: rental.deliveryAddress,
          phoneNumber: rental.phoneNumber,
          rentalStartDate: rental.rentalStartDate,
          rentalEndDate: rental.rentalEndDate,
          items: snapshotItems,
        },
        createdBy: actorId || staffId || task?.deliveryStaffId,
        updatedBy: actorId || staffId || task?.deliveryStaffId,
      },
    ]);

    return created;
  } catch (error) {
    if (error?.code === 11000) {
      const recovered = await HandoverRecord.findOne({
        rentalId,
        status: { $in: ACTIVE_HANDOVER_STATUSES },
      })
        .sort({ attemptNo: -1 })
        .lean();
      if (recovered) return recovered;
    }
    throw error;
  }
};

const syncCancelledRental = async ({ rentalId, actorId }) => {
  ensureObjectId(rentalId, "rentalId");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const rental = await Rental.findById(rentalId).session(session).lean();
    if (!rental) {
      throw new DomainError("Không tìm thấy rental", 404, "RENTAL_NOT_FOUND");
    }

    if (rental.status !== "CANCELLED") {
      throw new DomainError("Chỉ sync cancel cho rental có status CANCELLED", 409, "INVALID_RENTAL_STATUS");
    }

    const now = new Date();

    await HandoverRecord.updateMany(
      {
        rentalId,
        status: HANDOVER_STATUS.DRAFT,
      },
      {
        $set: {
          status: HANDOVER_STATUS.VOID,
          result: HANDOVER_RESULT.VOID,
          voidReason: "Rental canceled before handover started",
          voidedAt: now,
          updatedBy: actorId,
        },
      },
      { session }
    );

    await HandoverRecord.updateMany(
      {
        rentalId,
        status: HANDOVER_STATUS.IN_PROGRESS,
      },
      {
        $set: {
          status: HANDOVER_STATUS.FAILED,
          result: HANDOVER_RESULT.FAILED,
          failure: {
            reason: HANDOVER_FAILURE_REASON.ORDER_CANCELED,
            detail: "Rental canceled while handover in progress",
            evidenceUrls: [],
            missingAccessories: [],
            mismatchedSerials: [],
            damagedItems: [],
            operatorNote: "Auto-closed by system",
          },
          finishedAt: now,
          updatedBy: actorId,
        },
      },
      { session }
    );

    await session.commitTransaction();

    return {
      success: true,
      message: "Đã đồng bộ handover records theo trạng thái CANCELLED của rental",
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  DomainError,
  HANDOVER_STATUS,
  HANDOVER_RESULT,
  HANDOVER_FAILURE_REASON,
  serialize,
  ensureDraftForDelivery,
  getDraftByTask,
  getById,
  listByRental,
  startHandover,
  saveInspection,
  confirmSuccess,
  failHandover,
  createRedeliveryAttempt,
  syncCancelledRental,
};
