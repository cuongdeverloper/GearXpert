import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, AlertCircle, Package, CheckCircle2, ChevronDown } from "lucide-react";
import { toast } from "react-toastify";
import { createShopReport } from "../../service/ApiService/ReportApi";
import { getMyRentals } from "../../service/ApiService/RentalApi";

const REASONS = [
  "Sản phẩm giả/nhái",
  "Thái độ phục vụ kém",
  "Lừa đảo",
  "Giá cả không hợp lý",
  "Thiết bị hư hỏng/không giống mô tả",
  "Khác"
];

const ShopReportModal = ({ isOpen, onClose, shopId, shopName }) => {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState([]);
  const [purchasedProduct, setPurchasedProduct] = useState("");
  const [userRentals, setUserRentals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showReasons, setShowReasons] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUserRentals();
    }
  }, [isOpen]);

  const fetchUserRentals = async () => {
    try {
      const res = await getMyRentals();
      if (res && res.EC === 0) {
        // Filter rentals related to this shop if possible, or just show all
        // Assuming rental object has devices and those devices have supplierId
        setUserRentals(res.DT || []);
      }
    } catch (error) {
      console.error("Error fetching rentals:", error);
    }
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (evidence.length + files.length > 5) {
      toast.warning("Bạn chỉ có thể đính kèm tối đa 5 file.");
      return;
    }
    setEvidence([...evidence, ...files]);
  };

  const removeFile = (index) => {
    setEvidence(evidence.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason || !description) {
      toast.error("Vui lòng chọn lý do và nhập mô tả chi tiết.");
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append("shopId", shopId);
    formData.append("reason", reason);
    formData.append("description", description);
    if (purchasedProduct) {
      formData.append("purchasedProductId", purchasedProduct);
    }
    evidence.forEach((file) => {
      formData.append("evidence", file);
    });

    try {
      const res = await createShopReport(formData);
      if (res && res.success) {
        toast.success(res.message);
        onClose();
        // Reset form
        setReason("");
        setDescription("");
        setEvidence([]);
        setPurchasedProduct("");
      } else {
        toast.error(res.message || "Có lỗi xảy ra khi gửi báo cáo.");
      }
    } catch (error) {
      toast.error("Không thể gửi báo cáo, vui lòng thử lại sau.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-[32px] w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
        >
          {/* Header */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-100 rounded-xl text-red-600">
                <AlertCircle size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Báo cáo cửa hàng</h3>
                <p className="text-sm text-slate-500">Shop: {shopName}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={24} className="text-slate-400" />
            </button>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Reason Selection */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  Lý do báo cáo <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowReasons(!showReasons)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-left text-slate-700 hover:border-indigo-200 transition-all"
                  >
                    <span className={reason ? "font-semibold" : "text-slate-400"}>
                      {reason || "Chọn lý do báo cáo..."}
                    </span>
                    <ChevronDown size={20} className={`text-slate-400 transition-transform ${showReasons ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {showReasons && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute inset-x-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 py-2"
                      >
                        {REASONS.map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => {
                              setReason(r);
                              setShowReasons(false);
                            }}
                            className="w-full px-5 py-3 text-left text-sm font-medium hover:bg-slate-50 transition-colors flex items-center justify-between group"
                          >
                            <span className={reason === r ? "text-indigo-600 font-bold" : "text-slate-600"}>{r}</span>
                            {reason === r && <CheckCircle2 size={16} className="text-indigo-600" />}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  Mô tả chi tiết <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Hãy mô tả chi tiết sự việc..."
                  rows={4}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-700 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all resize-none"
                />
              </div>

              {/* Evidence Upload */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  Bằng chứng (Ảnh/Video, tối đa 5 file)
                </label>
                <div className="flex flex-wrap gap-3">
                  {evidence.map((file, index) => (
                    <div key={index} className="relative w-24 h-24 rounded-xl overflow-hidden border border-slate-200 group bg-slate-50">
                      {file.type.startsWith("image") ? (
                        <img
                          src={URL.createObjectURL(file)}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                      ) : file.type.startsWith("video") ? (
                        <video
                          src={URL.createObjectURL(file)}
                          className="w-full h-full object-cover"
                          muted
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                          <Upload size={24} className="text-slate-400" />
                        </div>
                      )}
                      
                      {/* Video Overlay Icon */}
                      {file.type.startsWith("video") && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/10 pointer-events-none">
                            <div className="p-1.5 bg-white/80 rounded-full shadow-sm">
                                <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-indigo-600 border-b-[5px] border-b-transparent ml-0.5" />
                            </div>
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="absolute top-1 right-1 bg-white/80 backdrop-blur-md p-1 rounded-lg shadow-sm hover:text-red-500 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {evidence.length < 5 && (
                    <label className="w-24 h-24 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-indigo-400 hover:bg-slate-50 transition-all text-slate-400 hover:text-indigo-600">
                      <Upload size={24} />
                      <span className="text-[10px] font-bold mt-1">Thêm file</span>
                      <input
                        type="file"
                        multiple
                        className="hidden"
                        onChange={handleFileChange}
                        accept="image/*,video/*"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Purchased Product Selection */}
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Package size={16} />
                  Sản phẩm đã mua (Không bắt buộc)
                </label>
                <select
                  value={purchasedProduct}
                  onChange={(e) => setPurchasedProduct(e.target.value)}
                  className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-700 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                >
                  <option value="">-- Chọn sản phẩm liên quan --</option>
                  {userRentals.map((rental) => (
                      <optgroup key={rental._id} label={`Đơn hàng ${rental._id.substring(0,8)}...`}>
                         {rental.rentalItems?.map(item => (
                             <option key={item._id} value={item.deviceId?._id || item.deviceId}>
                                {item.deviceId?.deviceName || "Thiết bị"}
                             </option>
                         ))}
                      </optgroup>
                  ))}
                </select>
              </div>
            </form>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-4">
            <button
              onClick={onClose}
              className="flex-1 px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all"
            >
              Hủy bỏ
            </button>
            <button
              disabled={loading}
              onClick={handleSubmit}
              className="flex-2 px-12 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-700 shadow-xl shadow-red-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <AlertCircle size={18} />
              )}
              <span>Gửi báo cáo</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ShopReportModal;
