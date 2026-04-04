import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

/**
 * Luồng xác nhận đơn đã được xử lý tại /rental/checkout (ký + gọi API checkout).
 * Route này giữ để link cũ không lỗi — luôn chuyển về trang thanh toán.
 */
export default function RentalReviewPage() {
  const navigate = useNavigate();

  useEffect(() => {
    toast.info("Vui lòng xác nhận đơn thuê tại trang thanh toán.");
    navigate("/rental/checkout", { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
      Đang chuyển đến trang thanh toán…
    </div>
  );
}
