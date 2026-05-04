import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { FiArrowLeft, FiPlus, FiX, FiList } from "react-icons/fi";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { createDevice } from "../../service/ApiService/DeviceApi";
import { getSupplierProfile } from "../../service/ApiService/SupplierApi";
import { VIETNAM_CITIES } from "../../utils/vietnamCities";

export default function SupplierAddDevicePage() {
  const navigate = useNavigate();
  const userAccount = useSelector((state) => state.user.account);
  const [supplierProfile, setSupplierProfile] = useState(null);
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
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const fileInputRef = useRef();
  // Fetch supplier profile by userId on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (!userAccount?.id) return;
      console.log(">>> Dữ liệu tài khoản Redux:", userAccount);
      console.log(">>> Vai trò (Role) hiện tại:", userAccount.role || "Chưa xác định");
      try {
        const res = await getSupplierProfile(userAccount.id);
        if (res.data) {
          console.log(res.data)
          setSupplierProfile(res.data);
          // Auto-fill city from profile if available
          if (res.data.location?.city) {
            setFormData(prev => ({ ...prev, city: res.data.location.city }));
          }
        }
      } catch (error) {
        console.error("Error fetching supplier profile:", error);
        toast.error("Không thể lấy thông tin cửa hàng");
      }
    };
    fetchProfile();
  }, [userAccount?.id]);

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
    setImages((prev) => {
      const nextImages = [...prev, ...compressed].slice(0, 5);
      setImagePreviews(nextImages.map((file) => URL.createObjectURL(file)));
      return nextImages;
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemoveImage = (idx) => {
    const newImages = images.filter((_, i) => i !== idx);
    setImages(newImages);
    setImagePreviews(newImages.map((file) => URL.createObjectURL(file)));
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
    if (!formData.depositAmount || formData.depositAmount <= 0) newErrors.depositAmount = "Tiền cọc là bắt buộc";
    if (!formData.city.trim()) newErrors.city = "Tỉnh/Thành phố là bắt buộc";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const parseSpecs = (rows) => {
    const specs = {};
    rows.forEach((row) => {
      const key = row.key?.trim();
      if (!key) return;
      specs[key] = row.value?.trim() || true;
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
      console.log(">>> Vai trò của User hiện tại:", userAccount?.role);
      console.log(">>> Thông tin User/Supplier khi thêm sản phẩm:", supplierProfile);
      setLoading(true);
      const form = new FormData();
      form.append("name", formData.name);
      form.append("description", formData.description);
      form.append("category", formData.category);
      // Explicitly send supplierId from fetched profile
      if (supplierProfile?.userId) {
        // userId có thể là object do được populate ở backend, cần lấy ._id
        const sId = typeof supplierProfile.userId === 'object' 
          ? supplierProfile.userId._id 
          : supplierProfile.userId;
        form.append("supplierId", sId);
      }
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
      const specsPayload = parseSpecs(formData.specs);
      if (Object.keys(specsPayload).length > 0) {
        form.append("specs", JSON.stringify(specsPayload));
      }
      images.forEach((img) => form.append("images", img));

      await createDevice(form);
      toast.success(
        "Đã tạo danh mục thiết bị. Thêm từng đơn vị (serial) tại Kho hoặc trang chi tiết thiết bị."
      );
      navigate("/supplier/devices");
    } catch (error) {
      console.error("Error creating device:", error);
      const errorMsg =
        error.response?.data?.message || error.message || "Không thể thêm thiết bị";
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={() => navigate("/supplier/devices")}
            className="mt-1 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
            aria-label="Back"
          >
            <FiArrowLeft size={18} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">
              Thêm sản phẩm mới
            </h2>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Tạo <strong className="font-medium text-slate-700">thông tin chung</strong> (catalog).{" "}
              <strong className="font-medium text-slate-700">Số lượng</strong> = số đơn vị có serial trong kho.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Thông tin cơ bản</h3>
            <p className="text-sm text-slate-500 mb-4">Nhập thông tin chi tiết về sản phẩm</p>

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
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all ${errors.name
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
                  Mô tả sản phẩm *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Mô tả tình trạng, cấu hình, phụ kiện đi kèm..."
                  rows="4"
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all ${errors.description
                    ? "border-red-500 bg-red-50 focus:ring-red-200"
                    : "border-slate-200 focus:ring-primary/20"
                    } focus:ring-2 focus:border-primary outline-none resize-none`}
                />
                {errors.description && (
                  <p className="text-xs text-red-600 mt-1">{errors.description}</p>
                )}
              </div>
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
              {imagePreviews.map((src, idx) => (
                <div
                  key={src}
                  className="relative h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50"
                >
                  <img src={src} alt="preview" className="object-cover w-full h-full" />
                  {idx === 0 && (
                    <span className="absolute left-2 bottom-2 rounded-full bg-primary/90 px-2 py-0.5 text-[10px] font-semibold text-white">
                      Ảnh chính
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(idx)}
                    className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow hover:bg-red-600 transition"
                    title="Remove image"
                  >
                    <FiX size={14} />
                  </button>
                </div>
              ))}

              <button
                type="button"
                disabled={imagePreviews.length >= 5}
                onClick={() => fileInputRef.current?.click()}
                className="flex h-24 w-24 sm:h-28 sm:w-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-primary/40 hover:bg-primary/5 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPlus size={22} />
                <span className="text-xs font-semibold">Tải ảnh lên</span>
              </button>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <FiList className="text-primary" /> Thông số kỹ thuật
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Tạo bảng thuộc tính kỹ thuật chi tiết giúp khách hàng dễ dàng ra quyết định thuê.
              </p>
            </div>
            <div className="p-6">
              {formData.specs.length > 0 && (
                <div className="flex items-center gap-4 px-1 mb-4">
                  <div className="w-5/12 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tên thông số</div>
                  <div className="flex-1 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Giá trị cấu hình</div>
                  <div className="w-10"></div>
                </div>
              )}
              <div className="space-y-4">
                {formData.specs.map((spec, idx) => (
                  <div key={`spec-${idx}`} className="flex items-start gap-4 group">
                    <div className="w-5/12">
                      <input
                        type="text"
                        value={spec.key}
                        onChange={(e) => handleSpecChange(idx, "key", e.target.value)}
                        placeholder="VD: Cảm biến, Chipset..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm transition-all shadow-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <input
                        type="text"
                        value={spec.value}
                        onChange={(e) => handleSpecChange(idx, "value", e.target.value)}
                        placeholder="VD: Full-frame 24.2MP..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white hover:border-slate-300 focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none text-sm transition-all shadow-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeSpecRow(idx)}
                      className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-transparent text-slate-300 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all"
                      title="Xóa thông số"
                    >
                      <FiX size={18} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addSpecRow}
                className="mt-6 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed border-slate-200 text-sm font-semibold text-slate-500 hover:border-primary hover:text-primary hover:bg-primary/5 transition-all bg-slate-50/50 hover:shadow-sm"
              >
                <FiPlus size={18} />
                Thêm một thông số kỹ thuật
              </button>
            </div>
          </section>
        </div>

        <div className="space-y-6 lg:col-span-1">
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
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all ${errors.perDay
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
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all ${errors.depositAmount
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
            <p className="text-sm text-slate-500 mt-1 mb-4">
              Sau khi lưu, vào{" "}
              <Link to="/supplier/inventory" className="font-semibold text-primary hover:underline">
                Quản lý kho
              </Link>{" "}
              hoặc trang chi tiết thiết bị để thêm từng đơn vị (serial). Số lượng hiển thị trên cửa hàng = số đơn vị
              đó.
            </p>
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
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all ${errors.city
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
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Đang lưu...
                  </>
                ) : (
                  <>
                    <FiPlus size={20} />
                    Lưu sản phẩm
                  </>
                )}
              </motion.button>
              <motion.button
                type="button"
                onClick={() => navigate("/supplier/devices")}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-3 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 transition-all"
              >
                Hủy
              </motion.button>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
