import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { getDevices, getDeviceDetail } from "../../service/ApiService/DeviceApi";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import ProductCard from "../../components/common/ProductCard";

// Headless UI cho modal & dropdown
import { Dialog, Transition, Popover } from "@headlessui/react";
import { Fragment } from "react";

export default function ProductsPage() {
  const [searchParams] = useSearchParams();
  const categoryFromUrl = searchParams.get("category");

  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(categoryFromUrl || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("featured");
  const [priceRange, setPriceRange] = useState([0, 10000000]);

  // Compare states
  const [selectedForCompare, setSelectedForCompare] = useState([]); // max 2 _id
  const [compareData, setCompareData] = useState({ device1: null, device2: null });
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [compareSearchQuery, setCompareSearchQuery] = useState("");
  const [compareError, setCompareError] = useState("");

  const notifyChatbotSearch = useCallback((query) => {
    const q = String(query || "").trim();
    if (!q) return;
    window.dispatchEvent(
      new CustomEvent("gearxpert:product-search", { detail: { query: q } })
    );
  }, []);

  const triggerAIFromCurrentFilters = useCallback(() => {
    const q = String(searchQuery || "").trim();
    if (q) {
      notifyChatbotSearch(q);
      return;
    }

    // If user only filters by category, still allow AI to suggest within that category.
    const categoryHintMap = {
      CAMERA: "camera",
      LIGHTING: "lighting",
      AUDIO: "audio",
      OFFICE: "office",
      GAMING: "gaming",
      ACCESSORY: "gimbal",
      DRONE: "drone",
      OTHER: "gear",
    };

    if (selectedCategory && categoryHintMap[selectedCategory]) {
      notifyChatbotSearch(categoryHintMap[selectedCategory]);
    }
  }, [notifyChatbotSearch, searchQuery, selectedCategory]);

  const categories = [
    { name: "Tất cả thiết bị", id: null, icon: "grid_view" },
    { name: "Máy ảnh", id: "CAMERA", icon: "videocam" },
    { name: "Ánh sáng", id: "LIGHTING", icon: "lightbulb" },
    { name: "Âm thanh", id: "AUDIO", icon: "mic" },
    { name: "Văn phòng", id: "OFFICE", icon: "business_center" },
    { name: "Trò chơi", id: "GAMING", icon: "sports_esports" },
    { name: "Phụ kiện", id: "ACCESSORY", icon: "handyman" },
    { name: "Flycam", id: "DRONE", icon: "flight" },
    { name: "Khác", id: "OTHER", icon: "category" },
  ];

  const fetchDevices = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        limit: 100,
        ...(selectedCategory && { category: selectedCategory }),
      };
      const response = await getDevices(params);
      setDevices(response.devices || []);
    } catch (error) {
      console.error("Error fetching devices:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedCategory]);

  const applyFiltersAndSort = useCallback(() => {
    let result = [...devices];

    if (searchQuery) {
      result = result.filter(
        (device) =>
          device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          device.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Price Filter
    result = result.filter(
      (device) =>
        (device.rentPrice?.perDay || 0) >= priceRange[0] &&
        (device.rentPrice?.perDay || 0) <= priceRange[1]
    );

    switch (sortBy) {
      case "price_asc":
        result.sort((a, b) => (a.rentPrice?.perDay || 0) - (b.rentPrice?.perDay || 0));
        break;
      case "price_desc":
        result.sort((a, b) => (b.rentPrice?.perDay || 0) - (a.rentPrice?.perDay || 0));
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        break;
      default:
        break;
    }

    setFilteredDevices(result);
  }, [devices, searchQuery, sortBy, priceRange]);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  useEffect(() => {
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
  }, [categoryFromUrl]);

  useEffect(() => {
    applyFiltersAndSort();

    // Track search queries for AI suggestions
    if (searchQuery.trim().length > 2) {
      const timer = setTimeout(() => {
        const searches = JSON.parse(localStorage.getItem("searchQueries") || "[]");
        const updated = [searchQuery.trim(), ...searches.filter(s => s !== searchQuery.trim())].slice(0, 5);
        localStorage.setItem("searchQueries", JSON.stringify(updated));
      }, 1500); // 1.5s delay to avoid tracking every keystroke
      return () => clearTimeout(timer);
    }
  }, [applyFiltersAndSort, searchQuery, priceRange]);

  // Compare logic
  const handleToggleCompare = (device) => {
    setCompareError("");

    if (selectedForCompare.includes(device._id)) {
      setSelectedForCompare((prev) => prev.filter((id) => id !== device._id));
    } else {
      if (selectedForCompare.length >= 2) {
        setCompareError("You can compare up to 2 devices only.");
        return;
      }

      if (selectedForCompare.length === 1) {
        const firstId = selectedForCompare[0];
        const firstDevice = devices.find((d) => d._id === firstId);
        if (firstDevice && firstDevice.category !== device.category) {
          setCompareError("Only devices in the same category can be compared.");
          return;
        }
      }

      setSelectedForCompare((prev) => [...prev, device._id]);
    }
  };

  const fetchCompareData = async () => {
    if (selectedForCompare.length !== 2) return;

    setLoadingCompare(true);
    setCompareError("");

    try {
      const [dev1, dev2] = await Promise.all([
        getDeviceDetail(selectedForCompare[0]),
        getDeviceDetail(selectedForCompare[1]),
      ]);

      setCompareData({ device1: dev1, device2: dev2 });
      setIsCompareModalOpen(true);
    } catch (err) {
      console.error("Compare fetch error:", err);
      setCompareError("Failed to load comparison data. Please try again.");
    } finally {
      setLoadingCompare(false);
    }
  };

  // Filtered candidates for second device
  const getCompareCandidates = () => {
    if (selectedForCompare.length === 0) return [];

    const firstId = selectedForCompare[0];
    const first = devices.find((d) => d._id === firstId);
    if (!first) return [];

    let candidates = devices.filter(
      (d) => d.category === first.category && d._id !== first._id
    );

    if (compareSearchQuery.trim()) {
      const q = compareSearchQuery.toLowerCase();
      candidates = candidates.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          (d.description || "").toLowerCase().includes(q)
      );
    }

    return candidates;
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50" data-theme="light">
      <Header />

      <main className="flex-grow w-full pb-12">
        {/* Premium Hero Section - giữ nguyên */}
        <section className="relative w-full bg-slate-900 overflow-hidden mb-10 pt-48 pb-24 lg:pt-56 lg:pb-32" data-theme="dark">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2070')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-slate-50"></div>

          <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 font-display tracking-tight">
              Danh mục <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-indigo-400">Thiết bị chuyên nghiệp</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-light mb-10">
              Trang bị cho tầm nhìn của bạn những máy ảnh, ống kính và ánh sáng tiêu chuẩn công nghiệp. <br className="hidden md:block" /> Được bảo trì tỉ mỉ và sẵn sàng cho buổi quay tiếp theo của bạn.
            </p>

            <div className="max-w-2xl mx-auto relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan to-indigo-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2 flex items-center shadow-2xl">
                <span className="material-symbols-outlined text-white/50 ml-3 mr-2 text-2xl">search</span>
                <input
                  type="text"
                  placeholder="Tìm kiếm 'Sony FX3', 'Aputure', 'Ronin'..."
                  className="flex-1 bg-transparent border-none text-white placeholder-white/50 focus:ring-0 text-lg h-12"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      triggerAIFromCurrentFilters();
                    }
                  }}
                />
                <button
                  onClick={triggerAIFromCurrentFilters}
                  className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors"
                >
                  Tìm kiếm
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-20 relative z-20">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar - giữ nguyên */}
            <aside className="w-full lg:w-72 flex-shrink-0">
              <div className="bg-white/80 backdrop-blur-xl rounded-[24px] p-6 shadow-xl border border-white/60 sticky top-24">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Lọc theo danh mục</h3>
                
                <Popover as="div" className="relative">
                  <Popover.Button className="w-full flex items-center justify-between gap-3 px-5 py-4 rounded-2xl bg-slate-900 shadow-xl shadow-slate-200/50 text-white transition-all hover:bg-slate-800">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-accent-cyan text-[22px]">
                        {categories.find(c => c.id === selectedCategory)?.icon || "grid_view"}
                      </span>
                      <span className="font-bold tracking-tight">
                        {categories.find(c => c.id === selectedCategory)?.name || "Tất cả thiết bị"}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">unfold_more</span>
                  </Popover.Button>

                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                  >
                    <Popover.Panel className="absolute left-0 right-0 mt-3 p-2 origin-top rounded-2xl bg-white border border-slate-100 shadow-2xl focus:outline-none z-50 max-h-[70vh] overflow-y-auto">
                        {({ close }) => (
                          <div className="space-y-1">
                            {categories.map((cat) => (
                              <div key={cat.name}>
                                <button
                                  onClick={() => {
                                    setSelectedCategory(cat.id);
                                    close();
                                  }}
                                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left ${
                                    selectedCategory === cat.id
                                      ? "bg-slate-100 text-slate-900 font-bold"
                                      : "hover:bg-slate-50 text-slate-600 hover:text-indigo-600"
                                  }`}
                                >
                                  <span className={`material-symbols-outlined text-[20px] ${
                                    selectedCategory === cat.id ? "text-accent-cyan" : "text-slate-400"
                                  }`}>
                                    {cat.icon}
                                  </span>
                                  <span className="text-sm">{cat.name}</span>
                                  {selectedCategory === cat.id && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-accent-cyan"></div>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                    </Popover.Panel>
                  </Transition>
                </Popover>

                <div className="mt-10 border-t border-slate-100 pt-8">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Khoảng giá</h3>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">VNĐ / Ngày</span>
                  </div>
                  
                  <div className="px-2">
                    <div className="relative h-2 w-full bg-slate-100 rounded-full mb-8">
                      {/* Track highlight */}
                      <div 
                        className="absolute h-full bg-indigo-500 rounded-full transition-all duration-75"
                        style={{
                          left: `${(priceRange[0] / 10000000) * 100}%`,
                          right: `${100 - (priceRange[1] / 10000000) * 100}%`
                        }}
                      />
                      
                      <input
                        type="range"
                        min="0"
                        max="10000000"
                        step="100000"
                        value={priceRange[0]}
                        onChange={(e) => {
                          const val = Math.min(Number(e.target.value), priceRange[1] - 500000);
                          setPriceRange([val, priceRange[1]]);
                        }}
                        className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none cursor-pointer z-30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-600 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                      />
                      <input
                        type="range"
                        min="0"
                        max="10000000"
                        step="100000"
                        value={priceRange[1]}
                        onChange={(e) => {
                          const val = Math.max(Number(e.target.value), priceRange[0] + 500000);
                          setPriceRange([priceRange[0], val]);
                        }}
                        className="absolute w-full h-2 bg-transparent appearance-none pointer-events-none cursor-pointer z-30 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-indigo-600 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:active:cursor-grabbing"
                      />
                    </div>
                    
                    <div className="flex justify-between items-center gap-4">
                      <div className="flex-1">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Giá thấp nhất</p>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
                          {priceRange[0].toLocaleString('vi-VN')}đ
                        </div>
                      </div>
                      <div className="flex-1 text-right">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Giá cao nhất</p>
                        <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
                          {priceRange[1].toLocaleString('vi-VN')}đ
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10 border-t border-slate-100 pt-8">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Sắp xếp theo</h3>
                  <div className="grid grid-cols-1 gap-2">
                    {[
                      { id: "featured", label: "Nổi bật", icon: "auto_awesome" },
                      { id: "newest", label: "Hàng mới về", icon: "new_releases" },
                      { id: "price_asc", label: "Giá: Thấp đến Cao", icon: "trending_up" },
                      { id: "price_desc", label: "Giá: Cao xuống Thấp", icon: "trending_down" },
                    ].map((option) => (
                      <button
                        key={option.id}
                        onClick={() => setSortBy(option.id)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left text-sm ${
                          sortBy === option.id
                            ? "bg-indigo-50 text-indigo-700 font-bold border border-indigo-100"
                            : "text-slate-600 hover:bg-slate-50 border border-transparent"
                        }`}
                      >
                        <span className={`material-symbols-outlined text-[18px] ${
                          sortBy === option.id ? "text-indigo-600" : "text-slate-400"
                        }`}>
                          {option.icon}
                        </span>
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>



                <div className="mt-10 p-6 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl text-white relative overflow-hidden" data-theme="dark">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                  <h4 className="font-bold font-display text-lg mb-2 relative z-10">Bạn cần một combo?</h4>
                  <p className="text-xs text-indigo-100 mb-4 relative z-10 leading-relaxed">Giảm ngay 15% khi bạn thuê trọn bộ máy ảnh chuyên nghiệp.</p>
                  <button className="px-4 py-2 bg-white text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors w-full shadow-lg relative z-10">
                    Xem các gói thuê
                  </button>
                </div>
              </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1">
              {/* Controls Bar */}
              <div className="bg-white/50 backdrop-blur-md rounded-2xl p-4 mb-8 flex flex-wrap items-center justify-between gap-4 border border-white/60 shadow-sm">
                <h2 className="text-lg font-bold text-slate-700">
                  Đang hiển thị <span className="text-slate-900">{filteredDevices.length}</span> kết quả
                </h2>

                <div className="flex items-center gap-4">
                  {selectedForCompare.length > 0 && (
                    <div className="flex gap-2">
                      {selectedForCompare.map((id) => {
                        const dev = devices.find((d) => d._id === id);
                        return dev ? (
                          <div
                            key={id}
                            className="bg-indigo-100 px-3 py-1 rounded-full text-xs flex items-center gap-2 shadow-sm border border-indigo-200"
                          >
                            <span className="font-semibold text-indigo-700 truncate max-w-[120px]">{dev.name}</span>
                            <button
                              onClick={() => handleToggleCompare(dev)}
                              className="text-red-500 hover:text-red-700 font-bold text-lg leading-none"
                            >
                              ×
                            </button>
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}

                  <div className="flex flex-col items-end">
                    <button
                      onClick={fetchCompareData}
                      disabled={selectedForCompare.length !== 2 || loadingCompare}
                      className={`px-8 py-2.5 rounded-xl font-extrabold text-white transition-all transform active:scale-95 shadow-md ${
                        selectedForCompare.length === 2 && !loadingCompare
                          ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200"
                          : "bg-slate-300 cursor-not-allowed"
                      }`}
                    >
                      {loadingCompare ? "Đang tải..." : "So sánh thiết bị"}
                    </button>
                    {compareError && <p className="text-red-600 text-[10px] mt-1 font-bold">{compareError}</p>}
                  </div>
                </div>
              </div>

              {/* Search + Grid candidates khi chọn 1 thiết bị */}
              {selectedForCompare.length === 1 && (
                <div className="mb-8">
                  <input
                    type="text"
                    value={compareSearchQuery}
                    onChange={(e) => setCompareSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm sản phẩm tương tự để so sánh..."
                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm mb-4"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {getCompareCandidates().length > 0 ? (
                      getCompareCandidates().map((candidate) => (
                        <div
                          key={candidate._id}
                          className="relative cursor-pointer group"
                          onClick={() => handleToggleCompare(candidate)}
                        >
                          <ProductCard
                            device={candidate}
                            variant="detailed"
                            className="h-full scale-95 hover:scale-100 transition-transform"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl">
                            <span className="text-white font-bold text-lg bg-indigo-600 px-6 py-3 rounded-xl shadow-lg">
                              Chọn để so sánh
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-slate-500 col-span-full text-center py-8">
                        Không tìm thấy sản phẩm phù hợp trong danh mục này.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="h-[420px] bg-white rounded-3xl animate-pulse ring-1 ring-slate-100 shadow-sm"></div>
                  ))}
                </div>
              ) : filteredDevices.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                  {filteredDevices.map((device) => (
                    <ProductCard
                      key={device._id || device.id}
                      device={device}
                      variant="detailed"
                      className="hover:-translate-y-2 transition-transform duration-500 h-full"
                      isSelectedForCompare={selectedForCompare.includes(device._id)}
                      onToggleCompare={() => handleToggleCompare(device)}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-xl text-center p-8">
                  <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                    <span className="material-symbols-outlined text-5xl text-slate-300">manage_search</span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900 mb-2 font-display">Không tìm thấy kết quả</h3>
                  <p className="text-slate-500 max-w-md mx-auto mb-8">
                    Chúng tôi không tìm thấy kết quả nào phù hợp với tìm kiếm "{searchQuery}". Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm của bạn.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={triggerAIFromCurrentFilters}
                      className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors cursor-pointer"
                    >
                      Hỏi GearXpert AI
                    </button>
                    <button
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory(null);
                        setPriceRange([0, 10000000]);
                      }}
                      className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-primary transition-colors cursor-pointer"
                    >
                      Xóa bộ lọc
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Compare Modal with Highlight */}
      <Transition appear show={isCompareModalOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsCompareModalOpen(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-6xl transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all">
                  <div className="p-6 border-b flex justify-between items-center">
                    <Dialog.Title as="h3" className="text-2xl font-bold text-slate-900">
                      So sánh thiết bị
                    </Dialog.Title>
                    <button
                      onClick={() => setIsCompareModalOpen(false)}
                      className="text-3xl text-slate-500 hover:text-slate-700"
                    >
                      ×
                    </button>
                  </div>

                  {loadingCompare ? (
                    <div className="p-12 text-center">
                      <div className="inline-block w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                      <p className="text-slate-600">Đang tải dữ liệu so sánh...</p>
                    </div>
                  ) : (
                    <div className="p-6 overflow-x-auto max-h-[70vh]">
                      <table className="w-full min-w-[800px] border-collapse text-sm">
                        <thead className="sticky top-0 bg-white z-10">
                          <tr className="bg-slate-50">
                            <th className="border p-4 text-left font-semibold w-1/4">Đặc tính</th>
                            <th className="border p-4 text-center font-semibold">{compareData.device1?.name}</th>
                            <th className="border p-4 text-center font-semibold">{compareData.device2?.name}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const d1 = compareData.device1;
                            const d2 = compareData.device2;

                            const compareFn = (v1, v2, better = "higher") => {
                              if (v1 == null || v2 == null || v1 === v2) return { cls1: "", cls2: "", icon: "" };
                              const isHigherBetter = better === "higher";
                              const win = isHigherBetter ? v1 > v2 : v1 < v2;
                              return {
                                cls1: win ? "bg-green-50 text-green-800 font-medium" : "bg-red-50 text-red-800",
                                cls2: win ? "bg-red-50 text-red-800" : "bg-green-50 text-green-800 font-medium",
                                icon1: win ? (isHigherBetter ? "↑" : "↓") : "",
                                icon2: win ? "" : (isHigherBetter ? "↑" : "↓"),
                              };
                            };

                            const rows = [
                              { label: "Danh mục", v1: d1?.category, v2: d2?.category, type: "text" },
                              { label: "Thuê theo ngày", v1: d1?.rentPrice?.perDay, v2: d2?.rentPrice?.perDay, type: "lower" },
                              { label: "Thuê theo tuần", v1: d1?.rentPrice?.perWeek, v2: d2?.rentPrice?.perWeek, type: "lower" },
                              { label: "Thuê theo tháng", v1: d1?.rentPrice?.perMonth, v2: d2?.rentPrice?.perMonth, type: "lower" },
                              { label: "Tiền cọc", v1: d1?.depositAmount, v2: d2?.depositAmount, type: "lower" },
                              { label: "Tổng kho", v1: d1?.stockQuantity, v2: d2?.stockQuantity, type: "higher" },
                              { label: "Có sẵn", v1: d1?.availableQuantity, v2: d2?.availableQuantity, type: "higher" },
                              { label: "Đánh giá", v1: d1?.ratingAvg, v2: d2?.ratingAvg, type: "higher" },
                              { label: "Mô tả", v1: d1?.description || "—", v2: d2?.description || "—", type: "text", full: true },
                            ];

                            return rows.map((row, i) => {
                              if (row.full) {
                                return (
                                  <tr key={i} className="bg-slate-50/30">
                                    <td className="border p-3 font-medium">{row.label}</td>
                                    <td colSpan={2} className="border p-3">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div className={row.v1 !== row.v2 ? "bg-yellow-50 p-2 rounded" : ""}>{row.v1}</div>
                                        <div className={row.v1 !== row.v2 ? "bg-yellow-50 p-2 rounded" : ""}>{row.v2}</div>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              }

                              const cmp = compareFn(row.v1, row.v2, row.type);

                              return (
                                <tr key={i}>
                                  <td className="border p-3 font-medium">{row.label}</td>
                                  <td className={`border p-3 text-center ${cmp.cls1}`}>
                                    {row.v1 ?? "—"}
                                    {cmp.icon1 && <span className="ml-1 font-bold text-green-600">{cmp.icon1}</span>}
                                  </td>
                                  <td className={`border p-3 text-center ${cmp.cls2}`}>
                                    {row.v2 ?? "—"}
                                    {cmp.icon2 && <span className="ml-1 font-bold text-green-600">{cmp.icon2}</span>}
                                  </td>
                                </tr>
                              );
                            });
                          })()}

                          {/* Specs */}
                          {(() => {
                            const keys = new Set([
                              ...Object.keys(compareData.device1?.specs || {}),
                              ...Object.keys(compareData.device2?.specs || {}),
                            ]);
                            return [...keys].map((key) => {
                              const v1 = compareData.device1?.specs?.[key];
                              const v2 = compareData.device2?.specs?.[key];
                              const diff = v1 !== v2 && v1 !== undefined && v2 !== undefined;
                              return (
                                <tr key={key}>
                                  <td className="border p-3 font-medium">{key}</td>
                                  <td className={`border p-3 text-center ${diff ? "bg-yellow-50" : ""}`}>
                                    {v1 ?? "—"}
                                  </td>
                                  <td className={`border p-3 text-center ${diff ? "bg-yellow-50" : ""}`}>
                                    {v2 ?? "—"}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="p-6 border-t flex justify-end">
                    <button
                      onClick={() => setIsCompareModalOpen(false)}
                      className="px-8 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition"
                    >
                      Đóng
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
