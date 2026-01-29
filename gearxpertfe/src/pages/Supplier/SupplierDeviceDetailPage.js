import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiStar } from "react-icons/fi";
import { getDeviceDetail } from "../../service/ApiService/DeviceApi";
import { DEVICE_STATUS_CONFIG } from "../../utils/deviceStatus";
import { formatCurrency, formatDate, normalizeSpecs } from "../../utils/formatters";
import { toast } from "react-toastify";

export default function SupplierDeviceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDevice = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getDeviceDetail(id);
      setDevice(data);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load product");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevice();
  }, [id]);


  const statusCfg = useMemo(
    () => DEVICE_STATUS_CONFIG[device?.status] || null,
    [device?.status]
  );

  const specsList = useMemo(() => normalizeSpecs(device?.specs), [device?.specs]);

  const renderRatingStar = () => (
    <FiStar size={16} className="text-amber-500 fill-current" />
  );

  if (loading) {
    return <div className="text-sm text-slate-500">Loading...</div>;
  }

  if (!device) {
    return <div className="text-sm text-slate-500">Product not found.</div>;
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
              Product Details
            </h2>
            <p className="text-sm text-slate-600">
              Review complete product information, performance, and feedback.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate(`/supplier/devices/${device._id || id}/edit`)}
          className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Edit Product
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-white p-4 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <p className="text-xs uppercase tracking-wide text-slate-400">Rating</p>
          <div className="flex items-center gap-2">
            <p className="text-2xl font-semibold text-slate-900">
              {Number(device.ratingAvg || 0).toFixed(1)} / 5
            </p>
            {renderRatingStar()}
          </div>
          <p className="text-sm text-slate-500">{device.reviewCount || 0} reviews</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-emerald-50 via-white to-white p-4 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <p className="text-xs uppercase tracking-wide text-slate-400">Total Rentals</p>
          <p className="text-2xl font-semibold text-slate-900">{device.rentalCount || 0}</p>
          <p className="text-sm text-slate-500">
            {device.totalRentedUnits || 0} units rented
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50 via-white to-white p-4 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
          <p className="text-xs uppercase tracking-wide text-slate-400">Stock</p>
          <p className="text-2xl font-semibold text-slate-900">
            {device.stockQuantity || 0}
          </p>
          <p className="text-sm text-slate-500">Available units</p>
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
              <h3 className="text-lg font-semibold text-slate-900">Basic Information</h3>
              <p className="text-sm text-slate-500">
                Core details about this product.
              </p>
            </div>
            <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Name</p>
                <p className="text-sm font-medium text-slate-900">{device.name}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Category</p>
                <p className="text-sm font-medium text-slate-900">
                  {device.category || "Other"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">City</p>
                <p className="text-sm font-medium text-slate-900">
                  {device.location?.city || "-"}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Warehouse</p>
                <p className="text-sm font-medium text-slate-900">
                  {device.location?.warehouse || "-"}
                </p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-slate-400">Description</p>
                <p className="text-sm text-slate-600">
                  {device.description || "No description provided."}
                </p>
              </div>
            </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-0 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-100 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Pricing & Inventory</h3>
              <p className="text-sm text-slate-500">
                Rental pricing and inventory information.
              </p>
            </div>
            <div className="p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Price / day</p>
                <p className="text-sm font-medium text-slate-900">
                  {formatCurrency(device.rentPrice?.perDay || 0)} ₫
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Price / week</p>
                <p className="text-sm font-medium text-slate-900">
                  {formatCurrency(device.rentPrice?.perWeek || 0)} ₫
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Price / month</p>
                <p className="text-sm font-medium text-slate-900">
                  {formatCurrency(device.rentPrice?.perMonth || 0)} ₫
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Deposit</p>
                <p className="text-sm font-medium text-slate-900">
                  {formatCurrency(device.depositAmount || 0)} ₫
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Stock</p>
                <p className="text-sm font-medium text-slate-900">
                  {device.stockQuantity || 0}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Status</p>
                <p className="text-sm font-medium text-slate-900">
                  {statusCfg?.label || device.status}
                </p>
              </div>
            </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-0 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-sky-100 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Technical Specifications</h3>
              <p className="text-sm text-slate-500">
                Detailed specs provided for the product.
              </p>
            </div>
            <div className="p-6">
            {specsList.length === 0 ? (
              <p className="text-sm text-slate-500">No specifications.</p>
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
              <h3 className="text-lg font-semibold text-slate-900">Customer Reviews</h3>
              <p className="text-sm text-slate-500">
                Latest feedback from renters.
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
                          {review.userId?.fullName || "Customer"}
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
              <p className="text-sm text-slate-500">No reviews yet.</p>
            )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-0 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-indigo-100 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Product Gallery</h3>
              <p className="text-sm text-slate-500">
                Uploaded images for this product.
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
              <div className="text-sm text-slate-500">No images</div>
            )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-0 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-emerald-100 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Maintenance</h3>
              <p className="text-sm text-slate-500">
                Maintenance history and upcoming schedule.
              </p>
            </div>
            <div className="p-6">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Last maintenance</span>
                <span className="font-medium text-slate-900">
                  {formatDate(device.maintenanceSummary?.lastMaintenanceAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Next maintenance</span>
                <span className="font-medium text-slate-900">
                  {formatDate(device.maintenanceSummary?.nextMaintenanceAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Total maintenance</span>
                <span className="font-medium text-slate-900">
                  {device.maintenanceSummary?.totalMaintenanceCount || 0}
                </span>
              </div>
            </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-0 shadow-md ring-1 ring-slate-100 transition-all duration-300 hover:shadow-lg overflow-hidden">
            <div className="border-b border-slate-200 bg-gradient-to-r from-sky-100 to-white px-6 py-4">
              <h3 className="text-lg font-semibold text-slate-900">Timeline</h3>
              <p className="text-sm text-slate-500">
                Creation and update timestamps.
              </p>
            </div>
            <div className="p-6">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Created</span>
                <span className="font-medium text-slate-900">
                  {formatDate(device.createdAt)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Updated</span>
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
