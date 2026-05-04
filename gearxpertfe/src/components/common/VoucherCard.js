import React, { useState } from 'react';

const VoucherCard = ({ voucher, onApply, onViewDetails }) => {
    const [copied, setCopied] = useState(false);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    // Mapping styling cho các hạng thành viên
    const rankStyles = {
        SILVER: { color: 'bg-gradient-to-br from-slate-400 via-slate-500 to-gray-400', icon: 'military_tech', glow: 'shadow-slate-400/40' },
        GOLD: { color: 'bg-gradient-to-br from-yellow-500 via-amber-500 to-yellow-600', icon: 'star', glow: 'shadow-yellow-400/50' },
        PLATINUM: { color: 'bg-gradient-to-br from-cyan-600 via-blue-500 to-indigo-500', icon: 'loyalty', glow: 'shadow-blue-500/50' },
        DIAMOND: { color: 'bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500', icon: 'diamond', glow: 'shadow-fuchsia-500/50' }
    };

    const currentRankStyle = voucher.applicableRank ? rankStyles[voucher.applicableRank.toUpperCase()] : null;
    const isRankVoucher = !!currentRankStyle;
    const isGlobal = voucher.type === 'GLOBAL' || voucher.type === 'PERSONAL' || isRankVoucher;

    const isUsed = !!voucher.usedAt;

    return (
        <div
            onClick={() => !isUsed && onViewDetails && onViewDetails(voucher)}
            className={`group relative flex h-48 sm:h-44 overflow-hidden rounded-2xl shadow-sm transition-all duration-500 ${!isUsed ? 'hover:-translate-y-1 hover:scale-[1.01] cursor-pointer' : 'cursor-default'} ${
                isUsed 
                ? 'bg-slate-100 border-slate-200 dark:bg-slate-900/50 dark:border-slate-800 border grayscale-[0.8] opacity-80'
                : (isRankVoucher || voucher.type === 'PERSONAL' 
                    ? `${currentRankStyle?.color || voucher.rankColor} text-white border border-white/20 shadow-lg ${currentRankStyle?.glow || voucher.rankGlow}`
                    : voucher.type === 'GLOBAL'
                        ? 'premium-mesh-bg text-white border border-white/20 card-glow-hover'
                        : 'bg-white border border-slate-100 dark:bg-slate-800 dark:border-slate-700 card-glow-hover')
            }`}
        >
            {/* Left Section - Icon/Type */}
            <div className={`ticket-cutout flex w-24 sm:w-32 flex-col items-center justify-center shrink-0 ${isGlobal && !isUsed ? 'bg-white/10 backdrop-blur-md' : 'bg-slate-50/50 dark:bg-slate-900/50'
                }`}>
                <div className={`flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl shadow-xl transition-transform duration-500 group-hover:rotate-12 ${isGlobal ? 'bg-white/20 ring-1 ring-white/30' : 'bg-indigo-50 dark:bg-indigo-900/30 overflow-hidden'
                    }`}>
                    {!isGlobal && voucher.shopInfo?.avatar ? (
                        <img 
                            src={voucher.shopInfo.avatar} 
                            alt={voucher.shopInfo.name} 
                            className="h-full w-full object-cover rounded-2xl"
                        />
                    ) : (
                        <span className={`material-symbols-outlined text-[32px] sm:text-[40px] ${isUsed ? 'text-slate-400' : (isGlobal ? 'text-white material-symbols-filled' : 'text-indigo-600 dark:text-indigo-400')
                            }`}>
                            {isRankVoucher ? currentRankStyle.icon : (voucher.type === 'PERSONAL' ? voucher.rankIcon : (isGlobal ? 'workspace_premium' : 'storefront'))}
                        </span>
                    )}
                </div>
                <p className={`mt-3 text-[10px] font-black uppercase tracking-[0.2em] text-center px-2 line-clamp-2 ${isUsed ? 'text-slate-400' : (isGlobal ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400')
                    }`}>
                    {isGlobal ? (isRankVoucher ? (voucher.applicableRank + ' Rank') : (voucher.type === 'PERSONAL' ? 'Riêng bạn' : 'Global')) : (voucher.shopInfo?.name || 'Supplier')}
                </p>
            </div>

            {/* Dashed Divider */}
            <div className="dashed-divider h-full"></div>

            {/* Right Section - Content */}
            <div className="flex flex-1 flex-col justify-between p-5 sm:p-6 overflow-hidden">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                            <h3 className={`text-2xl sm:text-2xl lg:text-3xl font-black tracking-tight truncate ${isUsed ? 'text-slate-600' : (isGlobal ? 'text-white' : 'text-slate-900 dark:text-white')
                                }`}>
                                {voucher.discountType === 'PERCENT' ? `${voucher.discountValue}% OFF` : `-${voucher.discountValue.toLocaleString()}đ`}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <p className={`text-sm font-bold truncate ${isGlobal ? 'text-indigo-100' : 'text-indigo-600 dark:text-indigo-400'
                                }`}>
                                <span className="underline underline-offset-4 tracking-wider">{voucher.code}</span>
                            </p>
                        </div>
                        <p className={`text-xs mt-2 line-clamp-1 font-medium ${isGlobal ? 'text-indigo-100/70' : 'text-slate-500'
                            }`}>
                            {voucher.description}
                        </p>
                    </div>

                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(voucher.code);
                            setCopied(true);
                            setTimeout(() => setCopied(false), 2000);
                        }}
                        title="Sao chép mã"
                        className={`hidden sm:flex h-10 w-10 items-center justify-center rounded-xl shrink-0 transition-all duration-300 active:scale-90 hover:shadow-lg ${copied
                            ? 'bg-primary text-white'
                            : isGlobal
                                ? 'bg-white/10 text-white hover:bg-white/20'
                                : 'bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                            }`}>
                        <span className="material-symbols-outlined text-[20px]">
                            {copied ? 'check' : 'content_copy'}
                        </span>
                    </button>
                </div>

                <div className="flex items-end justify-between mt-auto">
                    <div className="text-[10px] sm:text-[11px] space-y-1 font-medium">
                        <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-[16px] ${isGlobal ? 'text-indigo-200' : 'text-indigo-500'}`}>event_available</span>
                            <p className={isGlobal ? 'text-indigo-100/90' : 'text-slate-500 dark:text-slate-400'}>
                                HSD: <span className="font-bold">{formatDate(voucher.expiredAt)}</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className={`material-symbols-outlined text-[16px] ${isGlobal ? 'text-indigo-200' : 'text-indigo-500'}`}>shopping_bag</span>
                            <p className={isGlobal ? 'text-indigo-100/90' : 'text-slate-500 dark:text-slate-400'}>
                                Min: <span className="font-bold">{voucher.minOrderValue.toLocaleString()}đ</span>
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => onViewDetails && onViewDetails(voucher)}
                            className={`hidden xl:block text-[11px] font-bold uppercase tracking-wider underline underline-offset-4 transition-all hover:opacity-80 ${isUsed ? 'text-slate-400' : (isGlobal ? 'text-white' : 'text-indigo-600 dark:text-indigo-400')
                                }`}
                        >
                            Chi tiết
                        </button>
                        {voucher.usedAt ? (
                            <div className="flex flex-col items-end">
                                <span className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${isGlobal ? 'text-indigo-200' : 'text-slate-400'}`}>Ngày dùng</span>
                                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${isGlobal 
                                    ? 'bg-white/10 border-white/20 text-white' 
                                    : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
                                    {formatDate(voucher.usedAt)}
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onApply && onApply(voucher);
                                }}
                                className={`px-5 py-2.5 sm:px-8 sm:py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95 ${isGlobal
                                    ? 'bg-white text-indigo-700 hover:bg-indigo-50 shadow-indigo-900/40'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'
                                    }`}
                            >
                                Sử dụng
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VoucherCard;
