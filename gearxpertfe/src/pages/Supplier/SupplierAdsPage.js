import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { FiExternalLink, FiTrash2, FiClock, FiCheck, FiXCircle, FiTrendingUp, FiPlus, FiAlertCircle } from 'react-icons/fi';
import { getMyAdvertisements, deleteAdvertisement } from '../../service/ApiService/AdvertisementApi';
import { getCurrentUser } from '../../service/ApiService/AuthApi';
import { doLogin } from '../../redux/action/userAction';
import AdvertisementModal from '../../components/common/AdvertisementModal';

export default function SupplierAdsPage() {
    const dispatch = useDispatch();
    const userAccount = useSelector((state) => state.user.account);
    const [myAds, setMyAds] = useState([]);
    const [loadingAds, setLoadingAds] = useState(false);
    const location = useLocation();
    const [initialPreselectSlug, setInitialPreselectSlug] = useState(null);
    const [initialPreselectName, setInitialPreselectName] = useState(null);
    const [showAdsModal, setShowAdsModal] = useState(false);

    useEffect(() => {
        if (location.state?.preselectDeviceSlug) {
            setInitialPreselectSlug(location.state.preselectDeviceSlug);
            setInitialPreselectName(location.state.preselectDeviceName || null);
            setShowAdsModal(true);
            
            // Clean up state to prevent re-opening on manual refresh
            window.history.replaceState({}, document.title);
        }
    }, [location.state]);

    useEffect(() => {
        fetchMyAds();
        fetchUserData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchMyAds = async () => {
        setLoadingAds(true);
        try {
            const response = await getMyAdvertisements();
            if (response.errorCode === 0) {
                setMyAds(response.data);
            }
        } catch (error) {
            console.error("Error fetching my ads:", error);
            toast.error("Không thể tải danh sách quảng cáo");
        } finally {
            setLoadingAds(false);
        }
    };

    const fetchUserData = async () => {
        try {
            const response = await getCurrentUser();
            if (response.errorCode === 0 && response.data) {
                const data = response.data;
                // Update Redux store to keep wallet balance in sync
                dispatch(doLogin({
                    data: {
                        ...userAccount,
                        walletBalance: data.walletBalance,
                        rewardPoints: data.rewardPoints,
                    }
                }));
            }
        } catch (error) {
            console.error('Error fetching user data:', error);
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

    const stats = [
        { label: 'Tổng chiến dịch', value: myAds.length, icon: FiTrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Đang hoạt động', value: myAds.filter(ad => ad.status === 'APPROVED').length, icon: FiCheck, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Chờ duyệt', value: myAds.filter(ad => ad.status === 'PENDING').length, icon: FiClock, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Số dư ví', value: `${(userAccount?.walletBalance || 0).toLocaleString('vi-VN')}₫`, icon: FiAlertCircle, color: 'text-rose-600', bg: 'bg-rose-50' },
    ];

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 p-8 rounded-3xl text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="relative z-10">
                    <h1 className="text-3xl font-bold font-display mb-2">Quản lý Quảng cáo</h1>
                    <p className="text-slate-400 max-w-xl">
                        Tăng khả năng hiển thị và doanh thu bằng cách quảng bá sản phẩm của bạn trên các vị trí nổi bật của GearXpert.
                    </p>
                </div>
                <button
                    onClick={() => setShowAdsModal(true)}
                    className="relative z-10 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-primary to-indigo-500 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-primary/30 transition-all hover:-translate-y-1 active:translate-y-0"
                >
                    <FiPlus className="text-xl" />
                    <span>Tạo quảng cáo mới</span>
                </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                            <stat.icon size={24} />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                            <p className="text-xl font-black text-slate-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">Danh sách chiến dịch</h2>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
                        <span className="w-2 h-2 rounded-full bg-primary"></span>
                        {myAds.length} Chiến dịch
                    </div>
                </div>

                <div className="p-6">
                    {loadingAds ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-500 font-medium">Đang tải dữ liệu...</p>
                        </div>
                    ) : myAds.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {myAds.map((ad, index) => (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    key={ad._id}
                                    className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:border-primary/30 transition-all group/card shadow-sm hover:shadow-md"
                                >
                                    <div className="relative aspect-video overflow-hidden">
                                        <img
                                            src={ad.imageUrl}
                                            alt={ad.title}
                                            className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                                        />
                                        <div className="absolute top-3 left-3 flex gap-1.5">
                                            {ad.adsType.map(type => (
                                                <span key={type} className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-black rounded-lg uppercase tracking-wider">
                                                    {type}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-slate-900 line-clamp-1 group-hover/card:text-primary transition-colors">{ad.title}</h4>
                                            <div className={`px-2.5 py-1 rounded-full text-[10px] font-black flex items-center gap-1.5 uppercase tracking-wider ${ad.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600' :
                                                ad.status === 'REJECTED' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
                                                }`}>
                                                {ad.status === 'APPROVED' ? <FiCheck size={12} /> :
                                                    ad.status === 'REJECTED' ? <FiXCircle size={12} /> : <FiClock size={12} />}
                                                {ad.status === 'APPROVED' ? 'Đã duyệt' : ad.status === 'REJECTED' ? 'Từ chối' : 'Chờ duyệt'}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10">{ad.description}</p>

                                        <div className="bg-white p-3 rounded-xl border border-slate-200/50 space-y-2 mb-5">
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400 font-bold uppercase tracking-tighter">Ngân sách</span>
                                                <span className="font-black text-slate-900">{ad.dailyBudget?.toLocaleString('vi-VN')}₫/ngày</span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="text-slate-400 font-bold uppercase tracking-tighter">Thời gian</span>
                                                <span className="font-bold text-slate-600">
                                                    {new Date(ad.startDate).toLocaleDateString('vi-VN')} - {new Date(ad.endDate).toLocaleDateString('vi-VN')}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            <a
                                                href={ad.link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
                                            >
                                                <FiExternalLink /> Xem Link
                                            </a>
                                            <button
                                                onClick={() => handleDeleteAd(ad._id)}
                                                className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all border border-rose-100 shadow-sm"
                                                title="Xóa quảng cáo"
                                            >
                                                <FiTrash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-20 text-center">
                            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300 border border-dashed border-slate-200">
                                <span className="material-symbols-outlined text-5xl">campaign</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Chưa có chiến dịch nào</h3>
                            <p className="text-slate-500 max-w-xs mx-auto mb-8">
                                Hãy bắt đầu quảng bá sản phẩm của bạn để tiếp cận hàng ngàn khách hàng tiềm năng.
                            </p>
                            <button
                                onClick={() => setShowAdsModal(true)}
                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-2xl font-bold hover:bg-primary-dark transition-all shadow-lg shadow-primary/20"
                            >
                                <FiPlus /> Tạo quảng cáo đầu tiên
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <AdvertisementModal
                isOpen={showAdsModal}
                onClose={() => {
                    setShowAdsModal(false);
                    setInitialPreselectSlug(null);
                    setInitialPreselectName(null);
                }}
                preselectSlug={initialPreselectSlug}
                preselectName={initialPreselectName}
                onSuccess={() => {
                    fetchMyAds();
                    fetchUserData();
                }}
            />
        </div>
    );
}