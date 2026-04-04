const mongoose = require("mongoose");
const Rental = require("../models/Rental");
const RentalItem = require("../models/RentalItem");
const DeliveryIssueReport = require("../models/DeliveryIssueReport");
const { HandoverRecord } = require("../models/HandoverRecord");
const {
  ReturnRecord,
  RETURN_RECORD_STATUS,
  RETURN_RECORD_RESULT,
  RETURN_FAILURE_REASON,
} = require("../models/ReturnRecord");

class DomainError extends Error {
  constructor(message, status = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "DomainError";
    this.status = status;
    this.code = code;
  }
}

const ACTIVE_STATUSES = [RETURN_RECORD_STATUS.DRAFT, RETURN_RECORD_STATUS.IN_PROGRESS];

/** .lean() + populate: ref có thể là subdoc {_id} hoặc ObjectId thuần */
const resolveRefId = (ref) => {
  if (ref == null) return null;
  if (typeof ref === "object" && ref._id != null) return ref._id;
  return ref;
};

const mapReturnFailureToIssueType = (reason) => {
  switch (reason) {
    case RETURN_FAILURE_REASON.MISSING_DEVICE:
      return "MISSING";
    case RETURN_FAILURE_REASON.DAMAGED_DEVICE:
      return "DAMAGED";
    case RETURN_FAILURE_REASON.CUSTOMER_REJECT_RETURN:
      return "WRONG_ITEM";
    case RETURN_FAILURE_REASON.CUSTOMER_UNAVAILABLE:
    case RETURN_FAILURE_REASON.WRONG_ADDRESS:
    case RETURN_FAILURE_REASON.CUSTOMER_NO_SHOW:
    case RETURN_FAILURE_REASON.CONTACT_FAILED:
    default:
      return "OTHER";
  }
};

const mapReturnFailureToLabel = (reason) => {
  switch (reason) {
    case RETURN_FAILURE_REASON.CUSTOMER_UNAVAILABLE:
      return "Khách vắng mặt / Không liên hệ được";
    case RETURN_FAILURE_REASON.WRONG_ADDRESS:
      return "Sai địa chỉ / Không tìm thấy vị trí";
    case RETURN_FAILURE_REASON.MISSING_DEVICE:
      return "Khách báo làm mất thiết bị";
    case RETURN_FAILURE_REASON.DAMAGED_DEVICE:
      return "Thiết bị hỏng hóc";
    case RETURN_FAILURE_REASON.OTHER:
      return "Lý do khác";
    case RETURN_FAILURE_REASON.CUSTOMER_NO_SHOW:
      return "Khách không có mặt";
    case RETURN_FAILURE_REASON.CUSTOMER_REJECT_RETURN:
      return "Khách từ chối trả";
    case RETURN_FAILURE_REASON.CONTACT_FAILED:
      return "Không liên hệ được khách";
    default:
      return "Khác";
  }
};

const ensureObjectId = (value, fieldName) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    throw new DomainError(`${fieldName} không hợp lệ`, 400, "INVALID_ID");
  }
};

const assertAssignableStaff = (record, staffId) => {
  if (!record.operatorStaffId) return;
  if (String(record.operatorStaffId) !== String(staffId)) {
    throw new DomainError("Biên bản thu hồi này thuộc operation staff khác", 403, "FORBIDDEN");
  }
};

const serialize = (record) => {
  const plain = typeof record.toObject === "function" ? record.toObject() : record;
  return {
    id: plain._id,
    rentalId: plain.rentalId,
    attemptNo: plain.attemptNo,
    status: plain.status,
    result: plain.result,
    operatorStaffId: plain.operatorStaffId,
    prefetchedSnapshot: plain.prefetchedSnapshot,
    inspection: plain.inspection,
    issue: plain.issue,
    failure: plain.failure,
    settlement: plain.settlement,
    startedAt: plain.startedAt,
    finishedAt: plain.finishedAt,
    voidedAt: plain.voidedAt,
    voidReason: plain.voidReason,
    createdAt: plain.createdAt,
    updatedAt: plain.updatedAt,
  };
};

const getNextAttemptNo = async (rentalId, session) => {
  let q = ReturnRecord.findOne({ rentalId })
    .sort({ attemptNo: -1 })
    .select("attemptNo");
  if (session) q = q.session(session);
  const latest = await q.lean();

  return (latest?.attemptNo || 0) + 1;
};

const mapRentalItemsToSnapshot = async (rentalId, session) => {
  let rq = RentalItem.find({ rentalId })
    .populate("deviceId", "name")
    .populate("deviceItemIds", "serialNumber");
  if (session) rq = rq.session(session);
  const rentalItems = await rq.lean();

  let hq = HandoverRecord.findOne({
    rentalId,
    status: "COMPLETED",
  })
    .sort({ attemptNo: -1 })
    .select("inspection.items");
  if (session) hq = hq.session(session);
  const latestHandover = await hq.lean();

  const handoverItemMap = new Map(
    (latestHandover?.inspection?.items || []).map((item) => [String(item.rentalItemId), item])
  );

  return rentalItems.map((item) => {
    const handoverItem = handoverItemMap.get(String(item._id));
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
      expectedQuantity: item.quantity || 1,
      expectedDeviceItemIds: Array.isArray(item.deviceItemIds)
        ? item.deviceItemIds.map((x) => resolveRefId(x)).filter(Boolean)
        : [],
      expectedSerialNumbers: Array.isArray(item.deviceItemIds)
        ? item.deviceItemIds
            .map((x) => (x && typeof x === "object" && x.serialNumber ? x.serialNumber : null))
            .filter(Boolean)
        : [],
      baselineCondition: handoverItem?.deviceCondition || "UNKNOWN",
      returnedDeviceItemIds: [],
      returnedSerialNumbers: [],
      accessories: Array.isArray(handoverItem?.accessories) ? handoverItem.accessories : [],
      returnCondition: "UNKNOWN",
      mismatchNote: "",
      operatorNote: "",
      evidenceUrls: [],
    };
  });
};

const validateInspectionPayload = (inspection) => {
  if (!inspection || typeof inspection !== "object") {
    throw new DomainError("inspection không hợp lệ", 400, "VALIDATION_ERROR");
  }
};

const assertRentalCanCreateReturnDraft = (rental) => {
  if (!rental) {
    throw new DomainError("Không tìm thấy rental", 404, "RENTAL_NOT_FOUND");
  }

  if (!["RETURNING", "INSPECTING"].includes(rental.status)) {
    throw new DomainError(
      "Rental chưa ở trạng thái phù hợp để tạo biên bản thu hồi",
      409,
      "INVALID_RENTAL_STATUS"
    );
  }
};

const ensureDraftForReturn = async ({ rentalId, staffId, actorId, session }) => {
  ensureObjectId(rentalId, "rentalId");
  if (staffId) ensureObjectId(staffId, "staffId");

  const sess = session || null;

  let rq = Rental.findById(rentalId);
  if (sess) rq = rq.session(sess);
  const rental = await rq.lean();
  assertRentalCanCreateReturnDraft(rental);

  let eq = ReturnRecord.findOne({
    rentalId,
    status: { $in: ACTIVE_STATUSES },
  }).sort({ attemptNo: -1 });
  if (sess) eq = eq.session(sess);
  const existing = await eq;

  if (existing) {
    return existing;
  }

  const attemptNo = await getNextAttemptNo(rentalId, sess);
  const snapshotItems = await mapRentalItemsToSnapshot(rentalId, sess);

  const createOpts = sess ? { session: sess } : {};
  try {
    const [created] = await ReturnRecord.create(
      [
        {
          rentalId,
          attemptNo,
          status: RETURN_RECORD_STATUS.DRAFT,
          operatorStaffId: staffId || rental.assignedOperationStaffId || undefined,
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
          inspection: {
            checklist: {
              customerPresent: false,
              receivedAtAddress: false,
              accessoriesChecked: false,
            },
            actualReturnedAt: null,
            isLateReturn: false,
            delayMinutes: 0,
            items: snapshotItems,
            operatorNote: "",
            evidenceUrls: [],
            requiresDeepInspection: false,
          },
          createdBy: actorId || staffId || rental.assignedOperationStaffId,
          updatedBy: actorId || staffId || rental.assignedOperationStaffId,
        },
      ],
      createOpts
    );

    return created;
  } catch (error) {
    if (error?.code === 11000) {
      const recovered = await ReturnRecord.findOne({
        rentalId,
        status: { $in: ACTIVE_STATUSES },
      })
        .sort({ attemptNo: -1 })
        .lean();
      if (recovered) return recovered;
    }
    throw error;
  }
};

const listByRental = async (rentalId) => {
  ensureObjectId(rentalId, "rentalId");
  return ReturnRecord.find({ rentalId }).sort({ attemptNo: -1 }).lean();
};

const getById = async (returnRecordId) => {
  ensureObjectId(returnRecordId, "returnRecordId");
  const record = await ReturnRecord.findById(returnRecordId);
  if (!record) {
    throw new DomainError("Không tìm thấy biên bản thu hồi", 404, "RETURN_RECORD_NOT_FOUND");
  }
  return record;
};

const startReturn = async ({ returnRecordId, staffId, actorId }) => {
  ensureObjectId(returnRecordId, "returnRecordId");
  ensureObjectId(staffId, "staffId");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const current = await ReturnRecord.findById(returnRecordId).session(session);
    if (!current) {
      throw new DomainError("Không tìm thấy biên bản thu hồi", 404, "RETURN_RECORD_NOT_FOUND");
    }

    assertAssignableStaff(current, staffId);

    if (current.status === RETURN_RECORD_STATUS.IN_PROGRESS) {
      await session.commitTransaction();
      return { idempotent: true, record: current };
    }

    if (current.status !== RETURN_RECORD_STATUS.DRAFT) {
      throw new DomainError("Biên bản không ở trạng thái DRAFT", 409, "INVALID_TRANSITION");
    }

    const updated = await ReturnRecord.findOneAndUpdate(
      { _id: returnRecordId, status: RETURN_RECORD_STATUS.DRAFT },
      {
        $set: {
          status: RETURN_RECORD_STATUS.IN_PROGRESS,
          operatorStaffId: current.operatorStaffId || staffId,
          startedAt: current.startedAt || new Date(),
          updatedBy: actorId || staffId,
        },
      },
      { new: true, session }
    );

    if (!updated) {
      throw new DomainError("Biên bản bị thay đổi đồng thời, vui lòng tải lại", 409, "STATE_RACE_CONFLICT");
    }

    const rentalItems = await RentalItem.find({ rentalId: current.rentalId })
      .select("_id deviceId")
      .session(session)
      .lean();

    const failureReasonLabel = mapReturnFailureToLabel(failure.reason);
    const issueType = mapReturnFailureToIssueType(failure.reason);

    await DeliveryIssueReport.create(
      [
        {
          rentalId: current.rentalId,
          rentalItemIds: rentalItems.map((item) => item._id),
          deviceIds: rentalItems.map((item) => item.deviceId).filter(Boolean),
          customerId: updated?.prefetchedSnapshot?.customerId,
          staffId,
          reportedBy: "STAFF",
          reportContext: "RETURN",
          issueType,
          description: [
            `Thu hồi thất bại: ${failureReasonLabel}`,
            failure.detail || "",
            failure.operatorNote || "",
          ]
            .filter(Boolean)
            .join(" | "),
          images: Array.isArray(failure.evidenceUrls) ? failure.evidenceUrls : [],
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

const saveInspection = async ({ returnRecordId, inspection, staffId, actorId }) => {
  ensureObjectId(returnRecordId, "returnRecordId");
  ensureObjectId(staffId, "staffId");
  validateInspectionPayload(inspection);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const current = await ReturnRecord.findById(returnRecordId).session(session);
    if (!current) {
      throw new DomainError("Không tìm thấy biên bản thu hồi", 404, "RETURN_RECORD_NOT_FOUND");
    }

    assertAssignableStaff(current, staffId);

    if (![RETURN_RECORD_STATUS.DRAFT, RETURN_RECORD_STATUS.IN_PROGRESS].includes(current.status)) {
      throw new DomainError("Biên bản không còn ở trạng thái chỉnh sửa", 409, "INVALID_TRANSITION");
    }

    const updated = await ReturnRecord.findOneAndUpdate(
      {
        _id: returnRecordId,
        status: { $in: [RETURN_RECORD_STATUS.DRAFT, RETURN_RECORD_STATUS.IN_PROGRESS] },
      },
      {
        $set: {
          inspection: {
            checklist: {
              customerPresent: Boolean(inspection?.checklist?.customerPresent),
              receivedAtAddress: Boolean(inspection?.checklist?.receivedAtAddress),
              accessoriesChecked: Boolean(inspection?.checklist?.accessoriesChecked),
            },
            actualReturnedAt: inspection?.actualReturnedAt || current.inspection?.actualReturnedAt || null,
            isLateReturn: Boolean(inspection?.isLateReturn),
            delayMinutes: Number(inspection?.delayMinutes || 0),
            items: Array.isArray(inspection?.items)
              ? inspection.items
              : current.inspection?.items || current.prefetchedSnapshot?.items || [],
            operatorNote: inspection?.operatorNote || "",
            evidenceUrls: Array.isArray(inspection?.evidenceUrls) ? inspection.evidenceUrls : [],
            requiresDeepInspection: Boolean(inspection?.requiresDeepInspection),
          },
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

const completeReturn = async ({ returnRecordId, inspection, settlement, staffId, actorId, session }) => {
  ensureObjectId(returnRecordId, "returnRecordId");
  ensureObjectId(staffId, "staffId");

  const dbSession = session || (await mongoose.startSession());
  const ownSession = !session;

  try {
    if (ownSession) dbSession.startTransaction();

    const current = await ReturnRecord.findById(returnRecordId).session(dbSession);
    if (!current) {
      throw new DomainError("Không tìm thấy biên bản thu hồi", 404, "RETURN_RECORD_NOT_FOUND");
    }

    assertAssignableStaff(current, staffId);

    if (current.status === RETURN_RECORD_STATUS.COMPLETED) {
      if (ownSession) await dbSession.commitTransaction();
      return { idempotent: true, record: current };
    }

    if (![RETURN_RECORD_STATUS.DRAFT, RETURN_RECORD_STATUS.IN_PROGRESS].includes(current.status)) {
      throw new DomainError("Biên bản không ở trạng thái hoàn tất", 409, "INVALID_TRANSITION");
    }

    const updated = await ReturnRecord.findOneAndUpdate(
      {
        _id: returnRecordId,
        status: { $in: [RETURN_RECORD_STATUS.DRAFT, RETURN_RECORD_STATUS.IN_PROGRESS] },
      },
      {
        $set: {
          status: RETURN_RECORD_STATUS.COMPLETED,
          result: RETURN_RECORD_RESULT.SUCCESS,
          inspection: inspection || current.inspection,
          settlement: settlement || current.settlement,
          startedAt: current.startedAt || new Date(),
          finishedAt: new Date(),
          updatedBy: actorId || staffId,
        },
      },
      { new: true, session: dbSession }
    );

    if (!updated) {
      throw new DomainError("Biên bản bị thay đổi đồng thời, vui lòng tải lại", 409, "STATE_RACE_CONFLICT");
    }

    if (ownSession) await dbSession.commitTransaction();
    return { idempotent: false, record: updated };
  } catch (error) {
    if (ownSession) await dbSession.abortTransaction();
    throw error;
  } finally {
    if (ownSession) dbSession.endSession();
  }
};

const reportIssue = async ({ returnRecordId, issue, inspection, staffId, actorId, session }) => {
  ensureObjectId(returnRecordId, "returnRecordId");
  ensureObjectId(staffId, "staffId");

  const dbSession = session || (await mongoose.startSession());
  const ownSession = !session;

  try {
    if (ownSession) dbSession.startTransaction();

    const current = await ReturnRecord.findById(returnRecordId).session(dbSession);
    if (!current) {
      throw new DomainError("Không tìm thấy biên bản thu hồi", 404, "RETURN_RECORD_NOT_FOUND");
    }

    assertAssignableStaff(current, staffId);

    if (current.status === RETURN_RECORD_STATUS.ISSUE_REPORTED) {
      if (ownSession) await dbSession.commitTransaction();
      return { idempotent: true, record: current };
    }

    if (![RETURN_RECORD_STATUS.DRAFT, RETURN_RECORD_STATUS.IN_PROGRESS].includes(current.status)) {
      throw new DomainError("Biên bản không còn ở trạng thái báo sự cố", 409, "INVALID_TRANSITION");
    }

    const updated = await ReturnRecord.findOneAndUpdate(
      {
        _id: returnRecordId,
        status: { $in: [RETURN_RECORD_STATUS.DRAFT, RETURN_RECORD_STATUS.IN_PROGRESS] },
      },
      {
        $set: {
          status: RETURN_RECORD_STATUS.ISSUE_REPORTED,
          result: RETURN_RECORD_RESULT.ISSUE,
          inspection: inspection || current.inspection,
          issue: {
            reportId: issue?.reportId,
            issueType: issue?.issueType,
            detail: issue?.detail || "",
            evidenceUrls: Array.isArray(issue?.evidenceUrls) ? issue.evidenceUrls : [],
            operatorNote: issue?.operatorNote || "",
            requiresDeepInspection: issue?.requiresDeepInspection !== false,
          },
          startedAt: current.startedAt || new Date(),
          finishedAt: new Date(),
          updatedBy: actorId || staffId,
        },
      },
      { new: true, session: dbSession }
    );

    if (!updated) {
      throw new DomainError("Biên bản bị thay đổi đồng thời, vui lòng tải lại", 409, "STATE_RACE_CONFLICT");
    }

    if (ownSession) await dbSession.commitTransaction();
    return { idempotent: false, record: updated };
  } catch (error) {
    if (ownSession) await dbSession.abortTransaction();
    throw error;
  } finally {
    if (ownSession) dbSession.endSession();
  }
};

const failReturn = async ({ returnRecordId, failure, inspection, staffId, actorId }) => {
  ensureObjectId(returnRecordId, "returnRecordId");
  ensureObjectId(staffId, "staffId");

  if (!failure?.reason || !Object.values(RETURN_FAILURE_REASON).includes(failure.reason)) {
    throw new DomainError("failure.reason không hợp lệ", 400, "VALIDATION_ERROR");
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const current = await ReturnRecord.findById(returnRecordId).session(session);
    if (!current) {
      throw new DomainError("Không tìm thấy biên bản thu hồi", 404, "RETURN_RECORD_NOT_FOUND");
    }

    assertAssignableStaff(current, staffId);

    if (current.status === RETURN_RECORD_STATUS.FAILED) {
      await session.commitTransaction();
      return { idempotent: true, record: current };
    }

    if (![RETURN_RECORD_STATUS.DRAFT, RETURN_RECORD_STATUS.IN_PROGRESS].includes(current.status)) {
      throw new DomainError("Biên bản không còn ở trạng thái fail", 409, "INVALID_TRANSITION");
    }

    const updated = await ReturnRecord.findOneAndUpdate(
      {
        _id: returnRecordId,
        status: { $in: [RETURN_RECORD_STATUS.DRAFT, RETURN_RECORD_STATUS.IN_PROGRESS] },
      },
      {
        $set: {
          status: RETURN_RECORD_STATUS.FAILED,
          result: RETURN_RECORD_RESULT.FAILED,
          inspection: inspection || current.inspection,
          failure: {
            reason: failure.reason,
            detail: failure.detail || "",
            evidenceUrls: Array.isArray(failure.evidenceUrls) ? failure.evidenceUrls : [],
            operatorNote: failure.operatorNote || "",
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

    const rental = await Rental.findById(updated.rentalId).session(session);
    if (!rental) {
      throw new DomainError("Không tìm thấy rental", 404, "RENTAL_NOT_FOUND");
    }

    rental.status = "PENDING_RESOLUTION";
    rental.inspectedContext = "RETURN";
    await rental.save({ session });

    const rentalItems = await RentalItem.find({ rentalId: updated.rentalId })
      .select("_id deviceId")
      .session(session)
      .lean();

    const failureReasonLabel = mapReturnFailureToLabel(failure.reason);
    const issueType = mapReturnFailureToIssueType(failure.reason);

    await DeliveryIssueReport.create(
      [
        {
          rentalId: updated.rentalId,
          rentalItemIds: rentalItems.map((item) => item._id),
          deviceIds: rentalItems.map((item) => item.deviceId).filter(Boolean),
          customerId: updated?.prefetchedSnapshot?.customerId,
          staffId,
          reportedBy: "STAFF",
          reportContext: "RETURN",
          issueType,
          description: [
            `Thu hồi thất bại: ${failureReasonLabel}`,
            failure.detail || "",
            failure.operatorNote || "",
          ]
            .filter(Boolean)
            .join(" | "),
          images: Array.isArray(failure.evidenceUrls) ? failure.evidenceUrls : [],
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

const createRetryAttempt = async ({ rentalId, staffId, actorId }) => {
  ensureObjectId(rentalId, "rentalId");
  ensureObjectId(staffId, "staffId");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const rental = await Rental.findById(rentalId).session(session).lean();
    if (!rental) {
      throw new DomainError("Không tìm thấy rental", 404, "RENTAL_NOT_FOUND");
    }

    if (rental.status !== "RETURNING") {
      throw new DomainError(
        "Chỉ có thể tạo retry attempt khi đơn đang ở trạng thái RETURNING",
        409,
        "INVALID_RENTAL_STATUS"
      );
    }

    const active = await ReturnRecord.findOne({
      rentalId,
      status: { $in: ACTIVE_STATUSES },
    })
      .session(session)
      .lean();

    if (active) {
      throw new DomainError("Đã có return attempt đang active", 409, "ACTIVE_ATTEMPT_EXISTS");
    }

    const attemptNo = await getNextAttemptNo(rentalId, session);
    const snapshotItems = await mapRentalItemsToSnapshot(rentalId, session);

    const [created] = await ReturnRecord.create(
      [
        {
          rentalId,
          attemptNo,
          status: RETURN_RECORD_STATUS.DRAFT,
          operatorStaffId: staffId,
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
          inspection: {
            checklist: {
              customerPresent: false,
              receivedAtAddress: false,
              accessoriesChecked: false,
            },
            actualReturnedAt: null,
            isLateReturn: false,
            delayMinutes: 0,
            items: snapshotItems,
            operatorNote: "",
            evidenceUrls: [],
            requiresDeepInspection: false,
          },
          createdBy: actorId || staffId,
          updatedBy: actorId || staffId,
        },
      ],
      { session }
    );

    await session.commitTransaction();
    return created;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const syncClosedRental = async ({ rentalId, reason, actorId }) => {
  ensureObjectId(rentalId, "rentalId");

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const rental = await Rental.findById(rentalId).session(session).lean();
    if (!rental) {
      throw new DomainError("Không tìm thấy rental", 404, "RENTAL_NOT_FOUND");
    }

    if (!["CANCELLED", "COMPLETED"].includes(rental.status)) {
      throw new DomainError(
        "Chỉ sync được rental đã đóng (CANCELLED/COMPLETED)",
        409,
        "INVALID_RENTAL_STATUS"
      );
    }

    const active = await ReturnRecord.findOne({
      rentalId,
      status: { $in: ACTIVE_STATUSES },
    }).session(session);

    if (!active) {
      await session.commitTransaction();
      return { updated: false, reason: "NO_ACTIVE_RECORD" };
    }

    active.status = RETURN_RECORD_STATUS.VOID;
    active.result = RETURN_RECORD_RESULT.VOID;
    active.voidReason = reason || `Rental đóng ở trạng thái ${rental.status}`;
    active.voidedAt = new Date();
    active.finishedAt = active.finishedAt || new Date();
    active.updatedBy = actorId;
    await active.save({ session });

    await session.commitTransaction();
    return { updated: true, record: active };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

module.exports = {
  DomainError,
  serialize,
  ensureDraftForReturn,
  listByRental,
  getById,
  startReturn,
  saveInspection,
  completeReturn,
  reportIssue,
  failReturn,
  createRetryAttempt,
  syncClosedRental,
  RETURN_RECORD_STATUS,
  RETURN_RECORD_RESULT,
  RETURN_FAILURE_REASON,
};
