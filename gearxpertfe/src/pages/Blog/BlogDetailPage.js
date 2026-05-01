/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import Header from "../../components/navigation/Header";
import Footer from "../../components/homepage/Footer";
import {
    getBlogDetail,
    getBlogs,
    toggleLikeBlog,
    addComment,
    updateComment,
    deleteComment,
    toggleSaveBlog
} from "../../service/ApiService/BlogApi";
import { useSocket } from "../../SocketContext";
import ImageWithFallback from "../../components/common/ImageWithFallback";
import blogFallback from "../../assets/bai-viet.png";
import { useTranslation } from "react-i18next";
import { CATEGORY_MAP, formatDate } from "./BlogConstants";

const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 0) return "vừa xong";
    if (diffInSeconds < 60) return `${diffInSeconds} giây trước`;

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays <= 3) return `${diffInDays} ngày trước`;

    return formatDate(dateStr);
};

export default function BlogDetailPage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const navigate = useNavigate();
    const [blog, setBlog] = useState(null);
    const [relatedBlogs, setRelatedBlogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [currentImgIdx, setCurrentImgIdx] = useState(0);

    // User State
    const isAuthenticated = useSelector((state) => state.user.isAuthenticated);
    const currentUser = useSelector((state) => state.user.account);

    // Interaction State
    const [isLiked, setIsLiked] = useState(false);
    const [likesCount, setLikesCount] = useState(0);
    const [isSaved, setIsSaved] = useState(false);
    const [commentText, setCommentText] = useState("");
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    // Comment Edit State
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editCommentText, setEditCommentText] = useState("");
    const [isUpdatingComment, setIsUpdatingComment] = useState(false);

    // Sensitive Keyword Modal
    const [sensitiveModal, setSensitiveModal] = useState({ open: false, message: "" });

    // Socket
    const { socket } = useSocket();

    const allImages = blog?.images?.length > 0 ? blog.images : (blog?.coverImage ? [blog.coverImage] : []);

    const openViewer = (index) => {
        setCurrentImgIdx(index);
        setViewerOpen(true);
        document.body.style.overflow = "hidden";
    };

    const closeViewer = () => {
        setViewerOpen(false);
        document.body.style.overflow = "auto";
    };

    const nextImg = useCallback((e) => {
        e?.stopPropagation();
        setCurrentImgIdx((prev) => (prev + 1) % allImages.length);
    }, [allImages.length]);

    const prevImg = useCallback((e) => {
        e?.stopPropagation();
        setCurrentImgIdx((prev) => (prev - 1 + allImages.length) % allImages.length);
    }, [allImages.length]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!viewerOpen) return;
            if (e.key === "Escape") closeViewer();
            if (e.key === "ArrowRight") nextImg();
            if (e.key === "ArrowLeft") prevImg();
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [viewerOpen, nextImg, prevImg]);

    useEffect(() => {
        const fetchBlog = async () => {
            try {
                setLoading(true);
                const data = await getBlogDetail(id);
                setBlog(data);

                // Initialize interaction states
                const userKey = currentUser?.username || currentUser?.email;
                if (userKey) {
                    setIsLiked(data.likes?.includes(userKey) || false);
                    setIsSaved(data.savedBy?.includes(userKey) || false);
                }
                setLikesCount(data.likes?.length || 0);

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
    }, [id, currentUser?.username, currentUser?.email]);

    // Socket Realtime Updates
    useEffect(() => {
        if (!socket || !id) return;

        socket.emit("joinRoom", `blog_${id}`);

        socket.on("blogUpdate", (data) => {
            const { type, blog: updatedBlog } = data;

            // Update components based on what changed
            setBlog(updatedBlog);

            if (type === "LIKE") {
                setLikesCount(updatedBlog.likes?.length || 0);

                // If current user liked/unliked on another device, update isLiked
                const userKey = currentUser?.username || currentUser?.email;
                if (userKey) {
                    setIsLiked(updatedBlog.likes?.includes(userKey) || false);
                }
            }
        });

        return () => {
            socket.emit("leaveRoom", `blog_${id}`);
            socket.off("blogUpdate");
        };
    }, [socket, id, currentUser?.username, currentUser?.email]);

    const handleLike = async () => {
        if (!isAuthenticated) {
            toast.error("Vui lòng đăng nhập để thích bài viết này!");
            navigate("/signin");
            return;
        }
        try {
            const userKey = currentUser.username || currentUser.email;
            const res = await toggleLikeBlog(id, userKey);
            setIsLiked(res.isLiked);
            setLikesCount(res.blog.likes?.length || 0);
        } catch (err) {
            toast.error("Lỗi khi thích bài viết");
        }
    };

    const handleSave = async () => {
        if (!isAuthenticated) {
            toast.error("Vui lòng đăng nhập để lưu bài viết này!");
            navigate("/signin");
            return;
        }
        try {
            const userKey = currentUser.username || currentUser.email;
            const res = await toggleSaveBlog(id, userKey);
            setIsSaved(res.isSaved);
            if (res.isSaved) toast.success("Đã lưu vào bộ sưu tập của bạn!");
            else toast.info("Đã xóa khỏi mục đã lưu.");
        } catch (err) {
            toast.error("Lỗi khi lưu bài viết");
        }
    };

    const handleSubmitComment = async (e) => {
        e.preventDefault();
        if (!isAuthenticated) {
            toast.error("Vui lòng đăng nhập để bình luận!");
            navigate("/signin");
            return;
        }
        if (!commentText.trim()) return;

        try {
            setIsSubmittingComment(true);
            const commentData = {
                userName: currentUser.username || currentUser.email,
                avatar: currentUser.image || "",
                text: commentText.trim()
            };
            const res = await addComment(id, commentData);
            setBlog(res.blog);
            setCommentText("");
        } catch (err) {
            if (err.response?.status === 400 && err.response?.data?.message?.includes("từ ngữ không phù hợp")) {
                setSensitiveModal({ open: true, message: err.response.data.message });
            } else {
                toast.error("Lỗi khi đăng bình luận");
            }
        } finally {
            setIsSubmittingComment(false);
        }
    };

    const handleEditComment = (comment) => {
        setEditingCommentId(comment._id);
        setEditCommentText(comment.text);
    };

    const handleUpdateComment = async (commentId) => {
        if (!editCommentText.trim()) return;
        try {
            setIsUpdatingComment(true);
            const res = await updateComment(id, commentId, {
                userName: currentUser.username || currentUser.email,
                text: editCommentText.trim()
            });
            setBlog(res.blog);
            setEditingCommentId(null);
            setEditCommentText("");
            toast.success("Đã cập nhật bình luận!");
        } catch (err) {
            if (err.response?.status === 400 && err.response?.data?.message?.includes("từ ngữ không phù hợp")) {
                setSensitiveModal({ open: true, message: err.response.data.message });
            } else {
                toast.error("Lỗi khi cập nhật bình luận");
            }
        } finally {
            setIsUpdatingComment(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa bình luận này?")) return;
        try {
            const userName = currentUser.username || currentUser.email;
            const role = currentUser.role;
            const res = await deleteComment(id, commentId, userName, role);
            setBlog(res.blog);
            toast.success("Đã xóa bình luận!");
        } catch (err) {
            toast.error("Lỗi khi xóa bình luận");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f6f6f8" }}>
                <Header />
                <div className="flex-grow flex items-center justify-center">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <span className="text-sm font-medium" style={{ color: "#4c4d9a" }}>Đang tải bài viết...</span>
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
                        Không tìm thấy bài viết
                    </h2>
                    <p className="mb-6" style={{ color: "#4c4d9a" }}>
                        Bài viết bạn đang tìm kiếm không tồn tại hoặc đã bị xóa.
                    </p>
                    <button
                        onClick={() => navigate("/blog")}
                        className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                        <span className="material-symbols-outlined text-lg">arrow_back</span>
                        Quay lại Blog
                    </button>
                </div>
                <Footer />
            </div>
        );
    }

    const catInfo = CATEGORY_MAP[blog.category] || { label: blog.category, color: "bg-primary" };

    return (
        <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#f6f6f8", fontFamily: "'Inter', sans-serif" }} data-theme="light">
            <Header />

            <main className="mx-auto w-full max-w-7xl px-6 pt-32 pb-20 lg:pt-44">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
                    
                    {/* Left Side: Main Content */}
                    <div className="lg:col-span-8">
                {/* Back button */}
                <button
                    onClick={() => navigate("/blog")}
                    className="flex items-center gap-1.5 text-sm font-semibold transition-colors mb-8 group"
                    style={{ color: "#4c4d9a" }}
                >
                    <span className="material-symbols-outlined text-lg group-hover:-translate-x-1 transition-transform">
                        arrow_back
                    </span>
                    Quay lại Blog
                </button>

                <article>
                    {/* Category Badge */}
                    <div className="mb-6">
                        <span className={`inline-block rounded-lg ${catInfo.color} px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white mb-4`}>
                            {t(`blog.categories.${blog.category}`, { defaultValue: blog.category })}
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
                                    <p className="text-xs" style={{ color: "#4c4d9a" }}>{formatDate(blog.approvedAt || blog.createdAt)}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-medium" style={{ color: "#4c4d9a" }}>
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">schedule</span>
                                    {blog.readTime} phút đọc
                                </span>
                                <span className="flex items-center gap-1">
                                    <span className="material-symbols-outlined text-sm">visibility</span>
                                    {blog.views || 0} lượt xem
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Facebook-style Media Grid */}
                    <div className="rounded-xl overflow-hidden mb-10 shadow-sm border border-slate-200 bg-white">
                        {(!blog.images || blog.images.length <= 1) ? (
                            <div
                                className="w-full h-[300px] md:h-[500px] cursor-pointer hover:opacity-95 transition-opacity bg-slate-100 flex items-center justify-center relative group"
                                onClick={() => openViewer(0)}
                            >
                                {/\.(mp4|mov|avi|webm)$/i.test(blog.coverImage) ? (
                                    <>
                                        <video
                                            src={blog.coverImage}
                                            className="w-full h-full object-cover"
                                            muted
                                            onMouseOver={(e) => e.target.play()}
                                            onMouseOut={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:scale-110 transition-transform">
                                            <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-2xl">
                                                <span className="material-symbols-outlined text-4xl fill-current">play_arrow</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <ImageWithFallback 
                                        src={blog.coverImage} 
                                        className="w-full h-full object-cover" 
                                        fallback={blogFallback}
                                        alt={blog.title}
                                    />
                                )}
                            </div>
                        ) : (
                            <div
                                className={`grid gap-1 bg-slate-200 transition-all duration-300 ${blog.images.length === 2 ? "grid-cols-2 h-[350px] md:h-[450px]" :
                                        "grid-cols-2 h-[500px] md:h-[650px]"
                                    }`}
                            >
                                {blog.images.length === 2 && blog.images.map((img, idx) => {
                                    const isVideo = /\.(mp4|mov|avi|webm)$/i.test(img);
                                    return (
                                        <div
                                            key={idx}
                                            className="h-full bg-slate-100 hover:brightness-90 transition-all cursor-pointer relative group"
                                            onClick={() => openViewer(idx)}
                                        >
                                            {isVideo ? (
                                                <video src={img} className="w-full h-full object-cover" muted />
                                            ) : (
                                                <ImageWithFallback 
                                                    src={img} 
                                                    className="w-full h-full object-cover" 
                                                    fallback={blogFallback}
                                                    alt={`Media ${idx + 1}`} 
                                                />
                                            )}
                                            {isVideo && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none group-hover:bg-black/10 transition-colors">
                                                    <div className="h-10 w-10 rounded-full bg-white/80 flex items-center justify-center text-primary shadow-lg border border-white/50">
                                                        <span className="material-symbols-outlined text-2xl fill-current">play_arrow</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}

                                {blog.images.length >= 3 && (
                                    <>
                                        {/* Left Side: Large Media */}
                                        <div
                                            className="col-span-1 h-full bg-slate-100 hover:brightness-90 transition-all cursor-pointer relative group"
                                            onClick={() => openViewer(0)}
                                        >
                                            {/\.(mp4|mov|avi|webm)$/i.test(blog.images[0]) ? (
                                                <video src={blog.images[0]} className="w-full h-full object-cover" muted />
                                            ) : (
                                                <ImageWithFallback 
                                                    src={blog.images[0]} 
                                                    className="w-full h-full object-cover" 
                                                    fallback={blogFallback}
                                                    alt="Main Media" 
                                                />
                                            )}
                                            {/\.(mp4|mov|avi|webm)$/i.test(blog.images[0]) && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <div className="h-16 w-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 text-white shadow-2xl group-hover:scale-110 transition-transform">
                                                        <span className="material-symbols-outlined text-4xl fill-current">play_arrow</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Right Side: Stacked Media */}
                                        <div className="col-span-1 grid grid-rows-2 gap-1 h-full overflow-hidden">
                                            {[1, 2].map((idx) => {
                                                const img = blog.images[idx];
                                                const isVideo = /\.(mp4|mov|avi|webm)$/i.test(img);
                                                return img && (
                                                    <div
                                                        key={idx}
                                                        className="relative h-full w-full bg-slate-100 hover:brightness-90 transition-all cursor-pointer overflow-hidden group"
                                                        onClick={() => openViewer(idx)}
                                                    >
                                                        {isVideo ? (
                                                            <video src={img} className="h-full w-full object-cover" muted />
                                                        ) : (
                                                        <ImageWithFallback 
                                                            src={img} 
                                                            className="w-full h-full object-cover" 
                                                            fallback={blogFallback}
                                                            alt={`Media ${idx + 1}`} 
                                                        />
                                                        )}
                                                        {isVideo && (
                                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                                <div className="h-10 w-10 rounded-full bg-white/80 flex items-center justify-center text-primary shadow-md border border-white/50">
                                                                    <span className="material-symbols-outlined text-xl fill-current">play_arrow</span>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {idx === 2 && blog.images.length > 3 && (
                                                            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20" style={{ height: '100%', width: '100%' }}>
                                                                <div className="text-white text-5xl font-black tracking-tighter text-center leading-none -translate-y-6">
                                                                    +{blog.images.length - 3}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Content */}
                    <div
                        className="text-base leading-relaxed blog-content mb-12"
                        style={{ color: "#0d0e1b", lineHeight: "1.9" }}
                        dangerouslySetInnerHTML={{ __html: blog.content }}
                    />

                    {/* Interaction Bar (Like, Comment, Save) */}
                    <div className="flex items-center justify-between py-4 mb-10 border-y border-slate-200">
                        <div className="flex items-center gap-6">
                            <button
                                onClick={handleLike}
                                className={`flex items-center gap-2 text-sm font-bold transition-all px-4 py-2 rounded-xl h-11 ${isLiked ? "text-primary bg-primary/10" : "text-slate-500 hover:bg-slate-100"
                                    }`}
                            >
                                <span className={`material-symbols-outlined text-2xl ${isLiked ? "fill-current" : ""}`}>
                                    thumb_up
                                </span>
                                <span>{likesCount} Thích</span>
                            </button>
                            <button
                                onClick={() => document.getElementById('comment-input').focus()}
                                className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:bg-slate-100 transition-all px-4 py-2 rounded-xl h-11"
                            >
                                <span className="material-symbols-outlined text-2xl">
                                    chat_bubble
                                </span>
                                <span>{blog.comments?.length || 0} Bình luận</span>
                            </button>
                        </div>
                        <button
                            onClick={handleSave}
                            className={`flex items-center gap-2 text-sm font-bold transition-all px-4 py-2 rounded-xl h-11 ${isSaved ? "text-amber-500 bg-amber-500/10" : "text-slate-500 hover:bg-slate-100"
                                }`}
                        >
                            <span className={`material-symbols-outlined text-2xl ${isSaved ? "fill-current" : ""}`}>
                                bookmark
                            </span>
                            <span>{isSaved ? "Đã lưu" : "Lưu"}</span>
                        </button>
                    </div>

                    {/* Comments Section */}
                    <section className="mb-16">
                        <h3 className="font-display text-xl font-bold mb-8" style={{ color: "#0d0e1b" }}>
                            Thảo luận ({blog.comments?.length || 0})
                        </h3>

                        {/* Comment Form */}
                        <form onSubmit={handleSubmitComment} className="mb-10 flex gap-4">
                            <div className="h-10 w-10 flex-shrink-0 rounded-full bg-slate-200 overflow-hidden">
                                {currentUser?.image ? (
                                    <img src={currentUser.image} alt="Me" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary uppercase text-sm font-bold">
                                        {currentUser?.username?.charAt(0) || "U"}
                                    </div>
                                )}
                            </div>
                            <div className="flex-grow flex flex-col gap-3">
                                <textarea
                                    id="comment-input"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Viết bình luận..."
                                    className="w-full min-h-[100px] rounded-2xl border border-slate-200 p-4 text-sm focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all outline-none resize-none"
                                />
                                <div className="flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={!commentText.trim() || isSubmittingComment}
                                        className="h-11 px-8 rounded-xl bg-primary text-white text-sm font-bold hover:shadow-lg hover:shadow-primary/30 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                                    >
                                        {isSubmittingComment ? "Đang đăng..." : "Đăng bình luận"}
                                    </button>
                                </div>
                            </div>
                        </form>

                        {/* Comment List */}
                        <div className="space-y-6">
                            {(blog.comments || []).slice().reverse().map((comment, index) => (
                                <div key={index} className="flex gap-4 group">
                                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-slate-100 overflow-hidden">
                                        {comment.avatar ? (
                                            <img src={comment.avatar} alt={comment.user} className="h-full w-full object-cover" />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center bg-slate-200 text-slate-500 uppercase text-xs font-bold">
                                                {comment.user.charAt(0)}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-grow min-w-0">
                                        <div className="rounded-2xl bg-slate-50 p-4 border border-slate-100 relative group/comment">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-slate-900">{comment.user}</span>
                                                    {comment.user === (currentUser?.username || currentUser?.email) && (
                                                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold uppercase">Bạn</span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-medium text-slate-400">
                                                    {formatTimeAgo(comment.createdAt)}
                                                </span>
                                            </div>

                                            {editingCommentId === comment._id ? (
                                                <div className="mt-2 flex flex-col gap-2">
                                                    <textarea
                                                        value={editCommentText}
                                                        onChange={(e) => setEditCommentText(e.target.value)}
                                                        className="w-full min-h-[60px] text-sm p-3 rounded-xl border border-slate-200 outline-none focus:border-primary transition-all"
                                                        autoFocus
                                                    />
                                                    <div className="flex justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingCommentId(null)}
                                                            className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5"
                                                        >
                                                            Hủy
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateComment(comment._id)}
                                                            disabled={isUpdatingComment || !editCommentText.trim()}
                                                            className="text-xs font-bold bg-primary text-white rounded-lg px-4 py-1.5 hover:shadow-md disabled:opacity-50"
                                                        >
                                                            {isUpdatingComment ? "Đang lưu..." : "Lưu"}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <>
                                                    <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap break-all">
                                                        {comment.text}
                                                    </p>
                                                    {(comment.user === (currentUser?.username || currentUser?.email) || currentUser?.role === "ADMIN") && (
                                                        <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                                            {comment.user === (currentUser?.username || currentUser?.email) && (
                                                                <button
                                                                    onClick={() => handleEditComment(comment)}
                                                                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-primary hover:border-primary shadow-sm transition-all"
                                                                    title="Sửa bình luận"
                                                                >
                                                                    <span className="material-symbols-outlined text-sm">edit</span>
                                                                </button>
                                                            )}
                                                            <button
                                                                onClick={() => handleDeleteComment(comment._id)}
                                                                className="h-7 w-7 flex items-center justify-center rounded-lg bg-white border border-slate-100 text-slate-400 hover:text-red-500 hover:border-red-100 shadow-sm transition-all"
                                                                title="Xóa bình luận"
                                                            >
                                                                <span className="material-symbols-outlined text-sm">delete</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(blog.comments || []).length === 0 && (
                                <div className="text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                                    <p className="text-sm text-slate-400">Chưa có bình luận nào. Hãy là người đầu tiên chia sẻ suy nghĩ của bạn!</p>
                                </div>
                            )}
                        </div>
                    </section>

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
            </div>

            {/* Right Side: Sidebar */}
            <aside className="hidden lg:block lg:col-span-4 sticky top-40 space-y-10">
                {/* Sticky Related Articles */}
                {relatedBlogs.length > 0 && (
                    <div className="space-y-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Xem tiếp tiếp theo</h3>
                        <div className="space-y-4">
                            {relatedBlogs.map((rb) => {
                                const rbCat = CATEGORY_MAP[rb.category] || { label: rb.category, color: "bg-primary" };
                                return (
                                <div 
                                        key={rb._id}
                                        onClick={() => navigate(`/blog/${rb._id}`)}
                                        className="group cursor-pointer flex gap-4 p-3 rounded-2xl hover:bg-white hover:shadow-xl hover:shadow-primary/5 transition-all border border-transparent hover:border-slate-100"
                                    >
                                        <div className="h-20 w-20 rounded-xl overflow-hidden flex-shrink-0 relative">
                                            <div 
                                                className="absolute inset-0 bg-cover bg-center transition-transform group-hover:scale-110"
                                                style={{ backgroundImage: `url('${rb.coverImage}')` }}
                                            />
                                        </div>
                                        <div className="flex flex-col justify-center gap-1">
                                            <span className={`text-[8px] font-black uppercase tracking-tighter w-fit px-1.5 py-0.5 rounded ${rbCat.color} text-white`}>
                                                {t(`blog.categories.${rb.category}`, { defaultValue: rb.category })}
                                            </span>
                                            <h4 className="text-sm font-bold text-slate-900 leading-tight group-hover:text-primary transition-colors line-clamp-2">
                                                {rb.title}
                                            </h4>
                                            <span className="text-[10px] text-slate-400 font-medium">{rb.readTime} phút đọc</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Newsletter Box */}
                <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group shadow-2xl">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform" />
                    <div className="relative z-10 text-center">
                        <span className="material-symbols-outlined text-4xl mb-4 text-primary">mark_email_read</span>
                        <h3 className="font-display font-bold text-xl mb-3">Tham gia bản tin</h3>
                        <p className="text-sm text-slate-400 mb-6 leading-relaxed">Nhận những cập nhật mới nhất về công nghệ thiết bị hàng tuần.</p>
                        <input 
                            type="text" 
                            placeholder="Email của bạn"
                            className="w-full bg-white/10 border border-white/10 rounded-xl py-3 px-4 text-sm text-white mb-3 outline-none focus:border-primary transition-all"
                        />
                        <button className="w-full bg-primary py-4 rounded-xl text-xs font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-primary/30 transition-all">
                            Đăng ký ngay
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Related Content (At bottom for mobile) */}
            <div className="lg:hidden col-span-1 border-t border-slate-100 mt-20">
                {relatedBlogs.length > 0 && (
                    <section className="pt-16">
                        <h2 className="font-display text-2xl font-bold mb-8" style={{ color: "#0d0e1b" }}>
                            Bài viết liên quan
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-10">
                            {relatedBlogs.map((rb) => {
                                const rbCat = CATEGORY_MAP[rb.category] || { label: rb.category, color: "bg-primary" };
                                return (
                                    <article
                                        key={rb._id}
                                        onClick={() => navigate(`/blog/${rb._id}`)}
                                        className="group flex flex-col rounded-xl bg-white overflow-hidden shadow-sm border border-slate-100"
                                    >
                                        <div className="aspect-video overflow-hidden relative">
                                            <div
                                                className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
                                                style={{ backgroundImage: `url('${rb.coverImage}')` }}
                                            />
                                        </div>
                                        <div className="p-5">
                                            <h3 className="font-display text-sm font-bold leading-snug group-hover:text-primary transition-colors line-clamp-2 mb-2">
                                                {rb.title}
                                            </h3>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-slate-500">{rb.author?.name}</span>
                                                <span className="text-[10px] font-bold uppercase text-slate-400">{rb.readTime} phút</span>
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    </section>
                )}
            </div>
        </div>
    </main>

            <Footer />

            {/* Premium Fullscreen Lightbox */}
            <AnimatePresence>
                {viewerOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-md"
                        onClick={closeViewer}
                    >
                        {/* Close Button */}
                        <button
                            className="absolute top-6 right-6 z-[210] flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-all hover:rotate-90"
                            onClick={closeViewer}
                        >
                            <span className="material-symbols-outlined text-3xl">close</span>
                        </button>

                        {/* Navigation - Left */}
                        {allImages.length > 1 && (
                            <button
                                className="absolute left-6 z-[210] flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/20 transition-all group"
                                onClick={prevImg}
                            >
                                <span className="material-symbols-outlined text-4xl group-hover:-translate-x-1 transition-transform">chevron_left</span>
                            </button>
                        )}

                        {/* Navigation - Right */}
                        {allImages.length > 1 && (
                            <button
                                className="absolute right-6 z-[210] flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-white hover:bg-white/20 transition-all group"
                                onClick={nextImg}
                            >
                                <span className="material-symbols-outlined text-4xl group-hover:translate-x-1 transition-transform">chevron_right</span>
                            </button>
                        )}

                        {/* Media Container */}
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative max-w-[90vw] max-h-[85vh] flex flex-col items-center"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/\.(mp4|mov|avi|webm)$/i.test(allImages[currentImgIdx]) ? (
                                <video
                                    src={allImages[currentImgIdx]}
                                    controls
                                    autoPlay
                                    className="max-w-full max-h-[80vh] rounded-lg shadow-2xl"
                                />
                            ) : (
                                <img
                                    src={allImages[currentImgIdx]}
                                    alt={`View ${currentImgIdx + 1}`}
                                    className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl select-none"
                                />
                            )}

                            {/* Counter & Info */}
                            <div className="mt-6 flex flex-col items-center gap-2">
                                <div className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 text-white text-sm font-bold tracking-widest uppercase">
                                    Ảnh {currentImgIdx + 1} / {allImages.length}
                                </div>
                                <p className="text-white/60 text-xs font-medium uppercase tracking-[0.2em]">{blog.title}</p>
                            </div>
                        </motion.div>

                        {/* Thumbnails Strip */}
                        {allImages.length > 1 && (
                            <div
                                className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-3 px-4 py-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {allImages.map((img, idx) => {
                                    const isVideo = /\.(mp4|mov|avi|webm)$/i.test(img);
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setCurrentImgIdx(idx)}
                                            className={`h-14 w-14 rounded-lg overflow-hidden cursor-pointer border-2 transition-all relative group ${currentImgIdx === idx ? "border-primary scale-110 shadow-lg shadow-primary/20" : "border-transparent opacity-40 hover:opacity-100"
                                                }`}
                                        >
                                            {isVideo ? (
                                                <video src={img} className="h-full w-full object-cover" muted />
                                            ) : (
                                                <img src={img} className="h-full w-full object-cover" alt="thumb" />
                                            )}
                                            {isVideo && (
                                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                    <span className="material-symbols-outlined text-[10px] text-white bg-black/40 rounded-full p-0.5">play_arrow</span>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Sensitive Keyword Popup */}
            <AnimatePresence>
                {sensitiveModal.open && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
                            onClick={() => setSensitiveModal({ ...sensitiveModal, open: false })}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
                        >
                            {/* Decorative background elements */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-full -mr-16 -mt-16 opacity-50" />
                            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full -ml-12 -mb-12 opacity-50" />

                            <div className="relative text-center">
                                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mx-auto mb-6 text-red-500 shadow-lg shadow-red-100 ring-8 ring-red-50/50">
                                    <span className="material-symbols-outlined text-4xl">security_update_warning</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 mb-4 leading-tight">Phát hiện từ ngữ không phù hợp</h3>
                                <p className="text-slate-500 text-sm leading-relaxed mb-8 px-2">
                                    {sensitiveModal.message || "Bình luận của bạn chứa các từ ngữ nằm trong danh sách hạn chế của cộng đồng GearXpert."}
                                </p>
                                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4 mb-8 text-left">
                                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0 text-slate-400 border border-slate-100">
                                        <span className="material-symbols-outlined text-sm">info</span>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                                        Vui lòng kiểm tra lại nội dung và sử dụng ngôn từ văn minh để xây dựng cộng đồng tốt đẹp hơn.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setSensitiveModal({ ...sensitiveModal, open: false })}
                                    className="w-full py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-[2px] transition-all hover:shadow-xl hover:shadow-primary/30 active:scale-95 shadow-lg shadow-primary/10"
                                >
                                    Tôi đã hiểu
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
