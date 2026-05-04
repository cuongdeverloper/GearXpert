import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getApprovedBanners } from '../../service/ApiService/AdvertisementApi';
import { FiChevronLeft, FiChevronRight, FiExternalLink } from 'react-icons/fi';

export default function TopBannerAds() {
    const [banners, setBanners] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBanners = async () => {
            try {
                const response = await getApprovedBanners();
                if (response.errorCode === 0) {
                    let remainingAds = [...response.data];
                    const shuffledBanners = [];

                    // 1. Định nghĩa bảng điểm trọng số cho các mức chi
                    const getWeight = (budget) => {
                        if (budget >= 500000) return 50; // Kim cương
                        if (budget >= 200000) return 25; // Vàng
                        if (budget >= 100000) return 15; // Bạc
                        return 10; // Đồng
                    };

                    // 2. Thuật toán Weighted Shuffle: Chọn từng vị trí dựa trên trọng số của các quảng cáo còn lại
                    while (remainingAds.length > 0) {
                        const totalWeight = remainingAds.reduce((sum, ad) => sum + getWeight(ad.dailyBudget), 0);
                        let random = Math.random() * totalWeight;

                        for (let i = 0; i < remainingAds.length; i++) {
                            const weight = getWeight(remainingAds[i].dailyBudget);
                            if (random < weight) {
                                shuffledBanners.push(remainingAds[i]);
                                remainingAds.splice(i, 1); // Loại bỏ quảng cáo đã chọn khỏi danh sách chờ
                                break;
                            }
                            random -= weight;
                        }
                    }

                    setBanners(shuffledBanners);
                }
            } catch (error) {
                console.error("Error fetching banners:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBanners();
    }, []);

    useEffect(() => {
        if (banners.length > 1) {
            const timer = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % banners.length);
            }, 6000);
            return () => clearInterval(timer);
        }
    }, [banners.length]);

    const handlePrev = () => {
        setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => (prev + 1) % banners.length);
    };

    if (loading || banners.length === 0) return null;

    const currentBanner = banners[currentIndex];

    return (
        <div className="relative w-full overflow-hidden mb-8 lg:mb-12 group">
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentBanner._id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="relative w-full aspect-[21/7] md:aspect-[4/1] lg:aspect-[4.5/1] rounded-[32px] overflow-hidden shadow-2xl"
                >
                    <a
                        href={currentBanner.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full h-full relative"
                    >
                        {/* Image */}
                        <img
                            src={currentBanner.imageUrl}
                            alt={currentBanner.title}
                            className="w-full h-full object-cover transition-transform duration-[20s] hover:scale-110"
                        />

                        {/* Overlay Gradient */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent flex flex-col justify-center px-8 md:px-14">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3, duration: 0.8 }}
                                className="max-w-2xl"
                            >
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/20 backdrop-blur-md rounded-full border border-primary/30 mb-3">
                                    <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                                    <span className="text-[10px] font-bold text-white uppercase tracking-widest">Sponsored</span>
                                </div>
                                <h2 className="text-2xl md:text-4xl lg:text-4xl font-bold text-white mb-2 drop-shadow-lg leading-tight">
                                    {currentBanner.title}
                                </h2>
                                <p className="text-slate-200 text-sm md:text-lg mb-6 line-clamp-1 md:line-clamp-2 drop-shadow-md max-w-lg">
                                    {currentBanner.description}
                                </p>
                                <div className="flex items-center gap-4">
                                    <span className="inline-flex items-center gap-2 px-6 py-3 bg-white text-slate-900 rounded-xl font-bold text-sm md:text-base hover:bg-primary hover:text-white transition-all shadow-xl shadow-black/20 hover:-translate-y-1">
                                        Khám phá ngay <FiExternalLink />
                                    </span>
                                </div>
                            </motion.div>
                        </div>
                    </a>
                </motion.div>
            </AnimatePresence>

            {/* Navigation Buttons */}
            {banners.length > 1 && (
                <>
                    <button
                        onClick={handlePrev}
                        className="absolute left-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:border-primary shadow-2xl -translate-x-4 group-hover:translate-x-0"
                    >
                        <FiChevronLeft size={24} />
                    </button>
                    <button
                        onClick={handleNext}
                        className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-primary hover:border-primary shadow-2xl translate-x-4 group-hover:translate-x-0"
                    >
                        <FiChevronRight size={24} />
                    </button>

                    {/* Indicators */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 px-4 py-2 bg-black/20 backdrop-blur-md rounded-full border border-white/10">
                        {banners.map((_, index) => (
                            <button
                                key={index}
                                onClick={() => setCurrentIndex(index)}
                                className={`h-1.5 transition-all duration-500 rounded-full ${currentIndex === index ? 'w-8 bg-primary' : 'w-2 bg-white/40 hover:bg-white/60'
                                    }`}
                            />
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
