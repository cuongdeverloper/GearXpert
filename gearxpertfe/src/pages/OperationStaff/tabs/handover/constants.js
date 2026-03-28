export const FAILURE_OPTIONS = [
  { value: "NO_SHOW", label: "Khách không có mặt" },
  { value: "CUSTOMER_REJECT", label: "Khách từ chối nhận" },
  { value: "MISSING_ACCESSORY", label: "Thiếu phụ kiện" },
  { value: "DEVICE_MISMATCH", label: "Sai thiết bị / sai serial" },
  { value: "DAMAGED_ITEM_AT_DELIVERY", label: "Thiết bị hư hỏng khi giao" },
  { value: "DELIVERY_BLOCKED", label: "Bị chặn giao / không thể tiếp cận" },
  { value: "OTHER", label: "Khác" },
];

export const STATUS_BADGE = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
  VOID: "bg-amber-100 text-amber-700 border-amber-200",
};
