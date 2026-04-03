import {useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiRefreshCw, FiStar } from "react-icons/fi";
import { getDeviceDetail, getDeviceItemsForSupplier } from "../../service/ApiService/DeviceApi";
import { DEVICE_STATUS_CONFIG } from "../../utils/deviceStatus";
import { formatCurrency, formatDate, normalizeSpecs } from "../../utils/formatters";
import { toast } from "react-toastify";

const DEVICE_ITEM_STATUS_VI = {
  AVAILABLE: "Sẵn sàng",
  RENTED: "Đang thuê",
  RESERVED: "Đã giữ",
  MAINTENANCE: "Bảo trì",
  REPAIR: "Sửa chữa",
  DAMAGED: "Hỏng",
  LOST: "Mất",
  RETIRED: "Ngưng dùng",
};

const DEVICE_ITEM_STATUS_CLASS = {
  AVAILABLE: "bg-emerald-50 text-emerald-800 border-emerald-200",
  RENTED: "bg-violet-50 text-violet-800 border-violet-200",
  RESERVED: "bg-amber-50 text-amber-800 border-amber-200",
  MAINTENANCE: "bg-orange-50 text-orange-800 border-orange-200",
  REPAIR: "bg-orange-50 text-orange-900 border-orange-200",
  DAMAGED: "bg-red-50 text-red-800 border-red-200",
  LOST: "bg-slate-100 text-slate-700 border-slate-200",
  RETIRED: "bg-slate-100 text-slate-600 border-slate-200",
};

export default function SupplierDeviceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState([]);
  const [unitsTotal, setUnitsTotal] = useState(0);
  const [unitsLoading, setUnitsLoading] = useState(false);

  const fetchDevice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getDeviceDetail(id);
      setDevice(data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Không thể tải sản phẩm");
    } finally {
      setLoading(false);
    }
  }, [id]); 

  useEffect(() => {
    fetchDevice();
  }, [fetchDevice]);

  const fetchUnits = useCallback(async () => {
    const devId = device?._id;
    if (!devId) return;
    setUnitsLoading(true);
    try {
      const res = await getDeviceItemsForSupplier(devId, { limit: 500 });
      setUnits(res?.items || []);
      setUnitsTotal(res?.total ?? 0);
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.message || "Không tải được danh sách đơn vị");
      setUnits([]);
      setUnitsTotal(0);
    } finally {
      setUnitsLoading(false);
    }
  }, [device?._id]);

  useEffect(() => {
    if (device?._id) {
      fetchUnits();
    }
  }, [device?._id, fetchUnits]);

  const statusCfg = useMemo(
    () => DEVICE_STATUS_CONFIG[device?.status] || null,
    [device?.status]
  );

  const specsList = useMemo(() => normalizeSpecs(device?.specs), [device?.specs]);

  const renderRatingStar = () => (
    <FiStar size={16} className="text-amber-500 fill-current" />
  );

  if (loading) {
    return <div className="text-sm text-slate-500">Đang tải...</div>;
  }

  if (!device) {
    return <div className="text-sm text-slate-500">Không tìm thấy sản phẩm.</div>;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-6">
      {/* <div className="rounded-[28px] border border-slate-200 bg-slate-100/80 p-3 shadow-inner"> */}
        {/* <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-indigo-50/60 pt-6 px-6 pb-4 shadow-md"> */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/supplier/devices")}
            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
            aria-label="Back"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
              Chi tiết sản phẩm
            </h2>
            <p className="text-sm text-slate-600">
              Xem thông tin chi tiết, hiệu suất và đánh giá về sản phẩm.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/supplier/devices/${device._id || id}/edit`)}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Chỉnh sửa sản phẩm
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-white p-4 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <p className="text-xs uppercase tracking-wide text-slate-400">Đánh giá</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-semibold text-slate-900">
              {Number(device.ratingAvg || 0).toFixed(1)} / 5
            </p>
            {renderRatingStar()}
          </div>
          <p className="text-sm text-slate-500">{device.reviewCount || 0} đánh giá</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-white p-4 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <p className="text-xs uppercase tracking-wide text-slate-400">Lượt thuê</p>
          <p className="text-2xl font-semibold text-slate-900">{device.rentalCount || 0}</p>
          <p className="text-sm text-slate-500">
            {device.totalRentedUnits || 0} thiết bị đã thuê
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-white p-4 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <p className="text-xs uppercase tracking-wide text-slate-400">Đơn vị (DeviceItem)</p>
          <p className="text-2xl font-semibold text-slate-900">
            {device.stockQuantity || 0}
          </p>
          <p className="text-sm text-slate-500">Tổng serial trong kho</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 via-white to-white p-4 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
          <span
            className={`mt-2 inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-semibold ${
              statusCfg?.className ||
              "bg-slate-100 text-slate-600 border border-slate-200"
            }`}
          >
            {statusCfg?.label || device.status}
          </span>
        </div>
      </div>
        {/* </div> */}
      {/* </div> */}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-0 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-indigo-100 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Thông tin cơ bản</h3>
              <p className="text-sm text-slate-500">
                Các chi tiết cốt lõi của sản phẩm này.
              </p>
            </div>
            <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Tên</p>
                <p className="text-sm font-medium text-slate-900">{device.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Danh mục</p>
                <p className="text-sm font-medium text-slate-900">
                  {device.category === 'CAMERA' ? 'Máy ảnh' : device.category === 'AUDIO' ? 'Âm thanh' : device.category === 'OFFICE' ? 'Văn phòng' : device.category === 'GAMING' ? 'Gaming' : device.category === 'ACCESSORY' ? 'Phụ kiện' : device.category === 'LIGHTING' ? 'Ánh sáng' : device.category === 'DRONE' ? 'Flycam' : 'Khác'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Thành phố</p>
                <p className="text-sm font-medium text-slate-900">
                  {device.location?.city || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Kho hàng</p>
                <p className="text-sm font-medium text-slate-900">
                  {device.location?.warehouse || "-"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">Mô tả</p>
                <p className="text-sm text-slate-600">
                  {device.description || "Không có mô tả."}
                </p>
              </div>
            </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-0 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-100 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Giá & Tồn kho</h3>
              <p className="text-sm text-slate-500">
                Thông tin về giá thuê và tồn kho.
              </p>
            </div>
            <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Giá / ngày</p>
                <p className="text-sm font-medium text-slate-900">
                  {formatCurrency(device.rentPrice?.perDay || 0)} ₫
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Giá / tuần</p>
                <p className="text-sm font-medium text-slate-900">
                  {formatCurrency(device.rentPrice?.perWeek || 0)} ₫
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Giá / tháng</p>
                <p className="text-sm font-medium text-slate-900">
                  {formatCurrency(device.rentPrice?.perMonth || 0)} ₫
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Tiền cọc</p>
                <p className="text-sm font-medium text-slate-900">
                  {formatCurrency(device.depositAmount || 0)} ₫
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Tổng đơn vị</p>
                <p className="text-sm font-medium text-slate-900">
                  {device.stockQuantity || 0}{" "}
                  <span className="text-slate-500 font-normal">({unitsTotal} dòng chi tiết)</span>
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Trạng thái</p>
                <p className="text-sm font-medium text-slate-900">
                  {statusCfg?.label || device.status}
                </p>
              </div>
            </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-0 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-violet-50 to-white px-6 py-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Đơn vị vật lý (serial)</h3>
                <p className="text-sm text-slate-500">
                  Mỗi dòng là một thiết bị thật gắn với loại này — số lượng đồng bộ với tổng ở trên.
                </p>
              </div>
              <button
                type="button"
                onClick={() => fetchUnits()}
                disabled={unitsLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <FiRefreshCw size={16} className={unitsLoading ? "animate-spin" : ""} />
                Làm mới
              </button>
            </div>
            <div className="p-6 overflow-x-auto">
              {unitsLoading && units.length === 0 ? (
                <p className="text-sm text-slate-500">Đang tải danh sách...</p>
              ) : units.length === 0 ? (
                <p className="text-sm text-slate-500">
                  Chưa có đơn vị nào. Thêm serial tại{" "}
                  <span className="font-medium text-slate-700">Quản lý kho</span> (hoặc chạy migration nếu dữ liệu
                  cũ).
                </p>
              ) : (
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                      <th className="pb-2 pr-4 font-semibold">Serial</th>
                      <th className="pb-2 pr-4 font-semibold">Mã nội bộ</th>
                      <th className="pb-2 pr-4 font-semibold">Ảnh</th>
                      <th className="pb-2 pr-4 font-semibold">Trạng thái</th>
                      <th className="pb-2 pr-4 font-semibold">Tình trạng</th>
                      <th className="pb-2 font-semibold">Tạo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {units.map((u) => (
                      <tr key={u._id} className="text-slate-800">
                        <td className="py-2.5 pr-4 font-mono text-xs">
                          {u.serialNumber || "—"}
                        </td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-slate-600">
                          {u.internalCode || "—"}
                        </td>
                        <td className="py-2.5 pr-4">
                          {u.images?.length ? (
                            <div className="flex flex-wrap gap-1">
                              {u.images.slice(0, 3).map((src, i) => (
                                <a
                                  key={i}
                                  href={src}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block shrink-0"
                                >
                                  <img
                                    src={src}
                                    alt=""
                                    className="h-10 w-10 rounded-md object-cover border border-slate-200"
                                  />
                                </a>
                              ))}
                              {u.images.length > 3 ? (
                                <span className="self-center text-xs text-slate-500">
                                  +{u.images.length - 3}
                                </span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${
                              DEVICE_ITEM_STATUS_CLASS[u.status] ||
                              "bg-slate-50 text-slate-700 border-slate-200"
                            }`}
                          >
                            {DEVICE_ITEM_STATUS_VI[u.status] || u.status}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-600">{u.condition || "—"}</td>
                        <td className="py-2.5 text-slate-500 whitespace-nowrap">
                          {u.createdAt ? formatDate(u.createdAt) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {!unitsLoading && unitsTotal > units.length ? (
                <p className="mt-3 text-xs text-slate-500">
                  Hiển thị {units.length}/{unitsTotal}. Tăng limit API nếu cần xem hết.
                </p>
              ) : null}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-0 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-sky-100 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Thông số kỹ thuật</h3>
              <p className="text-sm text-slate-500">
                Các thông số chi tiết của sản phẩm.
              </p>
            </div>
            <div className="p-6">
            {specsList.length === 0 ? (
              <p className="text-sm text-slate-500">Không có thông số.</p>
            ) : (
              <div className="space-y-2">
                {specsList.map((spec, index) => (
                  <div
                    key={`${spec.key}-${index}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-slate-500">{spec.key}</span>
                    <span className="font-medium text-slate-800">
                      {String(spec.value)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-0 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-amber-100 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Khách hàng đánh giá</h3>
              <p className="text-sm text-slate-500">
                Phản hồi mới nhất từ khách thuê.
              </p>
            </div>
            <div className="p-6">
            {device.reviews?.length ? (
              <div className="space-y-4">
                {device.reviews.map((review) => (
                  <div
                    key={review._id}
                    className="rounded-xl border border-slate-100 bg-gradient-to-r from-slate-50 to-white p-4 transition-all duration-200 hover:shadow-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {review.userId?.fullName || "Khách hàng"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatDate(review.createdAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">
                          {review.rating} / 5
                        </span>
                        {renderRatingStar()}
                      </div>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">{review.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Chưa có đánh giá nào.</p>
            )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-0 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-indigo-100 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Thư viện ảnh</h3>
              <p className="text-sm text-slate-500">
                Hình ảnh đã tải lên của sản phẩm này.
              </p>
            </div>
            <div className="p-6">
            {device.images?.length ? (
              <div className="grid grid-cols-2 gap-3">
                {device.images.map((img, index) => (
                  <div
                    key={`${img}-${index}`}
                    className="aspect-square overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition-transform duration-200 hover:scale-[1.02]"
                  >
                    <img src={img} alt="device" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-slate-500">Không có ảnh</div>
            )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-0 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-100 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Bảo trì</h3>
              <p className="text-sm text-slate-500">
                Lịch sử bảo trì và kế hoạch sắp tới.
              </p>
            </div>
            <div className="p-6">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Lần bảo trì cuối</span>
                <span className="font-medium text-slate-900">
                  {formatDate(device.maintenanceSummary?.lastMaintenanceAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Lần bảo trì tới</span>
                <span className="font-medium text-slate-900">
                  {formatDate(device.maintenanceSummary?.nextMaintenanceAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tổng số lần bảo trì</span>
                <span className="font-medium text-slate-900">
                  {device.maintenanceSummary?.totalMaintenanceCount || 0}
                </span>
              </div>
            </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-0 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-sky-100 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Mốc thời gian</h3>
              <p className="text-sm text-slate-500">
                Thời gian tạo và cập nhật.
              </p>
            </div>
            <div className="p-6">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Ngày tạo</span>
                <span className="font-medium text-slate-900">
                  {formatDate(device.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Ngày cập nhật</span>
                <span className="font-medium text-slate-900">
                  {formatDate(device.updatedAt)}
                </span>
              </div>
            </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
