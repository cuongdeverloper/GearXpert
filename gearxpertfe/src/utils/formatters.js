export const formatCurrency = (value) => {
  if (typeof value !== "number") return "0";
  return new Intl.NumberFormat("vi-VN").format(value);
};

export const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB");
};

export const normalizeSpecs = (specs) => {
  if (!specs) return [];
  if (Array.isArray(specs)) return specs;
  if (specs instanceof Map) {
    return Array.from(specs.entries()).map(([key, value]) => ({ key: String(key), value: String(value ?? "") }));
  }
  if (typeof specs === "object") {
    return Object.entries(specs).map(([key, value]) => ({ key: String(key), value: String(value ?? "") }));
  }
  return [];
};
