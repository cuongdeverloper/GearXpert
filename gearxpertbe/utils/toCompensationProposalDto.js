/**
 * Dùng chung khi trả JSON đề xuất bồi thường (report / admin list).
 * @param {object|null} proposal
 */
function toCompensationProposalDto(proposal) {
  if (!proposal) return null;
  return {
    _id: proposal._id,
    proposedBy: proposal.proposedBy,
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
