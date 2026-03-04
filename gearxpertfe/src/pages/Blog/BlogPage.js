import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import { getBlogs, getFeaturedBlog } from "../../service/ApiService/BlogApi";
import { CATEGORY_MAP, formatDate } from "./BlogConstants";
import SubmitBlogModal from "./SubmitBlogModal";



export default function BlogPage() {
    const navigate = useNavigate();
    const [blogs, setBlogs] = useState([]);
    const [featuredBlog, setFeaturedBlog] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [searchInput, setSearchInput] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearchExpanded, setIsSearchExpanded] = useState(false);
    const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
    const blogsLengthRef = useRef(0);

    // Submission Form State
    const isAuthenticated = useSelector((state) => state.user.isAuthenticated);
    const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

    useEffect(() => {
        blogsLengthRef.current = blogs.length;
    }, [blogs]);

    const fetchFeatured = useCallback(async () => {
        try {
            const res = await getFeaturedBlog();
            setFeaturedBlog(res);
        } catch {
            setFeaturedBlog(null);
        }
    }, []);

    const fetchBlogs = useCallback(async () => {
        try {
            // Only show big loader if we have NO blogs or it's a reset (page 1 with no slice)
            // If we are just refreshing/collapsing, keep the current blogs visible
            if (page === 1 && blogsLengthRef.current === 0) setLoading(true);
            else if (page > 1) setLoadingMore(true);

            const limit = page === 1 ? 4 : 2;
            const backendPage = page === 1 ? 1 : (page + 1); // For page 2, uses backend page 3 to skip first 4

            const params = { page: backendPage, limit };
            if (selectedCategory) params.category = selectedCategory;
            if (searchTerm) params.search = searchTerm;

            const res = await getBlogs(params);

            if (page === 1) {
                setBlogs(res.blogs || []);
            } else {
                setBlogs(prev => [...prev, ...(res.blogs || [])]);
            }

            setTotalCount(res.total || 0);
        } catch (err) {
            console.error("Error fetching blogs:", err);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [page, selectedCategory, searchTerm]);

    useEffect(() => {
        fetchFeatured();
    }, [fetchFeatured]);

    useEffect(() => {
        fetchBlogs();
    }, [fetchBlogs]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearchTerm(searchInput);
        setPage(1);
    };

    const handleClearSearch = () => {
        setSearchInput("");
        setSearchTerm("");
        setIsSearchExpanded(false);
        setPage(1);
    };

    const handleCategoryFilter = (cat) => {
        setSelectedCategory(cat === selectedCategory ? null : cat);
        setPage(1);
    };

    const handleCollapse = () => {
        // Slice locally first to avoid flicker
        setBlogs(prev => prev.slice(0, 4));
        setPage(1);
        // Scroll smoothly to start of insights
        const headerOffset = 100;
        const element = document.getElementById('insights-start');
        const elementPosition = element?.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
            top: offsetPosition || 0,
            behavior: "smooth"
        });
    };

    // Use all blogs for the grid
    const gridBlogs = blogs;
    // Trending = first 3 for sidebar
    const trendingBlogs = gridBlogs.slice(0, 3);

    const handleOpenSubmitModal = () => {
        if (!isAuthenticated) {
            toast.error("Vui lòng đăng nhập để đóng góp bài viết!");
            navigate("/signin");
            return;
        }
        setIsSubmitModalOpen(true);
    };

    // Category hover class (AI_TECH uses accent-cyan hover)
    const getCardHoverClass = (category) => {
        return category === "AI_TECH"
            ? "group-hover:text-accent-cyan"
            : "group-hover:text-primary";
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f6f6f8", fontFamily: "'Inter', sans-serif" }}>
            <Header />

            {/* ============ PREMIUM HERO BANNER ============ */}
            <section className="relative w-full overflow-hidden bg-slate-900 py-20 lg:py-32">
                {/* Background Image with Overlay */}
                <div className="absolute inset-0 z-0">
                    <img
                        src="/C:/Users/LENOVO/.gemini/antigravity/brain/02465285-41b5-4567-a127-34f04a430823/blog_hero_banner_background_1772367323158.png"
                        alt="Hero Decor"
                        className="h-full w-full object-cover opacity-40"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent" />
                </div>

                <div className="relative z-10 mx-auto max-w-[1440px] px-6 md:px-10">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-16">
                        {/* Hero Text Content */}
                        <div className="max-w-3xl">
                            <nav className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-400">
                                <span className="hover:text-primary cursor-pointer transition-colors" onClick={() => navigate("/")}>Home</span>
                                <span className="material-symbols-outlined text-xs">chevron_right</span>
                                <span className="text-white">Blog</span>
                            </nav>

                            <h1 className="font-display text-5xl md:text-7xl font-black text-white leading-[1.1] mb-6">
                                Gear <span className="text-primary italic">Editorial</span> <br />
                                & Market Insights
                            </h1>

                            <p className="text-lg md:text-xl text-slate-300 leading-relaxed mb-10 max-w-2xl">
                                Explore deep-dives into the latest high-tech equipment, industry-shifting news, and professional masterclasses designed for modern creators.
                            </p>

                        </div>

                        {/* Featured Quick Card - Made wider as requested */}
                        {featuredBlog && (
                            <div
                                onClick={() => navigate(`/blog/${featuredBlog._id}`)}
                                className="hidden lg:flex flex-col w-[550px] shrink-0 rounded-3xl overflow-hidden glass-panel border-white/10 shadow-2xl cursor-pointer group hover:scale-[1.02] transition-all duration-500"
                            >
                                <div className="aspect-[21/9] overflow-hidden">
                                    <img src={featuredBlog.coverImage} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="Featured" />
                                </div>
                                <div className="p-8">
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                                            Featured Insight
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            {featuredBlog.readTime} MIN READ
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-bold text-white mb-3 line-clamp-2 group-hover:text-primary transition-colors leading-snug">
                                        {featuredBlog.title}
                                    </h3>
                                    <p className="text-sm text-slate-400 line-clamp-2 mb-6 leading-relaxed">
                                        {featuredBlog.description}
                                    </p>
                                    <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                        <div className="flex items-center gap-3">
                                            {featuredBlog.author?.avatar ? (
                                                <div className="h-10 w-10 rounded-full border border-white/10 p-0.5">
                                                    <img src={featuredBlog.author.avatar} alt={featuredBlog.author.name} className="h-full w-full rounded-full object-cover" />
                                                </div>
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-bold">
                                                    {featuredBlog.author?.name?.charAt(0)}
                                                </div>
                                            )}
                                            <div>
                                                <span className="block text-sm text-white font-bold">{featuredBlog.author?.name}</span>
                                                <span className="block text-[10px] text-slate-500 uppercase font-medium">{formatDate(featuredBlog.createdAt)}</span>
                                            </div>
                                        </div>
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5 text-white group-hover:bg-primary group-hover:text-white transition-all">
                                            <span className="material-symbols-outlined text-sm">arrow_outward</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Decorative Elements */}
                <div className="absolute right-0 bottom-0 h-64 w-64 bg-primary/20 blur-[120px] rounded-full translate-x-1/2 translate-y-1/2" />
                <div className="absolute left-1/4 top-0 h-40 w-40 bg-accent-cyan/10 blur-[100px] rounded-full -translate-y-1/2" />
            </section>

            <main className="mx-auto w-full max-w-[1440px] px-6 py-10 md:px-10">
                {/* Standalone featured section removed for cleaner hero integration */}


                <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
                    {/* ============ MAIN CONTENT FEED ============ */}
                    <div className="lg:col-span-8">
                        {/* ---- Toolbar: Title + Search + View Toggles ---- */}
                        <div id="insights-start" className="flex items-center justify-between mb-8 gap-4">
                            <h2 className="font-display text-3xl font-bold tracking-tight shrink-0" style={{ color: "#0d0e1b" }}>
                                Latest Insights
                            </h2>

                            <div className="flex items-center gap-2">
                                {/* Search */}
                                <form
                                    onSubmit={handleSearch}
                                    className="relative flex items-center"
                                >
                                    <div
                                        className="flex items-center rounded-xl bg-white overflow-hidden transition-all duration-300 ease-in-out"
                                        style={{
                                            border: "1px solid rgba(99,102,241,0.12)",
                                            width: isSearchExpanded ? "280px" : "42px",
                                            height: "42px",
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (isSearchExpanded && searchInput) {
                                                    handleSearch({ preventDefault: () => { } });
                                                } else {
                                                    setIsSearchExpanded(!isSearchExpanded);
                                                }
                                            }}
                                            className="flex h-[42px] w-[42px] shrink-0 items-center justify-center text-primary hover:text-primary/80 transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-xl">search</span>
                                        </button>

                                        <input
                                            value={searchInput}
                                            onChange={(e) => setSearchInput(e.target.value)}
                                            onBlur={() => {
                                                if (!searchInput) setIsSearchExpanded(false);
                                            }}
                                            className="h-full w-full border-none bg-transparent pr-3 text-sm outline-none placeholder:text-slate-400"
                                            style={{
                                                color: "#0d0e1b",
                                                opacity: isSearchExpanded ? 1 : 0,
                                                pointerEvents: isSearchExpanded ? "auto" : "none",
                                                transition: "opacity 0.2s ease",
                                            }}
                                            placeholder="Search articles..."
                                            type="text"
                                            autoFocus={isSearchExpanded}
                                        />

                                        {isSearchExpanded && searchInput && (
                                            <button
                                                type="button"
                                                onClick={handleClearSearch}
                                                className="flex h-6 w-6 shrink-0 items-center justify-center mr-2 rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-sm">close</span>
                                            </button>
                                        )}
                                    </div>
                                </form>

                                {/* Active search indicator */}
                                {searchTerm && (
                                    <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5">
                                        <span className="text-xs font-semibold text-primary truncate max-w-[100px]">
                                            "{searchTerm}"
                                        </span>
                                        <button
                                            onClick={handleClearSearch}
                                            className=" text-primary/60 hover:text-primary transition-colors"
                                        >
                                            <span className="material-symbols-outlined text-sm">close</span>
                                        </button>
                                    </div>
                                )}

                                {/* View toggles */}
                                <button
                                    onClick={() => setViewMode("grid")}
                                    className={`h-[42px] w-[42px] flex items-center justify-center rounded-lg border transition-all ${viewMode === "grid"
                                        ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                                        : "bg-white text-slate-400 hover:text-primary border-transparent"
                                        }`}
                                    style={viewMode !== "grid" ? { borderColor: "rgba(99,102,241,0.1)" } : {}}
                                >
                                    <span className="material-symbols-outlined text-xl">grid_view</span>
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`h-[42px] w-[42px] flex items-center justify-center rounded-lg border transition-all ${viewMode === "list"
                                        ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                                        : "bg-white text-slate-400 hover:text-primary border-transparent"
                                        }`}
                                    style={viewMode !== "list" ? { borderColor: "rgba(99,102,241,0.1)" } : {}}
                                >
                                    <span className="material-symbols-outlined text-xl">view_list</span>
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                    <span className="text-sm font-medium" style={{ color: "#4c4d9a" }}>Loading articles...</span>
                                </div>
                            </div>
                        ) : gridBlogs.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center">
                                <span className="material-symbols-outlined text-6xl text-slate-300 mb-4">article</span>
                                <h3 className="text-xl font-bold text-slate-400 mb-2">No articles found</h3>
                                <p className="text-sm text-slate-400">Try adjusting your search or filter criteria.</p>
                            </div>
                        ) : (
                            <>
                                {/* ===== GRID VIEW ===== */}
                                {viewMode === "grid" && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        {gridBlogs.map((blog) => {
                                            const catInfo = CATEGORY_MAP[blog.category] || { label: blog.category, color: "bg-primary" };
                                            return (
                                                <article
                                                    key={blog._id}
                                                    onClick={() => navigate(`/blog/${blog._id}`)}
                                                    className="group flex flex-col rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
                                                    style={{ border: "1px solid rgba(99,102,241,0.05)" }}
                                                >
                                                    <div className="aspect-[16/10] overflow-hidden relative">
                                                        <div
                                                            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                                            style={{ backgroundImage: `url('${blog.coverImage}')` }}
                                                        />
                                                        <div className="absolute top-4 left-4">
                                                            <span className={`rounded-lg ${catInfo.color} px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white`}>
                                                                {catInfo.label}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-1 flex-col p-6">
                                                        <h3
                                                            className={`font-display text-xl font-bold leading-snug ${getCardHoverClass(blog.category)} transition-colors mb-3`}
                                                            style={{ color: "#0d0e1b" }}
                                                        >
                                                            {blog.title}
                                                        </h3>
                                                        <p className="text-sm line-clamp-3 mb-6 flex-1 leading-relaxed" style={{ color: "#4c4d9a" }}>
                                                            {blog.description}
                                                        </p>
                                                        <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid rgba(99,102,241,0.05)" }}>
                                                            <div className="flex items-center gap-3">
                                                                {blog.author?.avatar ? (
                                                                    <div
                                                                        className="h-8 w-8 rounded-full bg-primary/10 bg-cover bg-center"
                                                                        style={{ backgroundImage: `url('${blog.author.avatar}')` }}
                                                                    />
                                                                ) : (
                                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                                                        <span className="material-symbols-outlined text-primary text-sm">person</span>
                                                                    </div>
                                                                )}
                                                                <span className="text-xs font-semibold" style={{ color: "#0d0e1b" }}>
                                                                    {blog.author?.name}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(76,77,154,0.6)" }}>
                                                                {blog.readTime} min read
                                                            </span>
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* ===== LIST VIEW ===== */}
                                {viewMode === "list" && (
                                    <div className="flex flex-col gap-5">
                                        {gridBlogs.map((blog, index) => {
                                            const catInfo = CATEGORY_MAP[blog.category] || { label: blog.category, color: "bg-primary" };
                                            return (
                                                <article
                                                    key={blog._id}
                                                    onClick={() => navigate(`/blog/${blog._id}`)}
                                                    className="group flex flex-row rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
                                                    style={{ border: "1px solid rgba(99,102,241,0.05)" }}
                                                >
                                                    {/* Thumbnail */}
                                                    <div className="relative w-[200px] md:w-[260px] shrink-0 overflow-hidden">
                                                        <div
                                                            className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                                            style={{ backgroundImage: `url('${blog.coverImage}')` }}
                                                        />
                                                        <div className="absolute top-3 left-3">
                                                            <span className={`rounded-lg ${catInfo.color} px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white`}>
                                                                {catInfo.label}
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex flex-1 flex-col justify-center p-5 md:p-6 min-w-0">
                                                        <div className="flex items-center gap-3 mb-2">
                                                            <span className="text-xs font-semibold text-primary">
                                                                #{index + 1 + (page - 1) * 8}
                                                            </span>
                                                            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(76,77,154,0.6)" }}>
                                                                {formatDate(blog.createdAt)}
                                                            </span>
                                                        </div>
                                                        <h3
                                                            className={`font-display text-lg font-bold leading-snug ${getCardHoverClass(blog.category)} transition-colors mb-2 line-clamp-2`}
                                                            style={{ color: "#0d0e1b" }}
                                                        >
                                                            {blog.title}
                                                        </h3>
                                                        <p className="text-sm line-clamp-2 mb-4 leading-relaxed hidden md:block" style={{ color: "#4c4d9a" }}>
                                                            {blog.description}
                                                        </p>
                                                        <div className="flex items-center justify-between mt-auto">
                                                            <div className="flex items-center gap-2.5">
                                                                {blog.author?.avatar ? (
                                                                    <div
                                                                        className="h-7 w-7 rounded-full bg-primary/10 bg-cover bg-center"
                                                                        style={{ backgroundImage: `url('${blog.author.avatar}')` }}
                                                                    />
                                                                ) : (
                                                                    <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center">
                                                                        <span className="material-symbols-outlined text-primary text-xs">person</span>
                                                                    </div>
                                                                )}
                                                                <span className="text-xs font-semibold" style={{ color: "#0d0e1b" }}>
                                                                    {blog.author?.name}
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(76,77,154,0.6)" }}>
                                                                {blog.readTime} min read
                                                            </span>
                                                        </div>
                                                    </div>
                                                </article>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Load More / Show Less Button */}
                                {gridBlogs.length > 0 && totalCount > 4 && (
                                    <div className="mt-12 flex justify-center">
                                        {gridBlogs.length < totalCount ? (
                                            <button
                                                onClick={() => setPage(prev => prev + 1)}
                                                disabled={loadingMore}
                                                className="flex items-center gap-2 rounded-xl border-2 px-8 py-3 font-bold text-primary hover:bg-primary hover:text-white transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                                                style={{ borderColor: "rgba(99,102,241,0.1)" }}
                                            >
                                                {loadingMore ? (
                                                    <>
                                                        <div className="h-4 w-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                                                        <span>Fetching...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <span>Load More Insights</span>
                                                        <span className="material-symbols-outlined group-hover:translate-y-1 transition-transform">expand_more</span>
                                                    </>
                                                )}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={handleCollapse}
                                                className="flex items-center gap-2 rounded-xl border-2 px-8 py-3 font-bold text-primary hover:bg-white hover:text-primary transition-all border-primary shadow-lg shadow-primary/10"
                                            >
                                                <span>Show Less</span>
                                                <span className="material-symbols-outlined">expand_less</span>
                                            </button>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* ============ SIDEBAR ============ */}
                    <aside className="lg:col-span-4 space-y-12">
                        {/* Popular Categories */}
                        <div className="rounded-xl bg-white p-8 shadow-sm" style={{ border: "1px solid rgba(99,102,241,0.05)" }}>
                            <h3 className="font-display text-xl font-bold mb-6 flex items-center gap-2" style={{ color: "#0d0e1b" }}>
                                <span className="material-symbols-outlined text-primary">category</span>
                                Popular Categories
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {Object.entries(CATEGORY_MAP).map(([key, { label }]) => {
                                    const isAiTech = key === "AI_TECH";
                                    return (
                                        <button
                                            key={key}
                                            onClick={() => handleCategoryFilter(key)}
                                            className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${selectedCategory === key
                                                ? "bg-primary text-white"
                                                : isAiTech
                                                    ? "bg-accent-cyan/10 text-accent-cyan font-bold hover:bg-accent-cyan hover:text-white"
                                                    : "bg-primary/5 hover:bg-primary hover:text-white"
                                                }`}
                                            style={
                                                selectedCategory !== key && !isAiTech
                                                    ? { color: "#0d0e1b" }
                                                    : {}
                                            }
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Trending Now */}
                        {trendingBlogs.length > 0 && (
                            <div className="rounded-xl bg-white p-8 shadow-sm" style={{ border: "1px solid rgba(99,102,241,0.05)" }}>
                                <h3 className="font-display text-xl font-bold mb-6 flex items-center gap-2" style={{ color: "#0d0e1b" }}>
                                    <span className="material-symbols-outlined text-primary">trending_up</span>
                                    Trending Now
                                </h3>
                                <div className="space-y-6">
                                    {trendingBlogs.map((blog) => {
                                        const catInfo = CATEGORY_MAP[blog.category] || { label: blog.category };
                                        const isTech = blog.category === "AI_TECH";
                                        return (
                                            <div
                                                key={blog._id}
                                                onClick={() => navigate(`/blog/${blog._id}`)}
                                                className="group flex gap-4 cursor-pointer"
                                            >
                                                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg">
                                                    <div
                                                        className="h-full w-full bg-cover bg-center group-hover:scale-110 transition-transform duration-300"
                                                        style={{ backgroundImage: `url('${blog.coverImage}')` }}
                                                    />
                                                </div>
                                                <div className="flex flex-col">
                                                    <h4 className="text-sm font-bold group-hover:text-primary transition-colors line-clamp-2 leading-snug" style={{ color: "#0d0e1b" }}>
                                                        {blog.title}
                                                    </h4>
                                                    <span
                                                        className="text-[10px] mt-1 uppercase font-bold tracking-tighter"
                                                        style={{ color: isTech ? "#22D3EE" : "#4c4d9a" }}
                                                    >
                                                        {catInfo.label}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Contribute */}
                        <div className="rounded-xl bg-white p-8 shadow-sm" style={{ border: "1px solid rgba(99,102,241,0.05)" }}>
                            <h3 className="font-display text-xl font-bold mb-4 flex items-center gap-2" style={{ color: "#0d0e1b" }}>
                                <span className="material-symbols-outlined text-primary">groups</span>
                                Contribute
                            </h3>
                            <p className="text-sm mb-6 leading-relaxed" style={{ color: "#4c4d9a" }}>
                                Got gear insights or a tech tutorial? Share your expertise with our global community of 50k+ professionals.
                            </p>
                            <button
                                onClick={handleOpenSubmitModal}
                                className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-primary text-primary py-3 text-sm font-bold transition-all hover:bg-primary hover:text-white"
                            >
                                <span className="material-symbols-outlined text-lg">upload_file</span>
                                Submit Your Article
                            </button>
                        </div>

                        {/* Pro Community – dark promo */}
                        <div className="relative overflow-hidden rounded-xl bg-slate-900 p-8 text-white">
                            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
                            <div className="relative z-10">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Pro Community</span>
                                <h3 className="mt-2 text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                                    Join the Inner Circle
                                </h3>
                                <p className="mt-4 text-sm text-slate-400 leading-relaxed">
                                    Exclusive deep-dives, equipment rentals, and industry networking.
                                </p>
                                <button className="mt-8 w-full rounded-lg bg-primary py-3 text-sm font-bold transition-all hover:bg-primary/80">
                                    Get Early Access
                                </button>
                            </div>
                        </div>
                    </aside>
                </div>
            </main>

            {/* ============ NEWSLETTER SECTION ============ */}
            <section className="bg-slate-950 text-white py-20">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <span className="inline-block bg-primary/20 text-primary text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] mb-6 border border-primary/30">
                        Intelligence for Creators
                    </span>

                    <h2 className="text-4xl md:text-5xl font-bold mb-6 font-display">
                        Gear Intelligence Delivered.
                    </h2>

                    <p className="text-slate-400 text-lg mb-10 max-w-2xl mx-auto">
                        Join 50,000+ professionals getting weekly insights on the latest cinematography tech, field tests, and production workflows.
                    </p>

                    <form className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto" onSubmit={(e) => e.preventDefault()}>
                        <input
                            className="flex-1 bg-slate-900 border-slate-800 rounded-xl px-6 py-4 focus:ring-primary focus:border-primary placeholder:text-slate-600 text-white"
                            placeholder="Enter your email address"
                            type="email"
                        />
                        <button
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-xl font-bold transition-all shadow-lg shadow-primary/20"
                            type="submit"
                        >
                            Subscribe Now
                        </button>
                    </form>

                    <p className="mt-6 text-slate-600 text-xs">
                        Zero spam. Only high-end gear. Unsubscribe at any time.
                    </p>
                </div>
            </section>

            <Footer />




            <SubmitBlogModal
                isOpen={isSubmitModalOpen}
                onClose={() => setIsSubmitModalOpen(false)}
                onSuccess={fetchBlogs}
            />
        </div>
    );
}
