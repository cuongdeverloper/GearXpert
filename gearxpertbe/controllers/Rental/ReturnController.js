const {
  DomainError,
  serialize,
  ensureDraftForReturn,
  getById,
  listByRental,
  startReturn,
  saveInspection,
  completeReturn,
  failReturn,
  createRetryAttempt,
  syncClosedRental,
} = require("../../services/ReturnService");

const tryParseJsonField = (value) => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return value;
  }
};

const sendError = (res, error) => {
  if (error instanceof DomainError) {
    return res.status(error.status).json({
      success: false,
      code: error.code,
      message: error.message,
    });
  }

  console.error("ReturnRecord error:", error);
  return res.status(500).json({
    success: false,
    code: "INTERNAL_ERROR",
    message: "Internal server error",
  });
};

const requireRole = (req, allowedRoles) => {
  const role = req.user?.role;
  if (!role || !allowedRoles.includes(role)) {
    throw new DomainError("Bạn không có quyền thực hiện thao tác này", 403, "FORBIDDEN");
  }
};

exports.createDraftForRental = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN"]);

    const record = await ensureDraftForReturn({
      rentalId: req.params.rentalId,
      staffId: req.body?.staffId || req.user.id,
      actorId: req.user.id,
    });

    return res.status(201).json({ success: true, returnRecord: serialize(record) });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.getById = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN", "SUPPLIER"]);

    const record = await getById(req.params.returnRecordId);

    if (
      req.user.role === "OPERATION_STAFF" &&
      record.operatorStaffId &&
      String(record.operatorStaffId) !== String(req.user.id)
    ) {
      throw new DomainError("Bạn không có quyền xem biên bản này", 403, "FORBIDDEN");
    }

    return res.status(200).json({ success: true, returnRecord: serialize(record) });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.listByRental = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN", "SUPPLIER"]);
    const list = await listByRental(req.params.rentalId);
    return res.status(200).json({ success: true, returnRecords: list.map(serialize) });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.start = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN"]);
    const result = await startReturn({
      returnRecordId: req.params.returnRecordId,
      staffId: req.user.id,
      actorId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      idempotent: result.idempotent,
      returnRecord: serialize(result.record),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.saveInspection = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN"]);

    const record = await saveInspection({
      returnRecordId: req.params.returnRecordId,
      inspection: req.body,
      staffId: req.user.id,
      actorId: req.user.id,
    });

    return res.status(200).json({ success: true, returnRecord: serialize(record) });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.confirmSuccess = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN"]);

    const parsedBody = req.body || {};
    const baseInspection = tryParseJsonField(parsedBody.inspection);
    const settlement = tryParseJsonField(parsedBody.settlement);

    const files = Array.isArray(req.files)
      ? req.files
      : Object.values(req.files || {}).flat();
    const uploadedUrls = files.map((file) => file?.path).filter(Boolean);

    let inspection = baseInspection;
    if (uploadedUrls.length > 0) {
      const existingUrls = Array.isArray(baseInspection?.evidenceUrls)
        ? baseInspection.evidenceUrls
        : [];
      inspection = {
        ...(baseInspection || {}),
        evidenceUrls: [...existingUrls, ...uploadedUrls],
      };
    }

    const result = await completeReturn({
      returnRecordId: req.params.returnRecordId,
      inspection,
      settlement,
      staffId: req.user.id,
      actorId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      idempotent: result.idempotent,
      returnRecord: serialize(result.record),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.fail = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN"]);

    const parsedBody = req.body || {};
    let failure = tryParseJsonField(parsedBody.failure) || {};
    const inspection = tryParseJsonField(parsedBody.inspection);

    const files = Array.isArray(req.files)
      ? req.files
      : Object.values(req.files || {}).flat();
    const uploadedUrls = files.map((file) => file?.path).filter(Boolean);

    if (uploadedUrls.length > 0) {
      const existingUrls = Array.isArray(failure.evidenceUrls) ? failure.evidenceUrls : [];
      failure = {
        ...failure,
        evidenceUrls: [...existingUrls, ...uploadedUrls],
      };
    }

    const result = await failReturn({
      returnRecordId: req.params.returnRecordId,
      failure,
      inspection,
      staffId: req.user.id,
      actorId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      idempotent: result.idempotent,
      returnRecord: serialize(result.record),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.createRetryAttempt = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN"]);

    const created = await createRetryAttempt({
      rentalId: req.params.rentalId,
      staffId: req.user.id,
      actorId: req.user.id,
    });

    return res.status(201).json({ success: true, returnRecord: serialize(created) });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.syncClosedRental = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN"]);

    const result = await syncClosedRental({
      rentalId: req.params.rentalId,
      reason: req.body?.reason,
      actorId: req.user.id,
    });

    return res.status(200).json({ success: true, ...result });
  } catch (error) {
    return sendError(res, error);
  }
};
