import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getCurrentUser, updateProfile, changePassword, sendOTPForPasswordChange } from '../../service/ApiService/AuthApi';
import { doLogin } from '../../redux/action/userAction';
import Header from '../../components/navigation/Header';
import Footer from '../../components/homepage/Footer';

export default function ProfilePage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userAccount = useSelector((state) => state.user.account);
  const isAuthenticated = useSelector((state) => state.user.isAuthenticated);

  const [loading, setLoading] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const fileInputRef = useRef(null);

  // OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [tempToken, setTempToken] = useState(''); // Store stateless token

  // Profile form state
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    street: '',
    district: '',
    city: '',
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/signin');
      return;
    }

    // Load user data from Redux or fetch from API
    if (userAccount) {
      setFormData({
        fullName: userAccount.username || userAccount.fullName || '',
        phone: userAccount.phoneNumber || userAccount.phone || '',
        street: userAccount.address?.street || '',
        district: userAccount.address?.district || '',
        city: userAccount.address?.city || '',
      });

      if (userAccount.image) {
        setAvatarPreview(userAccount.image);
      }
    }

    // Fetch latest user data
    fetchUserData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, navigate]);

  const fetchUserData = async () => {
    try {
      const response = await getCurrentUser();
      if (response.errorCode === 0 && response.data) {
        const data = response.data;
        setFormData({
          fullName: data.fullName || '',
          phone: data.phone || '',
          street: data.address?.street || '',
          district: data.address?.district || '',
          city: data.address?.city || '',
        });

        if (data.avatar) {
          setAvatarPreview(data.avatar);
        }

        // Update Redux store
        dispatch(doLogin({
          data: {
            id: data.id,
            access_token: userAccount.access_token || '',
            refresh_token: userAccount.refresh_token || '',
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            avatar: data.avatar,
            role: data.role,
            address: data.address || {},
            rank: data.rank,
            walletBalance: data.walletBalance,
            rewardPoints: data.rewardPoints,
          }
        }));
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Kích thước ảnh không được vượt quá 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitProfile = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const submitFormData = new FormData();
      submitFormData.append('fullName', formData.fullName);
      submitFormData.append('phone', formData.phone);
      submitFormData.append('street', formData.street);
      submitFormData.append('district', formData.district);
      submitFormData.append('city', formData.city);

      if (fileInputRef.current?.files[0]) {
        submitFormData.append('avatar', fileInputRef.current.files[0]);
      }

      const response = await updateProfile(submitFormData);

      if (response.errorCode === 0) {
        toast.success('Cập nhật thông tin thành công');

        // Update Redux store
        const data = response.data;
        dispatch(doLogin({
          data: {
            id: data.id,
            access_token: userAccount.access_token || '',
            refresh_token: userAccount.refresh_token || '',
            fullName: data.fullName,
            email: data.email,
            phone: data.phone,
            avatar: data.avatar,
            role: data.role,
            address: data.address || {},
            rank: data.rank,
            walletBalance: data.walletBalance,
            rewardPoints: data.rewardPoints,
          }
        }));

        if (data.avatar) {
          setAvatarPreview(data.avatar);
        }
      } else {
        toast.error(response.message || 'Cập nhật thất bại');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Có lỗi xảy ra khi cập nhật thông tin');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    if (!passwordData.oldPassword) {
      toast.error('Vui lòng nhập mật khẩu hiện tại để nhận OTP');
      return;
    }

    setSendingOtp(true);
    try {
      const response = await sendOTPForPasswordChange(passwordData.oldPassword);
      if (response.errorCode === 0) {
        toast.success('Mã OTP đã được gửi đến email của bạn');
        setOtpSent(true);
        if (response.data && response.data.tempToken) {
          setTempToken(response.data.tempToken);
        }
      } else {
        toast.error(response.message || 'Gửi OTP thất bại');
      }
    } catch (error) {
      console.error('Error sending OTP:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi gửi OTP');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();

    if (!otpSent) {
      toast.error('Vui lòng lấy mã OTP trước khi đổi mật khẩu');
      return;
    }

    if (!otpCode || otpCode.length !== 6) {
      toast.error('Vui lòng nhập mã OTP 6 chữ số');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Mật khẩu mới không khớp');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setChangingPassword(true);

    try {
      const response = await changePassword({
        newPassword: passwordData.newPassword,
        confirmPassword: passwordData.confirmPassword,
        otp: otpCode,
        tempToken: tempToken
      });

      if (response.errorCode === 0) {
        toast.success('Đổi mật khẩu thành công');
        setPasswordData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
        setOtpSent(false);
        setOtpCode('');
      } else {
        toast.error(response.message || 'Đổi mật khẩu thất bại');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Có lỗi xảy ra khi đổi mật khẩu');
    } finally {
      setChangingPassword(false);
    }
  };

  const formatRank = (rank) => {
    if (!rank) return 'Bronze';
    return rank.charAt(0) + rank.slice(1).toLowerCase();
  };

  // Get rank card class based on rank
  const getRankCardClass = (rank) => {
    if (!rank) return 'rank-card-bronze';
    const rankUpper = rank.toUpperCase();
    if (rankUpper === 'GOLD') return 'rank-card-gold';
    if (rankUpper === 'BRONZE') return 'rank-card-bronze';
    if (rankUpper === 'SILVER') return 'rank-card-silver';
    return 'rank-card-bronze'; // Default to bronze
  };

  // Get rank inner background class based on rank
  const getRankInnerClass = (rank) => {
    if (!rank) return 'bg-gradient-to-br from-amber-800 via-amber-700 to-orange-600';
    const rankUpper = rank.toUpperCase();
    if (rankUpper === 'GOLD') return 'bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-200';
    if (rankUpper === 'BRONZE') return 'bg-gradient-to-br from-amber-800 via-amber-700 to-orange-600';
    if (rankUpper === 'SILVER') return 'bg-gradient-to-br from-slate-300 via-slate-200 to-gray-100';
    return 'bg-gradient-to-br from-amber-800 via-amber-700 to-orange-600'; // Default to bronze
  };

  // Get rank text color class based on rank
  const getRankTextClass = (rank) => {
    if (!rank) return 'text-white';
    const rankUpper = rank.toUpperCase();
    if (rankUpper === 'GOLD') return 'text-amber-900';
    if (rankUpper === 'BRONZE') return 'text-white';
    if (rankUpper === 'SILVER') return 'text-slate-800';
    return 'text-white'; // Default to bronze
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
      <Header />

      <main className="flex-grow w-full max-w-[1440px] mx-auto px-6 lg:px-10 py-10">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-slate-900 via-primary to-accent-cyan bg-clip-text text-transparent mb-2 font-display">
            Hồ sơ của tôi
          </h1>
          <p className="text-slate-600 text-lg font-medium">
            Quản lý thông tin cá nhân và tài khoản của bạn
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - User Info Card */}
          <div className="lg:col-span-1">
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl hover:shadow-glow-cyan border border-slate-200/50 p-6 sticky top-24 transition-all duration-300">
              {/* Avatar Section */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative group">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarChange}
                    accept="image/*"
                    className="hidden"
                    id="avatar-upload"
                  />
                  <label
                    htmlFor="avatar-upload"
                    className="w-32 h-32 rounded-full bg-cover bg-center ring-4 ring-white shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] mb-4 cursor-pointer hover:ring-primary transition-all duration-300 relative overflow-hidden block"
                    style={{
                      backgroundImage: avatarPreview
                        ? `url("${avatarPreview}")`
                        : 'linear-gradient(to right, #6366F1, #22D3EE)'
                    }}
                  >
                    {!avatarPreview && (
                      <div className="w-full h-full rounded-full flex items-center justify-center text-white pointer-events-none">
                        <span className="material-symbols-outlined text-5xl">person</span>
                      </div>
                    )}
                    {/* Overlay on hover */}
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full flex items-center justify-center pointer-events-none z-10">
                      <span className="material-symbols-outlined text-white text-3xl">camera_alt</span>
                    </div>
                  </label>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-1 font-display">
                  {userAccount.username || userAccount.fullName || 'User'}
                </h2>
                <p className="text-slate-500 text-sm mb-4">
                  {userAccount.email || ''}
                </p>
              </div>

              {/* Rank Card */}
              <div
                className={`${getRankCardClass(userAccount.rank || 'BRONZE')} mb-4`}
              >
                <div className={`${getRankInnerClass(userAccount.rank || 'BRONZE')} relative rounded-[calc(0.75rem-3px)] w-full h-full flex items-center gap-3 p-4 z-[1]`}>
                  <span className={`material-symbols-outlined text-2xl fill-current ${getRankTextClass(userAccount.rank || 'BRONZE')}`}>military_tech</span>
                  <div className="flex-1">
                    <p className={`text-xs mb-1 ${getRankTextClass(userAccount.rank || 'BRONZE')}/80`}>Hạng thành viên</p>
                    <p className={`font-bold text-lg ${getRankTextClass(userAccount.rank || 'BRONZE')}`}>
                      {formatRank(userAccount.rank || 'BRONZE')}
                    </p>
                  </div>
                  <p className={`text-sm ${getRankTextClass(userAccount.rank || 'BRONZE')}/80`}>
                    {(userAccount.rewardPoints || 0).toLocaleString('vi-VN')} điểm
                  </p>
                </div>
              </div>

              {/* Wallet Card */}
              <div
                className="flex items-center gap-3 p-4 rounded-xl mb-6 cursor-pointer hover:scale-105 transition-all duration-300 shadow-md hover:shadow-lg"
                style={{ backgroundColor: '#D1FAE5' }}
                onClick={() => navigate('/wallet')}
              >
                <span className="material-symbols-outlined text-2xl text-slate-900">account_balance_wallet</span>
                <div className="flex-1">
                  <p className="text-xs text-slate-600 mb-1">Số dư ví</p>
                  <p className="font-bold text-lg text-slate-900">
                    {(userAccount.walletBalance || 0).toLocaleString('vi-VN')}đ
                  </p>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-200 my-6"></div>

              {/* Quick Stats */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-sm">Tài khoản</span>
                  <span className="text-slate-900 font-semibold text-sm">
                    {userAccount.role || 'CUSTOMER'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 text-sm">Trạng thái</span>
                  <span className="text-green-600 font-semibold text-sm flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Đã xác thực
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Forms */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Information Form */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl hover:shadow-glow-cyan border border-slate-200/50 p-6 md:p-8 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-primary/10 p-2 rounded-xl shadow-sm">
                  <span className="material-symbols-outlined text-primary text-2xl">person</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 font-display">
                  Thông tin cá nhân
                </h2>
              </div>

              <form onSubmit={handleSubmitProfile} className="space-y-6">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                    placeholder="Nhập họ và tên"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                    placeholder="Nhập số điện thoại"
                  />
                </div>

                {/* Address */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Đường/Phố
                    </label>
                    <input
                      type="text"
                      name="street"
                      value={formData.street}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                      placeholder="Đường/Phố"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Quận/Huyện
                    </label>
                    <input
                      type="text"
                      name="district"
                      value={formData.district}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                      placeholder="Quận/Huyện"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Thành phố
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                      placeholder="Thành phố"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => fetchUserData()}
                    className="px-6 py-3 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 hover:shadow-md transition-all duration-300"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-accent-cyan text-white rounded-xl font-semibold shadow-md hover:shadow-glow-cyan hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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

            {/* Change Password Form */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl hover:shadow-glow-cyan border border-slate-200/50 p-6 md:p-8 transition-all duration-300">
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-accent-cyan/10 p-2 rounded-xl shadow-sm">
                  <span className="material-symbols-outlined text-accent-cyan text-2xl">lock</span>
                </div>
                <h2 className="text-2xl font-bold text-slate-900 font-display">
                  Đổi mật khẩu
                </h2>
              </div>

              <form onSubmit={handleSubmitPassword} className="space-y-6">
                {/* Old Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Mật khẩu hiện tại <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-3">
                    <input
                      type="password"
                      name="oldPassword"
                      value={passwordData.oldPassword}
                      onChange={handlePasswordChange}
                      required
                      disabled={otpSent}
                      className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                      placeholder="Nhập mật khẩu hiện tại"
                    />
                    <button
                      type="button"
                      onClick={handleRequestOTP}
                      disabled={sendingOtp || otpSent || !passwordData.oldPassword}
                      className="whitespace-nowrap px-4 py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      {sendingOtp ? (
                        <span className="material-symbols-outlined animate-spin text-sm">sync</span>
                      ) : otpSent ? (
                        <span className="material-symbols-outlined text-sm">check</span>
                      ) : (
                        <span className="material-symbols-outlined text-sm">send</span>
                      )}
                      {otpSent ? 'Đã gửi' : 'Gửi mã OTP'}
                    </button>
                  </div>
                  {otpSent && (
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Mã OTP đã được gửi đến email của bạn. Vui lòng kiểm tra và nhập mã bên dưới.
                    </p>
                  )}
                </div>

                {/* OTP Input */}
                {otpSent && (
                  <div className="animate-fade-in-down">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Mã xác thực OTP <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="otp"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      maxLength={6}
                      className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400 font-mono tracking-widest text-center text-xl"
                      placeholder="• • • • • •"
                    />
                  </div>
                )}

                {/* New Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Mật khẩu mới <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="newPassword"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                    placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  />
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    required
                    minLength={6}
                    className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>

                {/* Submit Button */}
                <div className="flex justify-end gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
                      setOtpSent(false);
                      setOtpCode('');
                      setTempToken('');
                    }}
                    className="px-6 py-3 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 hover:shadow-md transition-all duration-300"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={changingPassword}
                    className="px-6 py-3 bg-gradient-to-r from-primary to-accent-cyan text-white rounded-xl font-semibold shadow-md hover:shadow-glow-cyan hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {changingPassword ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">sync</span>
                        Đang đổi...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">lock_reset</span>
                        Đổi mật khẩu
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
