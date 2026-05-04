import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiExternalLink } from 'react-icons/fi';
import { getApprovedPopups } from '../../service/ApiService/AdvertisementApi';

export default function PopupAds() {
    const [isOpen, setIsOpen] = useState(false);
    const [ad, setAd] = useState(null);

    useEffect(() => {
        const checkAndFetchAds = async () => {
            // Check session storage to see if popup has been shown in this session
            const hasSeenPopup = sessionStorage.getItem('hasSeenPopup');

            if (!hasSeenPopup) {
                try {
                    const response = await getApprovedPopups();
                    if (response.errorCode === 0 && response.data && response.data.length > 0) {
                        const ads = response.data;

                        // 1. Định nghĩa bảng điểm trọng số cho các mức chi (Số chẵn)
                        const getWeight = (budget) => {
                            if (budget >= 500000) return 50; // Kim cương
                            if (budget >= 200000) return 25; // Vàng
                            if (budget >= 100000) return 15; // Bạc
                            return 10; // Đồng
                        };

                        // 2. Tính tổng trọng số của tất cả quảng cáo đang chạy
                        const totalWeight = ads.reduce((sum, ad) => sum + getWeight(ad.dailyBudget), 0);

                        // 3. Lấy số ngẫu nhiên từ 0 đến tổng trọng số
                        let random = Math.random() * totalWeight;

                        // 4. Chọn quảng cáo dựa trên số ngẫu nhiên
                        let selectedAd = ads[0];
                        for (const adItem of ads) {
                            const adWeight = getWeight(adItem.dailyBudget);
                            if (random < adWeight) {
                                selectedAd = adItem;
                                break;
                            }
                            random -= adWeight;
                        }

                        setAd(selectedAd);

                        // Delay slightly for better UX
                        setTimeout(() => {
                            setIsOpen(true);
                        }, 1000);
                    }
                } catch (error) {
                    console.error("Error fetching popup ads:", error);
                }
            }
        };

        checkAndFetchAds();
    }, []);

    const handleClose = () => {
        setIsOpen(false);
        // Mark as seen for this session
        sessionStorage.setItem('hasSeenPopup', 'true');
    };

    if (!ad) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    {/* Backdrop with Blur Glass Effect */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                    ></motion.div>

                    {/* Popup Content */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        className="relative w-full max-w-3xl bg-white rounded-[32px] overflow-hidden shadow-2xl shadow-indigo-500/20"
                    >
                        {/* Image Section - Wider aspect ratio */}
                        <div className="relative aspect-video w-full">
                            <img
                                src={ad.imageUrl}
                                alt={ad.title}
                                className="w-full h-full object-cover"
                            />

                            {/* Sophisticated Gradient Overlays */}
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent opacity-90"></div>
                            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent"></div>

                            {/* Content overlay on image (Modern Style) */}
                            <div className="absolute bottom-0 left-0 right-0 p-8 pt-0 z-10 text-center">
                                {/* Ad Tag */}
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full border border-white/10 mb-4 mx-auto">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse"></span>
                                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Sponsored</span>
                                </div>

                                <motion.h3
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="text-2xl font-bold text-white font-display leading-tight mb-3 drop-shadow-sm"
                                >
                                    {ad.title}
                                </motion.h3>

                                <motion.p
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="text-slate-300 text-sm mb-8 line-clamp-2 leading-relaxed font-light"
                                >
                                    {ad.description}
                                </motion.p>

                                <motion.a
                                    href={ad.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={handleClose}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.4 }}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="block w-full py-4 bg-white text-slate-900 rounded-2xl font-bold shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all flex items-center justify-center gap-2 group cursor-pointer"
                                >
                                    <span>Khám phá ngay</span>
                                    <FiExternalLink className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </motion.a>
                            </div>

                            {/* Close Button - Integrated floating style */}
                            <button
                                onClick={handleClose}
                                className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center bg-black/20 hover:bg-black/40 backdrop-blur-md rounded-full text-white border border-white/10 transition-all transform hover:rotate-90 hover:scale-110"
                            >
                                <FiX size={20} />
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
