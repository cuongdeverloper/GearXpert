import { useState } from 'react';
import {
  ArrowLeft,
  Star,
  MapPin,
  Shield,
  Package,
  CheckCircle,
  AlertCircle,
  Cpu
} from 'lucide-react';
import { toast } from 'sonner';

/* ================= MOCK DATA ================= */

const MOCK_DEVICE = {
  _id: 'device_main_1',
  name: 'Canon EOS R5 + Lens 24-70mm',
  description: `
Canon EOS R5 là dòng máy ảnh mirrorless cao cấp dành cho nhiếp ảnh gia và videographer chuyên nghiệp.

✔ Phù hợp chụp cưới, sự kiện, TVC, quảng cáo
✔ Chất lượng hình ảnh vượt trội với cảm biến Full-frame 45MP
✔ Khả năng quay video 8K cực kỳ sắc nét

📌 Thiết bị được kiểm tra kỹ trước khi giao, đảm bảo hoạt động ổn định.
📌 Khách thuê cần giữ gìn và hoàn trả đúng tình trạng ban đầu.
  `,
  category: 'CAMERA',
  images: [
    'https://images.unsplash.com/photo-1431068799455-80bae0caf685',
    'https://images.unsplash.com/photo-1510127034890-ba27508e9f1c',
    'https://images.unsplash.com/photo-1502920917128-1aa500764b8a'
  ],
  rentPrice: { perDay: 300000 },
  depositAmount: 5000000,
  ratingAvg: 4.9,
  reviewCount: 128,
  location: { city: 'TP. Hồ Chí Minh' },
  specs: {
    'Cảm biến': 'Full-frame 45MP',
    'Quay video': '8K RAW',
    'Chống rung': 'IBIS 8-stop',
    'ISO': '100–51200',
    'Trọng lượng': '738g'
  }
};

const MOCK_ADDONS = [
  { _id: 'addon_1', name: 'Pin Canon LP-E6NH', rentPrice: { perDay: 20000 } },
  { _id: 'addon_2', name: 'Tripod Manfrotto', rentPrice: { perDay: 30000 } }
];

const MOCK_REVIEWS = [
  {
    _id: 'r1',
    userName: 'Nguyễn Văn A',
    avatar: 'https://i.pravatar.cc/40?img=1',
    rating: 5,
    date: '12/10/2025',
    comment:
      'Máy rất mới, đầy đủ phụ kiện. Quay 8K cực kỳ nét, pin trâu. Shop hỗ trợ nhiệt tình.'
  },
  {
    _id: 'r2',
    userName: 'Trần Thị B',
    avatar: 'https://i.pravatar.cc/40?img=2',
    rating: 4,
    date: '02/10/2025',
    comment:
      'Giao hàng đúng hẹn, máy hoạt động ổn định. Lần sau sẽ tiếp tục thuê.'
  }
];

const RELATED_DEVICES = [
  {
    _id: 'rel1',
    name: 'Sony A7 IV + 24-70mm',
    price: 280000,
    rating: 4.8,
    city: 'Hà Nội',
    rented: 86,
    image: 'https://images.unsplash.com/photo-1519183071298-a2962eadc7b9'
  },
  {
    _id: 'rel2',
    name: 'Canon R6 Mark II',
    price: 240000,
    rating: 4.7,
    city: 'TP. HCM',
    rented: 64,
    image: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f'
  }
];

/* ================= COMPONENT ================= */

export default function ProductDetailPage() {
  const device = MOCK_DEVICE;
  const [selectedImage, setSelectedImage] = useState(0);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [addons, setAddons] = useState([]);
  const hasRented = true;

  const toggleAddon = (addon) => {
    setAddons((prev) =>
      prev.find((a) => a._id === addon._id)
        ? prev.filter((a) => a._id !== addon._id)
        : [...prev, addon]
    );
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

  const handleAddToCart = () => {
    if (!startDate || !endDate) return toast.error('Vui lòng chọn thời gian thuê');
    toast.success('Đã thêm vào giỏ hàng');
  };

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
                    ? 'border-purple-600'
                    : 'border-gray-200'
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
              <input type="date" onChange={(e) => setStartDate(e.target.value)} className="border rounded-xl p-3" />
              <input type="date" onChange={(e) => setEndDate(e.target.value)} className="border rounded-xl p-3" />
            </div>

            <div>
              <h3 className="font-semibold mb-2">Phụ kiện đi kèm</h3>
              {MOCK_ADDONS.map((a) => (
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

            <button
              onClick={handleAddToCart}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white"
            >
              Thêm vào giỏ / Thuê ngay
            </button>
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
          {MOCK_REVIEWS.map((r) => (
            <div key={r._id} className="flex gap-4 border-b pb-6 mb-6">
              <img src={r.avatar} className="w-10 h-10 rounded-full" />
              <div>
                <div className="flex justify-between">
                  <b>{r.userName}</b>
                  <span className="text-sm text-gray-400">{r.date}</span>
                </div>
                <div className="flex gap-1 my-1">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
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
          {RELATED_DEVICES.map((d) => (
            <div key={d._id} className="bg-white rounded-2xl shadow overflow-hidden">
              <img src={d.image} className="h-48 w-full object-cover" />
              <div className="p-4 space-y-1">
                <p className="font-semibold">{d.name}</p>
                <p className="text-sm text-gray-500">{d.city}</p>
                <div className="flex justify-between">
                  <span className="text-blue-600">{d.price.toLocaleString()}đ/ngày</span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {d.rating}
                  </span>
                </div>
                <p className="text-xs text-gray-400">
                  Đã thuê {d.rented} lượt
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= UI HELPERS ================= */

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
