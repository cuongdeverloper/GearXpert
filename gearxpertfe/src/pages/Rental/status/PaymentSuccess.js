import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Package, Loader2 } from 'lucide-react';

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rentalId = searchParams.get('rentalId');
  
  const [countdown, setCountdown] = useState(5);

  // Tự động redirect sau 5 giây
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/user/myrental');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl border border-emerald-100 text-center animate-in zoom-in-95 duration-500">
        
        {/* Loading nhẹ chờ webhook */}
        <div className="py-6">
          <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-6" />
          <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Đang xử lý...</h2>
          <p className="text-slate-500 text-sm mt-2">Hệ thống đang cập nhật đơn hàng</p>
        </div>

        {/* Thành công */}
        <div className="animate-in fade-in zoom-in-95 duration-500 delay-300">
          <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <CheckCircle size={48} strokeWidth={3} />
          </div>
          
          <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Thanh toán thành công!</h1>
          <p className="text-slate-500 font-medium mb-4 leading-relaxed">
            Đơn hàng <span className="text-indigo-600 font-bold">#{rentalId?.slice(-8).toUpperCase()}</span> đã xác nhận.
          </p>
          <p className="text-slate-400 text-sm mb-6">
            Tự động chuyển trang sau {countdown} giây...
          </p>
        </div>

        {/* NÚT ĐIỀU HƯỚNG */}
        <div className="space-y-4">
          <button 
            onClick={() => navigate('/user/myrental')}
            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-xl flex items-center justify-center gap-3"
          >
            <Package size={20} /> Quản lý đơn thuê
          </button>
          
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-white text-slate-400 py-4 rounded-2xl font-bold uppercase text-xs hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
          >
            Quay lại trang chủ <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}