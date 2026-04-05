import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { FiArrowLeft, FiPlus, FiX } from "react-icons/fi";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { getDeviceDetail, updateDevice } from "../../service/ApiService/DeviceApi";
import { VIETNAM_CITIES } from "../../utils/vietnamCities";
import { normalizeSpecs } from "../../utils/formatters";
import { normalizeCatalogDeviceStatus } from "../../utils/deviceStatus";

export default function SupplierEditDevicePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [unitCountFromItems, setUnitCountFromItems] = useState(0);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "CAMERA",
    perDay: "",
    perWeek: "",
    perMonth: "",
    depositAmount: "",
    city: "",
    status: "AVAILABLE",
    specs: [{ key: "", value: "" }],
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [loadingDevice, setLoadingDevice] = useState(true);
  const [oldImages, setOldImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const fileInputRef = useRef();

  const combinedImages = useMemo(() => {
    const oldItems = oldImages.map((src, idx) => ({
      src,
      kind: "old",
      idx,
    }));
    const newItems = newImagePreviews.map((src, idx) => ({
      src,
      kind: "new",
      idx,
    }));
    return [...oldItems, ...newItems];
  }, [oldImages, newImagePreviews]);

  useEffect(() => {
    const fetchDevice = async () => {
      if (!id) return;
      setLoadingDevice(true);
      try {
        const data = await getDeviceDetail(id);
        const specsRows = normalizeSpecs(data?.specs);
        setUnitCountFromItems(data?.stockQuantity ?? 0);
        setFormData({
          name: data?.name || "",
          description: data?.description || "",
          category: data?.category || "CAMERA",
          perDay: data?.rentPrice?.perDay || "",
          perWeek: data?.rentPrice?.perWeek || "",
          perMonth: data?.rentPrice?.perMonth || "",
          depositAmount: data?.depositAmount || "",
          city: data?.location?.city || "",
          status: normalizeCatalogDeviceStatus(data?.status),
          specs: specsRows.length ? specsRows : [{ key: "", value: "" }],
        });
        setOldImages(data?.images || []);
        setNewImages([]);
        setNewImagePreviews([]);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Không thể tải sản phẩm");
      } finally {
        setLoadingDevice(false);
      }
    };
    fetchDevice();
  }, [id]);

  const compressImage = (file, maxWidth = 1200, quality = 0.8) =>
    new Promise((resolve) => {
      if (!file.type.startsWith("image/")) return resolve(file);
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(url);
        const scale = Math.min(1, maxWidth / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => resolve(new File([blob], file.name, { type: "image/jpeg" })),
          "image/jpeg",
          quality
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file);
      };
      img.src = url;
    });

  const handleImageChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const compressed = await Promise.all(files.map((f) => compressImage(f)));
    setNewImages((prev) => {
      const remainingSlots = Math.max(0, 5 - oldImages.length - prev.length);
      const nextImages = [...prev, ...compressed].slice(0, prev.length + remainingSlots);
      setNewImagePreviews(nextImages.map((file) => URL.createObjectURL(file)));
      return nextImages;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveOldImage = (idx) => {
    setOldImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleRemoveNewImage = (idx) => {
    const nextImages = newImages.filter((_, i) => i !== idx);
    setNewImages(nextImages);
    setNewImagePreviews(nextImages.map((file) => URL.createObjectURL(file)));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseInt(value) || "" : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = "Tên thiết bị là bắt buộc";
    if (!formData.description.trim()) newErrors.description = "Mô tả là bắt buộc";
    if (!formData.perDay || formData.perDay <= 0) newErrors.perDay = "Giá thuê ngày là bắt buộc";
    if (!formData.depositAmount || formData.depositAmount <= 0) {
      newErrors.depositAmount = "Tiền cọc là bắt buộc";
    }
    if (!formData.city.trim()) newErrors.city = "Tỉnh/Thành phố là bắt buộc";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const parseSpecs = (rows) => {
    const specs = {};
    rows.forEach((row) => {
      const key = typeof row.key === "string" ? row.key.trim() : String(row.key ?? "");
      if (!key) return;
      specs[key] = typeof row.value === "string" ? row.value.trim() || true : row.value ?? true;
    });
    return specs;
  };

  const handleSpecChange = (index, field, value) => {
    setFormData((prev) => ({
      ...prev,
      specs: prev.specs.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const addSpecRow = () => {
    setFormData((prev) => ({
      ...prev,
      specs: [...prev.specs, { key: "", value: "" }],
    }));
  };

  const removeSpecRow = (index) => {
    setFormData((prev) => {
      const nextSpecs = prev.specs.filter((_, idx) => idx !== index);
      return {
        ...prev,
        specs: nextSpecs.length ? nextSpecs : [{ key: "", value: "" }],
      };
    });
  };

  const submitDevice = async () => {
    try {
      setLoading(true);
      const form = new FormData();
      form.append("name", formData.name);
      form.append("description", formData.description);
      form.append("category", formData.category);
      form.append(
        "rentPrice",
        JSON.stringify({
          perDay: parseFloat(formData.perDay),
          ...(formData.perWeek && { perWeek: parseFloat(formData.perWeek) }),
          ...(formData.perMonth && { perMonth: parseFloat(formData.perMonth) }),
        })
      );
      form.append("depositAmount", parseFloat(formData.depositAmount));
      form.append(
        "location",
        JSON.stringify({
          warehouse: "",
          city: formData.city,
        })
      );
      form.append("status", formData.status);
      form.append("oldImages", JSON.stringify(oldImages));
      const specsPayload = parseSpecs(formData.specs);
      form.append("specs", JSON.stringify(specsPayload));
      newImages.forEach((img) => form.append("images", img));

      const res = await updateDevice(id, form);
      if (res?.device?.stockQuantity != null) {
        setUnitCountFromItems(res.device.stockQuantity);
      }
      toast.success("Cập nhật sản phẩm thành công!");
      navigate(`/supplier/devices/${id}`);
    } catch (error) {
      console.error("Error updating device:", error);
      const errorMsg =
        error.response?.data?.message || error.message || "Không thể cập nhật sản phẩm";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      submitDevice();
    }
  };

  if (loadingDevice) {
    return <div className="text-sm text-slate-500">Đang tải...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate(`/supplier/devices/${id}`)}
            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Back"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
              Chỉnh sửa sản phẩm
            </h2>
            <p className="text-sm text-slate-600">
              Cập nhật thông tin để giữ sản phẩm luôn chính xác
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Thông tin cơ bản</h3>
            <p className="text-sm text-slate-500 mb-4">Cập nhật thông tin chi tiết về sản phẩm</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tên sản phẩm *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ví dụ: MacBook Pro 14 M3 Pro"
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                    errors.name
                      ? "border-red-500 bg-red-50 focus:ring-red-200"
                      : "border-slate-200 focus:ring-primary/20"
                  } focus:ring-2 focus:border-primary outline-none`}
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Danh mục *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                >
                  <option value="CAMERA">📷 Máy ảnh</option>
                  <option value="AUDIO">🎧 Âm thanh</option>
                  <option value="OFFICE">💼 Văn phòng</option>
                  <option value="GAMING">🎮 Gaming</option>
                  <option value="ACCESSORY">🔌 Phụ kiện</option>
                  <option value="LIGHTING">💡 Ánh sáng</option>
                  <option value="DRONE">🚁 Flycam</option>
                  <option value="OTHER">📁 Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mô tả *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Mô tả thiết bị của bạn thật chi tiết"
                  rows="4"
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                    errors.description
                      ? "border-red-500 bg-red-50 focus:ring-red-200"
                      : "border-slate-200 focus:ring-primary/20"
                  } focus:ring-2 focus:border-primary outline-none`}
                />
                {errors.description && (
                  <p className="text-xs text-red-600 mt-1">{errors.description}</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Thông số kỹ thuật</h3>
            <p className="text-sm text-slate-500 mb-4">
              Thêm thông số chi tiết theo định dạng key-value
            </p>
            <div className="space-y-3">
              {formData.specs.map((spec, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Tên thông số"
                    value={spec.key}
                    onChange={(e) => handleSpecChange(idx, "key", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Giá trị"
                      value={spec.value}
                      onChange={(e) => handleSpecChange(idx, "value", e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => removeSpecRow(idx)}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50"
                      aria-label="Remove spec"
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addSpecRow}
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-dark"
              >
                <FiPlus size={16} />
                Thêm thông số
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Hình ảnh sản phẩm</h3>
            <p className="text-sm text-slate-500 mb-4">
              Tối đa 5 ảnh, ảnh đầu tiên sẽ là ảnh chính
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              ref={fileInputRef}
              onChange={handleImageChange}
              className="hidden"
            />
            <div className="mt-2 flex flex-wrap items-start gap-4">
              {combinedImages.map((item, idx) => (
                <div
                  key={`${item.kind}-${item.src}-${idx}`}
                  className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50"
                >
                  <img src={item.src} alt="preview" className="object-cover w-full h-full" />
                  {idx === 0 && (
                    <span className="absolute left-2 bottom-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                      Ảnh chính
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      item.kind === "old"
                        ? handleRemoveOldImage(item.idx)
                        : handleRemoveNewImage(item.idx)
                    }
                    className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600 transition"
                    title="Remove image"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                disabled={combinedImages.length >= 5}
                onClick={() => fileInputRef.current?.click()}
                className="flex h-24 w-24 sm:h-28 sm:w-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-primary/40 hover:bg-primary/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPlus size={22} />
                <span className="text-xs font-semibold">Tải ảnh lên</span>
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Giá thuê</h3>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Giá theo ngày *
                </label>
                <input
                  type="number"
                  name="perDay"
                  value={formData.perDay}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                    errors.perDay
                      ? "border-red-500 bg-red-50 focus:ring-red-200"
                      : "border-slate-200 focus:ring-primary/20"
                  } focus:ring-2 focus:border-primary outline-none`}
                />
                {errors.perDay && <p className="text-xs text-red-600 mt-1">{errors.perDay}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Giá theo tuần
                </label>
                <input
                  type="number"
                  name="perWeek"
                  value={formData.perWeek}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Giá theo tháng
                </label>
                <input
                  type="number"
                  name="perMonth"
                  value={formData.perMonth}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tiền đặt cọc *
                </label>
                <input
                  type="number"
                  name="depositAmount"
                  value={formData.depositAmount}
                  onChange={handleChange}
                  placeholder="0"
                  min="0"
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                    errors.depositAmount
                      ? "border-red-500 bg-red-50 focus:ring-red-200"
                      : "border-slate-200 focus:ring-primary/20"
                  } focus:ring-2 focus:border-primary outline-none`}
                />
                {errors.depositAmount && (
                  <p className="text-xs text-red-600 mt-1">{errors.depositAmount}</p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Kho hàng</h3>
            <div className="mt-2 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
              <span className="font-medium text-slate-800">Đơn vị vật lý (DeviceItem):</span>{" "}
              <span className="tabular-nums font-semibold text-slate-900">{unitCountFromItems}</span>
              <span className="text-slate-500"> — đếm theo serial trong hệ thống, không chỉnh tay ở đây.</span>
              <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                <Link to="/supplier/inventory" className="text-primary hover:underline">
                  Quản lý kho
                </Link>
                <Link to={`/supplier/devices/${id}`} className="text-primary hover:underline">
                  Chi tiết &amp; thêm serial
                </Link>
              </div>
            </div>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Trạng thái
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                >
                  <option value="AVAILABLE">Sẵn có</option>
                  <option value="SUSPICIOUS">Cần kiểm tra</option>
                  <option value="STOPPED">Tạm dừng</option>
                  <option value="DISCONTINUED">Ngừng kinh doanh</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Vị trí</h3>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tỉnh/Thành phố *
                </label>
                <select
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                    errors.city
                      ? "border-red-500 bg-red-50 focus:ring-red-200"
                      : "border-slate-200 focus:ring-primary/20"
                  } focus:ring-2 focus:border-primary outline-none bg-white`}
                >
                  <option value="">Chọn Tỉnh/Thành phố</option>
                  {VIETNAM_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
                {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3">
              <motion.button
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Đang lưu..." : "Lưu thay đổi"}
              </motion.button>
              <button
                type="button"
                onClick={() => navigate(`/supplier/devices/${id}`)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
              >
                Hủy
              </button>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
