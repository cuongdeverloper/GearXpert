import React, { useEffect, useRef, useState } from 'react';
import { History, LogOut, Pencil, User } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { doLogin, doLogout } from '../../../redux/action/userAction';
import { persistor } from '../../../redux/store';
import { getCurrentUser, updateProfile } from '../../../service/ApiService/AuthApi';
import Cookies from 'js-cookie';
import { toast } from 'react-toastify';

export default function ProfileTab({ setActiveMenu }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const userAccount = useSelector((state) => state.user.account);
  const socketConnection = useSelector((state) => state.user.account.socketConnection);
  const fileInputRef = useRef(null);

  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    street: '',
    district: '',
    city: '',
  });

  const applyProfileData = (data) => {
    setFormData({
      fullName: data?.fullName || data?.username || '',
      phone: data?.phone || data?.phoneNumber || '',
      street: data?.address?.street || '',
      district: data?.address?.district || '',
      city: data?.address?.city || '',
    });
    setAvatarPreview(data?.avatar || data?.image || '');
  };

  useEffect(() => {
    applyProfileData(userAccount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchUserData = async () => {
      setLoadingProfile(true);
      try {
        const response = await getCurrentUser();
        if (response?.errorCode === 0 && response?.data) {
          const data = response.data;
          applyProfileData(data);

          dispatch(
            doLogin({
              data: {
                id: data.id,
                access_token: userAccount.access_token || '',
                refresh_token: userAccount.refresh_token || '',
                fullName: data.fullName,
                email: data.email,
                phone: data.phone,
                avatar: data.avatar,
                type: data.type,
                role: data.role,
                address: data.address || {},
                rank: data.rank,
                walletBalance: data.walletBalance,
                rewardPoints: data.rewardPoints,
                isVerified: data.isVerified,
                isVerifiedEkyc: data.isVerifiedEkyc,
              },
            })
          );
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchUserData();
  }, [dispatch, userAccount.access_token, userAccount.refresh_token]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Kích thước ảnh không được vượt quá 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => setAvatarPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmitProfile = async (e) => {
    e.preventDefault();

    if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
      toast.error('Số điện thoại phải có đúng 10 chữ số');
      return;
    }

    setSavingProfile(true);
    try {
      const submitFormData = new FormData();
      submitFormData.append('fullName', formData.fullName);
      submitFormData.append('phone', formData.phone);
      submitFormData.append('street', formData.street);
      submitFormData.append('district', formData.district);
      submitFormData.append('city', formData.city);

      if (fileInputRef.current?.files?.[0]) {
        submitFormData.append('avatar', fileInputRef.current.files[0]);
      }

      const response = await updateProfile(submitFormData);
      if (response?.errorCode === 0 && response?.data) {
        const data = response.data;
        toast.success('Cập nhật thông tin thành công');
        applyProfileData(data);

        dispatch(
          doLogin({
            data: {
              id: data.id,
              access_token: userAccount.access_token || '',
              refresh_token: userAccount.refresh_token || '',
              fullName: data.fullName,
              email: data.email,
              phone: data.phone,
              avatar: data.avatar,
              type: data.type,
              role: data.role,
              address: data.address || {},
              rank: data.rank,
              walletBalance: data.walletBalance,
              rewardPoints: data.rewardPoints,
              isVerified: data.isVerified,
              isVerifiedEkyc: data.isVerifiedEkyc,
            },
          })
        );

        setIsEditing(false);
      } else {
        toast.error(response?.message || 'Cập nhật thất bại');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (socketConnection) {
        socketConnection.disconnect();
      }
      dispatch(doLogout());
      Cookies.remove('accessToken');
      Cookies.remove('refreshToken');
      await persistor.purge();
      toast.success('Đăng xuất thành công');
      navigate('/signin');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Có lỗi xảy ra khi đăng xuất');
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 flex items-start justify-center">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-md overflow-hidden">
              {avatarPreview ? (
                <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <User size={40} className="text-slate-400" />
              )}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 text-center">
              {formData.fullName || 'Nhân viên vận hành'}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{userAccount.email || '-'}</p>
            <div className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 mt-2 bg-emerald-50 px-3 py-1 rounded-full">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              Đang làm việc
            </div>
          </div>

          <div className="mt-6 w-full grid grid-cols-2 gap-4 text-center">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xl font-bold text-slate-900">{userAccount.rewardPoints || 0}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Điểm thưởng</p>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <p className="text-xl font-bold text-slate-900">{userAccount.rank || 'BRONZE'}</p>
              <p className="text-xs text-slate-500 font-medium mt-1">Rank</p>
            </div>
          </div>

          <button
            onClick={() => setIsEditing((prev) => !prev)}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 text-white py-2.5 font-semibold hover:bg-slate-800 transition-colors"
          >
            <Pencil size={16} /> {isEditing ? 'Đóng chỉnh sửa' : 'Chỉnh sửa hồ sơ'}
          </button>

          {isEditing && (
            <form onSubmit={handleSubmitProfile} className="mt-4 space-y-3">
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                placeholder="Họ và tên"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-primary"
                required
              />
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Số điện thoại"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-primary"
              />
              <input
                type="text"
                name="street"
                value={formData.street}
                onChange={handleInputChange}
                placeholder="Số nhà, đường"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-primary"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  name="district"
                  value={formData.district}
                  onChange={handleInputChange}
                  placeholder="Quận/Huyện"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-primary"
                />
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="Tỉnh/Thành phố"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-primary"
                />
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-slate-700"
              />

              <button
                type="submit"
                disabled={savingProfile}
                className="w-full rounded-xl bg-primary text-white py-2.5 font-semibold disabled:opacity-60"
              >
                {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </form>
          )}

          {loadingProfile && <p className="text-xs text-slate-500 mt-3">Đang đồng bộ dữ liệu...</p>}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div
            onClick={() => setActiveMenu('history')}
            className="p-5 border-b border-slate-100 flex items-center gap-4 text-slate-700 hover:bg-slate-50 active:bg-slate-100 cursor-pointer transition-colors"
          >
            <div className="p-2 bg-slate-100 rounded-lg">
              <History size={20} className="text-slate-600" />
            </div>
            <span className="font-bold flex-1">Lịch sử hoạt động</span>
          </div>
          <div
            onClick={handleLogout}
            className="p-5 flex items-center gap-4 text-red-600 hover:bg-red-50 active:bg-red-100 cursor-pointer transition-colors"
          >
            <div className="p-2 bg-red-100 rounded-lg">
              <LogOut size={20} className="text-red-600" />
            </div>
            <span className="font-bold flex-1">Đăng xuất</span>
          </div>
        </div>
      </div>
    </div>
  );
}
