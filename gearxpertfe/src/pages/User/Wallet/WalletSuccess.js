import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { CheckCircle, Loader2, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";
import api from "../../../service/AxiosCustomize";
export default function WalletSuccess() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const navigate = useNavigate();
  const orderCode = searchParams.get("orderCode");



useEffect(() => {
  const verify = async () => {
    if (!orderCode) {
      setStatus("error");
      return;
    }
    try {
      // PHẢI dùng instance có chứa Header Authorization (Bearer Token)
      await api.post("/api/wallets/verifytopup", { orderCode: Number(orderCode) }); 
      setStatus("success");
      toast.success("Ví của bạn đã được cộng tiền!");
    } catch (error) {
      console.error("Verify error:", error);
      setStatus("error");
      toast.error(error.response?.data?.message || "Xác thực thất bại");
    }
  };
  verify();
}, [orderCode]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-10 rounded-[40px] shadow-xl max-w-md w-full text-center">
        {status === "verifying" && (
          <>
            <Loader2 className="animate-spin mx-auto text-indigo-600 mb-6" size={64} />
            <h2 className="text-2xl font-black text-gray-900 mb-2">Đang xác thực...</h2>
            <p className="text-gray-500">Vui lòng không đóng trình duyệt, hệ thống đang xử lý giao dịch #{orderCode}</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="mx-auto text-emerald-500 mb-6" size={80} />
            <h2 className="text-3xl font-black text-gray-900 mb-2">Thành công 🎉</h2>
            <p className="text-gray-500 mb-8">Giao dịch <b>#{orderCode}</b> đã hoàn tất. Tiền đã được cộng vào ví của bạn.</p>
            <button 
              onClick={() => navigate("/user/wallet")}
              className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all"
            >
              Quay lại ví <ArrowRight size={18} />
            </button>
          </>
        )}

        {status === "error" && (
          <div className="text-red-500">
             <h2 className="text-2xl font-bold">Có lỗi xảy ra</h2>
             <p>Không thể xác định giao dịch. Vui lòng kiểm tra lại lịch sử ví.</p>
             <button onClick={() => navigate("/wallet")} className="mt-4 text-indigo-600 font-bold underline">Quay lại</button>
          </div>
        )}
      </div>
    </div>
  );
}