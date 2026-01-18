import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, ArrowRight, Package, Loader2, AlertCircle } from 'lucide-react';
import { verifyPayment } from '../../../service/ApiService/RentalApi'; // Đường dẫn service của bạn

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const rentalId = searchParams.get('rentalId');
  
  // Trạng thái xác thực
  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'

  useEffect(() => {
    const handleVerify = async () => {
      if (!rentalId) {
        setStatus('error');
        return;
      }

      try {
        // Chủ động gọi API để Backend check trực tiếp với PayOS (Không cần Webhook)
        const response = await verifyPayment(rentalId);
        
        if (response.data.success) {
          setStatus('success');
        } else {
          // Nếu PayOS báo chưa thanh toán thật
          setStatus('error');
        }
      } catch (error) {
        console.error("Xác thực thất bại:", error);
        setStatus('error');
      }
    };

    handleVerify();
  }, [rentalId]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-white rounded-[40px] p-10 shadow-2xl border border-emerald-100 text-center animate-in zoom-in-95 duration-500">
        
        {/* TRƯỜNG HỢP 1: ĐANG XÁC THỰC (Cần thiết khi không có Ngrok) */}
        {status === 'verifying' && (
          <div className="py-10">
            <Loader2 className="w-16 h-16 text-indigo-600 animate-spin mx-auto mb-6" />
            <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Đang kiểm tra giao dịch...</h2>
            <p className="text-slate-500 text-sm mt-2">Hệ thống đang xác nhận tiền về tài khoản. Vui lòng đợi trong giây lát.</p>
          </div>
        )}

        {/* TRƯỜNG HỢP 2: THÀNH CÔNG */}
        {status === 'success' && (
          <>
            <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <CheckCircle size={48} strokeWidth={3} />
            </div>
            
            <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">Thanh toán thành công!</h1>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              Đơn hàng <span className="text-indigo-600 font-bold">#{rentalId?.slice(-6).toUpperCase()}</span> đã được xác nhận. Chúng tôi sẽ chuẩn bị thiết bị ngay.
            </p>
          </>
        )}

        {/* TRƯỜNG HỢP 3: CÓ LỖI HOẶC CHƯA THANH TOÁN */}
        {status === 'error' && (
          <>
            <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
              <AlertCircle size={48} strokeWidth={3} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase italic mb-2">Chưa ghi nhận tiền</h1>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              Chúng tôi chưa nhận được phản hồi từ ngân hàng. Nếu bạn đã chuyển khoản, vui lòng đợi vài phút để hệ thống cập nhật.
            </p>
          </>
        )}

        {/* NÚT ĐIỀU HƯỚNG */}
        <div className="space-y-4">
          <button 
            onClick={() => navigate('/profile/rentals')}
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