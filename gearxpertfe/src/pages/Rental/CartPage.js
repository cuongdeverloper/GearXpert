import React, { useCallback, useState } from "react";
import {
  Trash2,
  ShoppingBag,
  Calendar,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Store,
} from "lucide-react";
import { getCart, removeCartItem } from "../../service/ApiService/CartApi";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";

const CartPage = () => {
  const [groupedBySupplier, setGroupedBySupplier] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const DAY = 1000 * 60 * 60 * 24;

  // Hàm xử lý dữ liệu: Nhóm theo supplierId
  const processCartData = useCallback(
    (rawCart) => {
      if (!rawCart?.items) return [];

      const calculateDays = (start, end) => {
        const d1 = new Date(start);
        const d2 = new Date(end);
        d1.setHours(0, 0, 0, 0);
        d2.setHours(0, 0, 0, 0);
        const diffTime = Math.abs(d2 - d1);
        const diffDays = Math.ceil(diffTime / DAY);
        return diffDays > 0 ? diffDays : 1;
      };

      // 1. Nhóm theo supplierId
      const supplierGroups = rawCart.items.reduce((acc, item) => {
        const supplierId = item.deviceId?.supplierId?._id;
        const supplierName =
          item.deviceId?.supplierId?.fullName ||
          `Cửa hàng #${supplierId?.slice(-6) || "unknown"}`;

        if (!supplierId) return acc;

        if (!acc[supplierId]) {
          acc[supplierId] = {
            supplierId,
            supplierName,
            devices: {}, // Nhóm tiếp theo deviceId bên trong supplier
          };
        }

        const deviceId = item.deviceId._id;
        if (!acc[supplierId].devices[deviceId]) {
          acc[supplierId].devices[deviceId] = {
            device: item.deviceId,
            bookings: [],
          };
        }

        acc[supplierId].devices[deviceId].bookings.push({
          id: item._id,
          startDate: new Date(item.rentalStartDate),
          endDate: new Date(item.rentalEndDate),
          quantity: item.quantity,
          totalDays: calculateDays(item.rentalStartDate, item.rentalEndDate),
          rentPrice: item.deviceId?.rentPrice?.perDay || 0,
        });

        return acc;
      }, {});

      // 2. Chuyển thành mảng, sắp xếp booking theo ngày
      return Object.values(supplierGroups).map((supplierGroup) => {
        supplierGroup.devices = Object.values(supplierGroup.devices).map(
          (deviceGroup) => {
            deviceGroup.bookings.sort((a, b) => a.startDate - b.startDate);
            return deviceGroup;
          }
        );
        return supplierGroup;
      });
    },
    [DAY]
  );

  const fetchCartData = useCallback(async () => {
    try {
      const res = await getCart("NORMAL");
      const processed = processCartData(res);
      setGroupedBySupplier(processed);

      // Hiển thị toast nếu có item bị xóa tự động
      if (res.cleaned) {
        toast.warning(
          res.message ||
            "Một số sản phẩm trong giỏ đã hết hàng và bị tự động xóa!",
          { autoClose: 5000 }
        );
      }
    } catch (err) {
      console.error("Error fetching cart", err);
      toast.error("Không thể tải giỏ hàng");
    } finally {
      setLoading(false);
    }
  }, [processCartData]);
  useEffect(() => {
    fetchCartData();
  }, [fetchCartData]);
  const handleRemove = async (itemId, deviceName) => {
    try {
      await removeCartItem(itemId);
      toast.success(`Đã xóa lịch thuê của ${deviceName}!`);
      fetchCartData();
    } catch (err) {
      toast.error("Không thể xóa. Vui lòng thử lại!");
    }
  };

  const handleCheckout = () => {
    if (!groupedBySupplier || groupedBySupplier.length === 0) {
      toast.warn("Giỏ hàng của bạn đang trống!");
      return;
    }
    toast.info("Đang chuyển đến trang thanh toán...");
    setTimeout(() => {
      navigate("/rental/checkout");
    }, 1500);
  };

  // Tính tổng tiền thuê + cọc theo supplier
  const calculateTotals = () => {
    let totalRent = 0;
    let totalDeposit = 0;

    groupedBySupplier.forEach((supplier) => {
      Object.values(supplier.devices).forEach((deviceGroup) => {
        // Tiền thuê: tổng tất cả booking
        const rent = deviceGroup.bookings.reduce(
          (sum, b) => sum + b.rentPrice * b.totalDays * b.quantity,
          0
        );
        totalRent += rent;

        // Tiền cọc: max quantity trong tất cả booking của thiết bị này
        const maxQty = Math.max(
          ...deviceGroup.bookings.map((b) => b.quantity),
          0
        );
        totalDeposit += (deviceGroup.device?.depositAmount || 0) * maxQty;
      });
    });

    return { rent: totalRent, deposit: totalDeposit };
  };

  const totals = calculateTotals();

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans">
      <Header />
      <div className="flex-1 pb-20">
        <ToastContainer position="top-right" autoClose={2000} theme="colored" />

        {/* HEADER NAV */}
        <div className="sticky top-[84px] z-40 mx-6 bg-white/80 backdrop-blur-md border border-slate-200 rounded-[24px] shadow-lg mt-4 mb-8">
          <div className="max-w-[1440px] mx-auto px-6 py-3 flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
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
          {/* DANH SÁCH THEO SUPPLIER (LEFT) */}
          <div className="lg:col-span-8 space-y-6">
            {groupedBySupplier.length > 0 ? (
              groupedBySupplier.map((supplierGroup) => (
                <div
                  key={supplierGroup.supplierId}
                  className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl hover:shadow-2xl transition-all duration-500 relative group overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/30 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-indigo-100/40 transition-colors"></div>

                  {/* SUPPLIER HEADER */}
                  <div className="relative flex items-center gap-4 mb-6 pb-4 border-b border-slate-100">
                    <div className="p-3 bg-indigo-100 rounded-2xl">
                      <Store size={28} className="text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-slate-900">
                        {supplierGroup.supplierName}
                      </h2>
                      <p className="text-sm text-slate-500">
                        Nhà cung cấp thiết bị
                      </p>
                    </div>
                  </div>

                  {/* DEVICES IN SUPPLIER */}
                  {Object.values(supplierGroup.devices).map((deviceGroup) => (
                    <div
                      key={deviceGroup.device._id}
                      className="mb-8 last:mb-0"
                    >
                      <div className="flex flex-col md:flex-row gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                        {/* THUMBNAIL */}
                        <div className="w-full md:w-40 h-40 bg-white rounded-2xl overflow-hidden border border-slate-200 flex-shrink-0">
                          <img
                            src={
                              deviceGroup.device?.images?.[0] ||
                              "https://via.placeholder.com/150"
                            }
                            alt={deviceGroup.device?.name}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* CONTENT */}
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-slate-900 mb-2">
                            {deviceGroup.device?.name}
                          </h3>

                          {/* BOOKINGS */}
                          <div className="space-y-4">
                            {deviceGroup.bookings.map((booking) => (
                              <div
                                key={booking.id}
                                className="flex flex-wrap justify-between items-center gap-4 bg-white p-4 rounded-xl border border-slate-200"
                              >
                                <div className="flex items-center gap-4">
                                  <Calendar
                                    size={20}
                                    className="text-indigo-600"
                                  />
                                  <div>
                                    <p className="font-medium">
                                      {booking.startDate.toLocaleDateString(
                                        "vi-VN"
                                      )}{" "}
                                      →{" "}
                                      {booking.endDate.toLocaleDateString(
                                        "vi-VN"
                                      )}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                      {booking.totalDays} ngày • SL:{" "}
                                      {booking.quantity}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-6">
                                  <p className="font-bold text-indigo-600">
                                    {(
                                      booking.rentPrice *
                                      booking.totalDays *
                                      booking.quantity
                                    ).toLocaleString()}
                                    đ
                                  </p>
                                  <button
                                    onClick={() =>
                                      handleRemove(
                                        booking.id,
                                        deviceGroup.device?.name
                                      )
                                    }
                                    className="text-red-400 hover:text-red-600 transition-colors"
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
                  ))}

                  {/* TỔNG CỦA SUPPLIER NÀY (tùy chọn hiển thị) */}
                  <div className="mt-6 pt-4 border-t border-slate-100 text-right">
                    <p className="text-sm font-medium text-slate-600">
                      Tạm tính supplier:
                      <span className="font-bold text-indigo-600 ml-2">
                        {Object.values(supplierGroup.devices)
                          .reduce((sum, d) => {
                            return (
                              sum +
                              d.bookings.reduce(
                                (s, b) =>
                                  s + b.rentPrice * b.totalDays * b.quantity,
                                0
                              )
                            );
                          }, 0)
                          .toLocaleString()}
                        đ
                      </span>
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-[40px] py-20 text-center border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <ShoppingBag size={40} className="text-slate-300" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">
                  Giỏ hàng trống
                </h2>
                <p className="text-slate-500 mb-8">
                  Hãy chọn cho mình những thiết bị Gear đỉnh nhất.
                </p>
                <button
                  onClick={() => navigate("/")}
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
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter mb-6">
                Chi tiết thanh toán
              </h2>

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
                    <p className="text-3xl font-black text-indigo-600 leading-none">
                      {(totals.rent + totals.deposit).toLocaleString()}đ
                    </p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold mt-2">
                      Đã bao gồm tiền cọc
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 rounded-2xl p-4 flex items-start gap-3 mb-8 border border-indigo-100">
                <ShieldCheck
                  className="text-indigo-600 flex-shrink-0"
                  size={20}
                />
                <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                  Tiền cọc sẽ được hoàn trả 100% sau khi thiết bị được kiểm tra
                  và thu hồi thành công.
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
