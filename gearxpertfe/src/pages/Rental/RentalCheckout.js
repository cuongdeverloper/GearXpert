import { useEffect, useState } from "react";
import { Trash2, CreditCard, Wallet } from "lucide-react";
import { toast } from "sonner";

import {
  getCart,
  removeCartItem,
  clearCart
} from "../../service/ApiService/CartApi";

import { checkout } from "../../service/ApiService/RentalApi";

export default function CheckoutPage() {
  const CART_TYPE = "NORMAL"; // hoặc INSTANT

  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [useInsurance, setUseInsurance] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState("BANK");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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

  /* ================= REMOVE ITEM ================= */
  const handleRemoveFromCart = async (itemId) => {
    try {
      await removeCartItem(itemId);
      setCart((prev) => prev.filter((i) => i._id !== itemId));
    } catch {
      toast.error("Xóa sản phẩm thất bại");
    }
  };

  /* ================= PRICE CALC ================= */
  const subtotal = cart.reduce((sum, item) => {
    const device = item.deviceId;
    return (
      sum +
      device.rentPrice.perDay *
        item.totalDays *
        item.quantity
    );
  }, 0);

  const deliveryFee = 50000;
  const insuranceFee = useInsurance ? Math.round(subtotal * 0.05) : 0;
  const total = subtotal + deliveryFee + insuranceFee;

  /* ================= CHECKOUT ================= */
  const handleCheckout = async () => {
    if (!deliveryAddress || !phoneNumber) {
      toast.error("Vui lòng nhập địa chỉ và số điện thoại");
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
        deliveryAddress,
        phoneNumber,
        paymentMethod: selectedPayment, // BANK | WALLET
        useInsurance,
        notes
      });

      toast.success("Đặt thuê thành công");
      setCart([]);
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
    <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* ================= CART ================= */}
      <div className="md:col-span-2">
        <h2 className="text-xl font-semibold mb-4">Thiết bị thuê</h2>

        {cart.length === 0 && (
          <p className="text-gray-500">Giỏ hàng trống</p>
        )}

        {cart.map((item) => {
          const device = item.deviceId;
          const itemTotal =
            device.rentPrice.perDay *
            item.totalDays *
            item.quantity;

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
                    onClick={() =>
                      handleRemoveFromCart(item._id)
                    }
                    className="text-red-600"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <p className="text-sm text-gray-500">
                  {item.totalDays} ngày • SL {item.quantity}
                </p>

                <p className="text-blue-600 mt-1">
                  {itemTotal.toLocaleString("vi-VN")} đ
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ================= SUMMARY ================= */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">
          Thanh toán
        </h3>

        <input
          className="w-full border p-2 rounded mb-3"
          placeholder="Địa chỉ giao hàng"
          value={deliveryAddress}
          onChange={(e) =>
            setDeliveryAddress(e.target.value)
          }
        />

        <input
          className="w-full border p-2 rounded mb-3"
          placeholder="Số điện thoại"
          value={phoneNumber}
          onChange={(e) =>
            setPhoneNumber(e.target.value)
          }
        />

        <textarea
          className="w-full border p-2 rounded mb-3"
          placeholder="Ghi chú"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        {/* ================= PAYMENT ================= */}
        <div className="mb-4">
          <p className="font-medium mb-2">
            Phương thức thanh toán
          </p>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={selectedPayment === "BANK"}
                onChange={() =>
                  setSelectedPayment("BANK")
                }
              />
              <CreditCard size={18} />
              Chuyển khoản ngân hàng
            </label>

            <label className="flex items-center gap-2">
              <input
                type="radio"
                checked={selectedPayment === "WALLET"}
                onChange={() =>
                  setSelectedPayment("WALLET")
                }
              />
              <Wallet size={18} />
              Ví GearXpert
            </label>
          </div>

          {/* BANK QR */}
          {selectedPayment === "BANK" && (
            <div className="mt-4 p-4 border rounded bg-gray-50 text-center">
              <p className="font-medium mb-2">
                Quét QR để chuyển khoản
              </p>
              <img
                className="mx-auto"
                src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=GEARXPERT_BANK_TRANSFER"
                alt="QR"
              />
              <p className="text-sm text-gray-600 mt-2">
                Nội dung: GEARXPERT + SĐT
              </p>
            </div>
          )}

          {/* WALLET */}
          {selectedPayment === "WALLET" && (
            <div className="mt-4 p-4 border rounded bg-purple-50">
              <p className="font-medium text-purple-700">
                Thanh toán bằng ví GearXpert
              </p>
              <p className="text-sm text-gray-600">
                Số dư sẽ được trừ sau khi xác nhận
              </p>
            </div>
          )}
        </div>

        {/* ================= TOTAL ================= */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Tạm tính</span>
            <span>
              {subtotal.toLocaleString("vi-VN")} đ
            </span>
          </div>

          <div className="flex justify-between">
            <span>Phí giao hàng</span>
            <span>
              {deliveryFee.toLocaleString("vi-VN")} đ
            </span>
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useInsurance}
              onChange={(e) =>
                setUseInsurance(e.target.checked)
              }
            />
            Bảo hiểm (5%)
          </label>

          <div className="flex justify-between font-semibold text-base pt-2 border-t">
            <span>Tổng</span>
            <span className="text-blue-600">
              {total.toLocaleString("vi-VN")} đ
            </span>
          </div>
        </div>

        <label className="flex items-center gap-2 mt-4 text-sm">
          <input
            type="checkbox"
            checked={agreeTerms}
            onChange={(e) =>
              setAgreeTerms(e.target.checked)
            }
          />
          Tôi đồng ý điều khoản thuê
        </label>

        <button
          onClick={handleCheckout}
          disabled={isProcessing || cart.length === 0}
          className="w-full mt-4 bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isProcessing
            ? "Đang xử lý..."
            : "Xác nhận thanh toán"}
        </button>
      </div>
    </div>
  );
}
