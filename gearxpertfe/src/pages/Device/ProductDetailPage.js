import { useState } from "react";
import { ArrowLeft, Star, AlertCircle } from "lucide-react";
import { ImageWithFallback } from "../../components/common/ImageWithFallback";
import { toast } from "sonner";
import {
  addToCart,
  addInstantToCart
} from "../services/cartService";
import { useNavigate } from "react-router-dom";

export default function ProductDetailPage({ equipment, onBack }) {
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  if (!equipment) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h2>Không tìm thấy thiết bị</h2>
        <button onClick={onBack}>Quay lại</button>
      </div>
    );
  }

  const calcDays = () => {
    if (!startDate || !endDate) return 0;
    return Math.max(
      1,
      Math.ceil(
        (new Date(endDate) - new Date(startDate)) / 86400000
      )
    );
  };

  const days = calcDays();
  const totalPrice =
    equipment.rentPrice.perDay * days * quantity;

  const validateDate = () => {
    if (!startDate || !endDate) {
      toast.error("Vui lòng chọn ngày thuê");
      return false;
    }
    return true;
  };

  const handleAddToCart = async () => {
    if (!validateDate()) return;

    await addToCart({
      deviceId: equipment._id,
      quantity,
      rentalStartDate: startDate,
      rentalEndDate: endDate
    });

    toast.success("Đã thêm vào giỏ hàng");
  };

  const handleRentNow = async () => {
    if (!validateDate()) return;

    await addInstantToCart({
      deviceId: equipment._id,
      quantity,
      rentalStartDate: startDate,
      rentalEndDate: endDate
    });

    navigate("/checkout?type=INSTANT");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <button onClick={onBack} className="m-6 flex gap-2">
        <ArrowLeft /> Quay lại
      </button>

      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 p-6">
        <ImageWithFallback
          src={equipment.images[selectedImage]}
          className="h-[500px] w-full rounded-xl object-cover"
        />

        <div>
          <h1 className="text-2xl">{equipment.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Star className="fill-yellow-400 text-yellow-400" />
            {equipment.rating || 5}
          </div>

          <p className="text-blue-600 mt-4">
            {equipment.rentPrice.perDay.toLocaleString()}đ / ngày
          </p>

          <div className="bg-white p-6 mt-6 rounded-xl shadow">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full mb-3"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full mb-3"
            />

            <p>
              Tổng tiền:{" "}
              <b>{totalPrice.toLocaleString()}đ</b>
            </p>

            <div className="flex gap-3 mt-4">
              <button
                onClick={handleAddToCart}
                className="border px-4 py-2 rounded"
              >
                Thêm vào giỏ
              </button>
              <button
                onClick={handleRentNow}
                className="bg-purple-600 text-white px-4 py-2 rounded"
              >
                Thuê ngay
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
