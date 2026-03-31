import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getCurrentUser, updateProfile, changePassword, sendOTPForPasswordChange } from '../../service/ApiService/AuthApi';
import { getMyAdvertisements, deleteAdvertisement } from '../../service/ApiService/AdvertisementApi';
import { doLogin, doLogout } from '../../redux/action/userAction';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiLock, FiTrash2, FiExternalLink, FiClock, FiCheck, FiXCircle } from 'react-icons/fi';
import Header from '../../components/navigation/Header';
import Footer from '../../components/homepage/Footer';
import EkycVerification from '../../components/EkycVerification';
import AdvertisementModal from '../../components/common/AdvertisementModal';
import PasswordStrengthMeter from "../../components/Auth/Sign in/PasswordStrengthMeter";


export default function ProfilePage() {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const userAccount = useSelector((state) => state.user.account);
    const isAuthenticated = useSelector((state) => state.user.isAuthenticated);

    const [loading, setLoading] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [changingPassword, setChangingPassword] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [showEkycModal, setShowEkycModal] = useState(false);
    const [showAdsModal, setShowAdsModal] = useState(false);
    const [myAds, setMyAds] = useState([]);
    const [loadingAds, setLoadingAds] = useState(false);
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
        fetchMyAds();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, navigate]);

    const fetchMyAds = async () => {
        setLoadingAds(true);
        try {
            const response = await getMyAdvertisements();
            if (response.errorCode === 0) {
                setMyAds(response.data);
            }
        } catch (error) {
            console.error("Error fetching my ads:", error);
        } finally {
            setLoadingAds(false);
        }
    };

    const handleDeleteAd = async (adId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa quảng cáo này?")) return;

        try {
            const response = await deleteAdvertisement(adId);
            if (response.errorCode === 0) {
                toast.success("Đã xóa quảng cáo thành công");
                fetchMyAds();
                fetchUserData(); // Refresh wallet balance for refund
            } else {
                toast.error(response.message || "Không thể xóa quảng cáo");
            }
        } catch (error) {
            console.error("Error deleting ad:", error);
            toast.error("Có lỗi xảy ra khi xóa quảng cáo");
        }
    };

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
                        type: data.type,
                        role: data.role,
                        address: data.address || {},
                        rank: data.rank,
                        walletBalance: data.walletBalance,
                        rewardPoints: data.rewardPoints,
                        isVerified: data.isVerified,
                        isVerifiedEkyc: data.isVerifiedEkyc,
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
        const cleanValue = name === 'phone' ? value.replace(/\D/g, '') : value;
        setFormData(prev => ({
            ...prev,
            [name]: cleanValue
        }));
    };

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            toast.error('Trình duyệt của bạn không hỗ trợ định vị');
            return;
        }

        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                try {
                    const res = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&accept-language=vi`
                    );
                    const data = await res.json();
                    if (data && data.address) {
                        const addr = data.address;
                        setFormData(prev => ({
                            ...prev,
                            street: addr.road || addr.house_number || prev.street,
                            district: addr.suburb || addr.district || addr.county || addr.quarter || prev.district,
                            city: addr.city || addr.province || addr.state || 'Đà Nẵng'
                        }));
                        toast.success('Đã cập nhật địa chỉ từ vị trí của bạn');
                    }
                } catch (error) {
                    console.error('Error reverse geocoding:', error);
                    toast.error('Không thể lấy địa chỉ từ tọa độ');
                } finally {
                    setIsLocating(false);
                }
            },
            (error) => {
                console.error('Error getting location:', error);
                setIsLocating(false);
                toast.error('Không thể lấy vị trí. Vui lòng kiểm tra quyền truy cập.');
            },
            { enableHighAccuracy: true }
        );
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

        // Validate phone number if provided
        if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
            toast.error('Số điện thoại phải có đúng 10 chữ số');
            return;
        }

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
                        type: data.type,
                        role: data.role,
                        address: data.address || {},
                        rank: data.rank,
                        walletBalance: data.walletBalance,
                        rewardPoints: data.rewardPoints,
                        isVerified: data.isVerified,
                        isVerifiedEkyc: data.isVerifiedEkyc,
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

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
        if (!passwordRegex.test(passwordData.newPassword)) {
            toast.error("Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, số và ký tự đặc biệt");
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
                // toast.success('Đổi mật khẩu thành công'); // Replaced by Modal
                setPasswordData({
                    oldPassword: '',
                    newPassword: '',
                    confirmPassword: '',
                });
                setOtpSent(false);
                setOtpCode('');

                // Show Logout Modal
                setShowLogoutModal(true);
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

    const handleReLogin = () => {
        dispatch(doLogout());
        navigate('/signin');
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
        <div className="min-h-screen flex flex-col bg-slate-50">
            <Header />

            <main className="flex-grow w-full pb-12">
                {/* Premium Hero Section */}
                <section className="relative w-full bg-slate-900 overflow-hidden mb-10 pt-48 pb-32 lg:pt-56 lg:pb-40">
                    {/* Background Image & Gradient */}
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1920')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-slate-900"></div>

                    <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel text-white mb-6 border border-white/10 bg-white/5 backdrop-blur-md animate-fade-in-up">
                            <span className="material-symbols-outlined text-accent-cyan text-[18px] fill-current">assignment_ind</span>
                            <span className="text-xs font-bold tracking-[0.1em] uppercase text-indigo-100">Member Profile</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-6 font-display tracking-tight animate-fade-in-up delay-100">
                            Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-indigo-400">Command Center</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto font-light mb-8 animate-fade-in-up delay-200">
                            Manage your personal information, security settings, and account aesthetics in one place.
                        </p>
                    </div>
                </section>

                <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-24 relative z-20">

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
                                            className="w-32 h-32 rounded-full ring-4 ring-white shadow-[0_8px_30px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.3)] mb-4 cursor-pointer hover:ring-primary transition-all duration-300 relative overflow-hidden block bg-gradient-to-r from-indigo-500 to-cyan-400"
                                        >
                                            {avatarPreview ? (
                                                <img
                                                    src={avatarPreview}
                                                    alt="Avatar Preview"
                                                    className="w-full h-full object-cover"
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
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
                                    onClick={() => navigate('/user/wallet')}
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
                                        <span className={`${userAccount.isVerifiedEkyc ? 'text-green-600' : 'text-amber-600'} font-semibold text-sm flex items-center gap-1`}>
                                            <span className={`w-2 h-2 ${userAccount.isVerifiedEkyc ? 'bg-green-500' : 'bg-amber-500'} rounded-full`}></span>
                                            {userAccount.isVerifiedEkyc ? 'Đã xác thực' : 'Chưa xác thực'}
                                        </span>
                                    </div>

                                    {userAccount?.role === 'CUSTOMER' && (
                                    <div className="mt-6 pt-6 border-t border-slate-200">
                                        <button
                                            onClick={() => {
                                                if (!userAccount.isVerifiedEkyc) {
                                                    toast.warning('Vui lòng xác thực danh tính (eKYC) trước khi đăng ký Nhà cung cấp!');
                                                    setShowEkycModal(true);
                                                } else {
                                                    navigate('/become-supplier');
                                                }
                                            }}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all duration-300"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">storefront</span>
                                            Nâng cấp Nhà cung cấp
                                        </button>
                                        <p className="text-xs text-slate-500 text-center mt-2">
                                            Cho thuê thiết bị nhàn rỗi để tạo thu nhập
                                        </p>
                                    </div>
                                )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Forms */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Profile Information Form */}
                            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl hover:shadow-glow-cyan border border-slate-200/50 p-6 md:p-8 transition-all duration-300">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center shadow-sm">
                                                <span className="material-symbols-outlined text-primary text-xl">person</span>
                                            </div>
                                            <h2 className="text-2xl font-bold text-slate-900 font-display">
                                                Thông tin cá nhân
                                            </h2>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleGetLocation}
                                            disabled={isLocating}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-sm hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm"
                                        >
                                            <span className={`material-symbols-outlined text-[18px] ${isLocating ? 'animate-spin' : ''}`}>my_location</span>
                                            {isLocating ? 'Đang xác định...' : 'Lấy vị trí hiện tại'}
                                        </button>
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
                                            Số điện thoại
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            id="phone-input"
                                            value={formData.phone}
                                            onChange={handleInputChange}
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
                                    <div className="flex justify-end items-center gap-4 pt-4">
                                        {!userAccount.isVerifiedEkyc && (
                                            <button
                                                type="button"
                                                onClick={() => setShowEkycModal(true)}
                                                className="mr-auto px-6 py-4 bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-400 text-white rounded-2xl font-bold shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2 border border-white/20"
                                            >
                                                <span className="material-symbols-outlined text-[20px] animate-pulse">verified_user</span>
                                                Xác thực người dùng
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => fetchUserData()}
                                            className="px-6 py-4 border border-slate-300 rounded-2xl text-slate-700 font-bold hover:bg-slate-50 hover:shadow-md transition-all duration-300"
                                        >
                                            Hủy
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 hover:shadow-primary/20 hover:-translate-y-1 active:translate-y-0 flex items-center gap-3 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="material-symbols-outlined animate-spin text-accent-cyan">sync</span>
                                                    Đang lưu...
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-accent-cyan animate-pulse">save</span>
                                                    Lưu thay đổi
                                                    <span className="material-symbols-outlined group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Change Password Form */}
                            {userAccount?.type !== 'GOOGLE' && (
                                <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl hover:shadow-glow-cyan border border-slate-200/50 p-6 md:p-8 transition-all duration-300">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 flex-shrink-0 bg-accent-cyan/10 rounded-full flex items-center justify-center shadow-sm">
                                            <span className="material-symbols-outlined text-accent-cyan text-xl">lock</span>
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
                                                    className="w-full px-4 py-3 border border-slate-200/60 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400 font-mono tracking-widest text-center text-xl"
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
                                            <PasswordStrengthMeter password={passwordData.newPassword} />
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
                            )}

                            {/* Advertisement Button Panel */}
                            {userAccount?.role === 'SUPPLIER' && (
                                <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl hover:shadow-[0_20px_50px_rgba(79,70,229,0.2)] border border-slate-200/50 p-6 md:p-8 transition-all duration-500 overflow-hidden relative group">
                                    {/* Decorative elements */}
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent-cyan/5 rounded-tr-full -ml-12 -mb-12 transition-transform group-hover:scale-150 duration-700"></div>

                                    <div className="relative z-10">
                                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                            <div className="flex items-center gap-4 text-center md:text-left">
                                                <div className="w-14 h-14 shrink-0 bg-gradient-to-br from-primary to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 rotate-3 group-hover:rotate-0 transition-transform duration-300">
                                                    <span className="material-symbols-outlined text-white text-3xl">campaign</span>
                                                </div>
                                                <div>
                                                    <h2 className="text-2xl font-bold text-slate-900 font-display mb-1">
                                                        Quảng bá tại GearXpert
                                                    </h2>
                                                    <p className="text-slate-500 text-sm max-w-md">
                                                        Đưa sản phẩm của bạn đến gần hơn với khách hàng bằng cách đăng quảng cáo lên Banner hoặc Popup tại trang chủ.
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                onClick={() => setShowAdsModal(true)}
                                                className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 hover:shadow-primary/20 hover:-translate-y-1 active:translate-y-0 flex items-center gap-3 group/btn"
                                            >
                                                <span className="material-symbols-outlined text-accent-cyan animate-pulse">add_circle</span>
                                                Đăng quảng cáo ngay
                                                <span className="material-symbols-outlined group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                                            </button>
                                        </div>

                                        {/* Ads List Section */}
                                        <div className="mt-10 pt-10 border-t border-slate-100">
                                            <div className="flex items-center justify-between mb-6">
                                                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                                    <span className="w-2 h-8 bg-primary rounded-full"></span>
                                                    Quảng cáo của bạn
                                                </h3>
                                                <span className="text-sm text-slate-400 font-medium">
                                                    {myAds.length} chiến dịch
                                                </span>
                                            </div>

                                            {loadingAds ? (
                                                <div className="flex justify-center py-10">
                                                    <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                                </div>
                                            ) : myAds.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                                    {myAds.map((ad) => (
                                                        <motion.div
                                                            layout
                                                            key={ad._id}
                                                            className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:border-primary/30 transition-all group/card"
                                                        >
                                                            <div className="relative aspect-video overflow-hidden">
                                                                <img
                                                                    src={ad.imageUrl}
                                                                    alt={ad.title}
                                                                    className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                                                                />
                                                                <div className="absolute top-2 right-2 flex gap-1">
                                                                    {ad.adsType.map(type => (
                                                                        <span key={type} className="px-2 py-0.5 bg-black/50 backdrop-blur-md text-white text-[9px] font-bold rounded-lg uppercase">
                                                                            {type}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <div className="p-4">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <h4 className="font-bold text-slate-900 line-clamp-1">{ad.title}</h4>
                                                                    <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${ad.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                                                                        ad.status === 'REJECTED' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                                                                        }`}>
                                                                        {ad.status === 'APPROVED' ? <FiCheck size={10} /> :
                                                                            ad.status === 'REJECTED' ? <FiXCircle size={10} /> : <FiClock size={10} />}
                                                                        {ad.status}
                                                                    </div>
                                                                </div>
                                                                <p className="text-xs text-slate-500 line-clamp-2 mb-2 h-8">{ad.description}</p>

                                                                <div className="flex flex-col gap-1 mb-4">
                                                                    <div className="flex justify-between text-[10px] text-slate-400">
                                                                        <span>Ngân sách:</span>
                                                                        <span className="font-bold text-slate-700">{ad.dailyBudget?.toLocaleString('vi-VN')}₫/ngày</span>
                                                                    </div>
                                                                    <div className="flex justify-between text-[10px] text-slate-400">
                                                                        <span>Thời gian:</span>
                                                                        <span className="font-medium text-slate-600">
                                                                            {new Date(ad.startDate).toLocaleDateString('vi-VN')} - {new Date(ad.endDate).toLocaleDateString('vi-VN')}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <a
                                                                        href={ad.link}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-100 transition-all"
                                                                    >
                                                                        <FiExternalLink /> Link
                                                                    </a>
                                                                    <button
                                                                        onClick={() => handleDeleteAd(ad._id)}
                                                                        className="p-2 bg-white border border-rose-200 text-rose-500 rounded-xl hover:bg-rose-50 transition-all shadow-sm"
                                                                        title="Xóa quảng cáo"
                                                                    >
                                                                        <FiTrash2 size={16} />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl p-10 text-center">
                                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300 shadow-sm">
                                                        <span className="material-symbols-outlined text-4xl">campaign</span>
                                                    </div>
                                                    <p className="text-slate-500 text-sm">Bạn chưa có chiến dịch quảng cáo nào.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />

            <AdvertisementModal
                isOpen={showAdsModal}
                onClose={() => setShowAdsModal(false)}
                onSuccess={() => {
                    fetchMyAds();
                    fetchUserData(); // Refresh wallet balance
                }}
            />

            {/* Re-login required Modal */}
            <AnimatePresence>
                {showLogoutModal && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        ></motion.div>

                        {/* Modal Content */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100"
                        >
                            {/* Top Aesthetic Trim */}
                            <div className="h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 w-full"></div>

                            <div className="p-8 text-center">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-50 rounded-3xl mb-6 transform rotate-6 transition-transform hover:rotate-0 duration-500">
                                    <FiCheckCircle className="text-emerald-500" size={40} />
                                </div>

                                <h3 className="text-2xl font-bold text-slate-900 mb-3 font-display">
                                    Cập nhật thành công!
                                </h3>

                                <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-2 px-4 rounded-full w-fit mx-auto mb-6">
                                    <FiLock size={16} />
                                    <span className="text-sm font-bold">Mật khẩu đã được thay đổi</span>
                                </div>

                                <p className="text-slate-600 leading-relaxed mb-8">
                                    Để đảm bảo an toàn tuyệt đối cho tài khoản, vui lòng đăng nhập lại với mật khẩu mới của bạn.
                                </p>

                                <button
                                    onClick={handleReLogin}
                                    className="inline-flex items-center justify-center gap-2 w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 group"
                                >
                                    Đăng nhập lại <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </button>
                            </div>

                            <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    Secure Account Management • GearXpert
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* eKYC Verification Modal */}
            <AnimatePresence>
                {showEkycModal && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowEkycModal(false)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        ></motion.div>

                        {/* Modal Content */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100"
                        >
                            <EkycVerification
                                isModal={true}
                                onClose={() => setShowEkycModal(false)}
                                onSuccess={() => {
                                    fetchUserData(); // Refresh profile data
                                }}
                            />
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}