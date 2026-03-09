import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  XCircle,
  RefreshCw,
  AlertCircle,
  Loader2,
  Check,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import * as rentalService from "../../../service/ApiService/RentalApi";

export default function PaymentCancel() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [rentalId, setRentalId] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false); // State cho modal confirm

  // Lấy rentalId từ query params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get("rentalId");
    if (id) {
      setRentalId(id);
    } else {
      toast.error("Không tìm thấy thông tin đơn hàng");
    }
  }, [location]);

  const handleRetryPayment = async () => {
    if (!rentalId)
      return toast.error("Không tìm thấy đơn hàng để thanh toán lại");

    setLoading(true);
    try {
      toast.info("Đang tạo link thanh toán lại cho toàn bộ đơn...");

      const res = await rentalService.repayRental(rentalId);

      if (res?.success && res?.paymentLink) {
        window.location.href = res.paymentLink;
      } else {
        toast.error("Không thể tạo link thanh toán lại");
      }
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Lỗi khi khởi tạo thanh toán lại, vui lòng thử lại sau"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!rentalId) return toast.error("Không tìm thấy đơn hàng để hủy");

    // Mở modal confirm thay vì window.confirm
    setShowConfirmModal(true);
  };

  const confirmCancel = async () => {
    setShowConfirmModal(false);
    setLoading(true);

    try {
      await rentalService.cancelRental(rentalId); // Gọi API hủy
      toast.success("Đã hủy đơn hàng thành công!");
      navigate("/user/myrental");
    } catch (err) {
      toast.error(
        err.response?.data?.message ||
          "Lỗi khi hủy đơn hàng, vui lòng liên hệ hỗ trợ"
      );
    } finally {
      setLoading(false);
    }
  };

  const cancelModal = () => {
    setShowConfirmModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl border border-red-100 text-center">
        <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
          <XCircle size={48} strokeWidth={3} />
        </div>

        <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">
          Thanh toán thất bại
        </h1>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed">
          Giao dịch đã bị hủy hoặc gặp lỗi kỹ thuật. Đừng lo, bạn có thể thử lại
          bằng phương thức khác.
        </p>

        <div className="bg-amber-50 rounded-2xl p-4 mb-8 flex items-start gap-3 text-left border border-amber-100">
          <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={20} />
          <p className="text-[11px] font-bold text-amber-700 leading-tight uppercase tracking-tight">
            Lưu ý: Đơn hàng vẫn được lưu ở trạng thái "Chờ thanh toán". Bạn có
            thể vào mục Đơn thuê để thanh toán lại hoặc hủy nếu không muốn tiếp
            tục.
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleRetryPayment}
            disabled={loading || !rentalId}
            className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-3 ${
              loading || !rentalId
                ? "bg-gray-400 cursor-not-allowed text-white"
                : "bg-slate-900 hover:bg-indigo-600 text-white"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} /> Đang xử lý...
              </>
            ) : (
              <>
                <RefreshCw size={20} /> Thử thanh toán lại
              </>
            )}
          </button>

          <button
            onClick={handleCancelOrder}
            disabled={loading || !rentalId}
            className={`w-full py-4 rounded-2xl font-bold uppercase text-xs transition-colors ${
              loading || !rentalId
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white text-red-600 hover:bg-red-50 border border-red-200"
            }`}
          >
            Hủy đơn và quay lại trang chủ
          </button>
        </div>
      </div>

      {/* Modal Confirm Hủy Đơn */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={32} />
              </div>
              <h2 className="text-xl font-black text-gray-900 mb-2">
                Xác nhận hủy đơn hàng?
              </h2>
              <p className="text-gray-600 text-sm">
                Hành động này sẽ hủy toàn bộ đơn hàng và hoàn lại số lượng thiết
                bị vào kho. Bạn không thể hoàn tác.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={cancelModal}
                className="py-4 rounded-2xl bg-gray-100 text-gray-700 font-bold uppercase text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
              >
                <X size={18} /> Không, giữ lại
              </button>
              <button
                onClick={confirmCancel}
                disabled={loading}
                className={`py-4 rounded-2xl font-black uppercase text-sm flex items-center justify-center gap-2 transition-all ${
                  loading
                    ? "bg-gray-400 cursor-not-allowed text-white"
                    : "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-200"
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={18} /> Đang hủy...
                  </>
                ) : (
                  <>
                    <Check size={18} /> Có, hủy đơn
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
