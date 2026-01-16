import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  CheckCircle2,
  MapPin,
  Phone,
  CreditCard,
  ArrowLeft,
  ShieldCheck,
  FileText,
  Package,
  Calendar,
  AlertCircle, Wallet
} from "lucide-react";

export default function OrderReviewPage() {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);

  // ================= MOCK DATA =================
  const mockOrderData = {
    cartType: "NORMAL",
    deliveryAddress: {
      street: "Số 1 Võ Văn Ngân",
      district: "Linh Chiểu, Thủ Đức",
      city: "TP. Hồ Chí Minh",
      fullAddress: "Số 1 Võ Văn Ngân, Phường Linh Chiểu, Thành phố Thủ Đức, Thành phố Hồ Chí Minh, 700000, Việt Nam"
    },
    phoneNumber: "0901234567",
    paymentMethod: "BANK", // Hoặc "WALLET"
    useInsurance: true,
    notes: "Giao hàng sau 5h chiều, vui lòng gọi trước khi đến.",
    voucherCode: "GEARX2024",
    items: [
      {
        _id: "item_01",
        quantity: 1,
        totalDays: 3,
        deviceId: {
          name: "Sony Alpha A7 IV w/ 24-70mm f/2.8 GM II",
          images: ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&q=80&w=300"],
          rentPrice: { perDay: 850000 }
        }
      },
      {
        _id: "item_02",
        quantity: 2,
        totalDays: 3,
        deviceId: {
          name: "DJI Ronin RS 3 Pro Combo",
          images: ["https://images.unsplash.com/photo-1533167683971-508b98166928?auto=format&fit=crop&q=80&w=300"],
          rentPrice: { perDay: 450000 }
        }
      }
    ],
    fees: {
      subtotal: 5250000,
      deliveryFee: 50000,
      insuranceFee: 262500,
      discountAmount: 200000,
      total: 5362500
    }
  };

  const [orderData, setOrderData] = useState(mockOrderData);

  const handleConfirmOrder = () => {
    setIsProcessing(true);
    // Giả lập thời gian chờ API
    setTimeout(() => {
      setIsProcessing(false);
      toast.success("MOCK: Đã gửi đơn hàng thành công!");
      // navigate("/order-success");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <div className="max-w-5xl mx-auto p-4 md:p-6">

        {/* Nút quay lại */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-500 hover:text-black mb-6 transition-colors group"
        >
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          Chỉnh sửa thông tin thanh toán
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* CỘT TRÁI: CHI TIẾT ĐƠN HÀNG */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-50 bg-white">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                  <Package className="text-blue-600" size={24} />
                  Review đơn hàng của bạn
                </h1>
                <p className="text-gray-500 text-sm mt-1">Vui lòng kiểm tra kỹ các thông tin trước khi xác nhận thuê.</p>
              </div>

              {/* Danh sách thiết bị */}
              <div className="p-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Thiết bị thuê</h3>
                <div className="space-y-4">
                  {orderData.items.map((item) => (
                    <div key={item._id} className="flex gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                      <img
                        src={item.deviceId.images[0]}
                        className="w-20 h-20 object-cover rounded-lg shadow-sm"
                        alt={item.deviceId.name}
                      />
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-800 leading-tight">{item.deviceId.name}</h4>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                          <span className="flex items-center gap-1"><Calendar size={14} /> {item.totalDays} ngày</span>
                          <span>SL: {item.quantity}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          {(item.deviceId.rentPrice.perDay * item.quantity * item.totalDays).toLocaleString("vi-VN")} đ
                        </p>
                        <p className="text-[10px] text-gray-400">{item.deviceId.rentPrice.perDay.toLocaleString("vi-VN")} đ/ngày</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Thông tin nhận hàng */}
              <div className="p-6 bg-blue-50/30 border-t border-gray-100">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Thông tin giao nhận</h3>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <MapPin className="text-blue-600 shrink-0" size={18} />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Địa chỉ giao hàng</p>
                        <p className="text-sm font-semibold text-gray-800">{orderData.deliveryAddress.fullAddress}</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <Phone className="text-blue-600 shrink-0" size={18} />
                      <div>
                        <p className="text-xs text-gray-500 font-medium">Số điện thoại</p>
                        <p className="text-sm font-semibold text-gray-800">{orderData.phoneNumber}</p>
                      </div>
                    </div>
                  </div>
                </div>
                {orderData.notes && (
                  <div className="mt-4 flex gap-3 p-3 bg-white rounded-lg border border-blue-100">
                    <FileText className="text-orange-400 shrink-0" size={18} />
                    <p className="text-sm text-gray-600 italic">"{orderData.notes}"</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-700 text-sm">
              <AlertCircle size={18} />
              <span>Thiết bị sẽ được kiểm tra ngoại quan và test chức năng cùng kỹ thuật viên khi bàn giao.</span>
            </div>
          </div>

          {/* CỘT PHẢI: TỔNG KẾT CHI PHÍ */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              <div className="p-6 bg-gray-900 text-white">
                <h2 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <CreditCard size={20} className="text-blue-400" /> Thanh toán
                </h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between opacity-70">
                    <span>Tổng tiền máy</span>
                    <span>{orderData.fees.subtotal.toLocaleString("vi-VN")} đ</span>
                  </div>
                  <div className="flex justify-between opacity-70">
                    <span>Phí vận chuyển</span>
                    <span>{orderData.fees.deliveryFee.toLocaleString("vi-VN")} đ</span>
                  </div>
                  {orderData.useInsurance && (
                    <div className="flex justify-between items-center text-blue-300">
                      <span className="flex items-center gap-1"><ShieldCheck size={14} /> Bảo hiểm thiết bị (5%)</span>
                      <span>+{orderData.fees.insuranceFee.toLocaleString("vi-VN")} đ</span>
                    </div>
                  )}
                  {orderData.fees.discountAmount > 0 && (
                    <div className="flex justify-between text-green-400 font-bold">
                      <span>Voucher: {orderData.voucherCode}</span>
                      <span>-{orderData.fees.discountAmount.toLocaleString("vi-VN")} đ</span>
                    </div>
                  )}
                  <div className="border-t border-gray-700 pt-4 mt-4 flex justify-between text-2xl font-black text-white">
                    <span>Tổng cộng</span>
                    <span className="text-blue-400">
                      {orderData.fees.total.toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-bold uppercase mb-3">Phương thức chọn:</p>
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  {orderData.paymentMethod === "BANK" ? (
                    <><CreditCard className="text-gray-600" /> <span className="font-medium text-gray-700">Chuyển khoản ngân hàng</span></>
                  ) : (
                    <><Wallet className="text-blue-600" /> <span className="font-medium text-gray-700">Ví GearXpert</span></>
                  )}
                </div>

                <button
                  onClick={handleConfirmOrder}
                  disabled={isProcessing}
                  className="w-full mt-6 bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Xác nhận đặt thuê <CheckCircle2 size={20} /></>
                  )}
                </button>
              </div>
            </div>

            <div className="text-center px-4">
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Bằng việc nhấn "Xác nhận đặt thuê", bạn đồng ý với <span className="underline cursor-pointer">Quy trình bàn giao</span> và <span className="underline cursor-pointer">Chính sách đền bù</span> của chúng tôi.
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}