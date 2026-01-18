import React from 'react';
import { FiLock, FiX, FiPhoneCall } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

const BlockedAccountModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                ></motion.div>

                {/* Modal Content */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
                >
                    {/* Top Accent Bar */}
                    <div className="h-2 bg-red-500 w-full"></div>

                    <div className="p-8 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-red-50 rounded-full mb-6">
                            <FiLock className="text-red-500" size={40} />
                        </div>

                        <h3 className="text-2xl font-bold text-slate-900 mb-3 font-display">
                            Tài khoản đã bị khóa
                        </h3>

                        <p className="text-slate-600 leading-relaxed mb-8">
                            Rất tiếc, tài khoản của bạn đã bị tạm khóa do vi phạm chính sách hoặc các vấn đề bảo mật. Vui lòng liên hệ với quản trị viên để được hỗ trợ mở khóa.
                        </p>

                        <div className="flex flex-col gap-3">
                            <a
                                href="tel:0123456789"
                                className="inline-flex items-center justify-center gap-2 w-full py-3.5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                            >
                                <FiPhoneCall /> Liên hệ hỗ trợ
                            </a>

                            <button
                                onClick={onClose}
                                className="w-full py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                            >
                                Đóng
                            </button>
                        </div>
                    </div>

                    <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                            GearXpert Safety & Policy Management
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default BlockedAccountModal;
