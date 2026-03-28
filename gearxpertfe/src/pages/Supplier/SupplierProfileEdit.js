// pages/supplier/SupplierProfileEdit.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
  updateSupplierProfile,
  getSupplierProfile,
} from '../../service/ApiService/SupplierApi';
import Map, { Marker } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';


const DISTRICTS = ['Hải Châu', 'Thanh Khê', 'Sơn Trà', 'Ngũ Hành Sơn', 'Liên Chiểu', 'Cẩm Lệ'];
const DA_NANG_COORDS = { latitude: 16.0544, longitude: 108.2022 };
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_ACCESS_TOKEN;

export default function SupplierProfileEdit() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.user.account);

  // Debug Redux state
  useEffect(() => {
    console.log("Redux user:", user);
    console.log("Role:", user?.role);
  }, [user]);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    businessDescription: '',
    operatingHours: '08:00 - 22:00 hàng ngày',
    contactZalo: '',
    contactFacebook: '',
    contactPhone: '',
    warehouseAddress: { street: '', district: '', city: '', fullAddress: '' },
  });

  const [businessAvatarFile, setBusinessAvatarFile] = useState(null);
  const [previewBusinessAvatar, setPreviewBusinessAvatar] = useState('');
  const [profileStats, setProfileStats] = useState({ deviceCount: 0, supplierRating: 0, supplierReviewCount: 0 });
  const [isDistrictOpen, setIsDistrictOpen] = useState(false);
  
  // Map state
  const [viewState, setViewState] = useState({
    ...DA_NANG_COORDS,
    zoom: 12
  });
  const [marker, setMarker] = useState(null);
  const [isManualMarker, setIsManualMarker] = useState(false);
  const [relevance, setRelevance] = useState(1);
  const [isLocating, setIsLocating] = useState(false);
  const [showLocationWarning, setShowLocationWarning] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.district-dropdown')) {
        setIsDistrictOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchSupplierProfile = async () => {
      // Kiểm tra quyền (không phân biệt hoa/thường)
      if (!user?.id || (user.role || '').toUpperCase() !== 'SUPPLIER') {
        toast.error('Bạn không có quyền truy cập trang này');
        navigate('/supplier/dashboard');
        return;
      }

      try {
        const res = await getSupplierProfile(user.id);
        if (res?.success) {
          const data = res.data;
          setFormData({
            businessName: data.businessName || '',
            businessDescription: data.businessDescription || '',
            operatingHours: data.operatingHours || '08:00 - 22:00 hàng ngày',
            contactZalo: data.contactZalo || '',
            contactFacebook: data.contactFacebook || '',
            contactPhone: data.contactPhone || '',
            warehouseAddress: data.warehouseAddress || {
              street: '',
              district: '',
              city: '',
              fullAddress: '',
            },
          });
          if (data.businessAvatar) setPreviewBusinessAvatar(data.businessAvatar);
          setProfileStats({
            deviceCount: data.deviceCount || 0,
            supplierRating: data.supplierRating || 0,
            supplierReviewCount: data.supplierReviewCount || 0,
          });
        }
      } catch (err) {
        toast.error('Không thể tải thông tin profile');
      }
    };

    fetchSupplierProfile();
  }, [user?.id, user?.role, navigate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time geocoding or initialization
  useEffect(() => {
    const { street, district, city, lat, lng } = formData.warehouseAddress;

    // 1. Nếu có sẵn tọa độ (vừa load từ API) và chưa có marker -> Init map
    if (lat && lng && !marker) {
      setMarker({ latitude: lat, longitude: lng });
      setViewState(prev => ({ ...prev, latitude: lat, longitude: lng, zoom: 15 }));
      return;
    }

    // 2. Nếu thay đổi text địa chỉ -> Geocode lại
    const geocodeAddress = async () => {
      if (isManualMarker) return; // Không tự động geocode nếu đang ghim thủ công bằng tay

      if (!street && !district) {
        setMarker(null);
        setViewState(prev => ({ ...prev, ...DA_NANG_COORDS, zoom: 12 }));
        return;
      }
      
      const fullAddr = `${street || ''}, ${district || ''}, ${city || 'Đà Nẵng'}, Việt Nam`;
      try {
        const geoUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(fullAddr)}.json?access_token=${MAPBOX_TOKEN}&limit=1&bbox=108.0,15.9,108.4,16.3`;
        const geoRes = await axios.get(geoUrl);
        
        if (geoRes.data?.features?.length > 0) {
          const feature = geoRes.data.features[0];
          const [foundLng, foundLat] = feature.center;
          setMarker({ latitude: foundLat, longitude: foundLng });
          setRelevance(feature.relevance || 0); // Lưu độ tin cậy của kết quả
          setViewState(prev => ({
            ...prev,
            latitude: foundLat,
            longitude: foundLng,
            zoom: 15
          }));
        }
      } catch (err) {
        console.error("Real-time geocoding failed:", err);
      }
    };

    const timer = setTimeout(geocodeAddress, 800);
    return () => clearTimeout(timer);
  }, [formData.warehouseAddress.street, formData.warehouseAddress.district, formData.warehouseAddress.city, isManualMarker]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMapClick = (e) => {
    const { lng, lat } = e.lngLat;
    setMarker({ latitude: lat, longitude: lng });
    setIsManualMarker(true);
    setRelevance(1); // Coi như tin tưởng tuyệt đối khi user tự ghim
  };

  const resetManualMarker = () => {
    setIsManualMarker(false);
    // Tự động geocode lại theo text địa chỉ khi reset
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      return toast.error("Trình duyệt không hỗ trợ định vị");
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setMarker({ latitude, longitude });
        setIsManualMarker(true);
        setRelevance(1);

        setViewState(prev => ({
          ...prev,
          latitude,
          longitude,
          zoom: 16,
          transitionDuration: 1000
        }));

        // Reverse Geocoding để tự điền địa chỉ vào input (Khôi phục lại theo yêu cầu)
        try {
          const revGeoUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&types=address,neighborhood,locality`;
          const res = await axios.get(revGeoUrl);
          if (res.data?.features?.length > 0) {
            const feature = res.data.features[0];
            const context = feature.context || [];
            
            // Tìm các thành phần địa chỉ
            const streetName = feature.place_type.includes('address') ? feature.text : '';
            const houseNum = feature.address || '';
            const districtObj = context.find(c => c.id.includes('district'));
            const district = districtObj?.text || '';
            const city = context.find(c => c.id.includes('place'))?.text || 'Đà Nẵng';

            setFormData(prev => ({
              ...prev,
              warehouseAddress: {
                ...prev.warehouseAddress,
                street: houseNum ? `${houseNum} ${streetName}` : streetName,
                district: DISTRICTS.includes(district) ? district : prev.warehouseAddress.district,
                city: city.includes('Đà Nẵng') ? 'Đà Nẵng' : city
              }
            }));
            
            setShowLocationWarning(true); // Hiện cảnh báo để user kiểm tra lại
            toast.success("Đã lấy vị trí hiện tại và cập nhật địa chỉ!");
          }
        } catch (err) {
          console.error("Reverse geocoding failed:", err);
          toast.info("Đã xác định vị trí nhưng không thể lấy được địa chỉ bằng chữ.");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLocating(false);
        toast.error("Không thể lấy vị trí hiện tại. Vui lòng cấp quyền truy cập.");
      },
      { enableHighAccuracy: true }
    );
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const cleanValue = name === 'contactPhone' ? value.replace(/\D/g, '') : value;
    if (name.includes('warehouseAddress')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        warehouseAddress: { ...prev.warehouseAddress, [field]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: cleanValue }));
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) return toast.error('Ảnh không được vượt quá 5MB');
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewBusinessAvatar(reader.result);
        setBusinessAvatarFile(file);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Coordinates: Lấy tọa độ từ marker đã được geocode tự động
      const lat = marker?.latitude;
      const lng = marker?.longitude;

      const submitData = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === 'warehouseAddress') {
          Object.keys(formData[key]).forEach((subKey) => {
            submitData.append(`warehouseAddress.${subKey}`, formData[key][subKey]);
          });
          // Thêm tọa độ mới tìm được
          if (lat && lng) {
            submitData.set('warehouseAddress.lat', lat);
            submitData.set('warehouseAddress.lng', lng);
          }
        } else {
          submitData.append(key, formData[key]);
        }
      });

      if (businessAvatarFile) submitData.append('businessAvatar', businessAvatarFile);

      const res = await updateSupplierProfile(submitData);
      if (res?.success) {
        toast.success('Cập nhật profile thành công!');
      } else {
        toast.error(res.message || 'Cập nhật thất bại');
      }
    } catch (err) {
      toast.error('Có lỗi xảy ra khi lưu');
    } finally {
      setLoading(false);
    }
  };

  // Nếu không phải Supplier → redirect
  if (!user?.id || (user.role || '').toUpperCase() !== 'SUPPLIER') {
    return <Navigate to="/supplier/dashboard" replace />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 font-display tracking-tight">Shop Profile</h2>
        <p className="mt-1 text-sm text-slate-600">Cập nhật thông tin kinh doanh, ảnh đại diện và các kênh liên hệ</p>
      </div>

      <div className="max-w-5xl">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left - Preview Card (giống profile user) */}
            <div className="lg:col-span-1">
              <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-slate-200/50 p-6 sticky top-[112px] transition-all duration-300">
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group">
                    <label
                      htmlFor="business-avatar-upload"
                      className="w-32 h-32 rounded-full ring-4 ring-white shadow-[0_8px_30px_rgba(0,0,0,0.2)] cursor-pointer overflow-hidden block bg-gradient-to-r from-indigo-500 to-cyan-400"
                    >
                      <input
                        id="business-avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                      <img
                        src={previewBusinessAvatar || '/default-shop.jpg'}
                        alt="Business Avatar"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-3xl">photo_camera</span>
                      </div>
                    </label>
                  </div>

                  <h2 className="text-2xl font-bold text-slate-900 mb-1 mt-4 font-display">
                    {formData.businessName || 'Cửa hàng của bạn'}
                  </h2>
                  <p className="text-slate-500 text-sm">
                    {user.email || 'Chưa cập nhật email'}
                  </p>
                </div>

                <div className="border-t border-slate-200 my-6"></div>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Sản phẩm đang cho thuê:</span>
                    <span className="font-semibold text-slate-900">{profileStats.deviceCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Đánh giá:</span>
                    <span className="font-semibold text-slate-900">{profileStats.supplierRating.toFixed(1)} ({profileStats.supplierReviewCount} đánh giá)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right - Form chỉnh sửa */}
            <div className="lg:col-span-2 space-y-8">
              <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-slate-200/50 p-6 md:p-8 transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 flex-shrink-0 bg-accent-cyan/10 rounded-full flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-accent-cyan text-xl">storefront</span>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-900 font-display">
                    Thông tin cửa hàng
                  </h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Tên cửa hàng */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Tên cửa hàng / Doanh nghiệp <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                      placeholder="Ví dụ: GearXpert Store"
                    />
                  </div>

                  {/* Mô tả */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mô tả cửa hàng
                    </label>
                    <textarea
                      name="businessDescription"
                      value={formData.businessDescription}
                      onChange={handleChange}
                      rows={5}
                      className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                      placeholder="Giới thiệu ngắn gọn về cửa hàng, sản phẩm nổi bật, dịch vụ..."
                    />
                  </div>

                  {/* Địa chỉ kho */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-slate-700">
                          Địa chỉ kho / Cửa hàng
                        </label>
                        {showLocationWarning && (
                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 rounded-full border border-amber-200 animate-pulse">
                            <span className="material-symbols-outlined text-amber-500 text-[14px]">info</span>
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Vui lòng kiểm tra lại địa chỉ đã điền!</span>
                            <button onClick={() => setShowLocationWarning(false)} className="hover:text-amber-800 transition-colors">
                              <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                          </div>
                        )}
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      <input
                        type="text"
                        name="warehouseAddress.street"
                        value={formData.warehouseAddress.street}
                        onChange={handleChange}
                        placeholder="Số nhà, đường"
                        className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                      />
                      <div className="relative district-dropdown">
                        <button
                          type="button"
                          onClick={() => setIsDistrictOpen(!isDistrictOpen)}
                          className={`w-full flex items-center justify-between px-4 py-3 border rounded-xl transition-all duration-300 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] ${
                            isDistrictOpen ? "ring-2 ring-accent-cyan border-transparent" : "border-slate-200/60"
                          }`}
                        >
                          <span className={formData.warehouseAddress.district ? "text-slate-900" : "text-slate-400"}>
                            {formData.warehouseAddress.district || "Chọn Quận"}
                          </span>
                          <span className={`material-symbols-outlined transition-transform duration-300 ${isDistrictOpen ? "rotate-180" : ""}`}>
                            expand_more
                          </span>
                        </button>

                        <div className={`absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-xl shadow-2xl z-50 overflow-hidden transition-all duration-300 origin-top ${
                          isDistrictOpen ? "opacity-100 scale-100 translate-y-0" : "opacity-0 scale-95 -translate-y-2 pointer-events-none"
                        }`}>
                          <div className="max-h-60 overflow-y-auto p-1 custom-scrollbar">
                            {DISTRICTS.map((d) => (
                              <button
                                key={d}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({
                                    ...prev,
                                    warehouseAddress: { ...prev.warehouseAddress, district: d }
                                  }));
                                  setIsDistrictOpen(false);
                                }}
                                className={`w-full px-4 py-2.5 rounded-lg text-left text-sm transition-all ${
                                  formData.warehouseAddress.district === d 
                                    ? "bg-accent-cyan/10 text-accent-cyan font-bold" 
                                    : "text-slate-600 hover:bg-slate-50"
                                }`}
                              >
                                {d}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <input
                        type="text"
                        name="warehouseAddress.city"
                        value={formData.warehouseAddress.city}
                        onChange={handleChange}
                        placeholder="Thành phố"
                        className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                      />
                    </div>

                    {/* Map Preview */}
                    <div className="mt-4 relative h-64 w-full rounded-2xl overflow-hidden border border-slate-200 shadow-inner group">
                      <Map
                        {...viewState}
                        onMove={(evt) => setViewState(evt.viewState)}
                        onClick={handleMapClick}
                        mapStyle="mapbox://styles/mapbox/streets-v12"
                        mapboxAccessToken={MAPBOX_TOKEN}
                        style={{ width: '100%', height: '100%' }}
                        reuseMaps
                        cursor="crosshair"
                      >
                        {marker && (
                          <Marker
                            latitude={marker.latitude}
                            longitude={marker.longitude}
                            anchor="bottom"
                          >
                            <div className="flex flex-col items-center">
                              <div className={`w-8 h-8 rounded-full border-4 border-white shadow-lg flex items-center justify-center translate-y-2 ${isManualMarker ? 'bg-indigo-600' : 'bg-slate-900'}`}>
                                <span className="material-symbols-outlined text-white text-sm">{isManualMarker ? 'person_pin_circle' : 'store'}</span>
                              </div>
                              <div className={`w-1 h-3 shadow-lg ${isManualMarker ? 'bg-indigo-600' : 'bg-slate-900'}`}></div>
                            </div>
                          </Marker>
                        )}
                      </Map>
                      
                      {/* Status/Control Overlay */}
                      <div className="absolute top-3 left-3 right-3 flex justify-between items-start pointer-events-none">
                        <div className="flex flex-col gap-2 pointer-events-auto">
                          {isManualMarker ? (
                            <button 
                              type="button"
                              onClick={resetManualMarker}
                              className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-lg flex items-center gap-1 hover:bg-indigo-700 transition-all"
                            >
                              <span className="material-symbols-outlined text-sm">restart_alt</span>
                              Dùng địa chỉ text
                            </button>
                          ) : relevance < 0.8 && marker && (
                            <div className="bg-amber-500 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shadow-lg flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">warning</span>
                              Vị trí có thể không chính xác
                            </div>
                          )}
                        </div>
                        
                        <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 shadow-sm">
                          {isManualMarker ? 'Đã ghim thủ công' : 'Bản đồ theo địa chỉ'}
                        </div>
                      </div>

                      {/* Map Controls (Right Side) */}
                      <div className="absolute right-3 bottom-12 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={handleLocateMe}
                          disabled={isLocating}
                          className={`w-10 h-10 rounded-xl shadow-xl flex items-center justify-center transition-all ${
                            isLocating 
                              ? 'bg-slate-100 text-slate-400' 
                              : 'bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-100'
                          }`}
                          title="Lấy vị trí hiện tại của tôi"
                        >
                          <span className={`material-symbols-outlined ${isLocating ? 'animate-spin' : ''}`}>
                            {isLocating ? 'sync' : 'my_location'}
                          </span>
                        </button>
                      </div>

                      {/* Manual Pinning Helper */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/80 backdrop-blur-md px-4 py-1.5 rounded-full text-[10px] font-medium text-white pointer-events-none shadow-xl border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                         Click lên bản đồ hoặc dùng icon định vị để ghim
                      </div>
                      
                      {!marker && (
                        <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                          <p className="text-xs font-medium text-slate-500 bg-white px-4 py-2 rounded-full shadow-sm">
                            Nhập địa chỉ hoặc click bản đồ để định vị
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Thời gian & Liên hệ */}
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Thời gian hoạt động
                      </label>
                      <input
                        type="text"
                        name="operatingHours"
                        value={formData.operatingHours}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                        placeholder="08:00 - 22:00 hàng ngày"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Số điện thoại công khai
                      </label>
                      <input
                        type="tel"
                        name="contactPhone"
                        value={formData.contactPhone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                        placeholder="SĐT khách hàng liên hệ"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Zalo liên hệ
                      </label>
                      <input
                        type="text"
                        name="contactZalo"
                        value={formData.contactZalo}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                        placeholder="Link Zalo hoặc số Zalo"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Facebook liên hệ
                      </label>
                      <input
                        type="text"
                        name="contactFacebook"
                        value={formData.contactFacebook}
                        onChange={handleChange}
                        className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                        placeholder="Link Facebook page/shop"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="flex justify-end gap-4 pt-6">
                    <button
                      type="button"
                      onClick={() => navigate('/supplier/dashboard')}
                      className="px-8 py-4 border border-slate-300 rounded-2xl text-slate-700 font-bold hover:bg-slate-50 hover:shadow-md transition-all duration-300"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-8 py-4 bg-gradient-to-r from-slate-900 to-indigo-700 text-white rounded-2xl font-bold hover:from-indigo-700 hover:to-cyan-600 transition-all duration-300 shadow-xl shadow-indigo-200/30 disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <span className="material-symbols-outlined animate-spin">sync</span>
                          Đang lưu...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">save</span>
                          Lưu thay đổi
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}