import { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Header from '../../components/navigation/Header';
import Footer from '../../components/homepage/Footer';
import { getCurrentUser } from '../../service/ApiService/AuthApi';
import { doLogin } from '../../redux/action/userAction';

export default function RankPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const userAccount = useSelector((state) => state.user.account);
    const isAuthenticated = useSelector((state) => state.user.isAuthenticated);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/signin');
        } else {
            const fetchUserData = async () => {
                try {
                    const response = await getCurrentUser();
                    if (response.errorCode === 0 && response.data) {
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
                    }
                } catch (error) {
                    console.error('Error fetching user data in RankPage:', error);
                }
            };
            fetchUserData();
        }
    }, [isAuthenticated, navigate, dispatch]);

    if (!isAuthenticated) return null;

    const currentRank = (userAccount?.rank || 'BRONZE').toUpperCase();
    const currentPoints = userAccount?.rewardPoints || 0;

    // Define Ranks details
    const RANKS = [
        {
            id: 'BRONZE',
            name: 'Bronze',
            minPoints: 0,
            icon: 'workspace_premium',
            color: 'from-amber-800 via-amber-700 to-orange-600',
            textColor: 'text-amber-800',
            glow: 'shadow-orange-500/40',
            benefits: [
                'Truy cập đầy đủ tính năng nền tảng',
                'Hỗ trợ khách hàng tiêu chuẩn',
                'Tích lũy điểm thưởng qua mỗi đơn hàng'
            ]
        },
        {
            id: 'SILVER',
            name: 'Silver',
            minPoints: 1000,
            icon: 'military_tech',
            color: 'from-slate-400 via-slate-300 to-gray-200',
            textColor: 'text-slate-500',
            glow: 'shadow-slate-400/40',
            benefits: [
                'Tất cả quyền lợi hạng Bronze',
                'Voucher giảm giá 5% mỗi tháng',
                'Hỗ trợ khách hàng ưu tiên 24/7'
            ]
        },
        {
            id: 'GOLD',
            name: 'Gold',
            minPoints: 5000,
            icon: 'star',
            color: 'from-yellow-500 via-amber-400 to-yellow-300',
            textColor: 'text-amber-500',
            glow: 'shadow-yellow-400/50',
            benefits: [
                'Tất cả quyền lợi hạng Silver',
                'Voucher giảm giá 10% mỗi tháng',
                'Quà tặng voucher sinh nhật',
                'Ưu tiên xử lý sự cố thuê thiết bị'
            ]
        },
        {
            id: 'PLATINUM',
            name: 'Platinum',
            minPoints: 10000,
            icon: 'loyalty',
            color: 'from-cyan-600 via-blue-500 to-indigo-400',
            textColor: 'text-blue-500',
            glow: 'shadow-blue-500/50',
            benefits: [
                'Tất cả quyền lợi hạng Gold',
                'Voucher giảm giá 15% mỗi tháng',
                'Miễn phí vận chuyển (Tối đa 50k)',
                'Ưu đãi độc quyền từ đối tác'
            ]
        },
        {
            id: 'DIAMOND',
            name: 'Diamond',
            minPoints: 20000,
            icon: 'diamond',
            color: 'from-purple-600 via-fuchsia-500 to-pink-500',
            textColor: 'text-fuchsia-500',
            glow: 'shadow-fuchsia-500/50',
            benefits: [
                'Tất cả quyền lợi hạng Platinum',
                'Voucher giảm giá 20% mỗi sáng',
                'Trợ lý cá nhân hỗ trợ dịch vụ',
                'Tham gia sự kiện độc quyền của GearXpert'
            ]
        }
    ];

    const currentRankIndex = RANKS.findIndex(r => r.id === currentRank);
    const isMaxRank = currentRankIndex === RANKS.length - 1;
    const nextRank = isMaxRank ? null : RANKS[currentRankIndex + 1];
    
    // Calculate Progress
    const basePoints = RANKS[currentRankIndex].minPoints;
    const targetPoints = nextRank ? nextRank.minPoints : basePoints;
    const pointsNeeded = nextRank ? targetPoints - currentPoints : 0;
    
    let progressPercent = 100;
    if (!isMaxRank) {
        progressPercent = Math.min(100, Math.max(0, ((currentPoints - basePoints) / (targetPoints - basePoints)) * 100));
    }

    const activeRankDetails = RANKS[currentRankIndex] || RANKS[0];

    return (
        <div className="min-h-screen flex flex-col bg-slate-50" data-theme="light">
            <Header />

            <main className="flex-grow w-full pb-12">
                {/* Premium Hero Section */}
                <section className="relative w-full bg-slate-900 overflow-hidden pt-36 pb-24 lg:pt-48 lg:pb-32" data-theme="dark">
                    {/* Background effects */}
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=1920')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
                    <div className={'absolute inset-0 bg-gradient-to-br opacity-40 mix-blend-multiply ' + activeRankDetails.color}></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-slate-900"></div>

                    <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10 text-center animate-fade-in-up">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel text-white mb-6 border border-white/10 bg-white/5 backdrop-blur-md">
                            <span className="material-symbols-outlined text-accent-cyan text-[18px]">workspace_premium</span>
                            <span className="text-xs font-bold tracking-[0.1em] uppercase text-indigo-100">GearXpert Rewards</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 font-display tracking-tight">
                            Hệ Thống <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-indigo-400">Thành Viên</span>
                        </h1>
                        <p className="text-lg text-slate-300 max-w-2xl mx-auto font-light">
                            Tích lũy thẻ thành viên, nâng cao trải nghiệm mua sắm và nhận vô vàn ưu đãi hấp dẫn.
                        </p>
                    </div>
                </section>

                <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-16 relative z-20">
                    <div className="grid lg:grid-cols-12 gap-8">
                        {/* Left Side: Current Status */}
                        <div className="lg:col-span-5 relative">
                            <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/50 p-8 sticky top-24 overflow-hidden">
                                {/* Decorative blob */}
                                <div className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-br ${activeRankDetails.color} rounded-full mix-blend-multiply filter blur-3xl opacity-20 transform translate-x-1/2 -translate-y-1/2`}></div>
                                
                                <h2 className="text-xl font-bold text-slate-800 mb-8 flex items-center justify-between">
                                    Thứ hạng của bạn
                                    <span className={`px-4 py-1.5 rounded-full text-xs font-bold bg-gradient-to-r ${activeRankDetails.color} text-white shadow-lg`}>
                                        {activeRankDetails.name}
                                    </span>
                                </h2>

                                {/* Rank Icon Display */}
                                <div className="flex flex-col items-center justify-center mb-10">
                                    <div className={`w-32 h-32 rounded-full flex items-center justify-center bg-gradient-to-br ${activeRankDetails.color} shadow-xl ${activeRankDetails.glow} mb-6 relative hover:scale-105 transition-transform duration-500`}>
                                        <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
                                            <span className={`material-symbols-outlined text-6xl ${activeRankDetails.textColor}`}>
                                                {activeRankDetails.icon}
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-4xl font-black text-slate-900 mb-2 font-display">
                                        {currentPoints.toLocaleString('vi-VN')} <span className="text-lg text-slate-500 font-normal">điểm</span>
                                    </p>
                                </div>

                                {/* Progress Bar */}
                                <div className="mb-8">
                                    <div className="flex justify-between text-sm mb-3">
                                        <span className="font-bold text-slate-700">{activeRankDetails.name}</span>
                                        {nextRank ? (
                                            <span className="font-bold text-slate-400">{nextRank.name}</span>
                                        ) : (
                                            <span className="font-bold text-yellow-500">MAX RANK</span>
                                        )}
                                    </div>
                                    <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner relative">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progressPercent}%` }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            className={`h-full bg-gradient-to-r ${activeRankDetails.color} rounded-full`}
                                        />
                                    </div>
                                    {!isMaxRank && (
                                        <p className="text-center text-sm text-slate-500 mt-4">
                                            Cần thêm <span className={`font-bold ${activeRankDetails.textColor}`}>{pointsNeeded.toLocaleString('vi-VN')} điểm</span> để thăng hạng <span className="font-bold text-slate-800">{nextRank.name}</span>
                                        </p>
                                    )}
                                    {isMaxRank && (
                                        <p className="text-center text-sm text-yellow-600 font-bold mt-4">
                                            Chúc mừng bạn đã đạt thứ hạng cao nhất!
                                        </p>
                                    )}
                                </div>
                                
                                <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 text-sm text-indigo-800 leading-relaxed shadow-sm">
                                    <p className="font-semibold mb-1 flex items-center gap-2">
                                        <span className="material-symbols-outlined text-indigo-500 text-[18px]">info</span>
                                        Cách tích điểm
                                    </p>
                                    <p className="text-indigo-600/80">
                                        Điểm được tính ngay khi bạn hoàn thành một đơn hàng thuê hoặc thông qua các hoạt động đóng góp cho cộng đồng. 10.000đ = 100 điểm.
                                    </p>
                                </div>

                                {/* Monthly Reward Voucher Section */}
                                {activeRankDetails.id !== 'BRONZE' && (
                                    <div className="mt-6 p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-indigo-950 text-white relative overflow-hidden group border border-indigo-500/30">
                                        {/* Animation effect */}
                                        <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-500/20 rounded-full blur-2xl group-hover:bg-indigo-500/40 transition-all duration-700"></div>
                                        
                                        <div className="relative z-10">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="font-bold text-indigo-200 uppercase tracking-tighter text-xs">Ưu đãi của tháng {new Date().getMonth() + 1}</h3>
                                                <span className="px-2 py-0.5 rounded-md bg-white/10 text-[10px] font-medium backdrop-blur-sm border border-white/10">Sử dụng 1 lần</span>
                                            </div>
                                            
                                            <div className="flex items-end justify-between gap-4">
                                                <div>
                                                    <p className="text-2xl font-black mb-1">Giảm {RANKS.find(r => r.id === currentRank)?.benefits[1]?.match(/\d+/)?.[0] || '—'}%</p>
                                                    <p className="text-[11px] text-indigo-300 font-medium">Reset sau {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()} ngày nữa</p>
                                                </div>
                                                <div className="flex flex-col items-end gap-2">
                                                    <div 
                                                        className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-sm font-bold cursor-pointer transition-all active:scale-95 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(`RANK_${currentRank}`);
                                                            alert('Đã sao chép mã ưu đãi!');
                                                        }}
                                                    >
                                                        RANK_{currentRank}
                                                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Side: Benefits Hierarchy */}
                        <div className="lg:col-span-7 space-y-6">
                            <h2 className="text-2xl font-bold text-slate-900 font-display mb-6 px-2">
                                Quyền lợi các hạng thành viên
                            </h2>

                            {RANKS.map((rank, idx) => {
                                const isUnlocked = currentPoints >= rank.minPoints;
                                const isCurrent = rank.id === currentRank;

                                return (
                                    <motion.div 
                                        key={rank.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: idx * 0.1 }}
                                        className={`relative overflow-hidden bg-white rounded-3xl p-6 sm:p-8 border shadow-lg transition-all duration-300 hover:shadow-xl ${isCurrent ? 'ring-2 ring-indigo-500 border-transparent shadow-indigo-500/10' : 'border-slate-100'} ${isUnlocked ? '' : 'grayscale-[50%] opacity-80'}`}
                                    >
                                        {/* Status Badge */}
                                        <div className="absolute top-6 right-6">
                                            {isCurrent ? (
                                                <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-full flex items-center gap-1 shadow-sm">
                                                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                                                    Hiện tại
                                                </span>
                                            ) : isUnlocked ? (
                                                <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">lock_open</span>
                                                    Đã mở khóa
                                                </span>
                                            ) : (
                                                <span className="px-3 py-1 bg-slate-100 text-slate-500 text-xs font-bold rounded-full flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">lock</span>
                                                    Chưa mở khóa
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-6 sm:items-center">
                                            {/* Rank Icon */}
                                            <div className="flex-shrink-0">
                                                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br ${rank.color} shadow-lg ${isCurrent ? rank.glow : ''}`}>
                                                    <span className="material-symbols-outlined text-4xl text-white">
                                                        {rank.icon}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Rank Details */}
                                            <div className="flex-grow">
                                                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-4">
                                                    <h3 className={`text-2xl font-black font-display uppercase tracking-wider ${rank.textColor}`}>
                                                        {rank.name}
                                                    </h3>
                                                    <span className="text-sm font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                                        {rank.minPoints.toLocaleString('vi-VN')} điểm
                                                    </span>
                                                </div>

                                                <ul className="space-y-3">
                                                    {rank.benefits.map((benefit, i) => (
                                                        <li key={i} className="flex items-start gap-3">
                                                            <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${isUnlocked ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                                                                <span className="material-symbols-outlined text-[12px] font-bold">done</span>
                                                            </div>
                                                            <span className={`text-sm ${isUnlocked ? 'text-slate-700' : 'text-slate-500'}`}>
                                                                {benefit}
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </main>
            
            <Footer />
        </div>
    );
}
