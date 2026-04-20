import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { getCurrentUser, updateProfile, changePassword, sendOTPForPasswordChange } from '../../service/ApiService/AuthApi';
import { getMySupplierContract } from '../../service/ApiService/SupplierApi';
import { doLogin, doLogout } from '../../redux/action/userAction';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiLock, FiCamera } from 'react-icons/fi';
import Header from '../../components/navigation/Header';
import Footer from '../../components/homepage/Footer';
import EkycVerification from '../../components/EkycVerification';
import { useTranslation } from 'react-i18next';
import PasswordStrengthMeter from "../../components/Auth/Sign in/PasswordStrengthMeter";


export default function ProfilePage() {
    const { t } = useTranslation();
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
    const [supplierContract, setSupplierContract] = useState(null);
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
        fetchContractData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, navigate]);

    const fetchContractData = async () => {
        try {
            const res = await getMySupplierContract();
            if (res && res.success && res.hasContract) {
                setSupplierContract(res.contract);
            }
        } catch (error) {
            console.error('Error fetching supplier contract:', error);
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
                toast.error(t('profile.error_avatar_size', { defaultValue: 'Kích thước ảnh không được vượt quá 5MB' }));
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
            toast.error(t('profile.error_no_location_support', { defaultValue: 'Trình duyệt của bạn không hỗ trợ định vị' }));
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
                        toast.success(t('profile.success_location_update', { defaultValue: 'Đã cập nhật địa chỉ từ vị trí của bạn' }));
                    }
                } catch (error) {
                    console.error('Error reverse geocoding:', error);
                    toast.error(t('profile.error_reverse_geocoding', { defaultValue: 'Không thể lấy địa chỉ từ tọa độ' }));
                } finally {
                    setIsLocating(false);
                }
            },
            (error) => {
                console.error('Error getting location:', error);
                setIsLocating(false);
                toast.error(t('profile.error_location_permission', { defaultValue: 'Không thể lấy vị trí. Vui lòng kiểm tra quyền truy cập.' }));
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
            toast.error(t('profile.error_phone_format', { defaultValue: 'Số điện thoại phải có đúng 10 chữ số' }));
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
                toast.success(t('profile.success_update'));

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
                toast.error(response.message || t('profile.error_update_failed', { defaultValue: 'Cập nhật thất bại' }));
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error(t('profile.error_update'));
        } finally {
            setLoading(false);
        }
    };

    const handleRequestOTP = async () => {
        if (!passwordData.oldPassword) {
            toast.error(t('profile.error_no_password_otp', { defaultValue: 'Vui lòng nhập mật khẩu hiện tại để nhận OTP' }));
            return;
        }

        setSendingOtp(true);
        try {
            const response = await sendOTPForPasswordChange(passwordData.oldPassword);
            if (response.errorCode === 0) {
                toast.success(t('profile.success_otp'));
                setOtpSent(true);
                if (response.data && response.data.tempToken) {
                    setTempToken(response.data.tempToken);
                }
            } else {
                toast.error(response.message || t('profile.error_send_otp_failed', { defaultValue: 'Gửi OTP thất bại' }));
            }
        } catch (error) {
            console.error('Error sending OTP:', error);
            toast.error(error.response?.data?.message || t('profile.error_otp'));
        } finally {
            setSendingOtp(false);
        }
    };

    const handleSubmitPassword = async (e) => {
        e.preventDefault();

        if (!otpSent) {
            toast.error(t('profile.error_request_otp_first', { defaultValue: 'Vui lòng lấy mã OTP trước khi đổi mật khẩu' }));
            return;
        }

        if (!otpCode || otpCode.length !== 6) {
            toast.error(t('profile.error_invalid_otp', { defaultValue: 'Vui lòng nhập mã OTP 6 chữ số' }));
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error(t('profile.error_password_mismatch', { defaultValue: 'Mật khẩu mới không khớp' }));
            return;
        }

        if (passwordData.newPassword.length < 6) {
            toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
            return;
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
        if (!passwordRegex.test(passwordData.newPassword)) {
            toast.error(t('profile.error_password_strength', { defaultValue: "Mật khẩu phải có nhất 6 ký tự, bao gồm chữ hoa, số và ký tự đặc biệt" }));
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
                toast.error(response.message || t('profile.error_change_password_failed', { defaultValue: 'Đổi mật khẩu thất bại' }));
            }
        } catch (error) {
            console.error('Error changing password:', error);
            toast.error(error.response?.data?.message || t('profile.error_change_password_general', { defaultValue: 'Có lỗi xảy ra khi đổi mật khẩu' }));
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
        if (rankUpper === 'DIAMOND') return 'rank-card-diamond shadow-fuchsia-500/30';
        if (rankUpper === 'PLATINUM') return 'rank-card-platinum shadow-blue-500/30';
        if (rankUpper === 'GOLD') return 'rank-card-gold shadow-yellow-500/30';
        if (rankUpper === 'BRONZE') return 'rank-card-bronze shadow-orange-500/30';
        if (rankUpper === 'SILVER') return 'rank-card-silver shadow-slate-400/30';
        return 'rank-card-bronze shadow-orange-500/30'; // Default to bronze
    };

    // Get rank inner background class based on rank
    const getRankInnerClass = (rank) => {
        if (!rank) return 'bg-gradient-to-br from-amber-800 via-amber-700 to-orange-600';
        const rankUpper = rank.toUpperCase();
        if (rankUpper === 'DIAMOND') return 'bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500';
        if (rankUpper === 'PLATINUM') return 'bg-gradient-to-br from-cyan-600 via-blue-500 to-indigo-400';
        if (rankUpper === 'GOLD') return 'bg-gradient-to-br from-amber-400 via-amber-300 to-yellow-200';
        if (rankUpper === 'BRONZE') return 'bg-gradient-to-br from-amber-800 via-amber-700 to-orange-600';
        if (rankUpper === 'SILVER') return 'bg-gradient-to-br from-slate-300 via-slate-200 to-gray-100';
        return 'bg-gradient-to-br from-amber-800 via-amber-700 to-orange-600'; // Default to bronze
    };

    // Get rank text color class based on rank
    const getRankTextClass = (rank) => {
        if (!rank) return 'text-white';
        const rankUpper = rank.toUpperCase();
        if (rankUpper === 'DIAMOND') return 'text-white';
        if (rankUpper === 'PLATINUM') return 'text-white';
        if (rankUpper === 'GOLD') return 'text-amber-900';
        if (rankUpper === 'BRONZE') return 'text-white';
        if (rankUpper === 'SILVER') return 'text-slate-800';
        return 'text-white'; // Default to bronze
    };

    const getRankIcon = (rank) => {
        const r = (rank || 'BRONZE').toUpperCase();
        if (r === 'DIAMOND') return 'diamond';
        if (r === 'PLATINUM') return 'loyalty';
        if (r === 'GOLD') return 'star';
        if (r === 'SILVER') return 'military_tech';
        return 'workspace_premium';
    };

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen flex flex-col bg-slate-50" data-theme="light">
            <Header />

            <main className="flex-grow w-full pb-12">
                {/* Premium Hero Section */}
                <section className="relative w-full bg-slate-900 overflow-hidden mb-10 pt-48 pb-32 lg:pt-56 lg:pb-40" data-theme="dark">
                    {/* Background Image & Gradient */}
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=1920')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-slate-900"></div>

                    <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel text-white mb-6 border border-white/10 bg-white/5 backdrop-blur-md animate-fade-in-up">
                            <span className="material-symbols-outlined text-accent-cyan text-[18px] fill-current">assignment_ind</span>
                            <span className="text-xs font-bold tracking-[0.1em] uppercase text-indigo-100">{t('profile.member_profile')}</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-6 font-display tracking-tight animate-fade-in-up delay-100">
                            {t('profile.your')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-indigo-400">{t('profile.command_center')}</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto font-light mb-8 animate-fade-in-up delay-200">
                            {t('profile.manage_info')}
                        </p>
                    </div>
                </section>

                <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-24 relative z-20">

                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* Left Column - User Info Card */}
                        <div className="lg:col-span-1">
                            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl hover:shadow-glow-cyan border border-slate-200/50 p-6 sticky top-24 transition-all duration-300">
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
                                                    className="w-full h-full object-cover group-hover:brightness-75 transition-all duration-300"
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                <div className="w-full h-full rounded-full flex items-center justify-center text-white pointer-events-none group-hover:brightness-75 transition-all duration-300">
                                                    <span className="material-symbols-outlined text-5xl">person</span>
                                                </div>
                                            )}
                                            {/* Overlay on hover */}
                                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-full flex items-center justify-center pointer-events-none z-10">
                                                <FiCamera className="text-white text-3xl" />
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
                                        <span className={`material-symbols-outlined text-2xl fill-current ${getRankTextClass(userAccount.rank || 'BRONZE')}`}>{getRankIcon(userAccount.rank || 'BRONZE')}</span>
                                        <div className="flex-1">
                                            <p className={`text-xs mb-1 ${getRankTextClass(userAccount.rank || 'BRONZE')}/80`}>{t('profile.member_rank')}</p>
                                            <p className={`font-bold text-lg ${getRankTextClass(userAccount.rank || 'BRONZE')}`}>
                                                {formatRank(userAccount.rank || 'BRONZE')}
                                            </p>
                                        </div>
                                        <p className={`text-sm ${getRankTextClass(userAccount.rank || 'BRONZE')}/80`}>
                                            {t('profile.points', { count: (userAccount.rewardPoints || 0).toLocaleString('vi-VN') })}
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
                                        <p className="text-xs text-slate-600 mb-1">{t('profile.wallet_balance')}</p>
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
                                        <span className="text-slate-600 text-sm">{t('profile.account_type')}</span>
                                        <span className="text-slate-900 font-semibold text-sm">
                                            {userAccount.role || 'CUSTOMER'}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-600 text-sm">{t('profile.status')}</span>
                                        <span className={`${userAccount.isVerifiedEkyc ? 'text-green-600' : 'text-amber-600'} font-semibold text-sm flex items-center gap-1`}>
                                            <span className={`w-2 h-2 ${userAccount.isVerifiedEkyc ? 'bg-green-500' : 'bg-amber-500'} rounded-full`}></span>
                                            {userAccount.isVerifiedEkyc ? t('profile.verified') : t('profile.not_verified')}
                                        </span>
                                    </div>

                                    {userAccount?.role === 'CUSTOMER' && (!supplierContract || supplierContract.status === 'REJECTED') && (
                                    <div className="mt-6 pt-6 border-t border-slate-200">
                                        <button
                                            onClick={() => {
                                                if (!userAccount.isVerifiedEkyc) {
                                                    toast.warning(t('profile.ekyc_warning_supplier'));
                                                    setShowEkycModal(true);
                                                } else {
                                                    navigate('/become-supplier');
                                                }
                                            }}
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-900 text-white rounded-lg font-bold hover:shadow-lg hover:shadow-indigo-500/30 hover:scale-[1.02] active:scale-95 transition-all duration-300"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">storefront</span>
                                            {t('profile.upgrade_supplier')}
                                        </button>
                                        <p className="text-xs text-slate-500 text-center mt-2">
                                            {t('profile.upgrade_supplier_desc')}
                                        </p>
                                    </div>
                                )}
                                
                                {supplierContract && supplierContract.status === 'PENDING' && (
                                    <div className="mt-6 pt-6 border-t border-slate-200">
                                        <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                                            <span className="material-symbols-outlined">pending_actions</span>
                                            <span className="text-sm font-semibold">Yêu cầu trở thành nhà cung cấp đang chờ phê duyệt</span>
                                        </div>
                                    </div>
                                )}

                                {supplierContract && supplierContract.status === 'APPROVED' && supplierContract.signedPdfUrl && (
                                    <div className="mt-6 pt-6 border-t border-slate-200">
                                        <a
                                            href={supplierContract.signedPdfUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-bold hover:shadow-lg hover:shadow-teal-500/30 hover:scale-[1.02] active:scale-95 transition-all duration-300"
                                        >
                                            <span className="material-symbols-outlined text-[20px]">download</span>
                                            Tải hợp đồng nhà cung cấp
                                        </a>
                                        <p className="text-xs text-slate-500 text-center mt-2">
                                            Hợp đồng đăng ký đã được phê duyệt
                                        </p>
                                    </div>
                                )}
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Forms */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Profile Information Form */}
                            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl hover:shadow-glow-cyan border border-slate-200/50 p-6 md:p-8 transition-all duration-300">
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 flex-shrink-0 bg-primary/10 rounded-full flex items-center justify-center shadow-sm">
                                                <span className="material-symbols-outlined text-primary text-xl">person</span>
                                            </div>
                                            <h2 className="text-2xl font-bold text-slate-900 font-display">
                                                {t('profile.personal_info')}
                                            </h2>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleGetLocation}
                                            disabled={isLocating}
                                            className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-lg font-bold text-sm hover:bg-indigo-100 transition-all border border-indigo-100 shadow-sm"
                                        >
                                            <span className={`material-symbols-outlined text-[18px] ${isLocating ? 'animate-spin' : ''}`}>my_location</span>
                                            {isLocating ? t('profile.locating') : t('profile.get_current_location')}
                                        </button>
                                    </div>

                                <form onSubmit={handleSubmitProfile} className="space-y-6">
                                    {/* Full Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            {t('profile.full_name')} <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleInputChange}
                                            required
                                            className="w-full px-4 py-3 border border-slate-200/60 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                                            placeholder={t('profile.full_name_placeholder', { defaultValue: "Nhập họ và tên" })}
                                        />
                                    </div>

                                    {/* Phone */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">
                                            {t('profile.phone_number')}
                                        </label>
                                        <input
                                            type="tel"
                                            name="phone"
                                            id="phone-input"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            className="w-full px-4 py-3 border border-slate-200/60 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                                            placeholder={t('profile.phone_placeholder', { defaultValue: "Nhập số điện thoại" })}
                                        />
                                    </div>

                                    {/* Address */}
                                    <div className="space-y-4">
                                        <div className="w-full">
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                {t('profile.street')}
                                            </label>
                                            <input
                                                type="text"
                                                name="street"
                                                value={formData.street}
                                                onChange={handleInputChange}    
                                                className="w-full px-4 py-3 border border-slate-200/60 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                                                placeholder={t('profile.street')}     
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                                    {t('profile.district')}
                                                </label>
                                                <input
                                                    type="text"
                                                    name="district"
                                                    value={formData.district}       
                                                    onChange={handleInputChange}    
                                                    className="w-full px-4 py-3 border border-slate-200/60 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                                                    placeholder={t('profile.district')}    
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                                    {t('profile.city')}
                                                </label>
                                                <input
                                                    type="text"
                                                    name="city"
                                                    value={formData.city}
                                                    onChange={handleInputChange}    
                                                    className="w-full px-4 py-3 border border-slate-200/60 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                                                    placeholder={t('profile.city')}      
                                                />
                                            </div>
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
                                                {t('profile.verify_user')}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => fetchUserData()}
                                            className="px-6 py-4 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 hover:shadow-md transition-all duration-300"
                                        >
                                            {t('common.cancel')}
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="px-8 py-4 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 hover:shadow-primary/20 hover:-translate-y-1 active:translate-y-0 flex items-center gap-3 group/btn disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? (
                                                <>
                                                    <span className="material-symbols-outlined animate-spin text-accent-cyan">sync</span>
                                                    {t('common.loading')}
                                                </>
                                            ) : (
                                                <>
                                                    <span className="material-symbols-outlined text-accent-cyan animate-pulse">save</span>
                                                    {t('common.save')}
                                                    <span className="material-symbols-outlined group-hover/btn:translate-x-1 transition-transform">arrow_forward</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>

                            {/* Change Password Form */}
                            {userAccount?.type !== 'GOOGLE' && (
                                <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl hover:shadow-glow-cyan border border-slate-200/50 p-6 md:p-8 transition-all duration-300">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="w-10 h-10 flex-shrink-0 bg-accent-cyan/10 rounded-full flex items-center justify-center shadow-sm">
                                            <span className="material-symbols-outlined text-accent-cyan text-xl">lock</span>
                                        </div>
                                        <h2 className="text-2xl font-bold text-slate-900 font-display">
                                            {t('profile.change_password')}
                                        </h2>
                                    </div>

                                    <form onSubmit={handleSubmitPassword} className="space-y-6">
                                        {/* Old Password */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                {t('profile.current_password')} <span className="text-red-500">*</span>
                                            </label>
                                            <div className="flex gap-3">
                                                <input
                                                    type="password"
                                                    name="oldPassword"
                                                    value={passwordData.oldPassword}
                                                    onChange={handlePasswordChange}
                                                    required
                                                    disabled={otpSent}
                                                    className="w-full px-4 py-3 border border-slate-200/60 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400 disabled:bg-slate-100 disabled:text-slate-500"
                                                    placeholder={t('profile.current_password')}
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
                                                    {otpSent ? t('profile.otp_sent') : t('profile.send_otp')}
                                                </button>
                                            </div>
                                            {otpSent && (
                                                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-sm">check_circle</span>
                                                    {t('profile.otp_sent_hint')}
                                                </p>
                                            )}
                                        </div>

                                        {/* OTP Input */}
                                        {otpSent && (
                                            <div className="animate-fade-in-down">
                                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                                    {t('profile.otp_verification_code')} <span className="text-red-500">*</span>
                                                </label>
                                                <input
                                                    type="text"
                                                    name="otp"
                                                    value={otpCode}
                                                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                    required
                                                    maxLength={6}
                                                    className="w-full px-4 py-3 border border-slate-200/60 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400 font-mono tracking-widest text-center text-xl"
                                                    placeholder="• • • • • •"
                                                />
                                            </div>
                                        )}

                                        {/* New Password */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                {t('profile.new_password')} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                name="newPassword"
                                                value={passwordData.newPassword}
                                                onChange={handlePasswordChange}
                                                required
                                                minLength={6}
                                                className="w-full px-4 py-3 border border-slate-200/60 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                                                placeholder={t('profile.password_min_length')}
                                            />
                                            <PasswordStrengthMeter password={passwordData.newPassword} />
                                        </div>

                                        {/* Confirm Password */}
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                                {t('profile.confirm_password')} <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="password"
                                                name="confirmPassword"
                                                value={passwordData.confirmPassword}
                                                onChange={handlePasswordChange}
                                                required
                                                minLength={6}
                                                className="w-full px-4 py-3 border border-slate-200/60 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent focus:shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 text-slate-900 bg-white/70 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.1)] placeholder:text-slate-400"
                                                placeholder={t('profile.confirm_password_placeholder')}
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
                                                className="px-6 py-3 border border-slate-300 rounded-lg text-slate-700 font-semibold hover:bg-slate-50 hover:shadow-md transition-all duration-300"
                                            >
                                                {t('common.cancel')}
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={changingPassword}
                                                className="px-8 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 hover:shadow-primary/20 hover:-translate-y-1 active:translate-y-0 flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {changingPassword ? (
                                                    <>
                                                        <span className="material-symbols-outlined animate-spin text-accent-cyan">sync</span>
                                                        {t('common.loading')}
                                                    </>
                                                ) : (
                                                    <>
                                                        <span className="material-symbols-outlined text-accent-cyan">save</span>
                                                        {t('profile.change_password')}
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            </main>

            <Footer />


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
                                    {t('profile.logout_modal_title')}
                                </h3>

                                <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 py-2 px-4 rounded-full w-fit mx-auto mb-6">
                                    <FiLock size={16} />
                                    <span className="text-sm font-bold">{t('profile.password_changed')}</span>
                                </div>

                                <p className="text-slate-600 leading-relaxed mb-8">
                                    {t('profile.logout_modal_desc')}
                                </p>

                                <button
                                    onClick={handleReLogin}
                                    className="inline-flex items-center justify-center gap-2 w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200 group"
                                >
                                    {t('profile.login_again')} <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
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





