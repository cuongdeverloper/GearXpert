import { useEffect, useState } from "react";
import { Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import {
  getCart,
  removeCartItem,
  clearCart
} from "../../service/ApiService/CartApi";
import { checkout } from "../../service/ApiService/RentalApi";
import { useSearchParams } from "react-router-dom";

export default function CheckoutPage() {
  const [params] = useSearchParams();
  const type = params.get("type") || "NORMAL";

  const [cart, setCart] = useState([]);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [useInsurance, setUseInsurance] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadCart();
  }, [type]);

  const loadCart = async () => {
    const res = await getCart(type);
    setCart(res.items || []);
  };

  const subtotal = cart.reduce(
    (sum, i) => sum + i.rentPrice,
    0
  );
  const insurance = useInsurance
    ? Math.round(subtotal * 0.05)
    : 0;
  const deliveryFee = 50000;
  const total = subtotal + insurance + deliveryFee;

  const handleCheckout = async () => {
    if (!deliveryAddress || !phoneNumber) {
      toast.error("Thiếu thông tin giao hàng");
      return;
    }

    setProcessing(true);

    await checkout({
      deliveryAddress,
      phoneNumber,
      notes,
      useInsurance
    });

    await clearCart(type);

    toast.success("Checkout thành công");
    setCart([]);
    setProcessing(false);
  };

  if (!cart.length) {
    return (
      <div className="h-screen flex flex-col items-center justify-center">
        <ShoppingCart size={48} />
        <p>Giỏ hàng trống</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 grid grid-cols-3 gap-8">
      <div className="col-span-2">
        {cart.map((item) => (
          <div
            key={item._id}
            className="flex justify-between p-4 bg-white rounded mb-4"
          >
            <div>
              <b>{item.deviceId.name}</b>
              <p>
                {item.totalDays} ngày • SL: {item.quantity}
              </p>
            </div>
            <div>
              {item.rentPrice.toLocaleString()}đ
              <button
                onClick={() =>
                  removeCartItem(item._id).then(loadCart)
                }
                className="ml-4 text-red-600"
              >
                <Trash2 />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-xl">
        <input
          placeholder="SĐT"
          className="w-full p-2 border mb-2"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
        />
        <textarea
          placeholder="Địa chỉ"
          className="w-full p-2 border mb-2"
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
        />

        <label className="flex gap-2 mb-2">
          <input
            type="checkbox"
            checked={useInsurance}
            onChange={(e) => setUseInsurance(e.target.checked)}
          />
          Bảo hiểm (5%)
        </label>

        <p>Tổng: {total.toLocaleString()}đ</p>

        <button
          disabled={processing}
          onClick={handleCheckout}
          className="w-full bg-purple-600 text-white p-3 rounded mt-4"
        >
          {processing ? "Đang xử lý..." : "Thanh toán"}
        </button>
      </div>
    </div>
  );
}
