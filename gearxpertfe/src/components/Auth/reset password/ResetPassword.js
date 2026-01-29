import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { resetPasswordApi } from '../ApiAuth';
import Header from "../../navigation/Header";
import Footer from "../../homepage/Footer";
import { ImSpinner9 } from "react-icons/im";
import PasswordStrengthMeter from "../Sign in/PasswordStrengthMeter";

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const token = searchParams.get('token');
    const navigate = useNavigate();

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("Mật khẩu không khớp!");
            return;
        }

        const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
        if (!passwordRegex.test(newPassword)) {
            toast.error("Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ hoa, số và ký tự đặc biệt");
            return;
        }

        setIsLoading(true);
        try {
            const response = await resetPasswordApi(token, newPassword);
            if (response.errorCode === 0) {
                toast.success(response.message);
                navigate('/signin');
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra khi đặt lại mật khẩu.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-200 via-slate-50 to-cyan-200 relative">
            <Header />

            <main className="flex-grow flex items-center justify-center p-4 relative z-10 w-full">
                <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-8 md:p-10">
                    <div className="text-center mb-8">
                        <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-primary/10 to-accent-cyan/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-primary/20 shadow-xl shadow-primary/10 backdrop-blur-sm">
                            <div className="w-14 h-14 bg-gradient-to-tr from-primary to-accent-cyan rounded-full flex items-center justify-center shadow-inner">
                                <span className="material-symbols-outlined text-3xl text-white drop-shadow-md">lock_clock</span>
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-slate-800 font-display mb-3 tracking-tight">Đặt lại mật khẩu</h2>
                        <p className="text-slate-500 text-base leading-relaxed">
                            Nhập mật khẩu mới của bạn bên dưới.
                        </p>
                    </div>

                    <form onSubmit={handleResetPassword} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                                Mật khẩu mới
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                                    <span className="material-symbols-outlined text-slate-400 text-[22px]">lock</span>
                                </div>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-[3px] focus:ring-primary/20 focus:border-primary transition-all shadow-sm group-hover:bg-white"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                            <PasswordStrengthMeter password={newPassword} />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-2 ml-1">
                                Xác nhận mật khẩu
                            </label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-primary">
                                    <span className="material-symbols-outlined text-slate-400 text-[22px]">lock_reset</span>
                                </div>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-[3px] focus:ring-primary/20 focus:border-primary transition-all shadow-sm group-hover:bg-white"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-gradient-to-r from-primary to-accent-cyan text-white font-bold py-3.5 rounded-2xl hover:from-primary-dark hover:to-cyan-500 transition-all duration-300 shadow-lg hover:shadow-cyan-500/30 transform hover:-translate-y-1 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2.5 text-lg cursor-pointer"
                            >
                                {isLoading ? (
                                    <>
                                        <ImSpinner9 className="animate-spin text-xl" />
                                        <span>Đang xử lý...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Đổi mật khẩu</span>
                                        <span className="material-symbols-outlined text-[24px]">check_circle</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            <Footer />
        </div>
    );
};

export default ResetPassword;
