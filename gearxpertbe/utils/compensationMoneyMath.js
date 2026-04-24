/**
 * Cùng hằng số / công thức với confirmReturn (10% phí nền tảng trên rentPriceTotal)
 * và buildCompensationSettlementPreview — dùng cho tạm tính UI + quyết toán ví khi admin duyệt.
 */
const SETTLEMENT_PLATFORM_FEE_RATE = 0.1;

function splitRentLikeConfirmReturn(rentTotalRaw) {
  const rentTotal = Math.max(0, Number(rentTotalRaw) || 0);
  const platformFee = Math.round(rentTotal * SETTLEMENT_PLATFORM_FEE_RATE);
  const supplierFromRent = Math.max(0, rentTotal - platformFee);
  return { rentTotal, platformFee, supplierFromRent };
}

function splitDepositForCompensation(depositRaw, C) {
  const deposit = Math.max(0, Number(depositRaw) || 0);
  const c = Math.max(0, Number(C) || 0);
  const fromDeposit = Math.min(c, deposit);
  const depositRefundToCustomer = Math.max(0, deposit - fromDeposit);
  const overDeposit = Math.max(0, c - deposit);
  return { deposit, fromDeposit, depositRefundToCustomer, overDeposit };
}

function pickSupplierTotalIllustrative(resolution, supplierFromRent, C, fromDeposit) {
  if (resolution === "CUSTOMER_PAY") {
    return supplierFromRent + C;
  }
  if (resolution === "SUPPLIER_BEAR") {
    return Math.max(0, supplierFromRent - C);
  }
  return supplierFromRent + fromDeposit;
}

module.exports = {
  SETTLEMENT_PLATFORM_FEE_RATE,
  splitRentLikeConfirmReturn,
  splitDepositForCompensation,
  pickSupplierTotalIllustrative,
};
