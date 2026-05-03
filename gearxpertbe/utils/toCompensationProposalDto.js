/**
 * Dùng chung khi trả JSON đề xuất bồi thường (report / admin list).
 * @param {object|null} proposal
 */
function toCompensationProposalDto(proposal) {
  if (!proposal) return null;
  return {
    _id: proposal._id,
    proposedBy: proposal.proposedBy,
    origin: proposal.origin || "SUPPLIER",
    amount: proposal.amount ?? 0,
    currency: proposal.currency || "VND",
    reason: proposal.reason || "",
    explanation: proposal.explanation || "",
    suggestedResolution: proposal.suggestedResolution,
    images: Array.isArray(proposal.images) ? proposal.images : [],
    submittedAt: proposal.submittedAt || proposal.createdAt,
    forwardedToCustomerAt: proposal.forwardedToCustomerAt,
    forwardedMessagePreview: proposal.forwardedMessagePreview || "",
    customerDecision: proposal.customerDecision || "PENDING",
    customerDecidedAt: proposal.customerDecidedAt,
    customerDecidedBy: proposal.customerDecidedBy,
    customerDecisionNote: proposal.customerDecisionNote || "",
    supplierDecision: proposal.supplierDecision || "PENDING",
    supplierDecidedAt: proposal.supplierDecidedAt,
    supplierDecidedBy: proposal.supplierDecidedBy,
    supplierDecisionNote: proposal.supplierDecisionNote || "",
    directGearXpertReview: Boolean(proposal.directGearXpertReview),
    handledByAdminId:
      proposal.handledByAdminId &&
      typeof proposal.handledByAdminId === "object" &&
      proposal.handledByAdminId._id
        ? proposal.handledByAdminId._id
        : proposal.handledByAdminId || null,
    handledByAdmin:
      proposal.handledByAdminId &&
      typeof proposal.handledByAdminId === "object" &&
      (proposal.handledByAdminId.fullName ||
        proposal.handledByAdminId.email ||
        proposal.handledByAdminId.phone)
        ? {
            fullName: proposal.handledByAdminId.fullName || "",
            email: proposal.handledByAdminId.email || "",
          }
        : null,
    adminDecision: proposal.adminDecision || "PENDING",
    adminDecidedAt: proposal.adminDecidedAt,
    adminDecidedBy: proposal.adminDecidedBy,
    adminDecisionNote: proposal.adminDecisionNote || "",
    approvedCompensationAmount: proposal.approvedCompensationAmount ?? 0,
    flowStatus: proposal.flowStatus || "PROPOSED",
    appliedToDeposit: Boolean(proposal.appliedToDeposit),
    appliedToDepositAt: proposal.appliedToDepositAt,
    deductedFromDepositAmount: proposal.deductedFromDepositAmount ?? 0,
  };
}

module.exports = { toCompensationProposalDto };
