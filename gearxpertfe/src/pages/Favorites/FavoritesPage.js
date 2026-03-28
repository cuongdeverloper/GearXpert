import { useEffect, useState } from "react";
import { getUserFavorites } from "../../service/ApiService/FavoriteApi";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import ProductCard from "../../components/common/ProductCard";

export default function FavoritesPage() {
    const [favorites, setFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFavorites();
    }, []);

    const fetchFavorites = async () => {
        try {
            setLoading(true);
            const response = await getUserFavorites();
            // Assuming response.data.favorites is the array, or response.favorites
            // Adjust based on actual API response structure shown in prior context (usually response.data or response is interceptor-handled)
            const favs = response?.data?.favorites || response?.favorites || [];

            // If the API returns full device objects inside favorites array:
            // Normalize data if necessary. 
            // Often favorites endpoint might return array of { device: {...}, ... } or just devices.
            // Let's assume it returns list of devices or objects containing device info.
            // Based on typical patterns, it probably returns populated favorites.
            setFavorites(favs);
        } catch (error) {
            console.error("Error fetching favorites:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleUnlike = async (deviceId) => {
        // Optimistically remove from list (assuming deviceId is the ID string)
        const id = deviceId._id || deviceId.id || deviceId;

        // Remove from local state immediately
        setFavorites(prev => prev.filter(item => {
            const currentItemId = item.deviceId._id || item.deviceId.id || item.deviceId;
            return currentItemId !== id;
        }));
    };

    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <Header />

            <main className="flex-grow w-full pb-12">
                {/* Premium Header Section */}
                <section className="relative w-full bg-slate-900 overflow-hidden mb-10 pt-40 pb-20 lg:pt-48 lg:pb-24">
                    {/* Background Image & Gradient */}
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070')] bg-cover bg-center opacity-20"></div>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/90 via-slate-900/95 to-cyan-900/90"></div>

                    <div className="relative z-10 max-w-[1440px] mx-auto px-6 lg:px-10 text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel text-white mb-6 border border-white/10 bg-white/5 backdrop-blur-md">
                            <span className="material-symbols-outlined text-accent-cyan text-[18px] fill-current">favorite</span>
                            <span className="text-xs font-bold tracking-[0.1em] uppercase text-indigo-100">Your Collection</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 font-display tracking-tight">
                            Saved <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-indigo-400">Masterpieces</span>
                        </h1>

                        <p className="text-lg text-slate-300 max-w-2xl mx-auto font-light">
                            Your personally curated selection of top-tier gear. Ready when you are.
                        </p>
                    </div>
                </section>

                <div className="max-w-[1440px] mx-auto px-6 lg:px-10 -mt-16 relative z-20">
                    <div className="bg-white/50 backdrop-blur-3xl rounded-[32px] p-6 lg:p-10 shadow-xl border border-white/60">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200/60">
                            <div className="flex items-center gap-3">
                                <span className="flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-600">
                                    <span className="material-symbols-outlined">grid_view</span>
                                </span>
                                <h2 className="text-xl font-bold text-slate-800">
                                    {favorites.length} {favorites.length === 1 ? 'Item' : 'Items'} Saved
                                </h2>
                            </div>

                            {/* Optional Filter/Sort could go here */}
                            <div className="hidden sm:flex items-center gap-2">
                                <button className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-white hover:shadow-sm transition-all border border-transparent hover:border-slate-100">
                                    Recently Added
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                    <div key={i} className="h-[400px] bg-white rounded-3xl animate-pulse ring-1 ring-slate-100"></div>
                                ))}
                            </div>
                        ) : favorites.length > 0 ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                                {favorites.map((item) => (
                                    <ProductCard
                                        key={item._id || item.id}
                                        device={item.deviceId}
                                        variant="detailed"
                                        onFavoriteChange={(isFav) => {
                                            if (!isFav) {
                                                handleUnlike(item.deviceId);
                                            }
                                        }}
                                        className="hover:-translate-y-2 transition-transform duration-500"
                                    />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-24 text-center">
                                <div className="w-24 h-24 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full flex items-center justify-center mb-6 shadow-inner ring-4 ring-white">
                                    <span className="material-symbols-outlined text-4xl text-indigo-300">favorite_border</span>
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900 mb-2 font-display">Your collection is empty</h3>
                                <p className="text-slate-500 max-w-md mx-auto mb-8">
                                    Start building your dream kit. Explore our catalog and save the gear that inspires your next project.
                                </p>
                                <a href="/" className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-primary transition-all shadow-lg hover:shadow-indigo-200 flex items-center gap-2 group">
                                    Explore Gear
                                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                </a>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}
