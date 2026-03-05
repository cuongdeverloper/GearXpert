// pages/supplier/SupplierProfileEdit.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import {
  updateSupplierProfile,
  getSupplierProfile,
} from '../../service/ApiService/SupplierApi';
import Header from '../../components/navigation/Header';
import Footer from '../../components/homepage/Footer';

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
        }
      } catch (err) {
        toast.error('Không thể tải thông tin profile');
      }
    };

    fetchSupplierProfile();
  }, [user?.id, user?.role, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('warehouseAddress')) {
      const field = name.split('.')[1];
      setFormData((prev) => ({
        ...prev,
        warehouseAddress: { ...prev.warehouseAddress, [field]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
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
      const submitData = new FormData();
      Object.keys(formData).forEach((key) => {
        if (key === 'warehouseAddress') {
          Object.keys(formData[key]).forEach((subKey) => {
            submitData.append(`warehouseAddress.${subKey}`, formData[key][subKey]);
          });
        } else {
          submitData.append(key, formData[key]);
        }
      });

      if (businessAvatarFile) submitData.append('businessAvatar', businessAvatarFile);

      const res = await updateSupplierProfile(submitData);
      if (res?.success) {
        toast.success('Cập nhật profile thành công');
        navigate('/supplier/profile'); // Hoặc dashboard
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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-grow pb-12">
        {/* Hero Section - đồng bộ với ProfilePage */}
        <section className="relative w-full bg-slate-900 overflow-hidden mb-10 pt-16 pb-32 lg:pt-24 lg:pb-40">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-slate-900"></div>

          <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel text-white mb-6 border border-white/10 bg-white/5 backdrop-blur-md">
              <span className="material-symbols-outlined text-accent-cyan text-[18px] fill-current">storefront</span>
              <span className="text-xs font-bold tracking-[0.1em] uppercase text-indigo-100">Supplier Dashboard</span>
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 font-display tracking-tight">
              Quản lý <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-indigo-400">Profile Cửa hàng</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto font-light">
              Cập nhật thông tin kinh doanh, ảnh đại diện cửa hàng và các kênh liên hệ để thu hút khách hàng tốt hơn.
            </p>
          </div>
        </section>

        <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-24 relative z-20">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left - Preview Card (giống profile user) */}
            <div className="lg:col-span-1">
              <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-slate-200/50 p-6 sticky top-24 transition-all duration-300">
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
                    <span className="text-slate-600">Sản phẩm đang bán:</span>
                    <span className="font-semibold text-slate-900">Chưa có dữ liệu</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Đánh giá:</span>
                    <span className="font-semibold text-slate-900">0.0 (0 đánh giá)</span>
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Địa chỉ kho / Cửa hàng
                    </label>
                    <div className="grid md:grid-cols-3 gap-4">
                      <input
                        type="text"
                        name="warehouseAddress.street"
                        value={formData.warehouseAddress.street}
                        onChange={handleChange}
                        placeholder="Số nhà, đường"
                        className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                      />
                      <input
                        type="text"
                        name="warehouseAddress.district"
                        value={formData.warehouseAddress.district}
                        onChange={handleChange}
                        placeholder="Quận/Huyện"
                        className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                      />
                      <input
                        type="text"
                        name="warehouseAddress.city"
                        value={formData.warehouseAddress.city}
                        onChange={handleChange}
                        placeholder="Thành phố"
                        className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-accent-cyan focus:border-transparent transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                      />
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
      </main>

      <Footer />
    </div>
  );
}