import React from 'react';
import { useNavigate } from 'react-router-dom';
import { XCircle, RefreshCw, AlertCircle } from 'lucide-react';

export default function PaymentCancel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl border border-red-100 text-center">
        <div className="w-24 h-24 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
          <XCircle size={48} strokeWidth={3} />
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Thanh toán thất bại</h1>
        <p className="text-slate-500 font-medium mb-8 leading-relaxed">
          Giao dịch đã bị hủy hoặc gặp lỗi kỹ thuật. Đừng lo, bạn có thể thử lại bằng phương thức khác.
        </p>

        <div className="bg-amber-50 rounded-2xl p-4 mb-8 flex items-start gap-3 text-left border border-amber-100">
          <AlertCircle className="text-amber-500 shrink-0" size={20} />
          <p className="text-[11px] font-bold text-amber-700 leading-tight uppercase tracking-tight">
            Lưu ý: Đơn hàng vẫn được lưu ở trạng thái "Chờ thanh toán". Bạn có thể vào mục Đơn thuê để thanh toán lại.
          </p>
        </div>

        <div className="space-y-4">
          <button 
            onClick={() => navigate('/profile/rentals')}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-red-500 transition-all shadow-xl flex items-center justify-center gap-3"
          >
            <RefreshCw size={20} /> Thử thanh toán lại
          </button>
          
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-white text-slate-400 py-4 rounded-2xl font-bold uppercase text-xs hover:text-slate-600 transition-colors"
          >
            Hủy đơn và quay lại trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}