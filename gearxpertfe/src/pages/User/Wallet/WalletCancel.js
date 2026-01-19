import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function WalletCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-10 rounded-[40px] shadow-2xl shadow-gray-200/50 max-w-md w-full text-center border border-gray-100">
        {/* Icon Section */}
        <div className="relative mx-auto w-24 h-24 mb-8">
          <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-20"></div>
          <div className="relative bg-red-50 w-24 h-24 rounded-full flex items-center justify-center">
            <XCircle size={60} className="text-red-500" strokeWidth={1.5} />
          </div>
        </div>

        {/* Text Content */}
        <h2 className="text-3xl font-black text-gray-900 mb-3 tracking-tight italic uppercase">
          Thanh toán <span className="text-red-500 not-italic">Đã hủy</span>
        </h2>
        <p className="text-gray-500 font-medium mb-10 leading-relaxed">
          Giao dịch nạp tiền của bạn không được thực hiện. <br />
          Đừng lo lắng, tài khoản của bạn chưa bị trừ tiền.
        </p>

        {/* Actions */}
        <div className="space-y-3">
          <button 
            onClick={() => navigate("/user/wallet")}
            className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-95"
          >
            <RefreshCw size={18} /> Thử lại ngay
          </button>
          
          <button 
            onClick={() => navigate("/user/wallet")}
            className="w-full bg-white text-gray-400 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:text-gray-600 transition-all border border-transparent"
          >
            <ArrowLeft size={18} /> Quay lại ví
          </button>
        </div>
      </div>

      {/* Footer info */}
      <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.2em] text-gray-300">
        GearXpert Financial Security
      </p>
    </div>
  );
}