import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { getAllAdvertisementsForAdmin, updateAdvertisementStatus } from "../../service/ApiService/AdvertisementApi";
import { FiCheck, FiX, FiExternalLink, FiSearch } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminAdsPage() {
    const [ads, setAds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedAd, setSelectedAd] = useState(null);

    useEffect(() => {
        fetchAds();
    }, []);

    const fetchAds = async () => {
        setLoading(true);
        try {
            const response = await getAllAdvertisementsForAdmin();
            if (response.errorCode === 0) {
                setAds(response.data);
            }
        } catch (error) {
            console.error("Error fetching ads:", error);
            toast.error("Không thể tải danh sách quảng cáo");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            const response = await updateAdvertisementStatus(id, status);
            if (response.errorCode === 0) {
                toast.success(response.message);
                fetchAds();
                if (selectedAd && selectedAd._id === id) {
                    setSelectedAd(null);
                }
            } else {
                toast.error(response.message);
            }
        } catch (error) {
            console.error("Error updating ad status:", error);
            toast.error("Có lỗi xảy ra khi cập nhật trạng thái");
        }
    };

    const filteredAds = ads.filter(ad => {
        const matchesStatus = filterStatus === "ALL" || ad.status === filterStatus;
        const matchesSearch = ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            ad.userId?.fullName.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const getStatusBadge = (status) => {
        switch (status) {
            case "PENDING":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Chờ duyệt
                    </span>
                );
            case "APPROVED":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        <FiCheck size={12} />
                        Đã duyệt
                    </span>
                );
            case "REJECTED":
                return (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                        <FiX size={12} />
                        Từ chối
                    </span>
                );
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 lg:p-10 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-indigo-50/50 to-transparent -z-10"></div>
            <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] bg-purple-100/40 rounded-full blur-3xl -z-10"></div>
            <div className="absolute top-[200px] left-[-100px] w-[300px] h-[300px] bg-cyan-100/40 rounded-full blur-3xl -z-10"></div>

            <div className="max-w-[1600px] mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-2 text-primary font-bold tracking-wider text-xs uppercase">
                            <span className="w-8 h-[2px] bg-primary"></span>
                            Admin Portal
                        </div>
                        <h1 className="text-4xl font-bold text-slate-900 font-display">Quản lý quảng cáo</h1>
                        <p className="text-slate-500 mt-2 max-w-xl text-lg font-light">
                            Kiểm duyệt và quản lý các chiến dịch quảng cáo của đối tác và người dùng.
                        </p>
                    </div>
                </div>

                {/* Glass Filter Bar */}
                <div className="sticky top-4 z-40 bg-white/80 backdrop-blur-xl rounded-2xl p-2 shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-white/50 mb-10 flex flex-col md:flex-row gap-3 items-center">
                    <div className="relative flex-1 w-full group">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={20} />
                        <input
                            type="text"
                            placeholder="Tìm kiếm chiến dịch, người đăng..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-transparent hover:bg-white/50 focus:bg-white rounded-xl outline-none transition-all placeholder:text-slate-400 font-medium"
                        />
                    </div>
                    <div className="h-8 w-[1px] bg-slate-200 hidden md:block"></div>
                    <div className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-xl w-full md:w-auto overflow-x-auto">
                        {["ALL", "PENDING", "APPROVED", "REJECTED"].map((status) => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-5 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${filterStatus === status
                                    ? "bg-white text-slate-900 shadow-sm ring-1 ring-black/5"
                                    : "text-slate-500 hover:text-slate-700 hover:bg-slate-200/50"
                                    }`}
                            >
                                {status === "ALL" ? "Tất cả" :
                                    status === "PENDING" ? "Chờ duyệt" :
                                        status === "APPROVED" ? "Đã duyệt" : "Từ chối"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Ads Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8">
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                            <div key={i} className="bg-white rounded-[2rem] h-[420px] animate-pulse border border-slate-100 shadow-sm"></div>
                        ))}
                    </div>
                ) : filteredAds.length > 0 ? (
                    <motion.div
                        layout
                        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8"
                    >
                        <AnimatePresence>
                            {filteredAds.map((ad) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.3 }}
                                    key={ad._id}
                                    onClick={() => setSelectedAd(ad)}
                                    className="group bg-white rounded-[2rem] border border-slate-100 hover:border-primary/20 hover:shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-500 cursor-pointer flex flex-col overflow-hidden relative"
                                >
                                    {/* Image Section */}
                                    <div className="relative h-56 overflow-hidden">
                                        <div className="absolute inset-0 bg-slate-900/10 z-10 group-hover:bg-slate-900/0 transition-colors duration-500"></div>
                                        <img
                                            src={ad.imageUrl}
                                            alt={ad.title}
                                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
                                        />

                                        {/* Overlay Badges */}
                                        <div className="absolute top-4 left-4 z-20 flex gap-2">
                                            {getStatusBadge(ad.status)}
                                        </div>

                                        <div className="absolute bottom-4 left-4 z-20 flex gap-2">
                                            {ad.adsType.map(type => (
                                                <span key={type} className="px-2.5 py-1 bg-white/90 backdrop-blur-md text-slate-900 rounded-lg text-[10px] uppercase font-bold shadow-sm tracking-wider">
                                                    {type}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Content Section */}
                                    <div className="p-6 flex flex-col flex-1">
                                        <div className="mb-4">
                                            <h3 className="font-bold text-slate-900 text-lg mb-2 line-clamp-1 group-hover:text-primary transition-colors font-display">
                                                {ad.title || "Không có tiêu đề"}
                                            </h3>
                                            <p className="text-slate-500 text-sm line-clamp-2 h-10 leading-relaxed">
                                                {ad.description || "Không có mô tả"}
                                            </p>
                                        </div>

                                        <div className="mt-auto pt-4 border-t border-slate-50 grid grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1">Người đăng</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                                                        {ad.userId?.fullName?.charAt(0) || "U"}
                                                    </div>
                                                    <p className="text-xs font-semibold text-slate-700 truncate max-w-[100px]">
                                                        {ad.userId?.fullName || "Ẩn danh"}
                                                    </p>
                                                </div>
                                            </div>
                                            <div>
                                                <p className="text-[10px] uppercase text-slate-400 font-bold tracking-wider mb-1">Thời gian</p>
                                                <p className="text-xs font-semibold text-slate-700">
                                                    {new Date(ad.startDate).toLocaleDateString('vi-VN')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 opacity-50">
                        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                            <FiSearch className="text-4xl text-slate-300" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Không tìm thấy kết quả</h3>
                        <p className="text-slate-500 mt-2">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                    </div>
                )}
            </div>

            {/* Premium Detail Modal */}
            <AnimatePresence>
                {selectedAd && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedAd(null)}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                        ></motion.div>

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 40 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 40 }}
                            transition={{ type: "spring", bounce: 0.3 }}
                            className="relative w-full max-w-5xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]"
                        >
                            {/* Left: Visual Preview */}
                            <div className="md:w-[45%] bg-slate-900 relative flex items-center justify-center p-8 overflow-hidden">
                                <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500/50 via-slate-900 to-slate-900"></div>
                                <img
                                    src={selectedAd.imageUrl}
                                    alt={selectedAd.title}
                                    className="relative z-10 w-full h-auto max-h-[60vh] object-contain rounded-xl shadow-2xl ring-1 ring-white/10"
                                />
                                <div className="absolute top-6 left-6 z-20">
                                    {getStatusBadge(selectedAd.status)}
                                </div>
                            </div>

                            {/* Right: Controller */}
                            <div className="md:w-[55%] flex flex-col max-h-[90vh] overflow-hidden bg-white">
                                <div className="p-8 md:p-10 overflow-y-auto custom-scrollbar flex-1">
                                    <div className="flex justify-between items-start mb-8">
                                        <div>
                                            <div className="flex gap-2 mb-3">
                                                {selectedAd.adsType.map(type => (
                                                    <span key={type} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold uppercase tracking-wider">
                                                        {type}
                                                    </span>
                                                ))}
                                            </div>
                                            <h2 className="text-3xl font-bold text-slate-900 font-display leading-tight">
                                                {selectedAd.title}
                                            </h2>
                                        </div>
                                        <button
                                            onClick={() => setSelectedAd(null)}
                                            className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-900"
                                        >
                                            <FiX size={24} />
                                        </button>
                                    </div>

                                    <div className="space-y-8">
                                        {/* Description */}
                                        <div>
                                            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <span className="w-1 h-4 bg-primary rounded-full"></span>
                                                Nội dung chi tiết
                                            </h4>
                                            <p className="text-slate-600 leading-relaxed text-lg bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                                                {selectedAd.description}
                                            </p>
                                        </div>

                                        {/* Campaign Info Grid */}
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-5 rounded-2xl bg-indigo-50/50 border border-indigo-100/50">
                                                <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">Ngân sách/Ngày</p>
                                                <p className="text-xl font-bold text-indigo-900">
                                                    {selectedAd.dailyBudget?.toLocaleString('vi-VN')}₫
                                                </p>
                                            </div>
                                            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100/50">
                                                <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider mb-1">Tổng chi phí</p>
                                                <p className="text-xl font-bold text-emerald-900">
                                                    {selectedAd.totalCost?.toLocaleString('vi-VN')}₫
                                                </p>
                                            </div>
                                        </div>

                                        {/* User Info */}
                                        <div className="flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                                            <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-lg">
                                                {selectedAd.userId?.fullName?.charAt(0) || "U"}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{selectedAd.userId?.fullName}</p>
                                                <p className="text-xs text-slate-500">{selectedAd.userId?.email}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{selectedAd.userId?.phone}</p>
                                            </div>
                                            <a
                                                href={selectedAd.link}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="ml-auto px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors flex items-center gap-2"
                                            >
                                                <FiExternalLink /> Visit Link
                                            </a>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Footer */}
                                {selectedAd.status === "PENDING" && (
                                    <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                                        <button
                                            onClick={() => handleStatusUpdate(selectedAd._id, "REJECTED")}
                                            className="flex-1 py-4 bg-white border border-rose-200 text-rose-600 rounded-2xl font-bold hover:bg-rose-50 hover:border-rose-300 transition-all shadow-sm"
                                        >
                                            Từ chối yêu cầu
                                        </button>
                                        <button
                                            onClick={() => handleStatusUpdate(selectedAd._id, "APPROVED")}
                                            className="flex-[2] py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-emerald-500/25 hover:-translate-y-0.5 transition-all shadow-md flex items-center justify-center gap-2"
                                        >
                                            <FiCheck size={20} />
                                            Phê duyệt ngay
                                        </button>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
