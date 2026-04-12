import axios from "../AxiosCustomize";

function clampNonNegative(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, x);
}

/**
 * Chuẩn hóa payload doanh thu NCC: unwrap `data` nếu có, ép summary & monthlyBreakdown.revenue >= 0.
 * (Phòng API/proxy trả số âm hoặc bundle cũ chưa rebuild.)
 */
export function normalizeSupplierRevenuePayload(raw) {
  if (!raw || typeof raw !== "object") {
    return raw;
  }
  const payload =
    raw.data != null && typeof raw.data === "object" && !Array.isArray(raw.data)
      ? raw.data
      : raw;

  if (!payload.summary || typeof payload.summary !== "object") {
    return payload;
  }

  const summary = {
    ...payload.summary,
    totalRevenue: clampNonNegative(payload.summary.totalRevenue),
    monthlyRevenue: clampNonNegative(payload.summary.monthlyRevenue),
  };

  const monthlyBreakdown = Array.isArray(payload.monthlyBreakdown)
    ? payload.monthlyBreakdown.map((row) => ({
        ...row,
        revenue: clampNonNegative(row?.revenue),
      }))
    : payload.monthlyBreakdown;

  return { ...payload, summary, monthlyBreakdown };
}

export const getSupplierRevenue = async (supplierId) => {
  const raw = await axios.get(`/api/rentals/supplier/${supplierId}/revenue`);
  return normalizeSupplierRevenuePayload(raw);
};
