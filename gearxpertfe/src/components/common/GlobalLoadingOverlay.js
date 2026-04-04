import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

const GlobalLoadingOverlay = ({ forceShow = false, text = "Đang tải dữ liệu..." }) => {
    const location = useLocation();
    const [isNavigating, setIsNavigating] = useState(false);
    
    const isLoadingHome = useSelector((state) => state.app?.isLoadingHome);
    const isLoadingAdmin = useSelector((state) => state.app?.isLoadingAdmin);
    
    // Full-screen overlay on route change (skipped for supplier dashboard — feels slow on in-app nav)
    useEffect(() => {
        if (location.pathname.startsWith("/supplier")) {
            setIsNavigating(false);
            return;
        }
        setIsNavigating(true);
        const timer = setTimeout(() => setIsNavigating(false), 700);
        return () => clearTimeout(timer);
    }, [location.pathname]);

    const isLoading = forceShow || isLoadingHome || isLoadingAdmin || isNavigating;

    const currentText = forceShow ? text : (isLoadingAdmin ? "Đang xử lý dữ liệu hệ thống..." : "Đang kết nối GearXpert...");

    return (
        <AnimatePresence>
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl"
                >
                    {/* Decorative Background Elements */}
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 blur-[120px] rounded-full animate-pulse" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-cyan/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }} />

                    <div className="relative flex flex-col items-center">
                        {/* Precision Camera Lens Animation */}
                        <div className="relative w-32 h-32 mb-10 flex items-center justify-center">
                            
                            {/* 1. Aperture Background (The Hole) */}
                            <div className="absolute inset-[12px] rounded-full bg-slate-50 flex items-center justify-center overflow-hidden z-10 shadow-[inner_0_4px_10px_rgba(0,0,0,0.2)]">
                                <svg 
                                    viewBox="0 0 100 100" 
                                    className="w-full h-full"
                                >
                                    {[...Array(6)].map((_, i) => (
                                        <g key={i} transform={`rotate(${i * 60} 50 50)`}>
                                            <motion.path
                                                // Each blade is a rectangle that slides horizontally
                                                // The left edge of the rectangle forms the side of the hexagon
                                                d="M 50,-100 L 200,-100 L 200,200 L 50,200 Z" 
                                                fill="#020617"
                                                stroke="#1e293b"
                                                strokeWidth="0.5"
                                                animate={{ 
                                                    // x=10 means edge is at 60 (Small hole)
                                                    // x=30 means edge is at 80 (Large hole)
                                                    x: [10, 30, 10]
                                                }}
                                                transition={{ 
                                                    repeat: Infinity, 
                                                    duration: 3, 
                                                    ease: "easeInOut"
                                                }}
                                            />
                                        </g>
                                    ))}
                                </svg>
                                
                                {/* Realistic Glass Reflection Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/10 pointer-events-none z-20" />
                            </div>

                            {/* 2. Outer Barrel Housing */}
                            <div className="absolute inset-0 rounded-full border-[14px] border-slate-900 shadow-2xl z-30 pointer-events-none" />
                            
                            {/* 3. Outer Focus Ring (Spinning) */}
                            <motion.div 
                                className="absolute -inset-2 rounded-full border border-white/5 border-dashed z-0"
                                animate={{ rotate: 360 }}
                                transition={{ repeat: Infinity, duration: 40, ease: "linear" }}
                            />
                        </div>

                        {/* Text Content */}
                        <motion.div
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            className="text-center"
                        >
                            <h3 className="text-2xl font-black text-white italic tracking-tighter uppercase mb-2">
                                Gear<span className="text-primary">Xpert</span>
                            </h3>
                            <p className="text-slate-400 text-[10px] font-black tracking-[0.4em] uppercase">
                                {currentText}
                            </p>
                        </motion.div>

                        {/* Progress Line */}
                        <div className="mt-8 w-48 h-[2px] bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                                className="h-full bg-gradient-to-r from-primary to-accent-cyan"
                                animate={{ x: [-200, 200] }}
                                transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GlobalLoadingOverlay;
