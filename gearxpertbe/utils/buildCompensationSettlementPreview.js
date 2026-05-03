/**
 * Tạm tính dòng tiền (UI), không ghi DB.
 * Tách file riêng để AdminCompensationProposalController.js chỉ giữ luồng duyệt / từ chối.
 */

const SUGGESTED_RESOLUTION_LABEL = {
  CUSTOMER_PAY: "Khách đền bù",
  SUPPLIER_BEAR: "NCC chịu trách nhiệm",
  /** Điều phối từ cọc tạm giữ / ví khách (phần vượt) — không đồng nghĩa chi quỹ lỗi vận hành */
  REQUEST_GX_REVIEW: "Điều phối từ cọc (GX)",
  /** Lỗi shipper/staff nền tảng: chi C từ ví hệ thống → NCC */
  PLATFORM_LIABILITY: "Hệ thống đền bù thiệt hại",
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

function compensationApprovedRowLabel(resolution) {
  const m = {
    CUSTOMER_PAY: "Mức bồi thường C (ô duyệt) — khách trả NCC",
    SUPPLIER_BEAR: "Mức bồi thường C (ô duyệt) — NCC chịu",
    PLATFORM_LIABILITY: "Mức bồi thường C (ô duyệt) — ví nền tảng chi cho NCC",
    REQUEST_GX_REVIEW: "Mức bồi thường C (ô duyệt) — điều phối từ cọc / ví",
  };
  return m[resolution] || m.REQUEST_GX_REVIEW;
}

function makeSettlementRentBlockRows(rentTotal, platformFee, supplierFromRent, C, resolution = "REQUEST_GX_REVIEW") {
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
      label: compensationApprovedRowLabel(resolution),
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
      label: "Luồng Khách đền bù (CUSTOMER_PAY)",
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

function pushRowsForPlatformLiability(rows, { platformFee, supplierFromRent, C, deposit, supplierTotalIllustrative }) {
  rows.push(
    {
      key: "flow_platform_liability",
      label: "Luồng Hệ thống đền bù thiệt hại",
      valueText:
        "Áp dụng khi lỗi thuộc shipper/staff nền tảng: ghi sổ trừ ví hệ thống (isSystem) và cộng NCC đúng C. Không trừ ví khách cho khoản này; không dùng cọc làm nguồn bù.",
      kind: "narrative",
    },
    {
      key: "platform_wallet_out",
      label: "Chi từ ví nền tảng → NCC (minh họa = C)",
      amount: C,
      kind: "out",
    },
    {
      key: "platform_net_illustrative",
      label: "Nền tảng — ròng minh họa (phí thuê 10% − chi bồi thường C)",
      amount: platformFee - C,
      kind: "context",
    },
    {
      key: "supplier_receives_damage_pay",
      label: "NCC — thuê ròng + nhận bồi thường C (minh họa)",
      amount: supplierTotalIllustrative,
      kind: "in",
    },
    {
      key: "customer_deposit_no_deduct",
      label: "Khách — hoàn cọc minh họa (không trừ C vào cọc trong nhánh này)",
      amount: deposit,
      kind: "in",
    }
  );
}

function pushRowsForSupplierBear(rows, supplierTotalIllustrative) {
  rows.push(
    {
      key: "flow",
      label: "Luồng NCC chịu trách nhiệm (SUPPLIER_BEAR)",
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
  C,
}) {
  let customerAmount = depositRefundToCustomer;
  let customerNote =
    "Đúng: tiền khách nhận lại = cọc trừ đi phần bồi thường lấy từ cọc: (cọc − min(mức bồi thường C, cọc)). Khi C ≤ cọc thì còn = cọc − C; khi C > cọc thì hoàn cọc = 0 và phần vượt xử lý riêng (dòng cảnh báo).";
  let customerRowLabel = "Khách hàng — hoàn cọc sau trừ bồi thường (minh họa)";

  let platformAmount = platformFee;
  let platformRowLabel = "Nền tảng — phí giữ (10% trên tiền thuê)";
  let platformDetail =
    "Phí 10% trên rentPriceTotal; giữ lại khi chốt đơn (cùng logic confirm return).";

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
  } else if (resolution === "PLATFORM_LIABILITY") {
    customerAmount = deposit;
    customerNote =
      "PLATFORM_LIABILITY: nền tảng chi C cho NCC từ ví hệ thống; minh họa khách nhận lại toàn bộ cọc (không trừ C vào cọc).";
    customerRowLabel = "Khách hàng — hoàn cọc (minh họa)";
    platformAmount = platformFee - C;
    platformRowLabel = "Nền tảng — ròng minh họa (phí thuê − chi bồi thường C)";
    platformDetail =
      "Chi C từ quỹ ví hệ thống cho NCC. Cột minh họa = phí 10% trên thuê − C (âm = chi vượt phần phí so với mô hình đơn giản).";
  }

  let supplierDetail =
    resolution === "CUSTOMER_PAY"
      ? "Từ thuê (sau phí) + bồi thường C."
      : resolution === "SUPPLIER_BEAR"
        ? "Còn lại từ thuê sau khi NCC chịu C (≥ 0)."
        : resolution === "PLATFORM_LIABILITY"
          ? "Từ thuê (sau phí) + bồi thường C do nền tảng chi."
          : "Từ thuê (sau phí) + phần từ cọc (minh họa).";

  const extraPayIfOverDeposit =
    resolution === "PLATFORM_LIABILITY"
      ? 0
      : resolution !== "SUPPLIER_BEAR" && overDeposit > 0
        ? overDeposit
        : 0;

  return {
    platform: {
      amount: platformAmount,
      label: "Nền tảng",
      rowLabel: platformRowLabel,
      detail: platformDetail,
    },
    customer: {
      amount: customerAmount,
      label: "Khách hàng",
      rowLabel: customerRowLabel,
      detail: customerNote,
      extraPayIfOverDeposit,
    },
    supplier: {
      amount: supplierTotalIllustrative,
      label: "NCC",
      rowLabel: "NCC — tổng dự kiến nhận (minh họa)",
      detail: supplierDetail,
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
  if (resolution === "PLATFORM_LIABILITY") {
    footNotes.push(
      "Hệ thống đền bù thiệt hại: khi duyệt, hệ thống trừ đúng C trên ví nền tảng (isSystem) nếu đủ số dư; không dùng cọc khách làm nguồn cho khoản này."
    );
  }
  if (rental?.depositStatus === "REFUNDED" || rental?.escrowStatus === "RELEASED") {
    footNotes.push("Lưu ý: cọc/escrow có thể đã xử lý trên hệ thống — số tạm tính cọc theo hồ sơ đơn, có thể lệch thực tế.");
  }
  if (overDeposit > 0 && resolution !== "SUPPLIER_BEAR" && resolution !== "PLATFORM_LIABILITY") {
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
    ...makeSettlementRentBlockRows(rentTotal, platformFee, supplierFromRent, C, resolution),
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
  } else if (resolution === "PLATFORM_LIABILITY") {
    pushRowsForPlatformLiability(rows, {
      platformFee,
      supplierFromRent,
      C,
      deposit,
      supplierTotalIllustrative,
    });
  } else {
    rows.push({
      key: "flow_deposit_orchestration",
      label: "Luồng Điều phối từ cọc (REQUEST_GX_REVIEW)",
      valueText:
        "Nền tảng điều phối bồi thường từ cọc đang tạm giữ (và phần vượt cọc qua ví khách khi cần), khớp ghi sổ khi admin duyệt — khác «Khách đền bù», «NCC chịu», và «Hệ thống đền bù thiệt hại» (chi thẳng từ ví nền tảng).",
      kind: "narrative",
    });
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
    C,
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
        resolution === "SUPPLIER_BEAR" ||
        resolution === "CUSTOMER_PAY" ||
        resolution === "PLATFORM_LIABILITY"
          ? 0
          : fromDeposit,
      /** Ròng khách (cọc − min(C,cọc)) — cả nhánh C thu tách vẫn dùng cùng số minh họa tác động. */
      depositRefundToCustomerIllustrative:
        resolution === "SUPPLIER_BEAR" || resolution === "PLATFORM_LIABILITY"
          ? null
          : depositRefundToCustomer,
      overCompensationVsDeposit:
        resolution === "SUPPLIER_BEAR" || resolution === "PLATFORM_LIABILITY" ? 0 : overDeposit,
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
