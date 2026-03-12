import { useState, useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import { getBlogs, manageBlogStatus, deleteBlog } from "../../service/ApiService/BlogApi";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import { FiSearch, FiCheckCircle, FiXCircle, FiEye, FiTrash2, FiClock, FiFileText } from "react-icons/fi";
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

    const fetchBlogs = useCallback(async (isInitial = false) => {
        try {
            if (isInitial) dispatch(showAdminLoading());
            setLoading(true);
            const params = {
                limit: 100,
                status: statusFilter,
                search: searchTerm || undefined
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
    }, [statusFilter, searchTerm, dispatch]);

    // Initial fetch
    useEffect(() => {
        fetchBlogs(true);
    }, [fetchBlogs]);

    // Fetch when filter changes (Fast)
    useEffect(() => {
        if (searchTerm === "") {
            fetchBlogs();
        }
    }, [statusFilter, fetchBlogs, searchTerm]);

    // Fetch when search changes (Debounced)
    useEffect(() => {
        if (searchTerm !== "") {
            const delayDebounceFn = setTimeout(() => {
                fetchBlogs();
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
            fetchBlogs();
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
                    fetchBlogs();
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
            fetchBlogs();
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
                                            <div className="h-14 w-14 rounded-2xl bg-slate-100 overflow-hidden flex-shrink-0 border border-slate-200">
                                                <img 
                                                    src={blog.images?.[0] || blog.coverImage || blog.image || blog.thumb || "/placeholder-blog.jpg"} 
                                                    alt="" 
                                                    className="h-full w-full object-cover" 
                                                    onError={(e) => { e.target.src = "/placeholder-blog.jpg"; }}
                                                />
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
                                    <td className="px-4 py-6 text-right">
                                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <a 
                                                href={`/blog/${blog._id}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-primary hover:border-primary transition-all shadow-sm"
                                                title="Xem trước"
                                            >
                                                <FiEye size={16} />
                                            </a>
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

            {/* Reason Modal */}
            {reasonModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setReasonModal({ ...reasonModal, open: false })}></div>
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md p-8 shadow-2xl relative z-10 animate-in fade-in zoom-in duration-200">
                        <h3 className="text-xl font-black text-slate-900 mb-2">{reasonModal.title}</h3>
                        <p className="text-sm text-slate-500 mb-6">Lý do này sẽ được gửi trực tiếp đến tác giả qua email.</p>
                        
                        <textarea
                            className="w-full h-32 p-5 rounded-[1.5rem] border border-slate-200 focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all outline-none text-sm resize-none"
                            placeholder="Nhập lý do chi tiết..."
                            value={reasonText}
                            onChange={(e) => setReasonText(e.target.value)}
                        />

                        <div className="flex items-center gap-3 mt-8">
                            <button
                                onClick={() => setReasonModal({ ...reasonModal, open: false })}
                                className="flex-1 py-4 rounded-2xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-all"
                            >
                                Hủy bỏ
                            </button>
                            <button
                                onClick={submitReasonAction}
                                className={`flex-1 py-4 rounded-2xl font-bold transition-all ${
                                    reasonModal.type === 'delete' 
                                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200' 
                                    : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
                                }`}
                            >
                                Xác nhận
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
