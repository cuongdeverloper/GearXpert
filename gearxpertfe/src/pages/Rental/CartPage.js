import React, { useEffect, useState } from 'react';
import { Trash2, ShoppingBag, Calendar, ShieldCheck, ArrowRight, ArrowLeft } from 'lucide-react';
import { getCart, removeCartItem, clearCart } from '../../service/ApiService/CartApi';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Header from '../../components/navigation/Header';
import Footer from '../../components/homepage/Footer';

const CartPage = () => {
  const [groupedCart, setGroupedCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Hàm xử lý dữ liệu: Chỉ nhóm theo sản phẩm, không tự ý gộp ngày để tránh conflict logistics
  const processCartData = (rawCart) => {
    if (!rawCart?.items) return [];

    const calculateDays = (start, end) => {
      const d1 = new Date(start);
      const d2 = new Date(end);
      d1.setHours(0, 0, 0, 0);
      d2.setHours(0, 0, 0, 0);
      const diffTime = Math.abs(d2 - d1);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 1;
    };

    // 1. Nhóm theo deviceId
    const groups = rawCart.items.reduce((acc, item) => {
      const dId = item.deviceId._id;
      if (!acc[dId]) {
        acc[dId] = {
          device: item.deviceId,
          bookings: [] // Danh sách các lịch thuê riêng biệt của cùng 1 thiết bị
        };
      }

      acc[dId].bookings.push({
        id: item._id,
        startDate: new Date(item.rentalStartDate),
        endDate: new Date(item.rentalEndDate),
        quantity: item.quantity,
        totalDays: calculateDays(item.rentalStartDate, item.rentalEndDate),
        rentPrice: item.deviceId?.rentPrice?.perDay || 0
      });
      return acc;
    }, {});

    // 2. Trả về danh sách đã nhóm và sắp xếp lịch theo thời gian
    return Object.values(groups).map(group => {
      group.bookings.sort((a, b) => a.startDate - b.startDate);
      return group;
    });
  };

  const fetchCartData = async () => {
    try {
      const res = await getCart("NORMAL");
      const processed = processCartData(res);
      setGroupedCart(processed);
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
      toast.success(`Đã xóa 1 lịch thuê của ${itemName}!`, {
        position: "top-right",
        autoClose: 2000,
        theme: "colored",
      });
      fetchCartData();
    } catch (err) {
      toast.error("Không thể xóa sản phẩm. Vui lòng thử lại!");
    }
  };

  const handleCheckout = () => {
    if (!groupedCart || groupedCart.length === 0) {
      toast.warn("Giỏ hàng của bạn đang trống!");
      return;
    }
    toast.info("Đang chuyển đến trang thanh toán...");
    setTimeout(() => {
      navigate('/rental/checkout');
    }, 1500);
  };

  // HÀM SỬA LỖI: Cập nhật tên biến từ mergedBookings sang bookings
  const calculateTotal = () => {
    if (!groupedCart || groupedCart.length === 0) return { rent: 0, deposit: 0 };

    return groupedCart.reduce((acc, group) => {
      // Tiền thuê = Tổng của các đợt lẻ
      const groupRent = group.bookings.reduce((sum, b) =>
        sum + (b.rentPrice * b.totalDays * b.quantity), 0
      );

      // Tiền cọc = Số lượng máy lớn nhất trong các đợt x đơn giá cọc
      const maxQty = group.bookings.length > 0 
        ? Math.max(...group.bookings.map(b => b.quantity)) 
        : 0;
      const groupDeposit = (group.device?.depositAmount || 0) * maxQty;

      return {
        rent: acc.rent + groupRent,
        deposit: acc.deposit + groupDeposit
      };
    }, { rent: 0, deposit: 0 });
  };

  const totals = calculateTotal();

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <Header />
      <div className="flex-1 pb-20">
        <ToastContainer position="top-right" autoClose={2000} theme="colored" />

        {/* HEADER NAV */}
        <div className="sticky top-[84px] z-40 mx-6 bg-white/80 backdrop-blur-md border border-slate-200 rounded-[24px] shadow-lg mt-4 mb-8">
          <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 transition-colors font-semibold"
            >
              <ArrowLeft className="w-5 h-5" />
              Quay lại cửa hàng
            </button>
            <div className="hidden md:flex items-center gap-4">
              <span className="text-sm font-medium text-slate-400">
                Trang chủ / Giỏ hàng của bạn
              </span>
            </div>
          </div>
        </div>

        <div className="max-w-[1440px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* DANH SÁCH ITEM (LEFT) */}
          <div className="lg:col-span-8 space-y-6">
            {groupedCart.length > 0 ? (
              groupedCart.map((group) => (
                <div key={group.device._id} className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl hover:shadow-2xl transition-all duration-500 relative group overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-indigo-100/40 transition-colors"></div>

                  <div className="relative flex flex-col md:flex-row gap-8">
                    {/* THUMBNAIL */}
                    <div className="w-full md:w-48 h-48 bg-slate-50 rounded-[32px] overflow-hidden border border-slate-100 flex-shrink-0 relative">
                      <img
                        src={group.device?.images?.[0] || 'https://via.placeholder.com/150'}
                        alt={group.device?.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute top-4 left-4">
                        <span className="bg-white/90 backdrop-blur-md text-indigo-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-sm border border-indigo-50">
                          {group.device?.category}
                        </span>
                      </div>
                    </div>

                    {/* CONTENT */}
                    <div className="flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <h3 className="text-2xl font-black text-slate-900 leading-tight mb-1">{group.device?.name}</h3>
                          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
                            <ShieldCheck size={14} className="text-indigo-500" />
                            <span>Bảo hiểm Pro đi kèm</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Tiền cọc thiết bị</p>
                          <p className="text-lg font-black text-slate-900 leading-none">
                            {/* CẬP NHẬT: Tính tiền cọc dựa trên max quantity trong mảng bookings */}
                            {(group.device?.depositAmount * Math.max(...group.bookings.map(b => b.quantity))).toLocaleString()}đ
                          </p>
                        </div>
                      </div>

                      {/* BOOKING ROWS - HIỂN THỊ TỪNG LỊCH THUÊ */}
                      <div className="space-y-3 bg-slate-50/50 p-4 rounded-[24px] border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 mb-2">Lịch thuê của bạn</p>
                        {group.bookings.map((booking) => (
                          <div key={booking.id} className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-indigo-200 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-indigo-50 rounded-xl">
                                <Calendar size={16} className="text-indigo-600" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-xs font-black text-slate-900">
                                  {booking.startDate.toLocaleDateString('vi-VN')} - {booking.endDate.toLocaleDateString('vi-VN')}
                                </span>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{booking.totalDays} ngày • Số lượng: {booking.quantity}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="text-right">
                                <p className="text-sm font-black text-indigo-600">
                                  {(booking.rentPrice * booking.totalDays * booking.quantity).toLocaleString()}đ
                                </p>
                              </div>
                              <button
                                onClick={() => handleRemove(booking.id, group.device?.name)}
                                className="text-slate-300 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-xl"
                                title="Xóa lịch thuê này"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
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

          {/* SUMMARY (RIGHT) */}
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
      <Footer />
    </div>
  );
};

export default CartPage;