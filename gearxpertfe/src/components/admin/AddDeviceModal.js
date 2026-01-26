import { useState, useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { FiX, FiPlus } from "react-icons/fi";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { createDevice } from "../../service/ApiService/DeviceApi";
import { VIETNAM_CITIES } from "../../utils/vietnamCities";

export default function AddDeviceModal({ isOpen, onClose, onDeviceAdded }) {
  const user = useSelector((state) => state.user.account);
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
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState([]); // File[]
  const [imagePreviews, setImagePreviews] = useState([]); // string[]
  const fileInputRef = useRef();
  // Handle image file selection
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files);
    setImagePreviews(files.map(file => URL.createObjectURL(file)));
  };

  // Remove selected image
  const handleRemoveImage = (idx) => {
    const newImages = images.filter((_, i) => i !== idx);
    setImages(newImages);
    setImagePreviews(newImages.map(file => URL.createObjectURL(file)));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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
    if (!formData.name.trim()) newErrors.name = "Device name is required";
    if (!formData.description.trim()) newErrors.description = "Description is required";
    if (!formData.perDay || formData.perDay <= 0) newErrors.perDay = "Daily price is required";
    if (!formData.depositAmount || formData.depositAmount <= 0) newErrors.depositAmount = "Deposit is required";
    if (!formData.city.trim()) newErrors.city = "City is required";
    if (formData.stockQuantity < 1) newErrors.stockQuantity = "Stock quantity must be ≥ 1";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) {
      submitDevice();
    }
  };

  const submitDevice = async () => {
    try {
      setLoading(true);

      // Prepare FormData for API
      const form = new FormData();
      form.append("name", formData.name);
      form.append("description", formData.description);
      form.append("category", formData.category);
      form.append("rentPrice", JSON.stringify({
        perDay: parseFloat(formData.perDay),
        ...(formData.perWeek && { perWeek: parseFloat(formData.perWeek) }),
        ...(formData.perMonth && { perMonth: parseFloat(formData.perMonth) }),
      }));
      form.append("depositAmount", parseFloat(formData.depositAmount));
      form.append("location", JSON.stringify({
        warehouse: formData.location,
        city: formData.city,
      }));
      form.append("stockQuantity", parseInt(formData.stockQuantity));
      // Append images
      images.forEach((img) => form.append("images", img));

      // Call API
      const response = await createDevice(form);
      toast.success("Device added successfully!");

      // Reset form
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
      setImages([]);
      setImagePreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Callback to refresh device list in parent
      if (onDeviceAdded) {
        onDeviceAdded();
      }

      onClose();
    } catch (error) {
      console.error("Error creating device:", error);
      const errorMsg = error.response?.data?.message || error.message || "Failed to add device";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
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
            <h2 className="text-2xl font-bold text-slate-900">Add New Device</h2>
            <p className="text-sm text-slate-500 mt-1">Fill in all information to register a rental device</p>
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
                    {/* Image Upload */}
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Device Images
                        <span className="ml-1 text-xs text-slate-400">(up to 5 images, jpg/png)</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        ref={fileInputRef}
                        onChange={handleImageChange}
                        className="block w-full border border-slate-200 rounded-xl px-4 py-2.5 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-semibold"
                      />
                      {imagePreviews.length > 0 && (
                        <div className="flex flex-wrap gap-3 mt-3">
                          {imagePreviews.map((src, idx) => (
                            <div key={idx} className="relative group w-24 h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                              <img src={src} alt="preview" className="object-cover w-full h-full" />
                              <button
                                type="button"
                                onClick={() => handleRemoveImage(idx)}
                                className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-slate-600 hover:bg-red-100 hover:text-red-500 transition"
                                title="Remove image"
                              >
                                <FiX size={16} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h3 className="mb-4 font-semibold text-slate-900 flex items-center gap-2">
              <div className="w-1 h-6 bg-primary rounded-full"></div>
              Basic Information
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Device Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g., Sony A7IV Camera"
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
                    <option value="ACCESSORY">🔌 Accessory</option>
                  </select>
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
                  placeholder="Detailed description of the device..."
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
                  Stock Quantity *
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
              Rental Price
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Daily Price ($) *
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
                  Weekly Price ($)
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
                  Monthly Price ($)
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
                Deposit ($) *
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
              Storage Location
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Warehouse
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  placeholder="e.g., Main Warehouse"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

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
                  <option value="">Select city...</option>
                  {VIETNAM_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
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
              Cancel
            </motion.button>
            <motion.button
              type="submit"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Adding...
                </>
              ) : (
                <>
                  <FiPlus size={20} />
                  Add Device
                </>
              )}
            </motion.button>
          </motion.div>
        </form>
      </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
