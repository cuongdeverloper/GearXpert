import React, { useState, useEffect } from "react";
import ImageWithFallback from "./ImageWithFallback";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import { CreditCard, XCircle, CheckCircle2, Clock, Wrench, Star, RefreshCcw, FileText } from "lucide-react";
import { getContractByRental, generateContract } from "../../service/ApiService/RentalApi";

// Status badge color helper
function getStatusColor(status) {
  switch ((status || '').toLowerCase()) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-700';
    case 'approved':
      return 'bg-green-100 text-green-700';
    case 'rejected':
      return 'bg-red-100 text-red-700';
    case 'completed':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-slate-200 text-slate-700';
  }
}

export default function RentalDetail({ open, onClose, rental }) {
  const [showContract, setShowContract] = useState(false);
  const [contractData, setContractData] = useState(null);
  const [loadingContract, setLoadingContract] = useState(false);

  const handleClose = () => {
    setShowContract(false);
    onClose();
  };

  // Fetch contract data when rental changes
  useEffect(() => {
    if (rental?._id && rental.status === "APPROVED") {
      fetchContractData();
    }
  }, [rental?._id, rental?.status]);

  const fetchContractData = async () => {
    try {
      setLoadingContract(true);
      const response = await getContractByRental(rental._id);
      setContractData(response.data);
    } catch (error) {
      console.error("Failed to fetch contract:", error);
      // If no contract exists, try to generate one
      if (error.response?.status === 404) {
        try {
          const generateResponse = await generateContract(rental._id);
          toast.success("Đã tạo hợp đồng thành công!");
          // Fetch again after generation
          const newResponse = await getContractByRental(rental._id);
          setContractData(newResponse.data);
        } catch (genError) {
          console.error("Failed to generate contract:", genError);
          toast.error("Không thể tạo hợp đồng");
        }
      }
    } finally {
      setLoadingContract(false);
    }
  };

  const contractId = rental?._id ? rental._id.slice(-6).toUpperCase() : "N/A";
  const contractDate = rental?.createdAt ? new Date(rental.createdAt).toLocaleDateString() : "-";

  return (
    <AnimatePresence>
      {open && rental && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative max-w-2xl w-full p-0 max-h-[85vh]"
            initial={{ scale: 0.95, y: 40, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }}
            exit={{ scale: 0.95, y: 40, opacity: 0, transition: { duration: 0.15 } }}
          >
            <div className="bg-white/80 dark:bg-slate-900/80 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-8 relative overflow-hidden backdrop-blur-xl max-h-[85vh] overflow-y-auto">
              <button
                className="absolute top-4 right-4 text-slate-400 hover:text-primary text-2xl font-bold transition-colors duration-150 rounded-full w-10 h-10 flex items-center justify-center hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30"
                onClick={handleClose}
                aria-label="Close"
              >
                ×
              </button>
              <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-6 tracking-tight flex items-center gap-3">
                <span>Chi tiết đơn thuê</span>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ml-2 ${getStatusColor(rental.status)}`}>{rental.status}</span>
              </h2>
              {/* Customer Info */}
              <div className="mb-6">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-base">Khách hàng</h3>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-xl overflow-hidden border-2 border-primary/20 shadow-sm">
                    {rental.customerId?.avatar ? (
                      <img src={rental.customerId.avatar} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                      <span role="img" aria-label="avatar">👤</span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white text-lg">{rental.customerId?.fullName}</div>
                    <div className="text-slate-600 dark:text-slate-300 text-sm">{rental.customerId?.email}</div>
                    <div className="text-slate-600 dark:text-slate-400 text-sm">{rental.deliveryAddress?.fullAddress}</div>
                  </div>
                </div>
              </div>
              {/* Rental Info */}
              <div className="mb-6">
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-base">Thông tin thuê</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700 dark:text-slate-200 text-sm">
                  <div><span className="font-semibold">Mã đơn:</span> {rental._id}</div>
                  <div><span className="font-semibold">Thời gian đặt:</span> {new Date(rental.createdAt).toLocaleString("vi-VN")}</div>
                  <div><span className="font-semibold">Tổng cộng:</span> <span className="text-primary font-bold">{(rental.totalAmount || 0).toLocaleString("vi-VN")}₫</span></div>
                  <div><span className="font-semibold">Số điện thoại:</span> {rental.phoneNumber}</div>
                  <div className="md:col-span-2"><span className="font-semibold">Ghi chú:</span> {rental.notes || '-'}</div>
                </div>
                {rental.status === "APPROVED" && (
                  <div className="mt-4">
                    {loadingContract ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-primary"></div>
                        <span className="text-sm text-slate-600">Đang tạo hợp đồng...</span>
                      </div>
                    ) : contractData ? (
                      <div className="space-y-3">
                        <button
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-all text-sm font-semibold"
                          onClick={() => setShowContract(true)}
                        >
                          <FileText size={16} />
                          <span>Xem hợp đồng</span>
                        </button>
                        {contractData.files && contractData.files.length > 0 && (
                          <div className="text-xs text-slate-500">
                            Hợp đồng đã được tạo: {new Date(contractData.files[0].createdAt).toLocaleString("vi-VN")}
                          </div>
                        )}
                      </div>
                    ) : (
                      <button
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 bg-white hover:bg-slate-50 transition-all text-sm font-semibold"
                        onClick={fetchContractData}
                      >
                        <FileText size={16} />
                        <span>Tạo hợp đồng</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
              {/* Product(s) Info */}
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 mb-2 text-base">Sản phẩm thuê</h3>
                <div className="space-y-5">
                  {rental.rentalItems?.map((item, idx) => (
                    <motion.div
                      key={item._id || idx}
                      className="flex gap-5 bg-white/90 dark:bg-slate-800/80 rounded-2xl p-4 items-center shadow-md border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-shadow duration-200 group"
                      whileHover={{ scale: 1.025, boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.15)" }}
                    >
                      <div className="w-28 h-28 flex-shrink-0 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white flex items-center justify-center shadow-sm">
                        {item.deviceId?.images?.length ? (
                          <ImageWithFallback src={item.deviceId.images[0]} alt={item.deviceId.name} className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105" />
                        ) : (
                          <span className="text-5xl">📷</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-slate-900 dark:text-white text-lg mb-1 flex items-center gap-2">
                          {item.deviceId?.name || 'Thiết bị'}
                        </div>
                        <div className="text-slate-600 dark:text-slate-300 text-sm mb-1 line-clamp-2">{item.deviceId?.description || '-'}</div>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400 mb-1">
                          <span>Danh mục: <span className="font-semibold text-slate-700 dark:text-slate-200">{item.deviceId?.category}</span></span>
                          <span>Tiền cọc: <span className="font-semibold text-slate-700 dark:text-slate-200">{item.deviceId?.depositAmount?.toLocaleString()}₫</span></span>
                        </div>
                        <div className="flex gap-4 text-xs text-slate-700 dark:text-slate-200">
                          <span>Thời gian: <b>{item.rentalStartDate?.slice(0,10)} → {item.rentalEndDate?.slice(0,10)}</b></span>
                          <span>SL: <b>{item.quantity}</b></span>
                          <span>Giá: <b>{(item.rentPrice || 0).toLocaleString("vi-VN")}₫</b></span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
      {showContract && rental && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative max-w-3xl w-full bg-white rounded-3xl shadow-2xl border border-slate-200 p-8"
            initial={{ scale: 0.96, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1, transition: { type: "spring", stiffness: 280, damping: 24 } }}
            exit={{ scale: 0.96, y: 30, opacity: 0, transition: { duration: 0.2 } }}
          >
            <button
              className="absolute top-4 right-4 text-slate-400 hover:text-primary text-2xl font-bold transition-colors duration-150 rounded-full w-10 h-10 flex items-center justify-center hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/30"
              onClick={() => setShowContract(false)}
              aria-label="Đóng"
            >
              ×
            </button>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-extrabold text-slate-900">Hợp đồng thuê</h3>
              <p className="text-sm text-slate-500">
                Hợp đồng #{contractData?.contract?._id?.slice(-6).toUpperCase() || contractId} • 
                {contractData?.contract?.createdAt ? new Date(contractData.contract.createdAt).toLocaleDateString() : contractDate}
              </p>
            </div>
            
            {contractData?.files && contractData.files.length > 0 && (
              <div className="mb-6">
                <h4 className="font-semibold text-slate-800 mb-3">File hợp đồng</h4>
                {contractData.files.map((file, index) => (
                  <div key={file._id} className="border border-slate-200 rounded-lg p-4 mb-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-slate-700">
                        {file.fileType === "DELIVERY" ? "Hợp đồng giao hàng" : 
                         file.fileType === "RETURN" ? "Hợp đồng trả hàng" : "Hợp đồng"}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(file.createdAt).toLocaleString("vi-VN")}
                      </span>
                    </div>
                    <a
                      href={file.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                      <FileText size={16} />
                      Tải xuống hợp đồng
                    </a>
                  </div>
                ))}
              </div>
            )}
            
            <div className="space-y-4 text-sm text-slate-700 leading-relaxed">
              <p><span className="font-semibold">Nhà cung cấp:</span> GearXpert Supplier</p>
              <p><span className="font-semibold">Khách hàng:</span> {rental.customerId?.fullName || "-"}</p>
              <p><span className="font-semibold">Địa chỉ giao hàng:</span> {rental.deliveryAddress?.fullAddress || "-"}</p>
              <p><span className="font-semibold">Số điện thoại:</span> {rental.phoneNumber || "-"}</p>
              <p><span className="font-semibold">Thời gian thuê:</span> {rental.rentalItems?.[0]?.rentalStartDate?.slice(0, 10)} → {rental.rentalItems?.[0]?.rentalEndDate?.slice(0, 10)}</p>
              <p><span className="font-semibold">Tổng tiền thuê:</span> {(rental.totalAmount || 0).toLocaleString("vi-VN")} ₫</p>
              <p><span className="font-semibold">Tiền cọc:</span> {(rental.depositAmount || 0).toLocaleString("vi-VN")} ₫</p>
              <p><span className="font-semibold">Ghi chú:</span> {rental.notes || "-"}</p>
            </div>
            <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-500 italic">
              Đây là bản xem trước của hợp đồng. Các điều khoản cuối cùng được thỏa thuận giữa nhà cung cấp và khách hàng.
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
