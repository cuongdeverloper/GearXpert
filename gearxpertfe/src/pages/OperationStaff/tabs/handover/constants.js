export const FAILURE_OPTIONS = [
  { value: "NO_SHOW", label: "Khách không có mặt" },
  { value: "CUSTOMER_REJECT", label: "Khách từ chối nhận" },
  { value: "MISSING_ACCESSORY", label: "Thiếu phụ kiện" },
  { value: "DEVICE_MISMATCH", label: "Sai thiết bị / sai serial" },
  { value: "DAMAGED_ITEM_AT_DELIVERY", label: "Thiết bị hư hỏng khi giao" },
  { value: "OTHER", label: "Khác" },
];

/** Lý do thu hồi thất bại (đồng bộ enum backend ReturnRecord.failure.reason) */
export const RETURN_FAILURE_OPTIONS = [
  { value: "MISSING_DEVICE", label: "Khách báo làm mất thiết bị" },
  { value: "DAMAGED_DEVICE", label: "Thiết bị hỏng hóc" },
  { value: "OTHER", label: "Lý do khác (Bắt buộc nhập ghi chú)" },
];

/** Nhãn hiển thị; giữ mã cũ để đọc bản ghi lưu trước khi đổi danh sách */
export const RETURN_FAILURE_REASON_LABELS = {
  CUSTOMER_UNAVAILABLE: "Khách vắng mặt / Không liên hệ được",
  WRONG_ADDRESS: "Sai địa chỉ / Không tìm thấy vị trí",
  MISSING_DEVICE: "Khách báo làm mất thiết bị",
  DAMAGED_DEVICE: "Thiết bị hỏng hóc",
  OTHER: "Lý do khác",
  CUSTOMER_NO_SHOW: "Khách không có mặt",
  CUSTOMER_REJECT_RETURN: "Khách từ chối trả",
  CONTACT_FAILED: "Không liên hệ được khách",
};

export function formatReturnFailureReason(reason) {
  if (!reason) return "—";
  return RETURN_FAILURE_REASON_LABELS[reason] || reason;
}

export const STATUS_BADGE = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
  VOID: "bg-amber-100 text-amber-700 border-amber-200",
};
