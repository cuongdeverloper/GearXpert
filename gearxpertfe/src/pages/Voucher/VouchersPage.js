import { useEffect, useState } from "react";
import { getAllVouchers } from "../../service/ApiService/VoucherApi";
import { useSelector } from "react-redux";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import VoucherCard from "../../components/common/VoucherCard";
import CategoryPills from "../../components/common/CategoryPills";
import ScrollAnimation from "../../components/common/ScrollAnimation";
import VoucherDetailModal from "../../components/common/VoucherDetailModal";
import { toast } from "react-toastify";

export default function VouchersPage() {
    const [vouchers, setVouchers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeFilter, setActiveFilter] = useState("ALL"); // ALL, PERSONAL, GLOBAL, SUPPLIER
    
    const userAccount = useSelector((state) => state.user.account);
    const userRank = (userAccount?.rank || "BRONZE").toUpperCase();

    // Modal State
    const [selectedVoucher, setSelectedVoucher] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const voucherCategories = [
        { name: "Tất cả", id: "ALL", icon: "confirmation_number" },
        { name: "Riêng bạn", id: "PERSONAL", icon: "workspace_premium" },
        { name: "Global", id: "GLOBAL", icon: "public" },
        { name: "Supplier", id: "SUPPLIER", icon: "storefront" },
    ];

    const rankDiscounts = {
        SILVER: { discount: 5, color: 'bg-gradient-to-br from-slate-400 via-slate-500 to-gray-400', icon: 'military_tech', glow: 'shadow-slate-400/40' },
        GOLD: { discount: 10, color: 'bg-gradient-to-br from-yellow-500 via-amber-500 to-yellow-600', icon: 'star', glow: 'shadow-yellow-400/50' },
        PLATINUM: { discount: 15, color: 'bg-gradient-to-br from-cyan-600 via-blue-500 to-indigo-500', icon: 'loyalty', glow: 'shadow-blue-500/50' },
        DIAMOND: { discount: 20, color: 'bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500', icon: 'diamond', glow: 'shadow-fuchsia-500/50' }
    };

    const personalVoucher = rankDiscounts[userRank] ? {
        _id: `RANK_${userRank}`,
        code: `RANK_${userRank}`,
        type: "PERSONAL",
        description: `Voucher giảm giá ${rankDiscounts[userRank].discount}% đặc quyền dành cho hạng Khách hàng ${userRank}`,
        discountType: "PERCENT",
        discountValue: rankDiscounts[userRank].discount,
        minOrderValue: 0,
        expiredAt: new Date(2099, 11, 31).toISOString(),
        status: "ACTIVE",
        shopInfo: null,
        rankColor: rankDiscounts[userRank].color,
        rankIcon: rankDiscounts[userRank].icon,
        rankGlow: rankDiscounts[userRank].glow
    } : null;

    useEffect(() => {
        fetchVouchers();
    }, []);

    const fetchVouchers = async () => {
        try {
            setLoading(true);
            const response = await getAllVouchers();
            if (response && response.success) {
                setVouchers(response.vouchers);
            } else {
                toast.error("Không thể tải danh sách voucher");
            }
        } catch (error) {
            console.error("Error fetching vouchers:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleApplyVoucher = (voucher) => {
        toast.info(`Đang áp dụng mã: ${voucher.code}`);
    };

    const handleViewDetails = (voucher) => {
        setSelectedVoucher(voucher);
        setIsModalOpen(true);
    };

    const allVouchersToDisplay = personalVoucher ? [personalVoucher, ...vouchers] : vouchers;

    const filteredVouchers = allVouchersToDisplay.filter(voucher => {
        const matchesType = activeFilter === "ALL" || voucher.type === activeFilter;

        // Normalize search query: trim and lowercase
        const query = searchQuery.trim().toLowerCase();

        // If query is empty, it matches everything
        if (!query) return matchesType;

        // More robust search: checks for presence of query as a substring anywhere in code or description
        const codeMatch = (voucher.code || "").toLowerCase().indexOf(query) !== -1;
        const descMatch = (voucher.description || "").toLowerCase().indexOf(query) !== -1;

        return matchesType && (codeMatch || descMatch);
    });

    return (
        <div className="min-h-screen flex flex-col bg-slate-50" data-theme="light">
            <Header />

            <main className="flex-grow w-full pb-12">
                {/* Premium Header Section */}
                <section className="relative w-full bg-slate-900 overflow-hidden mb-10 pt-48 pb-20 lg:pt-56 lg:pb-24" data-theme="dark">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=2070')] bg-cover bg-center opacity-20"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-slate-900/95 to-cyan-900/90"></div>

                    <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
                        <ScrollAnimation direction="down">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel text-white mb-6 border border-white/10 bg-white/5 backdrop-blur-md">
                                <span className="material-symbols-outlined text-accent-cyan text-[18px] fill-current">loyalty</span>
                                <span className="text-xs font-bold tracking-[0.1em] uppercase text-indigo-100">Exclusive Offers</span>
                            </div>

                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 font-display tracking-tight">
                                Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-indigo-400">Vouchers</span>
                            </h1>

                            <p className="text-lg text-slate-300 max-w-2xl mx-auto font-light">
                                Unlock special discounts and save on your next gear rental.
                            </p>
                        </ScrollAnimation>
                    </div>
                </section>

                <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-16 relative z-20">
                    <ScrollAnimation direction="up" delay={0.2} viewportAmount={0.1}>
                        <div className="bg-white/50 backdrop-blur-3xl rounded-[32px] p-6 lg:p-10 shadow-xl border border-white/60">
                            <div className="mb-10 text-center">
                                <h2 className="text-3xl md:text-4xl font-black text-slate-800 font-display flex flex-wrap items-center justify-center gap-x-3 gap-y-2">
                                    Có {filteredVouchers.length} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500">voucher</span> bạn muốn nè
                                </h2>
                            </div>

                            {/* Filter & Search Bar */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 pb-6 border-b border-slate-200/60">
                                <div className="flex-1 overflow-visible">
                                    <CategoryPills
                                        categories={voucherCategories}
                                        activeCategory={activeFilter}
                                        onSelect={(id) => setActiveFilter(id)}
                                        className="mb-0"
                                    />
                                </div>

                                <div className="relative flex-1 md:max-w-md group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity blur-xl -z-10"></div>
                                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                        <span className="material-symbols-outlined text-[20px]">search</span>
                                    </span>
                                    <input
                                        type="text"
                                        placeholder="Tìm theo mã hoặc mô tả..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="block w-full rounded-2xl border-none bg-white py-3.5 pl-11 pr-4 text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 shadow-sm ring-1 ring-slate-100 outline-none transition-all"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600"
                                        >
                                            <span className="material-symbols-outlined text-[18px]">close</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {loading ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                                    {[1, 2, 3, 4].map((i) => (
                                        <div key={i} className="h-44 bg-white/50 rounded-2xl animate-pulse ring-1 ring-slate-100"></div>
                                    ))}
                                </div>
                            ) : filteredVouchers.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                                    {filteredVouchers.map((voucher, index) => (
                                        <ScrollAnimation key={voucher._id} direction="up" delay={index * 0.05} viewportAmount={0.05}>
                                            <VoucherCard
                                                voucher={voucher}
                                                onApply={handleApplyVoucher}
                                                onViewDetails={handleViewDetails}
                                            />
                                        </ScrollAnimation>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-24 text-center">
                                    <div className="w-24 h-24 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-4 ring-white">
                                        <span className="material-symbols-outlined text-4xl text-indigo-300">search_off</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2 font-display">Không tìm thấy voucher</h3>
                                    <p className="text-slate-500 max-w-md mx-auto mb-8">
                                        Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm của bạn.
                                    </p>
                                    {(searchQuery || activeFilter !== "ALL") && (
                                        <button
                                            onClick={() => {
                                                setSearchQuery("");
                                                setActiveFilter("ALL");
                                            }}
                                            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                                        >
                                            Xóa tất cả bộ lọc
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </ScrollAnimation>
                </div>
            </main>

            <VoucherDetailModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                voucher={selectedVoucher}
                onApply={handleApplyVoucher}
            />

            <Footer />
        </div>
    );
}
