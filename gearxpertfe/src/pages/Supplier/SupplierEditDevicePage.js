import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FiArrowLeft, FiPlus, FiX } from "react-icons/fi";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { getDeviceDetail, updateDevice } from "../../service/ApiService/DeviceApi";
import { VIETNAM_CITIES } from "../../utils/vietnamCities";
import { normalizeSpecs } from "../../utils/formatters";

export default function SupplierEditDevicePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "CAMERA",
    stockQuantity: 1,
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
        setFormData({
          name: data?.name || "",
          description: data?.description || "",
          category: data?.category || "CAMERA",
          stockQuantity: data?.stockQuantity || 1,
          perDay: data?.rentPrice?.perDay || "",
          perWeek: data?.rentPrice?.perWeek || "",
          perMonth: data?.rentPrice?.perMonth || "",
          depositAmount: data?.depositAmount || "",
          city: data?.location?.city || "",
          status: data?.status || "AVAILABLE",
          specs: specsRows.length ? specsRows : [{ key: "", value: "" }],
        });
        setOldImages(data?.images || []);
        setNewImages([]);
        setNewImagePreviews([]);
      } catch (error) {
        toast.error(error?.response?.data?.message || "Failed to load product");
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
    if (!formData.name.trim()) newErrors.name = "Device name is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.perDay || formData.perDay <= 0) newErrors.perDay = "Daily price is required";
    if (!formData.depositAmount || formData.depositAmount <= 0) {
      newErrors.depositAmount = "Deposit is required";
    }
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (formData.stockQuantity < 1) newErrors.stockQuantity = "Stock quantity must be ≥ 1";

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
      form.append("stockQuantity", parseInt(formData.stockQuantity));
      form.append("status", formData.status);
      form.append("oldImages", JSON.stringify(oldImages));
      const specsPayload = parseSpecs(formData.specs);
      form.append("specs", JSON.stringify(specsPayload));
      newImages.forEach((img) => form.append("images", img));

      await updateDevice(id, form);
      toast.success("Product updated successfully!");
      navigate(`/supplier/devices/${id}`);
    } catch (error) {
      console.error("Error updating device:", error);
      const errorMsg =
        error.response?.data?.message || error.message || "Failed to update product";
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
    return <div className="text-sm text-slate-500">Loading...</div>;
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
              Edit Product
            </h2>
            <p className="text-sm text-slate-600">
              Update information to keep your listing accurate
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Basic Information</h3>
            <p className="text-sm text-slate-500 mb-4">Update detailed product information</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., MacBook Pro 14 M3 Pro"
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                    errors.name
                      ? "border-red-500 bg-red-50 focus:ring-red-200"
                      : "border-slate-200 focus:ring-primary/20"
                  } focus:ring-2 focus:border-primary outline-none`}
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Category *
                  </label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                  >
                    <option value="CAMERA">📷 Camera</option>
                    <option value="AUDIO">🎧 Audio</option>
                    <option value="OFFICE">💼 Office</option>
                    <option value="GAMING">🎮 Gaming</option>
                    <option value="ACCESSORY">🔌 Accessories</option>
                    <option value="LIGHTING">💡 Lighting</option>
                    <option value="DRONE">🚁 Drone</option>
                    <option value="OTHER">📁 Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Device Quantity *
                  </label>
                  <input
                    type="number"
                    name="stockQuantity"
                    value={formData.stockQuantity}
                    onChange={handleChange}
                    min="1"
                    className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                      errors.stockQuantity
                        ? "border-red-500 bg-red-50 focus:ring-red-200"
                        : "border-slate-200 focus:ring-primary/20"
                    } focus:ring-2 focus:border-primary outline-none`}
                  />
                  {errors.stockQuantity && (
                    <p className="text-xs text-red-600 mt-1">{errors.stockQuantity}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Describe your device in detail"
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
            <h3 className="text-lg font-semibold text-slate-900">Technical Specifications</h3>
            <p className="text-sm text-slate-500 mb-4">
              Add detailed specs in key-value format
            </p>
            <div className="space-y-3">
              {formData.specs.map((spec, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Spec Name"
                    value={spec.key}
                    onChange={(e) => handleSpecChange(idx, "key", e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                  <div className="flex items-center gap-3">
                    <input
                      type="text"
                      placeholder="Spec Value"
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
                Add Spec
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Product Images</h3>
            <p className="text-sm text-slate-500 mb-4">
              Max 5 images, the first image is the main image
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
                      Main Image
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
                <span className="text-xs font-semibold">Upload Image</span>
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Rental Price</h3>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Daily Price *
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
                  Weekly Price
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
                  Monthly Price
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
                  Deposit *
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
            <h3 className="text-lg font-semibold text-slate-900">Inventory</h3>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Device Quantity *
                </label>
                <input
                  type="number"
                  name="stockQuantity"
                  value={formData.stockQuantity}
                  onChange={handleChange}
                  min="1"
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                    errors.stockQuantity
                      ? "border-red-500 bg-red-50 focus:ring-red-200"
                      : "border-slate-200 focus:ring-primary/20"
                  } focus:ring-2 focus:border-primary outline-none`}
                />
                {errors.stockQuantity && (
                  <p className="text-xs text-red-600 mt-1">{errors.stockQuantity}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                >
                  <option value="AVAILABLE">Available</option>
                  <option value="STOPPED">Draft</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="BROKEN">Broken</option>
                </select>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Location</h3>
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  City *
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
                  <option value="">Select City</option>
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
                {loading ? "Saving..." : "Save Changes"}
              </motion.button>
              <button
                type="button"
                onClick={() => navigate(`/supplier/devices/${id}`)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
