import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { getBlogs, manageBlogStatus, deleteBlog, toggleFeaturedBlog } from "../../service/ApiService/BlogApi";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import { FiSearch, FiCheckCircle, FiXCircle, FiEye, FiTrash2, FiClock, FiFileText, FiMoreHorizontal, FiStar } from "react-icons/fi";
import { toast } from "react-toastify";
import { CATEGORY_MAP, formatDate } from "../Blog/BlogConstants";

export default function BlogManagement() {
    const dispatch = useDispatch();
    const [blogs, setBlogs] = useState([]);
    const [stats, setStats] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("pending");
    const [loading, setLoading] = useState(false);
    
    // Reason Modal States
    const [reasonModal, setReasonModal] = useState({ open: false, type: '', id: '', title: '' });
    const [reasonText, setReasonText] = useState("");
    const [openMenuId, setOpenMenuId] = useState(null);
    const [previewModal, setPreviewModal] = useState({ open: false, blog: null });

    // Close menu on click outside
    useEffect(() => {
        const handleClick = () => setOpenMenuId(null);
        window.addEventListener('click', handleClick);
        return () => window.removeEventListener('click', handleClick);
    }, []);

    const fetchBlogs = useCallback(async (status, search, isInitial = false) => {
        try {
            if (isInitial) dispatch(showAdminLoading());
            setLoading(true);
            const params = {
                limit: 100,
                status: status,
                search: search || undefined
            };
            const response = await getBlogs(params);
            setBlogs(response.blogs || []);
            if (response.stats) {
                setStats(response.stats);
            }
        } catch (error) {
            console.error("Error fetching blogs:", error);
            toast.error("Lỗi khi tải danh sách bài viết");
        } finally {
            setLoading(false);
            if (isInitial) dispatch(hideAdminLoading());
        }
    }, [dispatch]);

    // Initial fetch - Only ONCE on mount
    useEffect(() => {
        fetchBlogs(statusFilter, searchTerm, true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Fetch when filter changes (Fast)
    useEffect(() => {
        if (searchTerm === "") {
            fetchBlogs(statusFilter, searchTerm);
        }
    }, [statusFilter, fetchBlogs, searchTerm]);

    // Fetch when search changes (Debounced)
    useEffect(() => {
        if (searchTerm !== "") {
            const delayDebounceFn = setTimeout(() => {
                fetchBlogs(statusFilter, searchTerm);
            }, 500);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [searchTerm, statusFilter, fetchBlogs]);

    const handleUpdateStatus = async (id, status) => {
        if (status === 'rejected') {
            setReasonModal({ open: true, type: 'reject', id, title: 'Lý do từ chối bài viết' });
            return;
        }

        try {
            dispatch(showAdminLoading());
            await manageBlogStatus(id, status);
            toast.success(`Đã ${status === 'approved' ? 'duyệt' : 'từ chối'} bài viết thành công`);
            fetchBlogs(statusFilter, searchTerm);
        } catch (error) {
            console.error("Error updating status:", error);
            toast.error("Lỗi khi cập nhật trạng thái");
        } finally {
            dispatch(hideAdminLoading());
        }
    };

    const handleDelete = async (blog) => {
        if (blog.status === 'rejected') {
            if (window.confirm("Bạn có chắc chắn muốn xóa bài viết này?")) {
                try {
                    dispatch(showAdminLoading());
                    await deleteBlog(blog._id);
                    toast.success("Đã xóa bài viết thành công");
                    fetchBlogs(statusFilter, searchTerm);
                } catch (error) {
                    console.error("Error deleting blog:", error);
                    toast.error("Lỗi khi xóa bài viết");
                } finally {
                    dispatch(hideAdminLoading());
                }
            }
            return;
        }
        setReasonModal({ open: true, type: 'delete', id: blog._id, title: 'Lý do xóa bài viết' });
    };

    const handleToggleFeatured = async (id) => {
        try {
            dispatch(showAdminLoading());
            await toggleFeaturedBlog(id);
            toast.success("Đã cập nhật trạng thái nổi bật");
            fetchBlogs(statusFilter, searchTerm);
        } catch (error) {
            console.error("Error toggling featured:", error);
            toast.error("Lỗi khi cập nhật trạng thái nổi bật");
        } finally {
            dispatch(hideAdminLoading());
        }
    };

    const submitReasonAction = async () => {
        if (!reasonText.trim()) {
            toast.warning("Vui lòng nhập lý do");
            return;
        }

        try {
            dispatch(showAdminLoading());
            if (reasonModal.type === 'reject') {
                await manageBlogStatus(reasonModal.id, 'rejected', reasonText);
                toast.success("Đã từ chối và gửi email thông báo");
            } else {
                await deleteBlog(reasonModal.id, reasonText);
                toast.success("Đã xóa bài viết và gửi email thông báo");
            }
            setReasonModal({ open: false, type: '', id: '', title: '' });
            setReasonText("");
            fetchBlogs(statusFilter, searchTerm);
        } catch (error) {
            console.error("Error submitting reason:", error);
            toast.error("Đã có lỗi xảy ra");
        } finally {
            dispatch(hideAdminLoading());
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: "bg-amber-50 text-amber-600 border-amber-100",
            approved: "bg-emerald-50 text-emerald-600 border-emerald-100",
            rejected: "bg-red-50 text-red-600 border-red-100",
        };
        return badges[status] || "bg-slate-50 text-slate-600 border-slate-100";
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header section with Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-600">
                        <FiClock size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Đang chờ</p>
                        <p className="text-2xl font-black text-slate-900">{stats.pending}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
                        <FiCheckCircle size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Đã duyệt</p>
                        <p className="text-2xl font-black text-slate-900">{stats.approved}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600">
                        <FiFileText size={24} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Tổng cộng</p>
                        <p className="text-2xl font-black text-slate-900">{stats.all}</p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative flex-1 max-w-lg w-full">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm bài viết..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-[1.5rem] border border-slate-200 bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                    />
                </div>
                <div className="flex gap-2">
                    {['pending', 'approved', 'rejected', 'ALL'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                statusFilter === status 
                                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                                    : "bg-white border border-slate-200 text-slate-400 hover:border-slate-300"
                            }`}
                        >
                            {status === 'ALL' ? 'Tất cả' : status === 'pending' ? 'Chờ duyệt' : status === 'approved' ? 'Đã duyệt' : 'Từ chối'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden relative">
                {/* Local Loading Overlay */}
                {loading && (
                    <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] flex items-center justify-center transition-all duration-300">
                        <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    </div>
                )}

                <div className={`overflow-x-auto transition-opacity duration-300 ${loading ? 'opacity-50' : 'opacity-100'}`}>
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100">
                                <th className="px-4 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Bài viết</th>
                                <th className="px-4 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Tác giả</th>
                                <th className="px-4 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Danh mục</th>
                                <th className="px-4 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Trạng thái</th>
                                <th className="px-4 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Ngày gửi</th>
                                <th className="px-4 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {blogs.map((blog) => (
                                <tr key={blog._id} className="hover:bg-slate-50/30 transition-colors group">
                                    <td className="px-4 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="h-14 w-14 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200 relative flex items-center justify-center">
                                                {(() => {
                                                    const mediaUrl = blog.images?.[0] || blog.coverImage || blog.image || blog.thumb;
                                                    const isVideo = /\.(mp4|mov|avi|webm)$/i.test(mediaUrl);
                                                    
                                                    if (isVideo) {
                                                        return (
                                                            <>
                                                                <video 
                                                                    src={mediaUrl} 
                                                                    className="h-full w-full object-cover" 
                                                                    muted 
                                                                />
                                                                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                                                    <span className="material-symbols-outlined text-white text-lg fill-current">play_arrow</span>
                                                                </div>
                                                            </>
                                                        );
                                                    }
                                                    
                                                    return (
                                                        <img 
                                                            src={mediaUrl || "/placeholder-blog.jpg"} 
                                                            alt="" 
                                                            className="h-full w-full object-cover" 
                                                            onError={(e) => { e.target.src = "/placeholder-blog.jpg"; }}
                                                        />
                                                    );
                                                })()}
                                            </div>
                                            <div className="min-w-0 max-w-[150px] sm:max-w-[200px] lg:max-w-[300px]">
                                                <p className="font-black text-slate-900 line-clamp-1 truncate">{blog.title}</p>
                                                <p className="text-xs text-slate-400 font-medium">{blog.readTime} phút đọc</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-6">
                                        <div className="flex items-center gap-2">
                                            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs overflow-hidden border border-slate-100 flex-shrink-0 aspect-square">
                                                {blog.author?.avatar ? (
                                                    <img src={blog.author.avatar} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <span className="leading-none">{blog.author?.name?.charAt(0).toUpperCase() || "U"}</span>
                                                )}
                                            </div>
                                            <span className="font-bold text-slate-700 text-sm whitespace-nowrap">{blog.author?.name || "Unknown User"}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-6">
                                        <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] text-white ${CATEGORY_MAP[blog.category]?.color || "bg-primary"}`}>
                                            {CATEGORY_MAP[blog.category]?.label || blog.category}
                                        </span>
                                    </td>
                                    <td className="px-4 py-6 text-center">
                                        <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border ${getStatusBadge(blog.status)}`}>
                                            {blog.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-6 text-center text-sm font-bold text-slate-500 whitespace-nowrap">
                                        {formatDate(blog.createdAt)}
                                    </td>
                                    <td className="px-4 py-6 text-right relative">
                                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {blog.status === 'approved' ? (
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(openMenuId === blog._id ? null : blog._id);
                                                        }}
                                                        className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm"
                                                        title="Thao tác"
                                                    >
                                                        <FiMoreHorizontal size={16} />
                                                    </button>
                                                    
                                                    {openMenuId === blog._id && (
                                                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 py-2 animate-in fade-in zoom-in duration-200">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setPreviewModal({ open: true, blog });
                                                                    setOpenMenuId(null);
                                                                }}
                                                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors"
                                                            >
                                                                <FiEye size={16} />
                                                                <span>Xem bài viết</span>
                                                            </button>
                                                            <button
                                                                onClick={() => handleToggleFeatured(blog._id)}
                                                                className={`flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors ${
                                                                    blog.isFeatured 
                                                                    ? "text-amber-500 hover:bg-amber-50" 
                                                                    : "text-slate-600 hover:bg-slate-50 hover:text-amber-500"
                                                                }`}
                                                            >
                                                                <FiStar size={16} className={blog.isFeatured ? "fill-amber-500" : ""} />
                                                                <span>{blog.isFeatured ? "Bỏ nổi bật" : "Đặt nổi bật"}</span>
                                                            </button>
                                                            <div className="h-px bg-slate-100 my-1"></div>
                                                            <button
                                                                onClick={() => handleDelete(blog)}
                                                                className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                                            >
                                                                <FiTrash2 size={16} />
                                                                <span>Xóa bài viết</span>
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <>
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewModal({ open: true, blog });
                                                        }}
                                                        className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm"
                                                        title="Xem trước"
                                                    >
                                                        <FiEye size={16} />
                                                    </button>
                                                    {blog.status === 'pending' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleUpdateStatus(blog._id, 'approved')}
                                                                className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                                title="Duyệt bài"
                                                            >
                                                                <FiCheckCircle size={16} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateStatus(blog._id, 'rejected')}
                                                                className="p-2.5 rounded-xl bg-red-50 text-red-600 border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                                                title="Từ chối"
                                                            >
                                                                <FiXCircle size={16} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => handleDelete(blog)}
                                                        className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-600 transition-all shadow-sm"
                                                        title="Xóa"
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {blogs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-24 text-slate-300">
                        <FiFileText size={64} className="mb-4 opacity-20" />
                        <p className="font-black uppercase tracking-widest text-sm">Không tìm thấy bài viết nào</p>
                    </div>
                )}
            </div>

            {/* Blog Preview Modal */}
            {previewModal.open && previewModal.blog && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div 
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
                        onClick={() => setPreviewModal({ open: false, blog: null })}
                    ></div>
                    <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl relative z-10 flex flex-col animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-white sticky top-0 z-10">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <FiEye size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900">Preview Bài Viết</h3>
                                    <p className="text-xs text-slate-400 font-medium lowercase">Chế độ xem trước của quản trị viên</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setPreviewModal({ open: false, blog: null })}
                                className="h-10 w-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors"
                            >
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Content Body */}
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            <div className="max-w-3xl mx-auto">
                                {/* Metadata */}
                                <div className="mb-8">
                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white mb-4 inline-block ${CATEGORY_MAP[previewModal.blog.category]?.color || 'bg-primary'}`}>
                                        {CATEGORY_MAP[previewModal.blog.category]?.label || previewModal.blog.category}
                                    </span>
                                    <h2 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight mb-4">{previewModal.blog.title}</h2>
                                    <p className="text-lg text-slate-500 font-medium mb-6 leading-relaxed italic border-l-4 border-slate-100 pl-4">{previewModal.blog.description}</p>
                                    
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <div className="h-10 w-10 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                                                {previewModal.blog.author?.avatar ? (
                                                    <img src={previewModal.blog.author.avatar} alt="" className="h-full w-full object-cover" />
                                                ) : (
                                                    <div className="h-full w-full flex items-center justify-center text-slate-400 font-bold">
                                                        {previewModal.blog.author?.name?.charAt(0) || 'U'}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{previewModal.blog.author?.name}</p>
                                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{formatDate(previewModal.blog.createdAt)}</p>
                                            </div>
                                        </div>
                                        <div className="h-4 w-px bg-slate-200" />
                                        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-widest">
                                            <FiClock />
                                            <span>{previewModal.blog.readTime} phút đọc</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Media */}
                                <div className="rounded-3xl overflow-hidden mb-10 bg-slate-100 border border-slate-100 shadow-sm">
                                    {/\.(mp4|mov|avi|webm)$/i.test(previewModal.blog.coverImage) ? (
                                        <video 
                                            src={previewModal.blog.coverImage} 
                                            className="w-full aspect-video object-cover" 
                                            controls 
                                        />
                                    ) : (
                                        <img 
                                            src={previewModal.blog.coverImage} 
                                            alt="Cover" 
                                            className="w-full object-cover" 
                                        />
                                    )}
                                </div>

                                {/* Main Content */}
                                <div 
                                    className="prose prose-slate max-w-none prose-img:rounded-3xl prose-headings:font-black prose-p:text-slate-600 prose-p:leading-relaxed prose-p:text-lg"
                                    dangerouslySetInnerHTML={{ __html: previewModal.blog.content }}
                                />
                                
                                {previewModal.blog.images && previewModal.blog.images.length > 0 && (
                                    <div className="grid grid-cols-2 gap-4 mt-12">
                                        {previewModal.blog.images.map((img, idx) => (
                                            <div key={idx} className="rounded-[2rem] overflow-hidden border border-slate-100 bg-slate-50 aspect-video flex items-center justify-center relative">
                                                {/\.(mp4|mov|avi|webm)$/i.test(img) ? (
                                                    <video src={img} className="h-full w-full object-cover" muted />
                                                ) : (
                                                    <img src={img} alt="" className="h-full w-full object-cover" />
                                                )}
                                                {/\.(mp4|mov|avi|webm)$/i.test(img) && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/5">
                                                        <div className="h-10 w-10 rounded-full bg-white/80 flex items-center justify-center text-primary shadow-lg">
                                                            <FiEye />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 rounded-b-[2.5rem]">
                            <button 
                                onClick={() => setPreviewModal({ open: false, blog: null })}
                                className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-white transition-all text-sm"
                            >
                                Đóng
                            </button>
                            {previewModal.blog.status === 'pending' && (
                                <>
                                    <button 
                                        onClick={() => {
                                            handleUpdateStatus(previewModal.blog._id, 'rejected');
                                            setPreviewModal({ open: false, blog: null });
                                        }}
                                        className="px-6 py-3 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-600 hover:text-white transition-all text-sm"
                                    >
                                        Từ chối
                                    </button>
                                    <button 
                                        onClick={() => {
                                            handleUpdateStatus(previewModal.blog._id, 'approved');
                                            setPreviewModal({ open: false, blog: null });
                                        }}
                                        className="px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all text-sm"
                                    >
                                        Duyệt bài này
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
