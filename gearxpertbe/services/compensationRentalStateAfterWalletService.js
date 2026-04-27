/**
 * Sau khi admin duyệt bồi thường + quyết toán ví (nếu có): cập nhật trạng thái đơn / esc / serial.
 * Không gán rental COMPLETED, không REFUND cọc ở đây (do confirmReturn / nghiệp vụ trả hàng).
 */
const Rental = require("../models/Rental");
const DeviceItem = require("../models/DeviceItem");
const { compensationAuditLog } = require("../utils/compensationAuditLog");

/**
 * Hết chờ xử lý sự cố: thoát PENDING_RESOLUTION theo bối cảnh đơn.
 * @returns {string|null} status mới hoặc null = giữ nguyên
 */
function computeRentalStatusAfterCompensation(rental) {
  if (rental.status !== "PENDING_RESOLUTION") return null;
  if (rental.inspectedContext === "RETURN") return "RETURNING";
  if (rental.pickedUpAt || rental.deliveredAt) return "RENTING";
  return "DELIVERING";
}

/**
 * Đã giải phóng một phần cọc từ ví hệ thống sang NCC (bồi thường) → ghi PARTIAL_REFUND nếu trước đó còn HOLDING.
 * @returns {string|null}
 */
function computeEscrowStatusAfterCompensation(rental, walletSummary) {
  const d = Math.max(0, Number(walletSummary?.deductedFromDeposit) || 0);
  if (d <= 0) return null;
  if (rental.escrowStatus === "HOLDING") return "PARTIAL_REFUND";
  return null;
}

function buildRentalStatusEscrowPatch(rental, walletSummary) {
  const patch = {};
  const st = computeRentalStatusAfterCompensation(rental);
  if (st) patch.status = st;
  const esc = computeEscrowStatusAfterCompensation(rental, walletSummary);
  if (esc) patch.escrowStatus = esc;
  return patch;
}

/**
 * Cập nhật đơn thuê (status, escrow) sau bước ví. `walletSummary` null khi mức duyệt 0 (chỉ đóng sự cố).
 * @param {object|null|undefined} walletSummary — từ applyCompensationWalletOnAdminApprove
 */
async function applyRentalStateAfterCompensationWallet(rentalId, walletSummary) {
  if (!rentalId) return { applied: false, patch: null };
  const rental = await Rental.findById(rentalId);
  if (!rental) {
    compensationAuditLog("RENTAL_STATE_AFTER_WALLET", {
      event: "SKIP",
      rentalId: String(rentalId),
      reason: "NOT_FOUND",
    });
    return { applied: false, patch: null };
  }
  const patch = buildRentalStatusEscrowPatch(rental, walletSummary);
  if (Object.keys(patch).length === 0) {
    compensationAuditLog("RENTAL_STATE_AFTER_WALLET", {
      event: "SKIP",
      rentalId: String(rentalId),
      reason: "NO_CHANGES",
      previousStatus: rental.status,
    });
    return { applied: true, patch: null };
  }
  const prev = { status: rental.status, escrowStatus: rental.escrowStatus };
  await Rental.findByIdAndUpdate(rentalId, { $set: patch });
  compensationAuditLog("RENTAL_STATE_AFTER_WALLET", {
    event: "UPDATED",
    rentalId: String(rentalId),
    patch,
    previousStatus: prev.status,
    previousEscrow: prev.escrowStatus,
  });
  return { applied: true, patch };
}

/**
 * Hạ serial khỏi PENDING_RESOLUTION khi chốt bồi thường (damage hoặc delivery issue có deviceItemIds).
 */
async function updateDeviceItemsAfterCompensationAdminApproval(issueDoc) {
  const ids = issueDoc?.deviceItemIds;
  if (!Array.isArray(ids) || ids.length === 0) {
    return { modifiedCount: 0 };
  }
  const r = await DeviceItem.updateMany(
    { _id: { $in: ids } },
    { $set: { status: "RENTED", activeIssueId: null } }
  );
  compensationAuditLog("DEVICE_ITEMS_AFTER_COMPENSATION", {
    issueId: String(issueDoc._id),
    count: ids.length,
    modifiedCount: r.modifiedCount ?? 0,
  });
  return { modifiedCount: r.modifiedCount ?? 0 };
}

module.exports = {
  computeRentalStatusAfterCompensation,
  computeEscrowStatusAfterCompensation,
  buildRentalStatusEscrowPatch,
  applyRentalStateAfterCompensationWallet,
  updateDeviceItemsAfterCompensationAdminApproval,
};
