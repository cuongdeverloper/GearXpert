/**
 * Tạo snapshot/chuẩn tài chính từ field gốc trên Rental — không đọc rental.paymentBreakdown.
 * Phí & phần NCC luôn tính trên tiền thuê danh (rentPriceTotal), không dùng totalAmount (đã gồm cọc).
 *
 * @param {object} rental
 */
function buildCanonicalPaymentBreakdown(rental) {
  const rentAmount = Math.max(0, Number(rental?.rentPriceTotal) || 0);
  const depositAmount = Math.max(0, Number(rental?.depositAmount) || 0);
  const deliveryFee = Math.max(0, Number(rental?.deliveryFee) || 0);
  const voucherDiscount = Math.max(0, Number(rental?.voucherDiscount) || 0);

  // Phí nền tảng tính trên tiền thuê thực tế khách trả (sau giảm giá)
  const rentAfterDiscount = Math.max(0, rentAmount - voucherDiscount);
  const platformFee = Math.round(rentAfterDiscount * 0.1);
  const supplierReceive = Math.max(0, rentAfterDiscount - platformFee);

  const customerPayAmount = Math.max(
    0,
    rentAmount + depositAmount + deliveryFee - voucherDiscount,
  );

  return {
    rentAmount,
    depositAmount,
    platformFee,
    supplierReceive,
    customerPayAmount,
    platformReceive: platformFee + deliveryFee,
    supplierPayAmount: supplierReceive,
  };
}

module.exports = { buildCanonicalPaymentBreakdown };
