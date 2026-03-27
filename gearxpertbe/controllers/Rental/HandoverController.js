const {
  DomainError,
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
} = require("../../services/HandoverService");
const DeliveryTask = require("../../models/DeliveryTask");

const sendError = (res, error) => {
  if (error instanceof DomainError) {
    return res.status(error.status).json({
      success: false,
      code: error.code,
      message: error.message,
    });
  }

  console.error("Handover error:", error);
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

const validateCreateDraftBody = (body) => {
  if (!body || typeof body !== "object") {
    throw new DomainError("Body request không hợp lệ", 400, "VALIDATION_ERROR");
  }
};

exports.createDraftForRental = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN"]);
    validateCreateDraftBody(req.body);

    const record = await ensureDraftForDelivery({
      rentalId: req.params.rentalId,
      deliveryTaskId: req.body.deliveryTaskId,
      staffId: req.body.staffId || req.user.id,
      actorId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      handover: serialize(record),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.getTaskDraft = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN"]);

    const task = await DeliveryTask.findById(req.params.deliveryTaskId)
      .select("deliveryStaffId")
      .lean();

    if (!task) {
      throw new DomainError("Không tìm thấy delivery task", 404, "TASK_NOT_FOUND");
    }

    if (
      req.user.role === "OPERATION_STAFF" &&
      task.deliveryStaffId &&
      String(task.deliveryStaffId) !== String(req.user.id)
    ) {
      throw new DomainError("Task này không thuộc bạn", 403, "FORBIDDEN");
    }

    const record = await getDraftByTask({
      deliveryTaskId: req.params.deliveryTaskId,
      staffId: req.user.id,
      actorId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      handover: serialize(record),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.getById = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN", "SUPPLIER"]);
    const handover = await getById(req.params.handoverId);

    if (
      req.user.role === "OPERATION_STAFF" &&
      handover.operatorStaffId &&
      String(handover.operatorStaffId) !== String(req.user.id)
    ) {
      throw new DomainError("Bạn không có quyền xem biên bản này", 403, "FORBIDDEN");
    }

    return res.status(200).json({ success: true, handover: serialize(handover) });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.listByRental = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN", "SUPPLIER"]);
    const list = await listByRental(req.params.rentalId);
    return res.status(200).json({
      success: true,
      handovers: list.map(serialize),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.start = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN"]);
    const result = await startHandover({
      handoverId: req.params.handoverId,
      staffId: req.user.id,
      actorId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      idempotent: result.idempotent,
      handover: serialize(result.record),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.saveInspection = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN"]);

    const record = await saveInspection({
      handoverId: req.params.handoverId,
      inspection: req.body,
      staffId: req.user.id,
      actorId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      handover: serialize(record),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.confirmSuccess = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN"]);

    const { customerConfirmation, inspection } = req.body || {};

    const result = await confirmSuccess({
      handoverId: req.params.handoverId,
      customerConfirmation,
      inspection,
      staffId: req.user.id,
      actorId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      idempotent: result.idempotent,
      handover: serialize(result.record),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.fail = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN"]);

    const { failure, inspection } = req.body || {};

    const result = await failHandover({
      handoverId: req.params.handoverId,
      failure,
      inspection,
      staffId: req.user.id,
      actorId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      idempotent: result.idempotent,
      handover: serialize(result.record),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.createRedeliveryAttempt = async (req, res) => {
  try {
    requireRole(req, ["OPERATION_STAFF", "ADMIN"]);

    const created = await createRedeliveryAttempt({
      rentalId: req.params.rentalId,
      deliveryTaskId: req.body?.deliveryTaskId,
      staffId: req.user.id,
      actorId: req.user.id,
    });

    return res.status(201).json({
      success: true,
      handover: serialize(created),
    });
  } catch (error) {
    return sendError(res, error);
  }
};

exports.syncCancelledRental = async (req, res) => {
  try {
    requireRole(req, ["ADMIN", "OPERATION_STAFF"]);

    const result = await syncCancelledRental({
      rentalId: req.params.rentalId,
      actorId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    return sendError(res, error);
  }
};
