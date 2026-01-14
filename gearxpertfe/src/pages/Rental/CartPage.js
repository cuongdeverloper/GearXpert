import React, { useEffect, useState } from 'react';
import { Trash2, ShoppingBag, Calendar, ShieldCheck, ArrowRight, ChevronLeft } from 'lucide-react';
import { getCart, removeCartItem, clearCart } from '../../service/ApiService/CartApi'; // Đường dẫn service của bạn
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify'; // THÊM: Import Toastify
import 'react-toastify/dist/ReactToastify.css'; // THÊM: Import CSS của Toastify

const CartPage = () => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchCartData = async () => {
    try {
      const res = await getCart("NORMAL");
      setCart(res);
    } catch (err) {
      console.error("Error fetching cart", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCartData();
  }, []);

  const handleRemove = async (itemId, itemName) => { 
    try {
      await removeCartItem(itemId);
      // Hiển thị thông báo góc TRÊN BÊN PHẢI
      toast.success(`Đã xóa ${itemName || 'sản phẩm'} khỏi giỏ hàng!`, {
        position: "top-right",
        autoClose: 2000,
        theme: "colored",
      });
      fetchCartData(); // Refresh lại giỏ hàng
    } catch (err) {
      toast.error("Không thể xóa sản phẩm. Vui lòng thử lại!", {
        position: "top-right",
        theme: "colored",
      });
    }
  };

  const handleCheckout = () => {
    if (!cart?.items || cart.items.length === 0) {
      toast.warn("Giỏ hàng của bạn đang trống!", {
        position: "top-right",
        theme: "colored",
      });
      return;
    }
    toast.info("Đang chuyển đến trang thanh toán...", {
      position: "top-right",
      theme: "colored",
    });
    setTimeout(() => {
        navigate('/checkout'); 
    }, 1500);
  };

  const calculateTotal = () => {
    if (!cart?.items) return { rent: 0, deposit: 0 };
    return cart.items.reduce((acc, item) => {
      const price = item.deviceId?.rentPrice?.perDay || 0;
      const deposit = item.deviceId?.depositAmount || 0;
      return {
        rent: acc.rent + (price * item.totalDays * item.quantity),
        deposit: acc.deposit + (deposit * item.quantity)
      };
    }, { rent: 0, deposit: 0 });
  };

  const totals = calculateTotal();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Container cấu hình hiển thị Toast */}
      <ToastContainer 
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
      />

      {/* HEADER NAV */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 rounded-b-[32px] shadow-sm mb-8">
        <div className="max-w-[1440px] mx-auto px-8 py-5 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 font-bold transition-all">
            <ChevronLeft size={20} /> Quay lại cửa hàng
          </button>
          <h1 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Giỏ hàng của bạn</h1>
          <div className="w-20"></div> {/* Spacer */}
        </div>
      </div>

      <div className="max-w-[1440px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* DANH SÁCH ITEM (LEFT - 8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {cart?.items?.length > 0 ? (
            cart.items.map((item) => (
              <div key={item._id} className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm hover:shadow-md transition-all flex gap-6 relative group overflow-hidden">
                {/* Ảnh sản phẩm - Bo góc 2xl */}
                <div className="w-32 h-32 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex-shrink-0">
                  <img 
                    src={item.deviceId?.images?.[0] || 'https://via.placeholder.com/150'} 
                    alt={item.deviceId?.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                </div>

                {/* Nội dung */}
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-bold text-lg text-slate-900">{item.deviceId?.name}</h3>
                    <button 
                      onClick={() => handleRemove(item._id, item.deviceId?.name)}
                      className="text-slate-400 hover:text-red-500 transition-colors p-2 bg-slate-50 rounded-xl"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-4">
                    <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                      <Calendar size={14} className="text-indigo-600" />
                      <span>{new Date(item.rentalStartDate).toLocaleDateString()} - {new Date(item.rentalEndDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 text-indigo-700 font-bold">
                      {item.totalDays} ngày
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-slate-400 italic">Số lượng: <b className="text-slate-900">{item.quantity}</b></span>
                      <span className="text-slate-400 italic">Cọc: <b className="text-slate-900">{(item.deviceId?.depositAmount * item.quantity).toLocaleString()}đ</b></span>
                    </div>
                    <p className="text-xl font-black text-indigo-600">
                      {(item.deviceId?.rentPrice?.perDay * item.totalDays * item.quantity).toLocaleString()}đ
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white rounded-[40px] py-20 text-center border-2 border-dashed border-slate-200">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShoppingBag size={40} className="text-slate-300" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Giỏ hàng trống</h2>
              <p className="text-slate-500 mb-8">Hãy chọn cho mình những thiết bị Gear đỉnh nhất.</p>
              <button 
                onClick={() => navigate('/')}
                className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold hover:bg-indigo-600 transition-all active:scale-95"
              >
                Khám phá ngay
              </button>
            </div>
          )}
        </div>

        {/* SUMMARY (RIGHT - 4 cols) */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl sticky top-28">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6">Chi tiết thanh toán</h2>
            
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Tổng tiền thuê</span>
                <span>{totals.rent.toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Tổng tiền cọc</span>
                <span>{totals.deposit.toLocaleString()}đ</span>
              </div>
              <div className="flex justify-between text-slate-500 text-sm italic">
                <span>Phí dịch vụ</span>
                <span>Miễn phí</span>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                <span className="font-bold text-slate-900">Tổng cộng</span>
                <div className="text-right">
                  <p className="text-3xl font-black text-indigo-600 leading-none">{(totals.rent + totals.deposit).toLocaleString()}đ</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold mt-2">Đã bao gồm tiền cọc</p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 rounded-2xl p-4 flex items-start gap-3 mb-8 border border-indigo-100">
              <ShieldCheck className="text-indigo-600 flex-shrink-0" size={20} />
              <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                Tiền cọc sẽ được hoàn trả 100% sau khi thiết bị được kiểm tra và thu hồi thành công.
              </p>
            </div>

            <button 
              onClick={handleCheckout} 
              className="w-full bg-slate-900 text-white py-5 rounded-[24px] font-black text-lg uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-100 active:scale-[0.98]"
            >
              Thanh toán ngay <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartPage;