import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
    getAiDiscountSuggestions, 
    getActiveDiscounts,
    applyAiDiscount,
    removeDiscount
} from "../../service/ApiService/SmartGearApi";
import { toast } from "react-toastify";
import { 
    FiZap, 
    FiTrendingDown, 
    FiCpu, 
    FiBarChart2, 
    FiShield, 
    FiClock,
    FiRefreshCw,
    FiCalendar,
    FiTrash2,
    FiTag,
    FiArrowRight,
    FiTarget
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

export default function SupplierAiPricingPage() {
    const navigate = useNavigate();
    const [suggestions, setSuggestions] = useState([]);
    const [activeDiscounts, setActiveDiscounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingActive, setLoadingActive] = useState(true);
    const [applyingId, setApplyingId] = useState(null);
    const [removingId, setRemovingId] = useState(null);
    const [selectedDurations, setSelectedDurations] = useState({}); // { deviceId: days }

    const durationOptions = [
        { label: "3 ngày", value: 3 },
        { label: "7 ngày", value: 7 },
        { label: "15 ngày", value: 15 },
        { label: "30 ngày", value: 30 },
        { label: "Vĩnh viễn", value: 0 },
    ];

    useEffect(() => {
        fetchActivePromotions();
    }, []);

    const fetchActivePromotions = async () => {
        setLoadingActive(true);
        try {
            const response = await getActiveDiscounts();
            if (response && response.success) {
                setActiveDiscounts(response.activeDiscounts || []);
            }
        } catch (error) {
            console.error("Error fetching active discounts", error);
        } finally {
            setLoadingActive(false);
        }
    };

    const generateSuggestions = async () => {
        setLoading(true);
        try {
            const response = await getAiDiscountSuggestions();
            if (response && response.success) {
                setSuggestions(response.suggestions || []);
                
                // Initialize durations
                const initialDurations = {};
                response.suggestions.forEach(s => {
                    initialDurations[s.deviceId] = 7; // Default 7 days
                });
                setSelectedDurations(initialDurations);

                if (response.suggestions.length > 0) {
                    toast.success("Đã tạo chiến lược giá mới!");
                } else {
                    toast.info("AI chưa tìm được thêm sản phẩm nào cần điều chỉnh.");
                }
            }
        } catch (error) {
            toast.error("Không thể kết nối AI");
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (suggestion) => {
        setApplyingId(suggestion.deviceId);
        const duration = selectedDurations[suggestion.deviceId] || 7;
        
        try {
            const response = await applyAiDiscount({
                deviceId: suggestion.deviceId,
                discountPrice: suggestion.suggestedPrice,
                reason: suggestion.reason,
                durationInDays: duration
            });
            if (response && response.success) {
                toast.success(`Đã áp dụng giảm giá cho ${suggestion.name}`);
                setSuggestions(prev => prev.filter(s => s.deviceId !== suggestion.deviceId));
                fetchActivePromotions(); // Refresh active list
            }
        } catch (error) {
            toast.error("Lỗi khi áp dụng");
        } finally {
            setApplyingId(null);
        }
    };

    const handleRemoveDiscount = async (deviceId) => {
        setRemovingId(deviceId);
        try {
            const response = await removeDiscount(deviceId);
            if (response && response.success) {
                toast.info("Đã hủy giảm giá và khôi phục giá gốc.");
                setActiveDiscounts(prev => prev.filter(d => d.deviceId !== deviceId));
            }
        } catch (error) {
            toast.error("Lỗi khi hủy giảm giá");
        } finally {
            setRemovingId(null);
        }
    };

    const updateDuration = (deviceId, value) => {
        setSelectedDurations(prev => ({ ...prev, [deviceId]: value }));
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen bg-slate-50/50">
            {/* Header Section */}
            <div className="relative mb-10 overflow-hidden rounded-[2.5rem] bg-slate-900 px-8 py-10 text-white shadow-2xl">
                <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 bg-indigo-500/20 blur-3xl rounded-full" />
                <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-cyan-400/10 blur-3xl rounded-full" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/10 backdrop-blur-sm mb-4">
                            <FiCpu className="text-cyan-400 animate-pulse" size={14} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100">SmartGear Intelligence</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black mb-3 italic">Chiến lược giá AI</h1>
                        <p className="text-slate-400 max-w-xl text-sm md:text-base leading-relaxed">
                            Quản lý các chương trình giảm giá hiện có và sử dụng AI để tìm kiếm các cơ hội tăng trưởng doanh thu mới.
                        </p>
                    </div>
                    
                    <button 
                        onClick={generateSuggestions}
                        disabled={loading}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 transition-all shadow-xl shadow-indigo-500/20 active:scale-95 disabled:opacity-50"
                    >
                        {loading ? <FiRefreshCw className="animate-spin" /> : <FiZap />}
                        Tạo chiến lược gợi ý mới
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                {/* Left Column: ACTIVE & SUGGESTIONS */}
                <div className="lg:col-span-8 space-y-12">
                    
                    {/* 1. ACTIVE DISCOUNTS */}
                    <section>
                        <div className="flex items-center justify-between px-4 mb-6">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                <FiTag className="text-indigo-600" /> Đang áp dụng giảm giá ({activeDiscounts.length})
                            </h3>
                        </div>

                        {loadingActive ? (
                            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 flex justify-center italic text-slate-400 text-sm">
                                Đang tải danh sách khuyến mãi...
                            </div>
                        ) : activeDiscounts.length > 0 ? (
                            <div className="space-y-4">
                                {activeDiscounts.map((d) => (
                                    <div key={d.deviceId} className="bg-white rounded-[2rem] border-2 border-indigo-100 p-6 shadow-md relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 px-6 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-2xl">
                                            Đang chạy
                                        </div>
                                        <div className="flex flex-col md:flex-row gap-6">
                                            <div className="flex-1">
                                                <h4 className="text-xl font-black text-slate-900 mb-2">{d.name}</h4>
                                                <div className="flex items-center gap-3 mb-4">
                                                    <span className="px-2 py-0.5 bg-slate-50 text-slate-400 rounded-md text-[10px] font-bold uppercase border border-slate-100">{d.category}</span>
                                                    {d.expiry && (
                                                        <span className="text-[10px] text-indigo-500 font-bold flex items-center gap-1 uppercase tracking-tighter">
                                                            <FiClock /> Hết hạn: {new Date(d.expiry).toLocaleDateString("vi-VN")}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-slate-500 italic mb-2">"{d.reason}"</p>
                                            </div>
                                            <div className="md:w-48 shrink-0 flex flex-col justify-center border-l border-slate-100 pl-6 border-dashed pt-8">
                                                <div className="mb-4">
                                                     <div className="flex items-center gap-2 mb-1">
                                                         <span className="text-[10px] bg-rose-100 text-rose-600 font-black px-1.5 py-0.5 rounded">-{d.discountPercent}%</span>
                                                         <div className="text-xl font-black text-rose-600">{d.discountPrice.toLocaleString()}đ</div>
                                                     </div>
                                                     <div className="text-xs text-slate-400 line-through">Gốc: {d.originalPrice.toLocaleString()}đ</div>
                                                </div>
                                                <button 
                                                    onClick={() => navigate('/supplier/advertisements', { state: { preselectDeviceSlug: d.slug, preselectDeviceName: d.name } })}
                                                    className="w-full py-2.5 mb-2 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-200"
                                                >
                                                    <FiTarget size={14} className="text-cyan-400" /> Quảng cáo ngay
                                                </button>
                                                <button 
                                                    onClick={() => handleRemoveDiscount(d.deviceId)}
                                                    disabled={removingId === d.deviceId}
                                                    className="w-full py-2.5 rounded-xl border-2 border-rose-100 text-rose-500 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all flex items-center justify-center gap-2"
                                                >
                                                    {removingId === d.deviceId ? <FiRefreshCw className="animate-spin" /> : <FiTrash2 />}
                                                    Hủy giảm giá
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-white/50 p-12 rounded-[2.5rem] border border-dashed border-slate-200 text-center">
                                <p className="text-slate-400 text-sm font-medium italic">Không có sản phẩm nào đang được giảm giá.</p>
                            </div>
                        )}
                    </section>

                    {/* 2. SUGGESTIONS */}
                    <AnimatePresence>
                        {suggestions.length > 0 && (
                            <motion.section
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -30 }}
                            >
                                <div className="flex items-center justify-between px-4 mb-6 pt-6 border-t border-slate-200/60">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                        <FiZap className="text-amber-500" /> Đề xuất mới từ AI
                                    </h3>
                                    <button onClick={() => setSuggestions([])} className="text-xs text-slate-400 font-bold hover:text-slate-600">Bỏ qua tất cả</button>
                                </div>
                                <div className="space-y-4">
                                    {suggestions.map((item, index) => (
                                        <motion.div 
                                            key={item.deviceId}
                                            initial={{ opacity: 0, x: -20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.1 }}
                                            className="bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all group overflow-hidden"
                                        >
                                            <div className="flex flex-col md:flex-row gap-6">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-wider border border-slate-100">
                                                            {item.category}
                                                        </span>
                                                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-600">
                                                            <FiTrendingDown size={12} /> {item.rentalCount} lượt thuê / tháng
                                                        </span>
                                                    </div>
                                                    <h4 className="text-xl font-black text-slate-900 mb-4">{item.name}</h4>
                                                    <div className="bg-amber-50/30 p-4 rounded-2xl border border-amber-100/50 mb-0 border-l-4 border-l-amber-500">
                                                        <p className="text-[10px] text-amber-600 font-bold uppercase tracking-widest mb-1">Cơ sở đề xuất</p>
                                                        <p className="text-sm text-slate-800 font-medium italic leading-relaxed">"{item.reason}"</p>
                                                    </div>
                                                </div>

                                                <div className="md:w-64 shrink-0 flex flex-col justify-between border-l border-slate-100 pl-6 border-dashed">
                                                    <div className="mb-4">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Giá đề xuất</p>
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <span className="text-3xl font-black text-rose-500">{item.suggestedPrice?.toLocaleString()}đ</span>
                                                            <span className="bg-rose-50 text-rose-500 text-[10px] font-black px-2 py-1 rounded-lg border border-rose-100">-{item.discountPercent}%</span>
                                                        </div>
                                                        <p className="text-xs text-slate-400 font-bold mb-6">Gốc: <span className="line-through">{item.originalPrice?.toLocaleString()}đ</span></p>
                                                        
                                                        <div className="space-y-1.5">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-indigo-500 flex items-center gap-1.5"><FiCalendar /> Kỳ hạn</label>
                                                            <div className="grid grid-cols-2 gap-2">
                                                                {durationOptions.map(opt => (
                                                                    <button
                                                                        key={opt.value}
                                                                        onClick={() => updateDuration(item.deviceId, opt.value)}
                                                                        className={`px-2 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${
                                                                            (selectedDurations[item.deviceId] === opt.value)
                                                                            ? "bg-indigo-600 border-indigo-600 text-white"
                                                                            : "bg-white border-slate-100 text-slate-500 hover:border-indigo-200"
                                                                        }`}
                                                                    >
                                                                        {opt.label}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button 
                                                        onClick={() => handleApply(item)}
                                                        disabled={applyingId === item.deviceId}
                                                        className="w-full py-4 mt-2 rounded-2xl bg-slate-900 text-white font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-xl shadow-slate-200 active:scale-95 disabled:opacity-50"
                                                    >
                                                        {applyingId === item.deviceId ? <FiRefreshCw className="animate-spin" /> : <>Chấp nhận <FiArrowRight /></>}
                                                    </button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.section>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right Column: HELP & STATS */}
                <div className="lg:col-span-4 space-y-8">
                     <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm h-fit">
                        <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-base uppercase tracking-wider">
                            <FiBarChart2 className="text-indigo-600" /> Insight của AI
                        </h4>
                        <div className="space-y-6">
                            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                                <div className="flex items-center gap-3 text-emerald-600 mb-2">
                                    <FiShield size={20} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Hiệu quả thực tế</span>
                                </div>
                                <p className="text-xs text-emerald-800 leading-relaxed font-bold">
                                    Các chương trình giảm giá ngắn hạn (3-7 ngày) thường tăng lượt click vào sản phẩm gấp "3" lần.
                                </p>
                            </div>
                            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                                <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-3">Thông tin hệ thống</h5>
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                    "Bạn có thể thay đổi hoặc hủy bỏ bất kỳ chương trình giảm giá nào bất cứ lúc nào bằng nút "Hủy giảm giá" bên cạnh."
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}