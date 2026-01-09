import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  Headphones,
  Monitor,
  Gamepad2,
  Sparkles,
  Shield,
  Package,
  Clock,
  Star,
  ArrowRight,
  TrendingUp,
  MapPin,
} from "lucide-react";
import { getDevices } from "../../service/ApiService/DeviceApi";
import ImageWithFallback from "../../components/common/ImageWithFallback";

const categories = [
  {
    name: "Máy ảnh",
    icon: Camera,
    category: "CAMERA",
    color: "from-blue-500 to-cyan-500",
    description: "DSLR, Mirrorless, Action Cam",
  },
  {
    name: "Thiết bị quay",
    icon: Monitor,
    category: "AUDIO",
    color: "from-purple-500 to-pink-500",
    description: "Microphone, Recorder, Mixer",
  },
  {
    name: "Gaming",
    icon: Gamepad2,
    category: "GAMING",
    color: "from-orange-500 to-red-500",
    description: "PlayStation, Xbox, Console",
  },
  {
    name: "Phụ kiện",
    icon: Headphones,
    category: "ACCESSORY",
    color: "from-green-500 to-emerald-500",
    description: "Lens, Tripod, Accessories",
  },
];

const features = [
  {
    icon: Shield,
    title: "Bảo hiểm đầy đủ",
    description: "Bảo vệ thiết bị của bạn với gói bảo hiểm toàn diện",
  },
  {
    icon: Package,
    title: "Giao hàng nhanh",
    description: "Nhận thiết bị trong vòng 24h tại các thành phố lớn",
  },
  {
    icon: Clock,
    title: "Linh hoạt thời gian",
    description: "Thuê theo ngày, tuần hoặc tháng tùy nhu cầu",
  },
  {
    icon: Sparkles,
    title: "Chất lượng cao",
    description: "Tất cả thiết bị đều được kiểm tra kỹ trước khi giao",
  },
];

export default function Homepage() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);

  useEffect(() => {
    fetchDevices();
  }, [selectedCategory]);

  const fetchDevices = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 8,
        ...(selectedCategory && { category: selectedCategory }),
      };
      const response = await getDevices(params);
      setDevices(response.devices || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (category) => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };

  const handleDeviceClick = (deviceId) => {
    navigate(`/device/${deviceId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl mx-auto text-center text-white">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">
                Nền tảng cho thuê thiết bị điện tử hàng đầu
              </span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              Thuê thiết bị điện tử
              <br />
              <span className="bg-gradient-to-r from-yellow-300 to-pink-300 bg-clip-text text-transparent">
                dễ dàng, nhanh chóng
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-8 leading-relaxed">
              Từ máy ảnh chuyên nghiệp đến console gaming, tất cả đều có sẵn
              với giá thuê hợp lý
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  document
                    .getElementById("categories")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-8 py-4 bg-white text-purple-600 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Khám phá ngay
              </button>
              <button
                onClick={() => {
                  document
                    .getElementById("devices")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white border-2 border-white/30 rounded-xl font-semibold text-lg hover:bg-white/20 transition-all duration-300"
              >
                Xem thiết bị
              </button>
            </div>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-gray-50 to-transparent"></div>
      </section>

      {/* Categories Section */}
      <section id="categories" className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Danh mục thiết bị
          </h2>
          <p className="text-gray-600 text-lg">
            Chọn loại thiết bị bạn muốn thuê
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.category;
            return (
              <button
                key={cat.category}
                onClick={() => handleCategoryClick(cat.category)}
                className={`group relative overflow-hidden rounded-2xl p-8 bg-gradient-to-br ${cat.color} text-white transition-all duration-300 hover:scale-105 hover:shadow-2xl ${
                  isSelected ? "ring-4 ring-purple-300 ring-offset-2" : ""
                }`}
              >
                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 group-hover:bg-white/30 transition-colors">
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold mb-2">{cat.name}</h3>
                  <p className="text-white/80 text-sm">{cat.description}</p>
                  {isSelected && (
                    <div className="mt-4 flex items-center gap-2 text-sm font-medium">
                      <span>Đã chọn</span>
                      <CheckCircle className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* Featured Devices Section */}
      <section id="devices" className="max-w-7xl mx-auto px-6 py-16 bg-gray-50">
        <div className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              Thiết bị nổi bật
            </h2>
            <p className="text-gray-600 text-lg">
              {selectedCategory
                ? `Đang hiển thị: ${categories.find((c) => c.category === selectedCategory)?.name}`
                : "Những thiết bị được yêu thích nhất"}
            </p>
          </div>
          {selectedCategory && (
            <button
              onClick={() => setSelectedCategory(null)}
              className="px-6 py-3 bg-white border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Xóa bộ lọc
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl overflow-hidden shadow-sm animate-pulse"
              >
                <div className="h-48 bg-gray-200"></div>
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : devices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {devices.map((device) => (
              <div
                key={device._id}
                onClick={() => handleDeviceClick(device._id)}
                className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-2"
              >
                <div className="relative h-48 overflow-hidden bg-gray-100">
                  <ImageWithFallback
                    src={device.images?.[0] || ""}
                    alt={device.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                  <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 text-sm font-semibold text-gray-900">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {device.ratingAvg?.toFixed(1) || "0.0"}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-lg text-gray-900 mb-2 line-clamp-2 group-hover:text-purple-600 transition-colors">
                    {device.name}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                    <MapPin className="w-4 h-4" />
                    {device.location?.city || "N/A"}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-purple-600">
                        {device.rentPrice?.perDay?.toLocaleString() || "0"}đ
                      </p>
                      <p className="text-xs text-gray-500">/ ngày</p>
                    </div>
                    <button className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 transition-all transform group-hover:scale-105">
                      Xem chi tiết
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">
              Không tìm thấy thiết bị nào
            </p>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Tại sao chọn GearXpert?
          </h2>
          <p className="text-gray-600 text-lg">
            Dịch vụ cho thuê thiết bị điện tử uy tín và chuyên nghiệp
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 hover:border-purple-200"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center mb-4 text-white">
                  <Icon className="w-7 h-7" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="relative overflow-hidden bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 rounded-3xl p-12 md:p-16 text-center text-white">
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="relative z-10">
            <TrendingUp className="w-16 h-16 mx-auto mb-6 opacity-90" />
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Sẵn sàng bắt đầu?
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Khám phá hàng nghìn thiết bị điện tử chất lượng cao với giá thuê
              hợp lý
            </p>
            <button
              onClick={() => {
                document
                  .getElementById("devices")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-purple-600 rounded-xl font-semibold text-lg hover:bg-gray-100 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Xem tất cả thiết bị
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

// Helper component
const CheckCircle = ({ className }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M5 13l4 4L19 7"
    />
  </svg>
);
