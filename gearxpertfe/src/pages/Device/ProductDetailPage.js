import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Star,
  MapPin,
  Shield,
  Package,
  CheckCircle,
  AlertCircle,
  Cpu,
  ShoppingCart,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useParams, useNavigate } from "react-router-dom";

/* ===== API ===== */
import {
  getDeviceDetail,
  getDeviceAddons,
  getRelatedDevices,
} from "../../service/ApiService/DeviceApi";
import {
  addToCart,
  addInstantToCart,
} from "../../service/ApiService/CartApi";
import { hasRentedDevice } from "../../service/ApiService/RentalApi";

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [device, setDevice] = useState(null);
  const [addonsList, setAddonsList] = useState([]);
  const [relatedDevices, setRelatedDevices] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [hasRented, setHasRented] = useState(false);

  const [selectedImage, setSelectedImage] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [addons, setAddons] = useState([]);

  /* ===== LOAD DATA ===== */
  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [d, a, r, rented] = await Promise.all([
        getDeviceDetail(id),
        getDeviceAddons(id),
        getRelatedDevices(id),
        hasRentedDevice(id),
      ]);

      setDevice(d.data);
      setAddonsList(a.data || []);
      setRelatedDevices(r.data || []);
      setHasRented(rented.data?.hasRented || false);
      setReviews(d.data.reviews || []);
    } catch (err) {
      toast.error("Không thể tải dữ liệu thiết bị");
    }
  };

  if (!device) return null;

  /* ===== LOGIC ===== */
  const validateRental = () => {
    if (!startDate || !endDate) {
      toast.error("Vui lòng chọn thời gian thuê");
      return false;
    }
    return true;
  };

  const toggleAddon = (addon) => {
    setAddons((prev) =>
      prev.find((a) => a._id === addon._id)
        ? prev.filter((a) => a._id !== addon._id)
        : [...prev, addon]
    );
  };

  const handleAddToCart = async () => {
    if (!validateRental()) return;

    try {
      await addToCart({
        deviceId: device._id,
        quantity: 1,
        rentalStartDate: startDate,
        rentalEndDate: endDate,
        addons: addons.map((a) => a._id),
      });

      toast.success("Đã thêm vào giỏ hàng");
    } catch {
      toast.error("Thêm vào giỏ thất bại");
    }
  };

  const handleBuyNow = async () => {
    if (!validateRental()) return;

    try {
      await addInstantToCart({
        deviceId: device._id,
        quantity: 1,
        rentalStartDate: startDate,
        rentalEndDate: endDate,
        addons: addons.map((a) => a._id),
      });

      navigate("/checkout");
    } catch {
      toast.error("Thuê ngay thất bại");
    }
  };

  const days =
    startDate && endDate
      ? Math.max(
          1,
          Math.ceil((new Date(endDate) - new Date(startDate)) / 86400000)
        )
      : 0;

  const totalPrice =
    days *
    (device.rentPrice.perDay +
      addons.reduce((s, a) => s + a.rentPrice.perDay, 0));

  /* ===== UI (GIỮ NGUYÊN) ===== */
  return (
    <div className="min-h-screen bg-gray-50">
      {/* HEADER */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3">
          <ArrowLeft className="w-5 h-5" />
          Quay lại
        </div>
      </div>

      {/* MAIN */}
      <div className="max-w-7xl mx-auto px-6 py-10 grid lg:grid-cols-2 gap-12">
        {/* IMAGES */}
        <div>
          <img
            src={device.images[selectedImage]}
            className="w-full h-[520px] object-cover rounded-2xl"
          />
          <div className="grid grid-cols-3 gap-4 mt-4">
            {device.images.map((img, i) => (
              <img
                key={i}
                src={img}
                onClick={() => setSelectedImage(i)}
                className={`h-32 w-full object-cover rounded-xl cursor-pointer border ${
                  selectedImage === i
                    ? "border-purple-600"
                    : "border-gray-200"
                }`}
              />
            ))}
          </div>
        </div>

        {/* INFO */}
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">{device.name}</h1>

          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
            {device.ratingAvg} ({device.reviewCount} đánh giá)
          </div>

          <div className="flex items-center gap-2 text-gray-600">
            <MapPin className="w-4 h-4" />
            {device.location.city}
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-2xl">
            <p className="text-3xl font-bold text-blue-600">
              {device.rentPrice.perDay.toLocaleString()}đ / ngày
            </p>
            <p className="text-sm text-gray-500">
              Cọc: {device.depositAmount.toLocaleString()}đ
            </p>
          </div>

          {/* DATE + ADDON */}
          <div className="bg-white p-6 rounded-2xl shadow space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                onChange={(e) => setStartDate(e.target.value)}
                className="border rounded-xl p-3"
              />
              <input
                type="date"
                onChange={(e) => setEndDate(e.target.value)}
                className="border rounded-xl p-3"
              />
            </div>

            <div>
              <h3 className="font-semibold mb-2">Phụ kiện đi kèm</h3>
              {addonsList.map((a) => (
                <button
                  key={a._id}
                  onClick={() => toggleAddon(a)}
                  className="w-full flex justify-between p-3 border rounded-xl mb-2"
                >
                  {a.name}
                  <span>+{a.rentPrice.perDay.toLocaleString()}đ</span>
                </button>
              ))}
            </div>

            {days > 0 && (
              <div className="flex justify-between font-semibold">
                <span>{days} ngày</span>
                <span className="text-blue-600">
                  {totalPrice.toLocaleString()}đ
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-2">
              <button
                onClick={handleAddToCart}
                className="flex items-center justify-center gap-2 py-4 rounded-xl border border-purple-600 text-purple-600 font-semibold hover:bg-purple-50"
              >
                <ShoppingCart className="w-5 h-5" />
                Thêm vào giỏ
              </button>

              <button
                onClick={handleBuyNow}
                className="flex items-center justify-center gap-2 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold"
              >
                <Zap className="w-5 h-5" />
                Thuê ngay
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Criteria icon={<Shield />} text="Bảo hiểm" />
            <Criteria icon={<Package />} text="Giao nhanh" />
            <Criteria icon={<CheckCircle />} text="Đã kiểm tra" />
          </div>
        </div>
      </div>

      {/* DESCRIPTION + SPECS */}
      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-8">
        <Box title="Mô tả chi tiết">
          <p className="whitespace-pre-line text-gray-700">
            {device.description}
          </p>
        </Box>

        <Box title="Thông số kỹ thuật">
          <div className="space-y-3">
            {Object.entries(device.specs).map(([k, v]) => (
              <div key={k} className="flex gap-3 items-start">
                <Cpu className="w-4 h-4 mt-1 text-blue-600" />
                <p>
                  <b>{k}:</b> {v}
                </p>
              </div>
            ))}
          </div>
        </Box>
      </div>

      {/* REVIEWS */}
      <div className="max-w-7xl mx-auto px-6 mt-10">
        <Box title="Đánh giá từ khách thuê">
          {reviews.map((r) => (
            <div key={r._id} className="flex gap-4 border-b pb-6 mb-6">
              <img src={r.user.avatar} className="w-10 h-10 rounded-full" />
              <div>
                <div className="flex justify-between">
                  <b>{r.user.fullName}</b>
                  <span className="text-sm text-gray-400">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex gap-1 my-1">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-gray-700">{r.comment}</p>
              </div>
            </div>
          ))}

          {!hasRented && (
            <div className="flex gap-2 text-gray-500">
              <AlertCircle className="w-5 h-5" />
              Chỉ khách đã thuê mới được đánh giá
            </div>
          )}
        </Box>
      </div>

      {/* RELATED */}
      <div className="max-w-7xl mx-auto px-6 mt-12 pb-20">
        <h2 className="text-2xl font-bold mb-6">Thiết bị tương tự</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {relatedDevices.map((d) => (
            <div
              key={d._id}
              className="bg-white rounded-2xl shadow overflow-hidden"
            >
              <img src={d.image} className="h-48 w-full object-cover" />
              <div className="p-4 space-y-1">
                <p className="font-semibold">{d.name}</p>
                <p className="text-sm text-gray-500">{d.location.city}</p>
                <div className="flex justify-between">
                  <span className="text-blue-600">
                    {d.rentPrice.perDay.toLocaleString()}đ/ngày
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {d.ratingAvg}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===== UI HELPERS ===== */
const Box = ({ title, children }) => (
  <div className="bg-white rounded-2xl p-8 shadow">
    <h2 className="text-xl font-bold mb-4">{title}</h2>
    {children}
  </div>
);

const Criteria = ({ icon, text }) => (
  <div className="bg-white rounded-xl p-4 shadow text-center">
    <div className="mx-auto w-6 h-6 text-blue-600">{icon}</div>
    <p className="text-sm mt-2">{text}</p>
  </div>
);
