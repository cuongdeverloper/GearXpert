import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import { getBlogDetail, getBlogs } from "../../service/ApiService/BlogApi";

const CATEGORY_MAP = {
    CAMERA: { label: "Cameras", color: "bg-primary" },
    DRONE: { label: "Drones", color: "bg-primary" },
    LIGHTING: { label: "Lighting", color: "bg-amber-500" },
    AI_TECH: { label: "AI Tech", color: "bg-accent-cyan" },
    AUDIO: { label: "Audio Gear", color: "bg-primary" },
    CINEMATOGRAPHY: { label: "Cinematography", color: "bg-violet-500" },
    ACCESSORIES: { label: "Accessories", color: "bg-primary" },
    INDUSTRY_NEWS: { label: "Industry News", color: "bg-slate-800" },
};

const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
};

export default function BlogDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [blog, setBlog] = useState(null);
    const [relatedBlogs, setRelatedBlogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBlog = async () => {
            try {
                setLoading(true);
                const data = await getBlogDetail(id);
                setBlog(data);

                if (data?.category) {
                    const res = await getBlogs({ category: data.category, limit: 4 });
                    const related = (res.blogs || []).filter((b) => b._id !== id);
                    setRelatedBlogs(related.slice(0, 3));
                }
            } catch (err) {
                console.error("Error fetching blog detail:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchBlog();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f6f6f8" }}>
                <Header />
                <div className="flex-grow flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <span className="text-sm font-medium" style={{ color: "#4c4d9a" }}>Loading article...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!blog) {
        return (
            <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f6f6f8" }}>
                <Header />
                <div className="flex-grow flex flex-col items-center justify-center text-center px-6">
                    <span className="material-symbols-outlined text-7xl text-slate-300 mb-4">article</span>
                    <h2 className="font-display text-2xl font-bold mb-2" style={{ color: "#4c4d9a" }}>
                        Article not found
                    </h2>
                    <p className="mb-6" style={{ color: "#4c4d9a" }}>
                        The article you're looking for doesn't exist or has been removed.
                    </p>
                    <button
                        onClick={() => navigate("/blog")}
                        className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                        Back to Blog
                    </button>
                </div>
                <Footer />
            </div>
        );
    }

    const catInfo = CATEGORY_MAP[blog.category] || { label: blog.category, color: "bg-primary" };

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f6f6f8", fontFamily: "'Inter', sans-serif" }}>
            <Header />

            <main className="mx-auto w-full max-w-4xl px-6 py-10 md:px-20">
                {/* Back button */}
                <button
                    onClick={() => navigate("/blog")}
                    className="flex items-center gap-1.5 text-sm font-semibold transition-colors mb-8 group"
                    style={{ color: "#4c4d9a" }}
                >
                    <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">
                        arrow_back
                    </span>
                    Back to Blog
                </button>

                <article>
                    {/* Category Badge */}
                    <div className="mb-6">
                        <span className={`inline-block rounded-lg ${catInfo.color} px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white mb-4`}>
                            {catInfo.label}
                        </span>

                        {/* Title */}
                        <h1
                            className="font-display text-3xl md:text-4xl lg:text-5xl font-black leading-tight tracking-tight mb-4"
                            style={{ color: "#0d0e1b" }}
                        >
                            {blog.title}
                        </h1>

                        {/* Description */}
                        <p className="text-lg leading-relaxed mb-6" style={{ color: "#4c4d9a" }}>
                            {blog.description}
                        </p>

                        {/* Author & Meta */}
                        <div className="flex flex-wrap items-center gap-4 pb-6" style={{ borderBottom: "1px solid rgba(99,102,241,0.05)" }}>
                            <div className="flex items-center gap-3">
                                {blog.author?.avatar ? (
                                    <div
                                        className="h-11 w-11 rounded-full bg-primary/10 bg-cover bg-center"
                                        style={{ backgroundImage: `url('${blog.author.avatar}')` }}
                                    />
                                ) : (
                                    <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                                        <span className="material-symbols-outlined text-primary">person</span>
                                    </div>
                                )}
                                <div>
                                    <span className="text-sm font-bold" style={{ color: "#0d0e1b" }}>
                                        {blog.author?.name}
                                    </span>
                                    <p className="text-xs" style={{ color: "#4c4d9a" }}>{formatDate(blog.createdAt)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-medium" style={{ color: "#4c4d9a" }}>
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                    {blog.readTime} min read
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Cover Image */}
                    <div className="rounded-xl overflow-hidden mb-10 shadow-sm" style={{ border: "1px solid rgba(99,102,241,0.05)" }}>
                        <div
                            className="w-full h-[300px] md:h-[450px] bg-cover bg-center"
                            style={{ backgroundImage: `url('${blog.coverImage}')` }}
                        />
                    </div>

                    {/* Content */}
                    <div
                        className="text-base leading-relaxed whitespace-pre-line"
                        style={{ color: "#0d0e1b", lineHeight: "1.9" }}
                    >
                        {blog.content}
                    </div>

                    {/* Tags */}
                    {blog.tags && blog.tags.length > 0 && (
                        <div className="mt-10 pt-6" style={{ borderTop: "1px solid rgba(99,102,241,0.05)" }}>
                            <div className="flex flex-wrap gap-2">
                                {blog.tags.map((tag, index) => (
                                    <span
                                        key={index}
                                        className="rounded-full px-4 py-1.5 text-xs font-semibold"
                                        style={{ backgroundColor: "rgba(99,102,241,0.05)", color: "#4c4d9a" }}
                                    >
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </article>

                {/* Related Articles */}
                {relatedBlogs.length > 0 && (
                    <section className="mt-16">
                        <h2 className="font-display text-2xl font-bold mb-8" style={{ color: "#0d0e1b" }}>
                            Related Articles
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {relatedBlogs.map((rb) => {
                                const rbCat = CATEGORY_MAP[rb.category] || { label: rb.category, color: "bg-primary" };
                                return (
                                    <article
                                        key={rb._id}
                                        onClick={() => navigate(`/blog/${rb._id}`)}
                                        className="group flex flex-col rounded-xl bg-white overflow-hidden shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
                                        style={{ border: "1px solid rgba(99,102,241,0.05)" }}
                                    >
                                        <div className="aspect-[16/10] overflow-hidden relative">
                                            <div
                                                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                                style={{ backgroundImage: `url('${rb.coverImage}')` }}
                                            />
                                            <div className="absolute top-3 left-3">
                                                <span className={`rounded-lg ${rbCat.color} px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white`}>
                                                    {rbCat.label}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="p-5">
                                            <h3 className="font-display text-sm font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2" style={{ color: "#0d0e1b" }}>
                                                {rb.title}
                                            </h3>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium" style={{ color: "#4c4d9a" }}>
                                                    {rb.author?.name}
                                                </span>
                                                <span className="text-[10px] font-bold uppercase" style={{ color: "rgba(76,77,154,0.6)" }}>
                                                    {rb.readTime} min
                                                </span>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                )}
            </main>

            <Footer />
        </div>
    );
}
