import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { requestPasswordResetApi } from '../ApiAuth';
import { ImSpinner9 } from "react-icons/im";

const RequestPasswordReset = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await requestPasswordResetApi(email);
            if (response && response.errorCode === 6) {
                toast.warning(response.message)
            }
            if (response.errorCode === 0) {
                toast.success(response.message);
                setEmail(''); // Clear email on success
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error('Failed to send reset link. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full px-2 py-2">
            <div className="text-center mb-8">
                <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-primary/10 to-accent-cyan/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-primary/20 shadow-xl shadow-primary/10 backdrop-blur-sm">
                    <div className="w-14 h-14 bg-gradient-to-tr from-primary to-accent-cyan rounded-full flex items-center justify-center shadow-inner">
                        <span className="material-symbols-outlined text-3xl text-white drop-shadow-md">lock_reset</span>
                    </div>
                </div>
                <h2 className="text-3xl font-bold text-slate-800 font-display mb-3 tracking-tight">Quên mật khẩu?</h2>
                <p className="text-slate-500 text-base leading-relaxed max-w-xs mx-auto">
                    Đừng lo lắng! Nhập email của bạn và chúng tôi sẽ gửi hướng dẫn khôi phục.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                        Email đăng ký
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                            <span className="material-symbols-outlined text-slate-400 text-[22px]">mail</span>
                        </div>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-[3px] focus:ring-primary/20 focus:border-primary transition-all shadow-sm group-hover:bg-white"
                            placeholder="name@example.com"
                            required
                        />
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold py-3.5 rounded-2xl hover:from-indigo-700 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 transform hover:-translate-y-1 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2.5 text-lg cursor-pointer"
                    >
                        {isLoading ? (
                            <>
                                <ImSpinner9 className="animate-spin text-xl" />
                                <span>Đang xử lý...</span>
                            </>
                        ) : (
                            <>
                                <span>Gửi yêu cầu</span>
                                <span className="material-symbols-outlined text-[24px]">send</span>
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RequestPasswordReset;
