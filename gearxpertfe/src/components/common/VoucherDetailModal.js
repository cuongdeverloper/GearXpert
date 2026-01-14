import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

const VoucherDetailModal = ({ isOpen, onClose, voucher, onApply }) => {
    if (!voucher) return null;

    const isGlobal = voucher.type === 'GLOBAL';

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(voucher.code);
        toast.success(`Đã sao chép mã: ${voucher.code}`);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-lg overflow-hidden rounded-[32px] bg-white shadow-2xl dark:bg-slate-800"
                    >
                        {/* Hero Section */}
                        <div className={`relative p-8 text-center overflow-hidden ${isGlobal ? 'premium-mesh-bg text-white' : 'bg-slate-50 dark:bg-slate-900/50'}`}>
                            {isGlobal && <div className="absolute inset-0 bg-black/10"></div>}

                            <button
                                onClick={onClose}
                                className="absolute right-4 top-4 h-10 w-10 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 text-white/80 hover:text-white transition-colors z-10"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>

                            <div className="relative z-10 flex flex-col items-center">
                                <div className={`mb-4 flex h-20 w-20 items-center justify-center rounded-3xl shadow-2xl ${isGlobal ? 'bg-white/20 ring-1 ring-white/30' : 'bg-white dark:bg-slate-800'}`}>
                                    <span className={`material-symbols-outlined text-[48px] ${isGlobal ? 'text-white material-symbols-filled' : 'text-primary'}`}>
                                        {isGlobal ? 'workspace_premium' : 'storefront'}
                                    </span>
                                </div>
                                <h2 className={`text-4xl font-black mb-1 ${isGlobal ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                                    {voucher.discountType === 'PERCENT' ? `${voucher.discountValue}% OFF` : `-${voucher.discountValue.toLocaleString()}đ`}
                                </h2>
                                <p className={`text-sm font-bold tracking-widest uppercase opacity-80 ${isGlobal ? 'text-indigo-100' : 'text-slate-500'}`}>
                                    {isGlobal ? 'Global Voucher' : 'Supplier Exclusive'}
                                </p>
                            </div>
                        </div>

                        {/* Details Body */}
                        <div className="p-8 space-y-8">
                            {/* Promo Code Section */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Mã voucher</label>
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700/50 group">
                                    <span className="text-xl font-black text-primary tracking-wider">{voucher.code}</span>
                                    <button
                                        onClick={handleCopy}
                                        className="h-10 px-4 flex items-center gap-2 rounded-xl bg-primary text-white text-xs font-bold shadow-lg shadow-indigo-200 dark:shadow-none hover:bg-primary-dark transition-all active:scale-95"
                                    >
                                        <span className="material-symbols-outlined text-[18px]">content_copy</span>
                                        Sao chép
                                    </button>
                                </div>
                            </div>

                            {/* Description Section */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3">Mô tả và Điều kiện</label>
                                <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                                    {voucher.description}
                                </p>
                            </div>

                            {/* Terms Grid */}
                            <div className="grid grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Đơn hàng tối thiểu</label>
                                    <p className="text-lg font-bold text-slate-800 dark:text-white">{voucher.minOrderValue.toLocaleString()}đ</p>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">Hạn sử dụng đến</label>
                                    <p className="text-lg font-bold text-red-500">{formatDate(voucher.expiredAt)}</p>
                                </div>
                            </div>

                            {/* Interaction Footer */}
                            <div className="pt-4 flex gap-4">
                                <button
                                    onClick={() => {
                                        onApply?.(voucher);
                                        onClose();
                                    }}
                                    className="flex-1 py-4 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest hover:bg-primary transition-all shadow-xl active:scale-[0.98]"
                                >
                                    Sử dụng ngay
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-8 py-4 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all active:scale-[0.98]"
                                >
                                    Đóng
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default VoucherDetailModal;
