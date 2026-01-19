import { useState, useEffect } from "react";
import { FiX, FiPlus } from "react-icons/fi";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";

export default function AddDeviceModal({ isOpen, onClose }) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "CAMERA",
    stockQuantity: 1,
    perDay: "",
    perWeek: "",
    perMonth: "",
    depositAmount: "",
    location: "",
    city: "",
  });

  const [errors, setErrors] = useState({});

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

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
    if (!formData.perDay || formData.perDay <= 0) newErrors.perDay = "Giá theo ngày là bắt buộc";
    if (!formData.depositAmount || formData.depositAmount <= 0) newErrors.depositAmount = "Tiền cọc là bắt buộc";
    if (!formData.city.trim()) newErrors.city = "Thành phố là bắt buộc";
    if (formData.stockQuantity < 1) newErrors.stockQuantity = "Số lượng phải ≥ 1";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      toast.success("Thiết bị được thêm thành công!");
      setFormData({
        name: "",
        description: "",
        category: "CAMERA",
        stockQuantity: 1,
        perDay: "",
        perWeek: "",
        perMonth: "",
        depositAmount: "",
        location: "",
        city: "",
      });
      setErrors({});
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 w-screen h-screen z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-4xl max-h-[90vh] rounded-3xl bg-white shadow-2xl border border-slate-100 flex flex-col"
          >
        {/* Header */}
        <div className="sticky top-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white px-8 py-5 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Thêm Thiết Bị Mới</h2>
            <p className="text-sm text-slate-500 mt-1">Điền đầy đủ thông tin để đăng ký thiết bị cho thuê</p>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-200 text-slate-600 transition"
            aria-label="Close"
          >
            <FiX size={28} />
          </motion.button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Basic Information */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="mb-4 font-semibold text-slate-900 flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              Thông Tin Cơ Bản
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Tên Thiết Bị *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="vd: Sony A7IV Camera"
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
                    Danh Mục *
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
                    <option value="ACCESSORY">🔌 Phụ Kiện</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Mô Tả *
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Mô tả chi tiết về thiết bị..."
                  rows="2"
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                    errors.description
                      ? "border-red-500 bg-red-50 focus:ring-red-200"
                      : "border-slate-200 focus:ring-primary/20"
                  } focus:ring-2 focus:border-primary outline-none resize-none`}
                />
                {errors.description && <p className="text-xs text-red-600 mt-1">{errors.description}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Số Lượng Tồn Kho *
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
                {errors.stockQuantity && <p className="text-xs text-red-600 mt-1">{errors.stockQuantity}</p>}
              </div>
            </div>
          </motion.div>

          {/* Pricing */}
          <motion.div
            className="border-t border-slate-200 pt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h3 className="mb-4 font-semibold text-slate-900 flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              Giá Thuê
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Giá Theo Ngày ($) *
                </label>
                <input
                  type="number"
                  name="perDay"
                  value={formData.perDay}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
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
                  Giá Theo Tuần ($)
                </label>
                <input
                  type="number"
                  name="perWeek"
                  value={formData.perWeek}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Giá Theo Tháng ($)
                </label>
                <input
                  type="number"
                  name="perMonth"
                  value={formData.perMonth}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tiền Cọc ($) *
              </label>
              <input
                type="number"
                name="depositAmount"
                value={formData.depositAmount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0"
                className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                  errors.depositAmount
                    ? "border-red-500 bg-red-50 focus:ring-red-200"
                    : "border-slate-200 focus:ring-primary/20"
                } focus:ring-2 focus:border-primary outline-none`}
              />
              {errors.depositAmount && <p className="text-xs text-red-600 mt-1">{errors.depositAmount}</p>}
            </div>
          </motion.div>

          {/* Location */}
          <motion.div
            className="border-t border-slate-200 pt-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h3 className="mb-4 font-semibold text-slate-900 flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              Vị Trí Lưu Trữ
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Kho
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="vd: Kho Chính"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Thành Phố *
                </label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="vd: Ho Chi Minh"
                  className={`w-full px-4 py-2.5 rounded-xl border transition-all ${
                    errors.city
                      ? "border-red-500 bg-red-50 focus:ring-red-200"
                      : "border-slate-200 focus:ring-primary/20"
                  } focus:ring-2 focus:border-primary outline-none`}
                />
                {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city}</p>}
              </div>
            </div>
          </motion.div>

          {/* Actions */}
          <motion.div
            className="border-t border-slate-200 pt-6 flex gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <motion.button
              type="button"
              onClick={onClose}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 transition-all"
            >
              Hủy
            </motion.button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all"
            >
              <FiPlus size={20} />
              Thêm Thiết Bị
            </motion.button>
          </motion.div>
        </form>
      </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
