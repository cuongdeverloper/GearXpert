import React from 'react';
import { FiLogIn, FiUserPlus, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const AuthRequirementModal = ({ isOpen, onClose }) => {
    const navigate = useNavigate();

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
                    className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden border border-slate-100"
                >
                    {/* Top Aesthetic Trim */}
                    <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 w-full"></div>

                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all"
                    >
                        <FiX size={20} />
                    </button>

                    <div className="p-8 text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-50 rounded-3xl mb-6 transform rotate-12 group-hover:rotate-0 transition-transform duration-500">
                            <FiLogIn className="text-indigo-600" size={36} />
                        </div>

                        <h3 className="text-2xl font-bold text-slate-900 mb-3 font-display">
                            Yêu cầu đăng nhập
                        </h3>

                        <p className="text-slate-600 leading-relaxed mb-8">
                            Bạn cần tham gia cộng đồng GearXpert để thực hiện chức năng này. Đăng nhập ngay để tận hưởng dịch vụ thuê thiết bị tốt nhất!
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    onClose();
                                    navigate('/signin');
                                }}
                                className="inline-flex items-center justify-center gap-2 w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                            >
                                <FiLogIn /> Đăng nhập ngay
                            </button>

                            <button
                                onClick={() => {
                                    onClose();
                                    // Navigate to signin with a flag or just signin? Usually SignIn handles both.
                                    navigate('/signin');
                                }}
                                className="inline-flex items-center justify-center gap-2 w-full py-4 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl font-bold hover:border-indigo-100 hover:bg-indigo-50/30 transition-all"
                            >
                                <FiUserPlus /> Tạo tài khoản mới
                            </button>

                            <button
                                onClick={onClose}
                                className="mt-2 text-sm font-bold text-slate-400 hover:text-slate-600 transition-all"
                            >
                                Quay lại xem sản phẩm
                            </button>
                        </div>
                    </div>

                    <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            Join over 5,000+ rental professionals
                        </p>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AuthRequirementModal;
