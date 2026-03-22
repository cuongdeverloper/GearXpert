const DeliveryIssueReport = require("../../models/DeliveryIssueReport");
const DamageReport = require("../../models/DamageReport");
const Rental = require("../../models/Rental");
const RentalItem = require("../../models/RentalItem");
const User = require("../../models/User");
const OperationLog = require("../../models/OperationLog");

// ── Helper: normalize a delivery issue to unified case shape ─────────────────
function normalizeDeliveryIssue(doc) {
  return {
    _id: doc._id,
    caseType: "DELIVERY",
    sourceModel: "DeliveryIssueReport",
    status: doc.status,
    severity: null,
    reportedBy: doc.reportedBy,
    createdAt: doc.createdAt,
    rentalId: doc.rentalId?._id || doc.rentalId,
    customerName: doc.rentalId?.customerId?.fullName || null,
    supplierName: doc.rentalId?.supplierId?.fullName || null,
    deviceNames: doc.deviceIds?.map((d) => d?.name).filter(Boolean) || [],
    thumbnail: doc.images?.length ? doc.images[0] : null,
    description: doc.description,
    assignedAdmin: doc.assignedAdminId
      ? { _id: doc.assignedAdminId._id || doc.assignedAdminId, fullName: doc.assignedAdminId.fullName }
      : null,
    issueType: doc.issueType,
    reportContext: doc.reportContext,
  };
}

// ── Helper: normalize a damage report to unified case shape ──────────────────
function normalizeDamageReport(doc) {
  return {
    _id: doc._id,
    caseType: "DAMAGE",
    sourceModel: "DamageReport",
    status: doc.status,
    severity: doc.severity,
    reportedBy: "CUSTOMER",
    createdAt: doc.createdAt,
    rentalId: doc.rentalId?._id || doc.rentalId,
    customerName: doc.rentalId?.customerId?.fullName || null,
    supplierName: doc.rentalId?.supplierId?.fullName || null,
    deviceNames: doc.deviceId?.name ? [doc.deviceId.name] : [],
    thumbnail: doc.images?.length ? doc.images[0] : null,
    description: doc.description,
    assignedAdmin: doc.assignedAdminId
      ? { _id: doc.assignedAdminId._id || doc.assignedAdminId, fullName: doc.assignedAdminId.fullName }
      : null,
    issueType: null,
    reportContext: null,
  };
}

// ── GET /api/admin/disputes ─────────────────────────────────────────────────
exports.getDisputes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = "",
      status,
      caseType,
      severity,
      reportedBy,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const allCases = [];

    // ── Delivery Issues ──────────────────────────────────────────────────────
    if (!caseType || caseType === "DELIVERY") {
      const dFilter = {};
      if (status) dFilter.status = status;
      if (reportedBy) dFilter.reportedBy = reportedBy;

      let dDocs = await DeliveryIssueReport.find(dFilter)
        .populate({
          path: "rentalId",
          select: "customerId supplierId",
          populate: [
            { path: "customerId", select: "fullName" },
            { path: "supplierId", select: "fullName" },
          ],
        })
        .populate({ path: "deviceIds", select: "name images" })
        .populate({ path: "assignedAdminId", select: "fullName" })
        .sort({ createdAt: -1 })
        .lean();

      // Search on populated fields (customerName, supplierName, rentalId, description)
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        dDocs = dDocs.filter((doc) => {
          const customerName = doc.rentalId?.customerId?.fullName?.toLowerCase() || "";
          const supplierName = doc.rentalId?.supplierId?.fullName?.toLowerCase() || "";
          const rentalId = doc.rentalId?._id?.toString() || "";
          const desc = doc.description?.toLowerCase() || "";
          return (
            customerName.includes(q) ||
            supplierName.includes(q) ||
            rentalId.includes(q) ||
            desc.includes(q)
          );
        });
      }

      allCases.push(...dDocs.map((doc) => ({ ...normalizeDeliveryIssue(doc) })));
    }

    // ── Damage Reports ──────────────────────────────────────────────────────
    if (!caseType || caseType === "DAMAGE") {
      const dmgFilter = {};
      if (status) dmgFilter.status = status;
      if (severity) dmgFilter.severity = severity;

      let dmgDocs = await DamageReport.find(dmgFilter)
        .populate({
          path: "rentalId",
          select: "customerId supplierId",
          populate: [
            { path: "customerId", select: "fullName" },
            { path: "supplierId", select: "fullName" },
          ],
        })
        .populate({ path: "deviceId", select: "name images" })
        .populate({ path: "assignedAdminId", select: "fullName" })
        .sort({ createdAt: -1 })
        .lean();

      // Search on populated fields
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        dmgDocs = dmgDocs.filter((doc) => {
          const customerName = doc.rentalId?.customerId?.fullName?.toLowerCase() || "";
          const supplierName = doc.rentalId?.supplierId?.fullName?.toLowerCase() || "";
          const rentalId = doc.rentalId?._id?.toString() || "";
          const desc = doc.description?.toLowerCase() || "";
          return (
            customerName.includes(q) ||
            supplierName.includes(q) ||
            rentalId.includes(q) ||
            desc.includes(q)
          );
        });
      }

      allCases.push(...dmgDocs.map((doc) => ({ ...normalizeDamageReport(doc) })));
    }

    // Sort by createdAt desc across both sources
    allCases.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Apply reportedBy filter manually for delivery (after normalize)
    let filteredCases = allCases;
    if (reportedBy && (caseType === "DELIVERY" || !caseType)) {
      filteredCases = filteredCases.filter((c) => c.reportedBy === reportedBy);
    }

    const total = filteredCases.length;
    const paginated = filteredCases.slice(skip, skip + limitNum);

    res.json({
      cases: paginated,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (err) {
    console.error("Admin getDisputes error:", err);
    res.status(500).json({ message: "Failed to load disputes" });
  }
};

// ── GET /api/admin/disputes/:caseType/:id ──────────────────────────────────
exports.getDisputeDetail = async (req, res) => {
  try {
    const { caseType, id } = req.params;

    let doc;
    if (caseType === "DELIVERY") {
      doc = await DeliveryIssueReport.findById(id)
        .populate({
          path: "rentalId",
          populate: [
            { path: "customerId", select: "fullName email phone" },
            { path: "supplierId", select: "fullName email" },
          ],
        })
        .populate({ path: "rentalItemIds", select: "deviceId" })
        .populate({ path: "deviceIds", select: "name images" })
        .populate({ path: "staffId", select: "fullName" })
        .populate({ path: "assignedAdminId", select: "fullName" })
        .lean();

      if (doc) {
        await DeliveryIssueReport.populate(doc, [
          { path: "statusHistory.changedBy", select: "fullName" },
          { path: "internalNotes.adminId", select: "fullName" },
        ]);
      }
    } else if (caseType === "DAMAGE") {
      doc = await DamageReport.findById(id)
        .populate({
          path: "rentalId",
          populate: [
            { path: "customerId", select: "fullName email phone" },
            { path: "supplierId", select: "fullName email" },
          ],
        })
        .populate({ path: "deviceId", select: "name images" })
        .populate({ path: "assignedAdminId", select: "fullName" })
        .lean();

      if (doc) {
        await DamageReport.populate(doc, [
          { path: "statusHistory.changedBy", select: "fullName" },
          { path: "internalNotes.adminId", select: "fullName" },
        ]);
      }
    } else {
      return res.status(400).json({ message: "Invalid caseType" });
    }

    if (!doc) {
      return res.status(404).json({ message: "Dispute not found" });
    }

    // Get rental items / devices details
    let devices = [];
    if (caseType === "DELIVERY" && doc.deviceIds) {
      devices = doc.deviceIds.map((d) => ({
        _id: d._id,
        name: d.name,
        images: d.images,
      }));
    } else if (caseType === "DAMAGE" && doc.deviceId) {
      devices = [{
        _id: doc.deviceId._id,
        name: doc.deviceId.name,
        images: doc.deviceId.images,
      }];
    }

    // Build internalNotes with adminName
    const internalNotes = (doc.internalNotes || []).map((n) => ({
      _id: n._id,
      adminId: n.adminId?._id || n.adminId,
      adminName: n.adminId?.fullName || null,
      content: n.content,
      createdAt: n.createdAt,
    }));

    // Build statusHistory with changedBy name
    const statusHistory = (doc.statusHistory || []).map((h) => ({
      status: h.status,
      changedBy: h.changedBy
        ? { _id: h.changedBy._id || h.changedBy, fullName: h.changedBy.fullName }
        : null,
      note: h.note,
      createdAt: h.createdAt,
    }));

    const result = {
      _id: doc._id,
      caseType: caseType.toUpperCase(),
      sourceModel: caseType === "DELIVERY" ? "DeliveryIssueReport" : "DamageReport",
      status: doc.status,
      severity: doc.severity || null,
      reportedBy: doc.reportedBy || "CUSTOMER",
      createdAt: doc.createdAt,
      issueType: doc.issueType || null,
      description: doc.description,
      images: doc.images || [],
      reportContext: doc.reportContext || null,
      compensationAmount: doc.compensationAmount,

      rental: doc.rentalId
        ? {
            _id: doc.rentalId._id,
            status: doc.rentalId.status,
            rentPriceTotal: doc.rentalId.rentPriceTotal,
            depositAmount: doc.rentalId.depositAmount,
            rentalStartDate: doc.rentalId.rentalStartDate,
            rentalEndDate: doc.rentalId.rentalEndDate,
            deliveryAddress: doc.rentalId.deliveryAddress,
          }
        : null,

      customer: doc.rentalId?.customerId
        ? {
            _id: doc.rentalId.customerId._id,
            fullName: doc.rentalId.customerId.fullName,
            email: doc.rentalId.customerId.email,
            phone: doc.rentalId.customerId.phone,
          }
        : null,

      supplier: doc.rentalId?.supplierId
        ? {
            _id: doc.rentalId.supplierId._id,
            fullName: doc.rentalId.supplierId.fullName,
            email: doc.rentalId.supplierId.email,
          }
        : null,

      devices,
      assignedAdmin: doc.assignedAdminId
        ? { _id: doc.assignedAdminId._id, fullName: doc.assignedAdminId.fullName }
        : null,
      internalNotes,
      resolutionNote: doc.resolutionNote || null,
      statusHistory,
    };

    res.json({ case: result });
  } catch (err) {
    console.error("Admin getDisputeDetail error:", err);
    res.status(500).json({ message: "Failed to load dispute detail" });
  }
};

// ── PATCH /api/admin/disputes/:caseType/:id ────────────────────────────────
exports.updateDispute = async (req, res) => {
  try {
    const { caseType, id } = req.params;
    const { status, assignedAdminId, note, resolutionNote } = req.body;
    const adminId = req.user.id;

    const Model = caseType === "DELIVERY" ? DeliveryIssueReport : DamageReport;
    if (!Model) return res.status(400).json({ message: "Invalid caseType" });

    const doc = await Model.findById(id);
    if (!doc) return res.status(404).json({ message: "Dispute not found" });

    // Build history entry — status is the NEW status after this change
    const newStatus = (status && status !== doc.status) ? status : doc.status;

    const historyEntry = {
      status: newStatus,
      changedBy: adminId,
      note: note || null,
      createdAt: new Date(),
    };

    // Update status
    if (status && status !== doc.status) {
      doc.status = status;
    }

    // Assign admin
    if (assignedAdminId !== undefined) {
      doc.assignedAdminId = assignedAdminId || null;
    }

    // Resolution note
    if (resolutionNote !== undefined) {
      doc.resolutionNote = resolutionNote;
    }

    // Add note to internalNotes; push to statusHistory only if there is a status change or note
    if (note) {
      doc.internalNotes = doc.internalNotes || [];
      doc.internalNotes.push({ adminId, content: note });
    }

    // Push to history if: status changed OR note provided (note-only counts as activity)
    if (status || note) {
      doc.statusHistory = doc.statusHistory || [];
      doc.statusHistory.push(historyEntry);
    }

    await doc.save();

    // Side effect: update rental status for DELIVERY disputes
    if (caseType === "DELIVERY" && status === "RESOLVED") {
      await Rental.findByIdAndUpdate(doc.rentalId, {
        status: "INSPECTING",
      });
    }

    // Audit log
    await OperationLog.create({
      staffId: adminId,
      action: "UPDATE_DISPUTE",
      targetType: caseType.toUpperCase(),
      targetId: doc._id,
      details: {
        changedStatus: status,
        assignedAdminId,
        note,
        resolutionNote,
      },
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    // Repopulate for response
    await doc.populate({ path: "assignedAdminId", select: "fullName" });
    await Model.populate(doc, [
      { path: "internalNotes.adminId", select: "fullName" },
      { path: "statusHistory.changedBy", select: "fullName" },
    ]);

    const internalNotes = (doc.internalNotes || []).map((n) => ({
      _id: n._id,
      adminId: n.adminId?._id || n.adminId,
      adminName: n.adminId?.fullName,
      content: n.content,
      createdAt: n.createdAt,
    }));

    const statusHistory = (doc.statusHistory || []).map((h) => ({
      status: h.status,
      changedBy: h.changedBy
        ? { _id: h.changedBy._id || h.changedBy, fullName: h.changedBy.fullName }
        : null,
      note: h.note,
      createdAt: h.createdAt,
    }));

    res.json({
      message: "Dispute updated",
      data: {
        _id: doc._id,
        status: doc.status,
        assignedAdmin: doc.assignedAdminId
          ? { _id: doc.assignedAdminId._id, fullName: doc.assignedAdminId.fullName }
          : null,
        internalNotes,
        statusHistory,
      },
    });
  } catch (err) {
    console.error("Admin updateDispute error:", err);
    res.status(500).json({ message: "Failed to update dispute" });
  }
};
