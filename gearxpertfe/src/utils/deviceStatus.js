/**
 * Trạng thái thiết bị catalog (model Device — gearxpertbe/models/Device.js).
 * Khác DeviceItem (từng chiếc) có thể RENTED / MAINTENANCE.
 */
export const DEVICE_CATALOG_STATUSES = [
  "AVAILABLE",
  "SUSPICIOUS",
  "STOPPED",
  "DISCONTINUED",
];

/** Giá trị cũ từ FE/DB trước khi chuẩn hóa enum */
const LEGACY_CATALOG_STATUS_MAP = {
  MAINTENANCE: "SUSPICIOUS",
  BROKEN: "DISCONTINUED",
  RENTED: "AVAILABLE",
};

export function normalizeCatalogDeviceStatus(status) {
  if (!status) return "AVAILABLE";
  if (LEGACY_CATALOG_STATUS_MAP[status]) return LEGACY_CATALOG_STATUS_MAP[status];
  if (DEVICE_CATALOG_STATUSES.includes(status)) return status;
  return "AVAILABLE";
}

export const DEVICE_STATUS_CONFIG = {
  AVAILABLE: {
    label: "Sẵn sàng",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  SUSPICIOUS: {
    label: "Cần kiểm tra",
    className: "bg-amber-100 text-amber-800 border-amber-200",
  },
  STOPPED: {
    label: "Tạm dừng",
    className: "bg-gray-100 text-gray-600 border-gray-200",
  },
  DISCONTINUED: {
    label: "Ngừng kinh doanh",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};
