import { useEffect, useState } from "react";
import {
  Trash2,
  CreditCard,
  Wallet,
  Tag,
  Ticket,
  MapPin,
  Home,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  getCart,
  removeCartItem,
  clearCart,
} from "../../service/ApiService/CartApi";
import { validateVoucher } from "../../service/ApiService/VoucherApi.js";
import { checkout } from "../../service/ApiService/RentalApi";
// --- IMPORT THÊM CHO MAP ---
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix lỗi hiển thị icon marker mặc định của Leaflet trong React
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;
// ----------------------------

export default function CheckoutPage() {
  const CART_TYPE = "NORMAL";

  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ================= ADDRESS STATE ================= */
  const [address, setAddress] = useState({
    street: "",
    district: "",
    city: "",
    fullAddress: "",
  });
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [useInsurance, setUseInsurance] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState("BANK");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  /* ================= VOUCHER STATE ================= */
  const [voucherCode, setVoucherCode] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState(null);
  const [isApplyingVoucher, setIsApplyingVoucher] = useState(false);

  /* ================= MAP MODAL STATE ================= */
  const [showMapModal, setShowMapModal] = useState(false);
  const [mapPosition, setMapPosition] = useState([10.8231, 106.6297]); // Mặc định TP.HCM

  /* ================= AUTO-UPDATE FULL ADDRESS ================= */
  useEffect(() => {
    const { street, district, city } = address;
    // Chỉ tự động nối chuỗi khi các trường nhỏ thay đổi
    const full = [street, district, city].filter(Boolean).join(", ");
    setAddress((prev) => ({ ...prev, fullAddress: full }));
  }, [address.street, address.district, address.city]);

  /* ================= LOAD CART ================= */
  useEffect(() => {
    const fetchCart = async () => {
      try {
        const res = await getCart(CART_TYPE);
        setCart(res.data?.items || []);
      } catch {
        toast.error("Không thể tải giỏ hàng");
      } finally {
        setLoading(false);
      }
    };
    fetchCart();
  }, []);

  /* ================= MAP COMPONENT LOGIC (FIXED) ================= */
  function MapEventsHandler() {
    const map = useMapEvents({
      click: async (e) => {
        const { lat, lng } = e.latlng;

        // Kiểm tra an toàn trước khi set state
        if (lat !== undefined && lng !== undefined) {
          setMapPosition([lat, lng]);

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=vi`
            );
            const data = await res.json();

            if (data && data.address) {
              const addr = data.address;
              const city =
                addr.city || addr.town || addr.province || addr.state || "";
              const district =
                addr.suburb ||
                addr.district ||
                addr.county ||
                addr.quarter ||
                "";
              const street =
                addr.road || addr.house_number || addr.amenity || "";

              setAddress({
                city: city.replace("Thành phố ", "").replace("Tỉnh ", ""),
                district: district,
                street: street,
                fullAddress: data.display_name,
              });

              toast.success("Đã chọn vị trí");
              // Không nên tắt modal ngay lập tức nếu muốn người dùng thấy Marker đã nhảy
              setTimeout(() => setShowMapModal(false), 500);
            }
          } catch (error) {
            toast.error("Không thể lấy thông tin địa chỉ");
          }
        }
      },
    });

    // Chỉ render Marker nếu mapPosition hợp lệ và tồn tại
    return mapPosition && mapPosition[0] && mapPosition[1] ? (
      <Marker position={mapPosition} />
    ) : null;
  }

  /* ================= ADDRESS HELPERS ================= */
  const handleSetDefaultAddress = () => {
    setAddress({
      street: "Số 1 Võ Văn Ngân",
      district: "Thủ Đức",
      city: "TP. Hồ Chí Minh",
      fullAddress: "Số 1 Võ Văn Ngân, Thủ Đức, TP. Hồ Chí Minh",
    });
    setPhoneNumber("0901234567");
    toast.info("Đã áp dụng địa chỉ mặc định");
  };

  const handlePickOnMap = () => {
    setShowMapModal(true);
  };

  /* ================= REMOVE ITEM ================= */
  const handleRemoveFromCart = async (itemId) => {
    try {
      await removeCartItem(itemId);
      setCart((prev) => prev.filter((i) => i._id !== itemId));
      setAppliedVoucher(null);
    } catch {
      toast.error("Xóa sản phẩm thất bại");
    }
  };

  /* ================= APPLY VOUCHER ================= */
  const handleApplyVoucher = async () => {
    if (!voucherCode.trim()) {
      toast.error("Vui lòng nhập mã giảm giá");
      return;
    }

    try {
      setIsApplyingVoucher(true);
      const res = await validateVoucher({
        code: voucherCode,
        cartType: CART_TYPE,
      });
      setAppliedVoucher(res.data);
      toast.success(
        `Áp dụng mã thành công: Giảm ${res.data.discount.toLocaleString(
          "vi-VN"
        )} đ`
      );
    } catch (error) {
      setAppliedVoucher(null);
      toast.error(error.response?.data?.message || "Mã giảm giá không hợp lệ");
    } finally {
      setIsApplyingVoucher(false);
    }
  };

  /* ================= PRICE CALC ================= */
  const subtotal = cart.reduce((sum, item) => {
    const device = item.deviceId;
    return sum + device.rentPrice.perDay * item.totalDays * item.quantity;
  }, 0);

  const deliveryFee = 50000;
  const insuranceFee = useInsurance ? Math.round(subtotal * 0.05) : 0;
  const discountAmount = appliedVoucher ? appliedVoucher.discount : 0;
  const total = subtotal + deliveryFee + insuranceFee - discountAmount;

  /* ================= CHECKOUT ================= */
  const handleCheckout = async () => {
    if (!address.fullAddress || !phoneNumber) {
      toast.error("Vui lòng nhập đầy đủ địa chỉ và số điện thoại");
      return;
    }

    if (!agreeTerms) {
      toast.error("Bạn cần đồng ý điều khoản");
      return;
    }

    try {
      setIsProcessing(true);

      await checkout({
        cartType: CART_TYPE,
        deliveryAddress: address,
        phoneNumber,
        paymentMethod: selectedPayment,
        useInsurance,
        notes,
        voucherCode: appliedVoucher?.code,
      });

      toast.success("Đặt thuê thành công");
      setCart([]);
      setAppliedVoucher(null);
    } catch {
      toast.error("Thanh toán thất bại");
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-6">Đang tải...</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6 relative">
      {/* ================= MODAL MAP ================= */}
      {showMapModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl overflow-hidden shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <div>
                <h3 className="font-bold text-gray-800">
                  Chọn vị trí giao hàng
                </h3>
                <p className="text-xs text-gray-500 italic">
                  Click vào bản đồ để lấy địa chỉ tự động
                </p>
              </div>
              <button
                onClick={() => setShowMapModal(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="h-[500px] w-full relative">
              <MapContainer
                center={mapPosition}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
                // Thêm các thuộc tính này để map ổn định hơn
                whenCreated={(mapInstance) => {
                  mapInstance.invalidateSize();
                }}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <MapEventsHandler />
              </MapContainer>
            </div>
          </div>
        </div>
      )}

      {/* ================= CART ================= */}
      <div className="md:col-span-2">
        <h2 className="text-xl font-semibold mb-4">Thiết bị thuê</h2>

        {cart.length === 0 && <p className="text-gray-500">Giỏ hàng trống</p>}

        {cart.map((item) => {
          const device = item.deviceId;
          const itemTotal =
            device.rentPrice.perDay * item.totalDays * item.quantity;

          return (
            <div
              key={item._id}
              className="flex gap-4 p-4 bg-gray-50 rounded-lg mb-4"
            >
              <img
                src={device.images?.[0]}
                alt={device.name}
                className="w-24 h-24 rounded object-cover"
              />

              <div className="flex-1">
                <div className="flex justify-between">
                  <h3 className="font-medium">{device.name}</h3>
                  <button
                    onClick={() => handleRemoveFromCart(item._id)}
                    className="text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <p className="text-sm text-gray-500">
                  {item.totalDays} ngày • SL {item.quantity}
                </p>

                <p className="text-blue-600 mt-1 font-medium">
                  {itemTotal.toLocaleString("vi-VN")} đ
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= SUMMARY ================= */}
      <div className="bg-white border rounded-lg p-6 h-fit sticky top-6">
        <h3 className="text-lg font-semibold mb-4">Thanh toán</h3>

        {/* ADDRESS SECTION */}
        <div className="space-y-3 mb-4">
          <div className="flex gap-2 mb-2">
            <button
              onClick={handleSetDefaultAddress}
              className="flex-1 flex items-center justify-center gap-1 text-[11px] bg-gray-100 hover:bg-gray-200 py-1.5 rounded border transition-colors"
            >
              <Home size={14} /> Mặc định
            </button>
            <button
              onClick={handlePickOnMap}
              className="flex-1 flex items-center justify-center gap-1 text-[11px] bg-blue-50 text-blue-600 hover:bg-blue-100 py-1.5 rounded border border-blue-200 transition-colors"
            >
              <MapPin size={14} /> Chọn trên Map
            </button>
          </div>

          <input
            className="w-full border p-2 rounded text-sm"
            placeholder="Tỉnh / Thành phố"
            value={address.city}
            onChange={(e) => setAddress({ ...address, city: e.target.value })}
          />
          <input
            className="w-full border p-2 rounded text-sm"
            placeholder="Quận / Huyện"
            value={address.district}
            onChange={(e) =>
              setAddress({ ...address, district: e.target.value })
            }
          />
          <input
            className="w-full border p-2 rounded text-sm"
            placeholder="Số nhà, tên đường"
            value={address.street}
            onChange={(e) => setAddress({ ...address, street: e.target.value })}
          />

          {/* HIỂN THỊ ĐỊA CHỈ ĐẦY ĐỦ (NEW FIX) */}
          <div className="bg-gray-50 p-2 rounded border border-dashed border-gray-300">
            <label className="text-[10px] font-bold text-gray-500 uppercase">
              Địa chỉ đầy đủ:
            </label>
            <p className="text-xs text-gray-700 leading-relaxed min-h-[1.5rem]">
              {address.fullAddress || "Chưa có thông tin địa chỉ..."}
            </p>
          </div>

          <input
            className="w-full border p-2 rounded text-sm"
            placeholder="Số điện thoại"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />

          <textarea
            className="w-full border p-2 rounded text-sm"
            placeholder="Ghi chú"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* ================= VOUCHER SECTION ================= */}
        <div className="mb-6 border-t border-b py-4">
          <p className="flex items-center gap-2 font-medium mb-3 text-sm">
            <Ticket size={16} className="text-blue-600" /> Mã giảm giá
          </p>
          <div className="flex gap-2">
            <input
              className="flex-1 border p-2 rounded text-sm uppercase"
              placeholder="Nhập mã giảm giá..."
              value={voucherCode}
              onChange={(e) => setVoucherCode(e.target.value)}
            />
            <button
              onClick={handleApplyVoucher}
              disabled={isApplyingVoucher || !voucherCode}
              className="bg-gray-800 text-white px-4 py-2 rounded text-sm hover:bg-black disabled:opacity-50 transition-colors"
            >
              {isApplyingVoucher ? "..." : "Áp dụng"}
            </button>
          </div>
          {appliedVoucher && (
            <div className="mt-2 flex items-center justify-between bg-green-50 p-2 rounded border border-green-100">
              <p className="text-green-700 text-xs font-medium">
                ✓ Đã áp dụng mã: {appliedVoucher.code}
              </p>
              <button
                onClick={() => {
                  setAppliedVoucher(null);
                  setVoucherCode("");
                }}
                className="text-xs text-red-500 hover:underline"
              >
                Gỡ bỏ
              </button>
            </div>
          )}
        </div>

        {/* ================= PAYMENT METHODS ================= */}
        <div className="mb-6">
          <p className="font-medium mb-3 text-sm">Phương thức thanh toán</p>

          <div className="space-y-2">
            <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50 has-[:checked]:border-blue-500 transition-all">
              <input
                type="radio"
                name="payment"
                className="w-4 h-4 text-blue-600"
                checked={selectedPayment === "BANK"}
                onChange={() => setSelectedPayment("BANK")}
              />
              <CreditCard size={18} className="text-gray-600" />
              <span className="text-sm">Chuyển khoản ngân hàng</span>
            </label>

            <label className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50 has-[:checked]:border-blue-500 transition-all">
              <input
                type="radio"
                name="payment"
                className="w-4 h-4 text-blue-600"
                checked={selectedPayment === "WALLET"}
                onChange={() => setSelectedPayment("WALLET")}
              />
              <Wallet size={18} className="text-gray-600" />
              <span className="text-sm">Ví GearXpert</span>
            </label>
          </div>

          {/* BANK QR */}
          {selectedPayment === "BANK" && (
            <div className="mt-4 p-4 border rounded bg-gray-50 text-center animate-in fade-in duration-300">
              <p className="font-medium mb-2 text-sm text-gray-700">
                Quét QR để chuyển khoản
              </p>
              <img
                className="mx-auto border-2 border-white shadow-sm"
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=GEARXPERT_BANK_TRANSFER_${total}`}
                alt="QR"
              />
              <p className="text-xs text-gray-500 mt-2">
                Nội dung:{" "}
                <span className="font-bold text-gray-800">
                  GEARXPERT {phoneNumber}
                </span>
              </p>
            </div>
          )}

          {/* WALLET */}
          {selectedPayment === "WALLET" && (
            <div className="mt-4 p-4 border rounded bg-blue-50 border-blue-100 animate-in fade-in duration-300">
              <p className="font-medium text-blue-800 text-sm">
                Thanh toán bằng ví GearXpert
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Số dư sẽ được hệ thống khấu trừ tự động sau khi bạn xác nhận đơn
                hàng.
              </p>
            </div>
          )}
        </div>

        {/* ================= TOTAL BREAKDOWN ================= */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>Tạm tính</span>
            <span>{subtotal.toLocaleString("vi-VN")} đ</span>
          </div>

          <div className="flex justify-between text-gray-600">
            <span>Phí giao hàng</span>
            <span>{deliveryFee.toLocaleString("vi-VN")} đ</span>
          </div>

          <div className="flex justify-between text-gray-600">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="rounded text-blue-600"
                checked={useInsurance}
                onChange={(e) => setUseInsurance(e.target.checked)}
              />
              Phí bảo hiểm (5%)
            </label>
            <span>{insuranceFee.toLocaleString("vi-VN")} đ</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex justify-between text-green-600 font-medium">
              <span>Giảm giá voucher</span>
              <span>-{discountAmount.toLocaleString("vi-VN")} đ</span>
            </div>
          )}

          <div className="flex justify-between font-bold text-lg pt-3 border-t mt-2">
            <span>Tổng thanh toán</span>
            <span className="text-blue-600">
              {Math.max(0, total).toLocaleString("vi-VN")} đ
            </span>
          </div>
        </div>

        <label className="flex items-center gap-2 mt-6 text-xs text-gray-500 cursor-pointer">
          <input
            type="checkbox"
            className="rounded"
            checked={agreeTerms}
            onChange={(e) => setAgreeTerms(e.target.checked)}
          />
          Tôi đồng ý với các Điều khoản & Chính sách của GearXpert
        </label>

        <button
          onClick={handleCheckout}
          disabled={isProcessing || cart.length === 0}
          className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98]"
        >
          {isProcessing ? "Đang xử lý đơn hàng..." : "Xác nhận & Đặt thuê"}
        </button>
      </div>
    </div>
  );
}
