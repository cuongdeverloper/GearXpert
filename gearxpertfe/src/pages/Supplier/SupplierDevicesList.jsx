import { useEffect, useMemo, useState } from "react";
import { mockSupplierDevices } from "../../mocks/devices.mock";
import { DEVICE_STATUS_CONFIG } from "../../utils/deviceStatus";

const CATEGORIES = ["ALL", "CAMERA", "AUDIO", "OFFICE", "GAMING", "ACCESSORY"];
const PAGE_SIZES = [5, 10, 20];

export default function SupplierDevicesList() {
  const [category, setCategory] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* ===== FILTER ===== */
  const filteredDevices = useMemo(() => {
    if (category === "ALL") return mockSupplierDevices;
    return mockSupplierDevices.filter((d) => d.category === category);
  }, [category]);

  /* reset page when filter / page size changes */
  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  /* ===== PAGINATION ===== */
  const total = filteredDevices.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  /* keep page in valid range */
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
    if (page < 1) setPage(1);
  }, [page, totalPages]);

  const safePage = Math.min(page, totalPages);

  const paginatedDevices = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredDevices.slice(start, start + pageSize);
  }, [filteredDevices, safePage, pageSize]);

  return (
    <div className="space-y-4">
      {/* Header + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-xl font-semibold">Supplier - Devices</h1>

        <div className="flex items-center gap-2">
          {/* Category */}
          <select
            value={category}
            onChange={handleCategoryChange}
            className="rounded border px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c === "ALL" ? "All categories" : c}
              </option>
            ))}
          </select>

          {/* Page size */}
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="rounded border px-3 py-2 text-sm"
          >
            {PAGE_SIZES.map((s) => (
              <option key={s} value={s}>
                {s}/page
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="grid gap-3">
        {paginatedDevices.map((device) => {
          const statusCfg = DEVICE_STATUS_CONFIG[device.status];

          return (
            <div
              key={device._id}
              className="flex gap-4 rounded-lg border p-4"
            >
              <img
                src={device.images?.[0] || "https://via.placeholder.com/150"}
                alt={device.name}
                className="h-20 w-20 rounded object-cover"
              />

              <div className="flex-1">
                <div className="flex justify-between gap-2">
                  <div>
                    <h2 className="font-medium">{device.name}</h2>
                    <p className="text-sm text-gray-500">
                      {device.category}
                      {device.location?.city &&
                        ` · ${device.location.city}`}
                    </p>
                  </div>

                  <span
                    className={`h-fit rounded border px-2 py-1 text-xs font-medium ${
                      statusCfg?.className ||
                      "bg-gray-100 text-gray-600 border-gray-200"
                    }`}
                  >
                    {statusCfg?.label || device.status}
                  </span>
                </div>

                <p className="mt-2 text-sm">
                  Rent: <b>${device.rentPrice.perDay}/day</b> · Deposit:{" "}
                  <b>${device.depositAmount}</b>
                </p>
              </div>
            </div>
          );
        })}

        {paginatedDevices.length === 0 && (
          <div className="rounded border p-6 text-center text-sm text-gray-500">
            No devices found
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-600">
          Showing{" "}
          {total === 0 ? 0 : (safePage - 1) * pageSize + 1}–
          {Math.min(safePage * pageSize, total)} of {total}
        </p>

        <div className="flex items-center gap-2">
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            disabled={safePage === 1}
            onClick={() => setPage(1)}
          >
            First
          </button>
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            disabled={safePage === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>

          <span className="text-sm">
            Page <b>{safePage}</b> / {totalPages}
          </span>

          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            disabled={safePage === totalPages}
            onClick={() =>
              setPage((p) => Math.min(totalPages, p + 1))
            }
          >
            Next
          </button>
          <button
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
            disabled={safePage === totalPages}
            onClick={() => setPage(totalPages)}
          >
            Last
          </button>
        </div>
      </div>
    </div>
  );
}
