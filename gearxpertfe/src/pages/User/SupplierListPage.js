import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, MapPin, Star, ChevronRight, 
  X, Maximize2, Navigation, ChevronDown,
  Store, Layers
} from 'lucide-react';
import Map, { Marker, Popup, Source, Layer } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { motion, AnimatePresence } from 'framer-motion';
import { getPublicSuppliers } from '../../service/ApiService/SupplierApi';
import { toast } from 'react-toastify';
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";

const DISTRICTS = [
  'Hải Châu',
  'Thanh Khê',
  'Sơn Trà',
  'Ngũ Hành Sơn',
  'Liên Chiểu',
  'Cẩm Lệ',
];

const DA_NANG_COORDS = { latitude: 16.0544, longitude: 108.2022 };
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;
const MAPBOX_STYLE = 'mapbox://styles/mapbox/standard'; 

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export default function SupplierListPage() {
  const navigate = useNavigate();
  const mapRef = useRef();
  
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('featured');
  
  const [viewState, setViewState] = useState({
    ...DA_NANG_COORDS,
    zoom: 13,
    pitch: 45,
    bearing: 0
  });
  
  const [selectedShop, setSelectedShop] = useState(null);
  const [isFullscreenMap, setIsFullscreenMap] = useState(false);
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [routeData, setRouteData] = useState(null);

  const fetchSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (searchTerm) params.search = searchTerm;
      if (selectedDistrict) params.district = selectedDistrict;

      const res = await getPublicSuppliers(params);
      if (res && res.success) {
        setSuppliers(res.data || []);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Không thể tải danh sách đối tác');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedDistrict]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers();
    }, 500);
    return () => clearTimeout(timer);
  }, [fetchSuppliers]);

  const suppliersWithCoords = useMemo(() => {
    let result = suppliers.map((s) => {
      const lat = s.warehouseAddress?.lat || (16.04 + (parseInt(s._id.substring(0, 8), 16) % 100) / 2000);
      const lng = s.warehouseAddress?.lng || (108.20 + (parseInt(s._id.substring(8, 16), 16) % 100) / 2000);
      const progress = Math.floor(Math.random() * 40) + 60; 
      
      let distance = null;
      if (userLocation) {
        distance = calculateDistance(userLocation.latitude, userLocation.longitude, lat, lng);
      }
      
      return { ...s, coords: { latitude: lat, longitude: lng }, progress, distance };
    });

    if (sortBy === 'rating') {
      result.sort((a, b) => (b.supplierRating || 0) - (a.supplierRating || 0));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }

    return result;
  }, [suppliers, sortBy, userLocation]);

  const handleFlyTo = (shop) => {
    setSelectedShop(shop);
    mapRef.current?.flyTo({
      center: [shop.coords.longitude, shop.coords.latitude],
      zoom: 15.5,
      pitch: 60,
      bearing: -20,
      duration: 3000,
      essential: true
    });
  };

  const handleLocateMe = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        toast.error('Trình duyệt của bạn không hỗ trợ định vị');
        reject('Not supported');
        return;
      }

      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newCoords = { latitude, longitude };
          setUserLocation(newCoords);
          
          mapRef.current?.flyTo({
            center: [longitude, latitude],
            zoom: 15,
            pitch: 45,
            duration: 2000
          });
          
          setIsLocating(false);
          toast.success('Đã xác định vị trí của bạn');
          resolve(newCoords);
        },
        (error) => {
          console.error('Error getting location:', error);
          setIsLocating(false);
          toast.error('Không thể lấy vị trí. Vui lòng kiểm tra quyền truy cập vị trí.');
          reject(error);
        },
        { enableHighAccuracy: true }
      );
    });
  };

  const handleShowRoute = async (shop) => {
    let currentPos = userLocation;
    
    if (!currentPos) {
      try {
        currentPos = await handleLocateMe();
      } catch (error) {
        toast.info('Vui lòng cho phép truy cập vị trí để tìm đường.');
        return;
      }
    }

    try {
      const start = [currentPos.longitude, currentPos.latitude];
      const end = [shop.coords.longitude, shop.coords.latitude];
      const query = await fetch(
        `https://api.mapbox.com/directions/v5/mapbox/driving/${start[0]},${start[1]};${end[0]},${end[1]}?steps=true&geometries=geojson&access_token=${MAPBOX_TOKEN}`
      );
      const json = await query.json();
      
      if (json.routes && json.routes.length > 0) {
        const data = json.routes[0].geometry;
        setRouteData(data);
        
        // Zoom map to fit both points
        const bounds = [
          [Math.min(start[0], end[0]) - 0.005, Math.min(start[1], end[1]) - 0.005],
          [Math.max(start[0], end[0]) + 0.005, Math.max(start[1], end[1]) + 0.005]
        ];
        
        mapRef.current?.fitBounds(bounds, { padding: 100, duration: 2000 });
        toast.success(`Khoảng cách đường đi: ${(json.routes[0].distance / 1000).toFixed(1)}km`);
      } else {
        toast.error('Không tìm thấy đường đi');
      }
    } catch (error) {
      console.error('Error fetching route:', error);
      toast.error('Lỗi khi tìm đường');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      
      <main className="flex-grow w-full pb-20">
        {/* PREMIUM HERO SECTION - Synchronized with /products */}
        <section className="relative w-full bg-slate-900 overflow-hidden mb-12 pt-16 pb-24 lg:pt-24 lg:pb-32">
          {/* Background Image Overlay */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556761175-597368b268f9?q=80&w=2070')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
          {/* Depth Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-slate-50"></div>

          <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight font-display">
              Mạng lưới <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">Đối tác Chuyên nghiệp</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-light mb-10 leading-relaxed">
              Khám phá hệ sinh thái những nhà cung cấp thiết bị hàng đầu tại Đà Nẵng. <br className="hidden md:block"/> Kết nối với mạng lưới các trung tâm thiết bị chuyên nghiệp đã được kiểm duyệt.
            </p>

            {/* Premium Search Box */}
            <div className="max-w-2xl mx-auto relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-cyan-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
              <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2 flex items-center shadow-2xl">
                <Search className="text-white/50 ml-4 mr-3" size={24} />
                <input
                  type="text"
                  placeholder="Tìm tên shop, quận, thiết bị..."
                  className="flex-1 bg-transparent border-none text-white placeholder-white/40 focus:ring-0 text-lg h-12 outline-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <button
                  onClick={() => fetchSuppliers()}
                  className="px-8 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-indigo-50 transition-all uppercase text-sm tracking-widest"
                >
                  Tìm kiếm
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-20 relative z-20">
          <div className="flex flex-col lg:flex-row gap-8">
            
            {/* SIDEBAR - Synchronized with /products */}
            <aside className="w-full lg:w-80 flex-shrink-0">
              <div className="bg-white/80 backdrop-blur-xl rounded-[24px] p-6 shadow-xl border border-white/60 sticky top-24">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Vị trí</h3>
                
                <div className="relative mb-8">
                  <button
                    onClick={() => setIsDistrictOpen(!isDistrictOpen)}
                    className="w-full flex items-center justify-between px-5 py-4 bg-slate-900 text-white rounded-[20px] shadow-xl shadow-indigo-200 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin size={18} className="text-cyan-400" />
                      <span className="font-bold text-sm tracking-tight">
                        {selectedDistrict ? `Quận ${selectedDistrict}` : "Tất cả Đà Nẵng"}
                      </span>
                    </div>
                    <ChevronDown size={18} className={`transition-transform duration-300 ${isDistrictOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isDistrictOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 5, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        className="absolute top-full left-0 right-0 z-50 mt-1 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-[24px] shadow-2xl overflow-hidden p-2"
                      >
                        <button
                          onClick={() => { setSelectedDistrict(null); setIsDistrictOpen(false); }}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group ${selectedDistrict === null ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"}`}
                        >
                          <Layers size={16} />
                          <span className="font-bold text-xs uppercase tracking-wider">Tất cả Đà Nẵng</span>
                        </button>
                        
                        {DISTRICTS.map((d) => (
                          <button
                            key={d}
                            onClick={() => { setSelectedDistrict(d); setIsDistrictOpen(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-left group ${selectedDistrict === d ? "bg-indigo-50 text-indigo-600" : "text-slate-600 hover:bg-slate-50"}`}
                          >
                            <MapPin size={16} />
                            <span className="font-bold text-xs uppercase tracking-wider">Quận {d}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Nearby Hubs Section */}
                <div className="mt-8">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                    Cửa hàng lân cận
                    {userLocation && <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">Gần bạn nhất</span>}
                  </h3>
                  <div className="space-y-3">
                    {[...suppliersWithCoords]
                      .sort((a, b) => (a.distance || 999) - (b.distance || 999))
                      .slice(0, selectedDistrict ? 3 : suppliersWithCoords.length)
                      .map(shop => (
                        <div 
                          key={shop._id}
                          onClick={() => {
                            if (viewMode !== 'map') {
                              setViewMode('map');
                              setTimeout(() => handleFlyTo(shop), 100);
                            } else {
                              handleFlyTo(shop);
                            }
                          }}
                          className={`p-3 rounded-2xl border transition-all cursor-pointer flex gap-3 items-center group/hub ${selectedShop?._id === shop._id && viewMode === 'map' ? 'bg-indigo-600 border-indigo-600 shadow-xl shadow-indigo-500/30 text-white' : 'bg-white border-slate-50 hover:border-indigo-200 hover:shadow-md'}`}
                        >
                          <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ring-2 ring-slate-50">
                            <img src={shop.businessAvatar} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className={`text-[11px] font-bold truncate mb-0.5 ${selectedShop?._id === shop._id && viewMode === 'map' ? 'text-white' : 'text-slate-900 group-hover/hub:text-indigo-600'}`}>{shop.businessName}</p>
                            <div className="flex items-center gap-2">
                               <p className={`text-[9px] font-medium ${selectedShop?._id === shop._id && viewMode === 'map' ? 'text-indigo-100' : 'text-slate-400'}`}>
                                 {shop.warehouseAddress?.district}
                               </p>
                               {shop.distance !== null && (
                                 <span className={`text-[9px] font-black ${selectedShop?._id === shop._id && viewMode === 'map' ? 'text-white' : 'text-indigo-500'}`}>
                                   • {shop.distance < 1 ? `${(shop.distance * 1000).toFixed(0)}m` : `${shop.distance.toFixed(1)}km`}
                                 </span>
                               )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Promotional Card */}
                <div className="mt-8 p-6 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl text-white relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                  <h4 className="font-bold font-display text-lg mb-2 relative z-10">Trở thành đối tác?</h4>
                  <p className="text-xs text-indigo-100 mb-4 relative z-10 leading-relaxed">Tham gia vào mạng lưới chuyên nghiệp và mở rộng kinh doanh của bạn.</p>
                  <button className="px-4 py-2 bg-white text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors w-full shadow-lg relative z-10">
                    Đăng ký ngay
                  </button>
                </div>
              </div>
            </aside>

            {/* MAIN CONTENT Area */}
            <div className="flex-1">
              
              {/* CONTROLS BAR - Synchronized with /products */}
              <div className="bg-white/50 backdrop-blur-md rounded-2xl p-4 mb-8 flex flex-wrap items-center justify-between gap-4 border border-white/60 shadow-sm">
                <h2 className="text-lg font-bold text-slate-700">
                  Đang hiển thị <span className="text-slate-900">{suppliersWithCoords.length}</span> kết quả
                </h2>

                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-500">Sắp xếp:</span>
                    <div className="relative">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-bold py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm hover:border-indigo-300 transition-colors"
                      >
                        <option value="featured">Nổi bật</option>
                        <option value="newest">Đối tác mới nhất</option>
                        <option value="rating">Đánh giá cao nhất</option>
                      </select>
                      <ChevronRight size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none rotate-90" />
                    </div>
                  </div>

                  <div className="w-px h-6 bg-slate-200 mx-2 hidden sm:block"></div>

                  {/* View Toggle */}
                  <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'grid' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      Lưới
                    </button>
                    <button
                      onClick={() => setViewMode('map')}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${viewMode === 'map' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                    >
                      Bản đồ
                    </button>
                  </div>
                </div>
              </div>

              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8 pb-20">
                  {loading ? (
                    Array(6).fill(0).map((_, i) => (
                      <div key={i} className="bg-white rounded-[32px] p-4 h-[440px] animate-pulse ring-1 ring-slate-100 shadow-sm"></div>
                    ))
                  ) : suppliersWithCoords.length > 0 ? (
                    suppliersWithCoords.map((shop) => (
                      <motion.div
                        key={shop._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -8 }}
                        onClick={() => navigate(`/supplier/${shop.userId._id}`)}
                        className="bg-white rounded-[32px] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 cursor-pointer border border-slate-100 h-full flex flex-col group"
                      >
                        <div className="h-56 relative overflow-hidden">
                          <img src={shop.businessAvatar} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg flex items-center gap-1.5 border border-white/20">
                            <Star className="text-amber-500 fill-amber-500" size={14} />
                            <span className="text-xs font-bold text-slate-800">{shop.supplierRating?.toFixed(1) || '0.0'}</span>
                          </div>
                          {shop.isOnline && (
                             <div className="absolute top-4 right-4 px-3 py-1 bg-green-500 text-white text-[10px] font-bold rounded-full shadow-lg flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                                Live
                             </div>
                          )}
                        </div>
                        <div className="p-6 flex-grow flex flex-col">
                          <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-indigo-600 transition-colors truncate">
                            {shop.businessName}
                          </h3>
                          <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2 text-slate-400">
                              <MapPin size={14} className="text-indigo-500" />
                              <span className="text-xs font-medium">{shop.warehouseAddress?.district || 'Đà Nẵng'}</span>
                            </div>
                            {shop.distance !== null && (
                              <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                {shop.distance < 1 ? `${(shop.distance * 1000).toFixed(0)}m` : `${shop.distance.toFixed(1)}km`}
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-auto pt-6 border-t border-slate-50 flex justify-between items-center text-sm font-bold">
                             <div className="flex items-center gap-2 text-slate-600">
                                <Store size={18} className="text-indigo-500" />
                                <span>{shop.deviceCount} sản phẩm</span>
                             </div>
                             <div className="w-10 h-10 rounded-full border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                <ChevronRight size={18} />
                             </div>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full py-32 text-center bg-white rounded-[40px] border border-dashed border-slate-200">
                      <Search size={64} className="mx-auto mb-6 text-slate-200" />
                      <h3 className="text-2xl font-bold text-slate-900 mb-2">Không tìm thấy kết quả</h3>
                      <p className="text-slate-400 text-sm">Hãy thử điều chỉnh bộ lọc hoặc từ khóa tìm kiếm của bạn</p>
                    </div>
                  )}
                </div>
              ) : (
                /* PREMIUM MAP VIEW */
                <div className="relative h-[800px] w-full rounded-[3.5rem] overflow-hidden shadow-2xl border-[12px] border-white bg-slate-100">

                  <Map
                    {...viewState}
                    onMove={evt => setViewState(evt.viewState)}
                    ref={mapRef}
                    mapStyle={MAPBOX_STYLE}
                    mapboxAccessToken={MAPBOX_TOKEN}
                    style={{ width: '100%', height: '100%' }}
                    reuseMaps
                  >
                    {suppliersWithCoords.map((shop) => (
                      <Marker
                        key={shop._id}
                        latitude={shop.coords.latitude}
                        longitude={shop.coords.longitude}
                        anchor="bottom"
                        onClick={e => { e.originalEvent.stopPropagation(); handleFlyTo(shop); }}
                      >
                        <motion.div className="relative cursor-pointer" whileHover={{ scale: 1.2, zIndex: 10 }}>
                          <div className={`w-12 h-12 p-1 rounded-xl bg-white shadow-2xl border-2 transition-all duration-300 ${selectedShop?._id === shop._id ? 'border-indigo-600' : 'border-white'}`}>
                             <img src={shop.businessAvatar} className="w-full h-full object-cover rounded-lg" alt="" />
                          </div>
                          {selectedShop?._id === shop._id && <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-25"></div>}
                        </motion.div>
                      </Marker>
                    ))}

                    {userLocation && (
                      <Marker
                        latitude={userLocation.latitude}
                        longitude={userLocation.longitude}
                        anchor="center"
                      >
                        <div className="relative flex items-center justify-center">
                          <div className="absolute w-8 h-8 bg-indigo-500 rounded-full animate-ping opacity-30"></div>
                          <div className="relative w-4 h-4 bg-indigo-600 rounded-full border-2 border-white shadow-lg"></div>
                        </div>
                      </Marker>
                    )}

                    <AnimatePresence>
                      {selectedShop && (
                        <Popup
                          latitude={selectedShop.coords.latitude}
                          longitude={selectedShop.coords.longitude}
                          onClose={() => setSelectedShop(null)}
                          closeButton={false}
                          offset={45}
                          className="premium-popup"
                        >
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                            className="bg-white rounded-[2rem] border border-gray-100 shadow-2xl w-60 overflow-hidden"
                          >
                             <div className="h-28 w-full relative">
                                <img src={selectedShop.businessAvatar} className="w-full h-full object-cover" alt="" />
                             </div>
                             <div className="p-4">
                                <h5 className="font-bold text-slate-900 text-sm mb-1">{selectedShop.businessName}</h5>
                                <p className="text-[10px] text-slate-400 mb-4 flex items-center gap-1"><MapPin size={10} className="text-indigo-500" /> {selectedShop.warehouseAddress?.district}</p>
                                
                                <button onClick={() => navigate(`/supplier/${selectedShop.userId._id}`)} className="w-full bg-indigo-600 text-white font-bold text-xs py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">Xem chi tiết cửa hàng</button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleShowRoute(selectedShop); }} 
                                  className="w-full mt-2 bg-white text-indigo-600 border border-indigo-600 font-bold text-xs py-2.5 rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                                >
                                  <Navigation size={14} />
                                  Đường đi ngắn nhất
                                </button>
                             </div>
                          </motion.div>
                        </Popup>
                      )}
                    </AnimatePresence>

                    {routeData && (
                      <Source id="route" type="geojson" data={{
                        type: 'Feature',
                        properties: {},
                        geometry: routeData
                      }}>
                        <Layer
                          id="route"
                          type="line"
                          source="route"
                          layout={{
                            'line-join': 'round',
                            'line-cap': 'round'
                          }}
                          paint={{
                            'line-color': '#4f46e5',
                            'line-width': 6,
                            'line-opacity': 0.8
                          }}
                        />
                      </Source>
                    )}

                    <div className="absolute right-6 top-6 z-20 flex flex-col gap-3">
                       <button onClick={() => setIsFullscreenMap(true)} title="Toàn màn hình" className="w-12 h-12 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl flex items-center justify-center text-slate-600 border border-white/50 hover:bg-white transition-all"><Maximize2 size={20} /></button>
                       <button 
                         onClick={handleLocateMe} 
                         disabled={isLocating}
                         title="Vị trí của tôi"
                         className={`w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center transition-all ${isLocating ? 'bg-slate-200 text-slate-400' : 'bg-white/90 backdrop-blur-md text-indigo-600 border border-indigo-100 hover:bg-indigo-50'}`}
                       >
                         <Navigation size={20} className={isLocating ? 'animate-pulse' : ''} />
                       </button>
                       <button onClick={() => mapRef.current?.flyTo({ center: [DA_NANG_COORDS.longitude, DA_NANG_COORDS.latitude], zoom: 13, pitch: 45, bearing: 0, duration: 2000 })} title="Về trung tâm Đà Nẵng" className="w-12 h-12 bg-slate-900 text-white rounded-2xl shadow-xl flex items-center justify-center hover:bg-indigo-600 transition-all font-bold">DN</button>
                       {routeData && (
                         <button 
                           onClick={() => setRouteData(null)} 
                           title="Xóa đường đi" 
                           className="w-12 h-12 bg-red-500 text-white rounded-2xl shadow-xl flex items-center justify-center hover:bg-red-600 transition-all"
                         >
                           <X size={20} />
                         </button>
                       )}
                    </div>

                    <div className="absolute bottom-8 left-8 z-20 bg-slate-900/90 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 flex items-center gap-4 text-white">
                       <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                          <span className="text-[9px] font-bold uppercase tracking-widest">Cửa hàng đang hoạt động</span>
                       </div>
                    </div>
                  </Map>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Fullscreen Map Modal */}
      <AnimatePresence>
        {isFullscreenMap && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-6 md:p-12">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="w-full h-full bg-white rounded-[3rem] overflow-hidden relative border border-white/20 shadow-2xl">
              <button onClick={() => setIsFullscreenMap(false)} className="absolute top-10 right-10 z-[1010] w-16 h-16 bg-white rounded-full shadow-2xl flex items-center justify-center hover:rotate-90 transition-all">
                <X size={32} className="text-slate-900" />
              </button>
              <Map 
                {...viewState} 
                onMove={evt => setViewState(evt.viewState)} 
                mapStyle={MAPBOX_STYLE} 
                mapboxAccessToken={MAPBOX_TOKEN} 
                style={{ width: '100%', height: '100%' }}
                ref={mapRef}
                reuseMaps
              >
                {suppliersWithCoords.map(shop => (
                  <Marker 
                    key={shop._id} 
                    latitude={shop.coords.latitude} 
                    longitude={shop.coords.longitude} 
                    anchor="bottom"
                    onClick={e => { e.originalEvent.stopPropagation(); handleFlyTo(shop); }}
                  >
                    <motion.div className="relative cursor-pointer" whileHover={{ scale: 1.2, zIndex: 10 }}>
                      <div className={`w-14 h-14 p-1 rounded-2xl bg-white shadow-2xl border-2 transition-all duration-300 ${selectedShop?._id === shop._id ? 'border-indigo-600 shadow-indigo-200' : 'border-white'}`}>
                        <img src={shop.businessAvatar} className="w-full h-full object-cover rounded-xl" alt="" />
                      </div>
                      {selectedShop?._id === shop._id && <div className="absolute inset-0 bg-indigo-500 rounded-full animate-ping opacity-25"></div>}
                    </motion.div>
                  </Marker>
                ))}

                {userLocation && (
                  <Marker
                    latitude={userLocation.latitude}
                    longitude={userLocation.longitude}
                    anchor="center"
                  >
                    <div className="relative flex items-center justify-center">
                      <div className="absolute w-8 h-8 bg-indigo-500 rounded-full animate-ping opacity-30"></div>
                      <div className="relative w-4 h-4 bg-indigo-600 rounded-full border-2 border-white shadow-lg"></div>
                    </div>
                  </Marker>
                )}

                <AnimatePresence>
                  {selectedShop && (
                    <Popup
                      latitude={selectedShop.coords.latitude}
                      longitude={selectedShop.coords.longitude}
                      onClose={() => setSelectedShop(null)}
                      closeButton={false}
                      offset={45}
                      className="premium-popup shadow-none"
                    >
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 10 }}
                        className="bg-white rounded-[2.5rem] border border-gray-100 shadow-2xl w-60 overflow-hidden"
                      >
                         <div className="h-28 w-full relative">
                            <img src={selectedShop.businessAvatar} className="w-full h-full object-cover" alt="" />
                         </div>
                         <div className="p-4">
                            <h5 className="font-bold text-slate-900 text-sm mb-1">{selectedShop.businessName}</h5>
                            <p className="text-[10px] text-slate-400 mb-4 flex items-center gap-1"><MapPin size={10} className="text-indigo-500" /> {selectedShop.warehouseAddress?.district}</p>
                            
                            <button onClick={() => navigate(`/supplier/${selectedShop.userId._id}`)} className="w-full bg-indigo-600 text-white font-bold text-xs py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20">Xem chi tiết cửa hàng</button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleShowRoute(selectedShop); }} 
                              className="w-full mt-2 bg-white text-indigo-600 border border-indigo-600 font-bold text-xs py-2.5 rounded-xl hover:bg-indigo-50 transition-all flex items-center justify-center gap-2"
                            >
                              <Navigation size={14} />
                              Đường đi ngắn nhất
                            </button>
                         </div>
                      </motion.div>
                    </Popup>
                  )}
                </AnimatePresence>

                {routeData && (
                  <Source id="route-fs" type="geojson" data={{
                    type: 'Feature',
                    properties: {},
                    geometry: routeData
                  }}>
                    <Layer
                      id="route-fs"
                      type="line"
                      source="route-fs"
                      layout={{
                        'line-join': 'round',
                        'line-cap': 'round'
                      }}
                      paint={{
                        'line-color': '#4f46e5',
                        'line-width': 6,
                        'line-opacity': 0.8
                      }}
                    />
                  </Source>
                )}

                {/* Fullscreen Map Controls */}
                <div className="absolute left-10 top-10 flex flex-col gap-4">
                   <button 
                     onClick={handleLocateMe} 
                     disabled={isLocating}
                     title="Vị trí của tôi"
                     className={`w-14 h-14 rounded-2xl shadow-2xl flex items-center justify-center transition-all ${isLocating ? 'bg-slate-200 text-slate-400' : 'bg-white/90 backdrop-blur-md text-indigo-600 border border-indigo-100 hover:bg-indigo-50'}`}
                   >
                     <Navigation size={24} className={isLocating ? 'animate-pulse' : ''} />
                   </button>
                   <button onClick={() => mapRef.current?.flyTo({ center: [DA_NANG_COORDS.longitude, DA_NANG_COORDS.latitude], zoom: 13, pitch: 45, bearing: 0, duration: 2000 })} title="Về trung tâm Đà Nẵng" className="w-14 h-14 bg-slate-900 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:bg-indigo-600 transition-all font-bold">DN</button>
                   {routeData && (
                     <button 
                       onClick={() => setRouteData(null)} 
                       title="Xóa đường đi" 
                       className="w-14 h-14 bg-red-500 text-white rounded-2xl shadow-2xl flex items-center justify-center hover:bg-red-600 transition-all"
                     >
                       <X size={24} />
                     </button>
                   )}
                </div>
              </Map>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        .premium-popup .mapboxgl-popup-content { background: transparent !important; padding: 0 !important; box-shadow: none !important; }
        .premium-popup .mapboxgl-popup-tip { display: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(79, 70, 229, 0.3); border-radius: 10px; }
      `}} />
    </div>
  );
}
