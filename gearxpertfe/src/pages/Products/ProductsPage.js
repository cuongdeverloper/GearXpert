import { useCallback, useEffect, useState } from "react";
import { getDevices } from "../../service/ApiService/DeviceApi";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import ProductCard from "../../components/common/ProductCard";

export default function ProductsPage() {
    const [devices, setDevices] = useState([]);
    const [filteredDevices, setFilteredDevices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState('featured'); // featured, price_asc, price_desc, newest

    const categories = [
        { name: 'All Gear', id: null, icon: 'grid_view' },
        { name: 'Cinematography', id: 'CAMERA', icon: 'videocam' },
        { name: 'Lighting Kits', id: 'LIGHTING', icon: 'lightbulb' },
        { name: 'Audio Gear', id: 'AUDIO', icon: 'mic' },
        { name: 'Gimbal & Grip', id: 'ACCESSORY', icon: 'handyman' },
        { name: 'Aerial / Drones', id: 'DRONE', icon: 'flight' },
        { name: 'Other', id: 'OTHER', icon: 'category' },
    ];

    const fetchDevices = useCallback(async () => {
        try {
            setLoading(true);
            const params = {
                limit: 100,
                ...(selectedCategory && { category: selectedCategory }),
            };
            const response = await getDevices(params);
            setDevices(response.devices || []);
        } catch (error) {
            console.error("Error fetching devices:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory]);

    const applyFiltersAndSort = useCallback(() => {
        let result = [...devices];

        if (searchQuery) {
            result = result.filter(device =>
                device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                device.description?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        switch (sortBy) {
            case 'price_asc':
                result.sort((a, b) => {
                    const priceA = a.price || a.rentPrice?.perDay || 0;
                    const priceB = b.price || b.rentPrice?.perDay || 0;
                    return priceA - priceB;
                });
                break;
            case 'price_desc':
                result.sort((a, b) => {
                    const priceA = a.price || a.rentPrice?.perDay || 0;
                    const priceB = b.price || b.rentPrice?.perDay || 0;
                    return priceB - priceA;
                });
                break;
            case 'newest':
                result.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                break;
            default:
                break;
        }

        setFilteredDevices(result);
    }, [devices, searchQuery, sortBy]);

    useEffect(() => {
        fetchDevices();
    }, [fetchDevices]);

    useEffect(() => {
        applyFiltersAndSort();
    }, [applyFiltersAndSort]);

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <Header />

            <main className="flex-grow w-full pb-12">
                {/* Premium Hero Section */}
                <section className="relative w-full bg-slate-900 overflow-hidden mb-10 pt-16 pb-24 lg:pt-24 lg:pb-32">
                    {/* Background Image & Gradient */}
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?q=80&w=2070')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-slate-50"></div>

                    <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
                        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 font-display tracking-tight">
                            Professional <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-indigo-400">Gear Catalog</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-300 max-w-3xl mx-auto font-light mb-10">
                            Equip your vision with industry-standard cameras, lenses, and lighting. <br className="hidden md:block" /> Meticulously maintained and ready for your next shoot.
                        </p>

                        {/* Search Bar in Hero */}
                        <div className="max-w-2xl mx-auto relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-accent-cyan to-indigo-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition-opacity"></div>
                            <div className="relative bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2 flex items-center shadow-2xl">
                                <span className="material-symbols-outlined text-white/50 ml-3 mr-2 text-2xl">search</span>
                                <input
                                    type="text"
                                    placeholder="Search for 'Sony FX3', 'Aputure', 'Ronin'..."
                                    className="flex-1 bg-transparent border-none text-white placeholder-white/50 focus:ring-0 text-lg h-12"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <button className="px-6 py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors">
                                    Search
                                </button>
                            </div>
                        </div>
                    </div>
                </section>

                <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-20 relative z-20">
                    <div className="flex flex-col lg:flex-row gap-8">
                        {/* Sidebar Filters - Sticky & Glass */}
                        <aside className="w-full lg:w-72 flex-shrink-0">
                            <div className="bg-white/80 backdrop-blur-xl rounded-[24px] p-6 shadow-xl border border-white/60 sticky top-24">
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Filter By Category</h3>
                                <div className="space-y-2">
                                    {categories.map((cat) => (
                                        <button
                                            key={cat.name}
                                            onClick={() => setSelectedCategory(cat.id)}
                                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all text-left relative overflow-hidden group ${selectedCategory === cat.id
                                                ? 'bg-slate-900 text-white shadow-lg shadow-indigo-200/50'
                                                : 'text-slate-600 hover:bg-white hover:shadow-md hover:text-indigo-600'
                                                }`}
                                        >
                                            <span className={`material-symbols-outlined text-[20px] transition-colors ${selectedCategory === cat.id ? 'text-accent-cyan' : 'text-slate-400 group-hover:text-indigo-500'}`}>
                                                {cat.icon}
                                            </span>
                                            <span className="font-bold text-sm tracking-tight">{cat.name}</span>
                                            {selectedCategory === cat.id && (
                                                <div className="absolute right-4 w-2 h-2 rounded-full bg-accent-cyan shadow-[0_0_10px_rgba(34,211,238,0.8)]"></div>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {/* Promo / Banner in Sidebar */}
                                <div className="mt-8 p-6 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl text-white relative overflow-hidden">
                                    <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                                    <h4 className="font-bold font-display text-lg mb-2 relative z-10">Need a Bundle?</h4>
                                    <p className="text-xs text-indigo-100 mb-4 relative z-10 leading-relaxed">Get 15% off when you rent a complete camera kit.</p>
                                    <button className="px-4 py-2 bg-white text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-50 transition-colors w-full shadow-lg relative z-10">
                                        View Bundles
                                    </button>
                                </div>
                            </div>
                        </aside>

                        {/* Main Content */}
                        <div className="flex-1">
                            {/* Controls Bar */}
                            <div className="bg-white/50 backdrop-blur-md rounded-2xl p-4 mb-8 flex flex-wrap items-center justify-between gap-4 border border-white/60 shadow-sm">
                                <h2 className="text-lg font-bold text-slate-700">
                                    Showing <span className="text-slate-900">{filteredDevices.length}</span> results
                                </h2>

                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-slate-500">Sort by:</span>
                                    <div className="relative">
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="appearance-none bg-white border border-slate-200 text-slate-700 text-sm font-bold py-2.5 pl-4 pr-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer shadow-sm hover:border-indigo-300 transition-colors"
                                        >
                                            <option value="featured">Featured</option>
                                            <option value="newest">Newest Arrivals</option>
                                            <option value="price_asc">Price: Low to High</option>
                                            <option value="price_desc">Price: High to Low</option>
                                        </select>
                                        <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none text-[18px]">expand_more</span>
                                    </div>
                                </div>
                            </div>

                            {loading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                                    {[1, 2, 3, 4, 5, 6].map((i) => (
                                        <div key={i} className="h-[420px] bg-white rounded-3xl animate-pulse ring-1 ring-slate-100 shadow-sm"></div>
                                    ))}
                                </div>
                            ) : filteredDevices.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                                    {filteredDevices.map((device) => (
                                        <ProductCard
                                            key={device._id || device.id}
                                            device={device}
                                            variant="detailed"
                                            className="hover:-translate-y-2 transition-transform duration-500 h-full"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-slate-100 shadow-xl text-center p-8">
                                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                                        <span className="material-symbols-outlined text-5xl text-slate-300">manage_search</span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-2 font-display">No matches found</h3>
                                    <p className="text-slate-500 max-w-md mx-auto mb-8">
                                        We couldn't find any productions matching your search "{searchQuery}". Try adjusting your filters or search terms.
                                    </p>
                                    <button
                                        onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
                                        className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-primary transition-colors cursor-pointer"
                                    >
                                        Clear Filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
