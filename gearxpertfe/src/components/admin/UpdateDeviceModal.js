import { useState, useEffect, useRef } from "react";
import { updateDevice } from "../../service/ApiService/DeviceApi";
import { toast } from "react-toastify";
import { VIETNAM_CITIES } from "../../utils/vietnamCities";

const CATEGORIES = ["CAMERA", "AUDIO", "OFFICE", "GAMING", "ACCESSORY", "LIGHTING", "DRONE", "OTHER"];

export default function UpdateDeviceModal({ isOpen, onClose, device, onDeviceUpdated }) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "CAMERA",
    rentPrice: { perDay: 0, perWeek: 0, perMonth: 0 },
    depositAmount: 0,
    location: { warehouse: "", city: "" },
    stockQuantity: 1,
  });
  const [loading, setLoading] = useState(false);
  const [oldImages, setOldImages] = useState([]); // url[]
  const [newImages, setNewImages] = useState([]); // File[]
  const [newImagePreviews, setNewImagePreviews] = useState([]); // string[]
  const fileInputRef = useRef();

  useEffect(() => {
    if (device) {
      setForm({
        name: device.name || "",
        description: device.description || "",
        category: device.category || "CAMERA",
        rentPrice: device.rentPrice || { perDay: 0, perWeek: 0, perMonth: 0 },
        depositAmount: device.depositAmount || 0,
        location: device.location || { warehouse: "", city: "" },
        stockQuantity: device.stockQuantity || 1,
      });
      setOldImages(device.images || []);
      setNewImages([]);
      setNewImagePreviews([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [device]);
  // Handle new image file selection
  const handleNewImageChange = (e) => {
    const files = Array.from(e.target.files);
    setNewImages(files);
    setNewImagePreviews(files.map(file => URL.createObjectURL(file)));
  };

  // Remove old image
  const handleRemoveOldImage = (idx) => {
    setOldImages(oldImages.filter((_, i) => i !== idx));
  };

  // Remove new image
  const handleRemoveNewImage = (idx) => {
    const newImgs = newImages.filter((_, i) => i !== idx);
    setNewImages(newImgs);
    setNewImagePreviews(newImgs.map(file => URL.createObjectURL(file)));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePriceChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      rentPrice: { ...prev.rentPrice, [name]: Number(value) },
    }));
  };

  const handleLocationChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      location: { ...prev.location, [name]: value },
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Prepare FormData
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("description", form.description);
      formData.append("category", form.category);
      formData.append("rentPrice", JSON.stringify(form.rentPrice));
      formData.append("depositAmount", form.depositAmount);
      formData.append("location", JSON.stringify(form.location));
      formData.append("stockQuantity", form.stockQuantity);
      // Append old images (urls)
      formData.append("oldImages", JSON.stringify(oldImages));
      // Append new images (files)
      newImages.forEach((img) => formData.append("images", img));

      await updateDevice(device.id, formData);
      toast.success("Device updated successfully!");
      onDeviceUpdated && onDeviceUpdated();
      onClose();
    } catch (error) {
      console.error("[FE] updateDevice error:", error, error?.response?.data);
      toast.error(error?.response?.data?.message || "Failed to update device");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <form
        className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg space-y-4 relative"
        onSubmit={handleSubmit}
      >
        <button
          type="button"
          className="absolute top-3 right-3 text-slate-400 hover:text-slate-700"
          onClick={onClose}
        >
          ×
        </button>
        {/* Image Upload & Preview */}
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Device Images</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {oldImages.map((url, idx) => (
              <div key={idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <img src={url} alt="old" className="object-cover w-full h-full" />
                <button
                  type="button"
                  onClick={() => handleRemoveOldImage(idx)}
                  className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-slate-600 hover:bg-red-100 hover:text-red-500 transition"
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
            {newImagePreviews.map((src, idx) => (
              <div key={"new-" + idx} className="relative group w-20 h-20 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                <img src={src} alt="new" className="object-cover w-full h-full" />
                <button
                  type="button"
                  onClick={() => handleRemoveNewImage(idx)}
                  className="absolute top-1 right-1 bg-white/80 rounded-full p-1 text-slate-600 hover:bg-red-100 hover:text-red-500 transition"
                  title="Remove image"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            ref={fileInputRef}
            onChange={handleNewImageChange}
            className="block w-full border border-slate-200 rounded-lg px-3 py-2 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-semibold"
          />
        </div>
        <h2 className="text-xl font-bold mb-2">Update Device</h2>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Name</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium">Description</label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2"
            rows={3}
            required
          />
        </div>
        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium">Category</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium">Stock Quantity</label>
            <input
              name="stockQuantity"
              type="number"
              min={1}
              value={form.stockQuantity}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium">Daily Rate</label>
            <input
              name="perDay"
              type="number"
              min={0}
              value={form.rentPrice.perDay}
              onChange={handlePriceChange}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium">Weekly Rate</label>
            <input
              name="perWeek"
              type="number"
              min={0}
              value={form.rentPrice.perWeek}
              onChange={handlePriceChange}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium">Monthly Rate</label>
            <input
              name="perMonth"
              type="number"
              min={0}
              value={form.rentPrice.perMonth}
              onChange={handlePriceChange}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium">Deposit Amount</label>
            <input
              name="depositAmount"
              type="number"
              min={0}
              value={form.depositAmount}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium">Warehouse</label>
            <input
              name="warehouse"
              value={form.location.warehouse}
              onChange={handleLocationChange}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div className="flex-1 space-y-2">
            <label className="block text-sm font-medium">City</label>
            <select
              name="city"
              value={form.location.city}
              onChange={handleLocationChange}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select city</option>
              {VIETNAM_CITIES.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>
        </div>
        <button
          type="submit"
          className="w-full py-2.5 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark transition mt-2 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Saving..." : "Update Device"}
        </button>
      </form>
    </div>
  );
}
