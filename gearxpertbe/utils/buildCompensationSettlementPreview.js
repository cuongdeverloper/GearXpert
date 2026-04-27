/**
 * Tạm tính dòng tiền (UI), không ghi DB.
 * Tách file riêng để AdminCompensationProposalController.js chỉ giữ luồng duyệt / từ chối.
 */

const SUGGESTED_RESOLUTION_LABEL = {
  CUSTOMER_PAY: "Khách thanh toán bồi thường",
  SUPPLIER_BEAR: "Nhà cung cấp chịu khoản bồi thường",
  REQUEST_GX_REVIEW: "Cần phối hợp / đánh giá (GearXpert)",
};

const {
  SETTLEMENT_PLATFORM_FEE_RATE,
  splitRentLikeConfirmReturn,
  splitDepositForCompensation,
  pickSupplierTotalIllustrative,
} = require("./compensationMoneyMath");

function makeSettlementRentalInfoRows(rental) {
  return [
    {
      key: "rental_status",
      label: "Trạng thái đơn thuê",
      valueText: rental?.status || "—",
      kind: "info",
    },
    {
      key: "escrow",
      label: "Cọc (depositStatus / escrowStatus trên hệ thống)",
      valueText: `${rental?.depositStatus || "—"} / ${rental?.escrowStatus || "—"}`,
      kind: "info",
    },
  ];
}

/** Số từ `rental.depositAmount` — cùng mức cọc khách thường tạm giữ ở ví/escrow nền tảng trước khi trả/điều chỉnh. */
function makeDepositHeldByPlatformRow(deposit) {
  const d = Math.max(0, Number(deposit) || 0);
  return {
    key: "deposit_held_by_platform",
    label:
      "Tiền cọc theo hồ sơ đơn (thường tạm giữ tại nền tảng/escrow — xem cặp trạng thái cọc & escrow ở trên)",
    amount: d,
    kind: "primary",
  };
}

function makeSettlementRentBlockRows(rentTotal, platformFee, supplierFromRent, C) {
  return [
    {
      key: "section_rent",
      label: "Tiền thuê (tham chiếu cách tính khi chốt trả hàng / confirm return)",
      valueText: "90% thuê → NCC, 10% → phí nền tảng (trên rentPriceTotal).",
      kind: "narrative",
    },
    { key: "rent_total", label: "Tổng tiền thuê (rentPriceTotal)", amount: rentTotal, kind: "context" },
    { key: "platform_fee", label: "Phí nền tảng (10% trên thuê)", amount: platformFee, kind: "out" },
    {
      key: "supplier_from_rent",
      label: "NCC nhận từ tiền thuê (sau phí nền tảng)",
      amount: supplierFromRent,
      kind: "in",
    },
    {
      key: "comp",
      label: "Mức bồi thường (ô duyệt) — khoản khách bù cho NCC",
      amount: C,
      kind: "primary",
    },
  ];
}

function pushRowsForCustomerPay(
  rows,
  { supplierTotalIllustrative, deposit, depositRefundToCustomer, overDeposit, C }
) {
  rows.push(
    {
      key: "flow",
      label: "Luồng bồi thường (CUSTOMER_PAY)",
      valueText:
        "C ghi nhận qua kênh thanh toán tách (không trừ sổ cọc), nhưng tác động ròng tới khách tương đương: hoàn cọc − C (giống cọc − min(C, cọc)). NCC minh họa: thuê (sau phí) + C.",
      kind: "narrative",
    },
    {
      key: "section_cpay_deposit",
      label: "Khách — tác động cọc (ròng, minh họa)",
      valueText: `Cọc hồ sơ ${(deposit || 0).toLocaleString("vi-VN")} ₫; bồi thường C ${(C || 0).toLocaleString("vi-VN")} ₫. Ròng = cọc − C (tối đa 0 nếu C ≥ cọc).`,
      kind: "narrative",
    },
    {
      key: "cpay_deposit_refund",
      label: "Khách — ròng sau bồi thường (minh họa: cọc − C, khi C ≤ cọc)",
      amount: depositRefundToCustomer,
      kind: "in",
    }
  );
  if (overDeposit > 0) {
    rows.push({
      key: "cpay_over",
      label: "Khách — phần bồi thường vượt cọc (thu thêm, minh họa)",
      amount: overDeposit,
      kind: "warning",
    });
  }
  rows.push({
    key: "supplier_total_cpay",
    label: "Tổng dự kiến NCC nhận (thuê ròng + bồi thường C, minh họa)",
    amount: supplierTotalIllustrative,
    kind: "in",
  });
}

function pushRowsForSupplierBear(rows, supplierTotalIllustrative) {
  rows.push(
    {
      key: "flow",
      label: "Luồng bồi thường (SUPPLIER_BEAR)",
      valueText:
        "Khoản C do NCC chịu — tạm trừ vào phần nhận từ thuê (tối đa 0). Cọc không dùng để tính bù trong nhánh này.",
      kind: "narrative",
    },
    {
      key: "supplier_bear",
      label: "NCC còn lại từ thuê sau khi bù (minh họa max(0, thuê ròng − C))",
      amount: supplierTotalIllustrative,
      kind: "in",
    }
  );
}

function pushRowsForDepositDefaultPath(
  rows,
  { deposit, fromDeposit, depositRefundToCustomer, overDeposit, supplierFromRent }
) {
  rows.push(
    {
      key: "section_deposit",
      label: "Cọc: trừ bồi thường, phần còn hoàn khách",
      valueText:
        "Dùng cùng mức cọc đã nêu ở dòng «Cọc khách trên hồ sơ». Tối đa trừ min(C, cọc); phần còn hoàn khách.",
      kind: "narrative",
    },
    {
      key: "from_deposit",
      label: "Trừ từ cọc cho bồi thường (minh họa min(C, cọc))",
      amount: fromDeposit,
      kind: "out",
    },
    {
      key: "deposit_refund",
      label: "Khách nhận lại từ cọc (= cọc − min(C, cọc); tức cọc trừ phần bồi thường lấy từ cọc)",
      amount: depositRefundToCustomer,
      kind: "in",
    }
  );
  if (overDeposit > 0) {
    rows.push({
      key: "over",
      label: "Bồi thường vượt cọc (cần thu thêm từ khách hoặc xử lý khác)",
      amount: overDeposit,
      kind: "warning",
    });
  }
  rows.push({
    key: "supplier_incl_deposit",
    label: "Tổng dự kiến NCC nhận (thuê ròng + phần từ cọc, minh họa)",
    amount: supplierFromRent + fromDeposit,
    kind: "in",
  });
}

/**
 * Số tiền minh họa từng bên: nền tảng / khách / NCC (theo từng suggestedResolution).
 */
function computePartySummary(resolution, {
  platformFee,
  deposit,
  depositRefundToCustomer,
  overDeposit,
  supplierTotalIllustrative,
}) {
  let customerAmount = depositRefundToCustomer;
  let customerNote =
    "Đúng: tiền khách nhận lại = cọc trừ đi phần bồi thường lấy từ cọc: (cọc − min(mức bồi thường C, cọc)). Khi C ≤ cọc thì còn = cọc − C; khi C > cọc thì hoàn cọc = 0 và phần vượt xử lý riêng (dòng cảnh báo).";
  let customerRowLabel = "Khách hàng — hoàn cọc sau trừ bồi thường (minh họa)";

  if (resolution === "CUSTOMER_PAY") {
    customerAmount = depositRefundToCustomer;
    customerNote =
      "CUSTOMER_PAY: C thu tách sổ cọc, nhưng tổng tác động tới khách tương đương cọc − C (bằng cọc − min(C, cọc)). C > cọc: ròng 0, phần vượt ở dòng cảnh báo.";
    customerRowLabel = "Khách hàng — ròng (cọc − bồi thường C, minh họa; C thu tách sổ)";
  } else if (resolution === "SUPPLIER_BEAR") {
    customerAmount = deposit;
    customerNote =
      "Nhánh NCC chịu C: bản tạm tính coi khách nhận lại cả cọc; không trừ cọc cho bồi thường.";
    customerRowLabel = "Khách hàng — hoàn cọc (minh họa, NCC chịu bồi thường)";
  }

  return {
    platform: {
      amount: platformFee,
      label: "Nền tảng",
      rowLabel: "Nền tảng — phí giữ (10% trên tiền thuê)",
      detail: "Phí 10% trên rentPriceTotal; giữ lại khi chốt đơn (cùng logic confirm return).",
    },
    customer: {
      amount: customerAmount,
      label: "Khách hàng",
      rowLabel: customerRowLabel,
      detail: customerNote,
      extraPayIfOverDeposit:
        resolution !== "SUPPLIER_BEAR" && overDeposit > 0 ? overDeposit : 0,
    },
    supplier: {
      amount: supplierTotalIllustrative,
      label: "NCC",
      rowLabel: "NCC — tổng dự kiến nhận (minh họa)",
      detail:
        resolution === "CUSTOMER_PAY"
          ? "Từ thuê (sau phí) + bồi thường C."
          : resolution === "SUPPLIER_BEAR"
            ? "Còn lại từ thuê sau khi NCC chịu C (≥ 0)."
            : "Từ thuê (sau phí) + phần từ cọc (minh họa).",
    },
  };
}

function appendThreePartySummaryRows(rows, party) {
  rows.push({
    key: "section_parties",
    label: "Tóm tắt 3 bên (số tiền minh họa)",
    valueText: `Nền tảng: ${party.platform.amount.toLocaleString("vi-VN")} ₫ — Khách nhận lại: ${party.customer.amount.toLocaleString("vi-VN")} ₫ — NCC nhận: ${party.supplier.amount.toLocaleString("vi-VN")} ₫`,
    kind: "narrative",
  });
  rows.push({
    key: "party_platform",
    label: party.platform.rowLabel,
    amount: party.platform.amount,
    kind: "context",
  });
  rows.push({
    key: "party_customer",
    label: party.customer.rowLabel,
    amount: party.customer.amount,
    kind: "in",
  });
  if (party.customer.extraPayIfOverDeposit > 0) {
    rows.push({
      key: "party_customer_extra",
      label: "Khách — có thể phải trả thêm (C vượt cọc, minh họa)",
      amount: party.customer.extraPayIfOverDeposit,
      kind: "warning",
    });
  }
  rows.push({
    key: "party_supplier",
    label: party.supplier.rowLabel,
    amount: party.supplier.amount,
    kind: "in",
  });
}

function buildFootNotes(rental, { overDeposit, resolution }) {
  const footNotes = [
    "Đây là tạm tính tham khảo (UI). Ghi sổ ví / escrow thực tế tại bước nghiệp vụ tương ứng (ví dụ chốt trả hàng) có thể khác thời điểm admin duyệt đề xuất.",
    "Cách chia tiền thuê (10% phí nền tảng, phần còn cho NCC) thống nhất với luồng `confirmReturn` (RentalController).",
  ];
  if (rental?.depositStatus === "REFUNDED" || rental?.escrowStatus === "RELEASED") {
    footNotes.push("Lưu ý: cọc/escrow có thể đã xử lý trên hệ thống — số tạm tính cọc theo hồ sơ đơn, có thể lệch thực tế.");
  }
  if (overDeposit > 0 && resolution !== "SUPPLIER_BEAR") {
    footNotes.push("Khi C > cọc: khoản vượt thường cần thu riêng từ khách (nếu hướng xử lý nghiệp vụ yêu cầu).");
  }
  return footNotes;
}

/**
 * @param {{ rental: object, proposal: object, approvedAmount: number }} p
 */
function buildCompensationSettlementPreview({ rental, proposal, approvedAmount: rawApproved }) {
  const C = Math.max(0, Number(rawApproved) || 0);
  const resolution = proposal?.suggestedResolution || "REQUEST_GX_REVIEW";

  const { rentTotal, platformFee, supplierFromRent } = splitRentLikeConfirmReturn(rental?.rentPriceTotal);
  const { deposit, fromDeposit, depositRefundToCustomer, overDeposit } = splitDepositForCompensation(
    rental?.depositAmount,
    C
  );
  const supplierTotalIllustrative = pickSupplierTotalIllustrative(
    resolution,
    supplierFromRent,
    C,
    fromDeposit
  );

  const rows = [
    ...makeSettlementRentalInfoRows(rental),
    makeDepositHeldByPlatformRow(deposit),
    ...makeSettlementRentBlockRows(rentTotal, platformFee, supplierFromRent, C),
  ];
  if (resolution === "CUSTOMER_PAY") {
    pushRowsForCustomerPay(rows, {
      supplierTotalIllustrative,
      deposit,
      depositRefundToCustomer,
      overDeposit,
      C,
    });
  } else if (resolution === "SUPPLIER_BEAR") {
    pushRowsForSupplierBear(rows, supplierTotalIllustrative);
  } else {
    pushRowsForDepositDefaultPath(rows, {
      deposit,
      fromDeposit,
      depositRefundToCustomer,
      overDeposit,
      supplierFromRent,
    });
  }

  const footNotes = buildFootNotes(rental, { overDeposit, resolution });

  const partySummary = computePartySummary(resolution, {
    platformFee,
    deposit,
    depositRefundToCustomer,
    overDeposit,
    supplierTotalIllustrative,
  });
  appendThreePartySummaryRows(rows, partySummary);

  return {
    success: true,
    rental: {
      _id: rental?._id,
      status: rental?.status,
      depositStatus: rental?.depositStatus,
      escrowStatus: rental?.escrowStatus,
      /** Trùng `summary.depositHeld` — cọc trên hồ sơ (tham chiếu tạm giữ nền tảng) */
      depositAmount: deposit,
    },
    proposal: {
      _id: proposal?._id,
      amount: proposal?.amount,
      suggestedResolution: resolution,
    },
    suggestedResolutionLabel: SUGGESTED_RESOLUTION_LABEL[resolution] || resolution,
    previewApprovedAmount: C,
    summary: {
      rentTotal,
      platformFeeRate: SETTLEMENT_PLATFORM_FEE_RATE,
      platformFee,
      supplierFromRent,
      /** Cọc theo hồ sơ đơn = mức tương ứng khoản thường tạm giữ (escrow) tại nền tảng khi chưa quyết toán. */
      depositHeld: deposit,
      depositHeldByPlatformOnRecord: deposit,
      compensationApproved: C,
      fromDepositForCompensation:
        resolution === "SUPPLIER_BEAR" || resolution === "CUSTOMER_PAY" ? 0 : fromDeposit,
      /** Ròng khách (cọc − min(C,cọc)) — cả nhánh C thu tách vẫn dùng cùng số minh họa tác động. */
      depositRefundToCustomerIllustrative:
        resolution === "SUPPLIER_BEAR" ? null : depositRefundToCustomer,
      overCompensationVsDeposit: resolution === "SUPPLIER_BEAR" ? 0 : overDeposit,
      supplierTotalIllustrative,
      /** Ba bên: số tiền minh họa (VND) */
      platformReceives: partySummary.platform.amount,
      customerReceives: partySummary.customer.amount,
      supplierReceives: partySummary.supplier.amount,
      customerExtraPayIfOverDeposit: partySummary.customer.extraPayIfOverDeposit || 0,
    },
    partySummary,
    rows,
    footNotes,
  };
}

module.exports = { buildCompensationSettlementPreview };
