import React from 'react';
import { useSelector } from 'react-redux';
import { ImSpinner9 } from "react-icons/im";

const GlobalLoadingOverlay = () => {
    const isLoadingHome = useSelector((state) => state.app.isLoadingHome);
    const isLoadingAdmin = useSelector((state) => state.app.isLoadingAdmin);
    const isLoading = isLoadingHome || isLoadingAdmin;

    if (!isLoading) return null;

    const loadingText = isLoadingAdmin ? "Đang tải dữ liệu..." : "Đang tải trang chủ...";

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="text-center p-8 rounded-3xl bg-white/10 border border-white/20 shadow-2xl backdrop-blur-lg transform animate-pulse-slow">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-tr from-primary to-accent-cyan rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                    <ImSpinner9 className="text-3xl text-white animate-spin" />
                </div>
                <h3 className="text-xl font-bold text-white font-display tracking-wide drop-shadow-md">
                    {loadingText}
                </h3>
            </div>
        </div>
    );
};

export default GlobalLoadingOverlay;
