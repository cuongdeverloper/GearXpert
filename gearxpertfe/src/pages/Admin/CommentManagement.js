import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { 
    getAllComments, 
    deleteComment, 
    getSensitiveKeywords, 
    addSensitiveKeyword, 
    deleteSensitiveKeyword 
} from "../../service/ApiService/BlogApi";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import { FiSearch, FiTrash2, FiMessageSquare, FiShield, FiPlus, FiX } from "react-icons/fi";
import { toast } from "react-toastify";
import { formatDate } from "../Blog/BlogConstants";

export default function CommentManagement() {
    const dispatch = useDispatch();
    const currentUser = useSelector(state => state.user.account);
    const [comments, setComments] = useState([]);
    const [keywords, setKeywords] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [newKeyword, setNewKeyword] = useState("");
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState("comments"); // comments or keywords

    const fetchData = useCallback(async (isInitial = false) => {
        try {
            if (isInitial) dispatch(showAdminLoading());
            setLoading(true);
            
            if (activeTab === "comments") {
                const res = await getAllComments();
                setComments(res || []);
            } else {
                const res = await getSensitiveKeywords();
                setKeywords(res || []);
            }
        } catch (error) {
            console.error("Error fetching data:", error);
            toast.error("Lỗi khi tải dữ liệu");
        } finally {
            setLoading(false);
            if (isInitial) dispatch(hideAdminLoading());
        }
    }, [activeTab, dispatch]);

    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    const handleDeleteComment = async (comment) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa bình luận này?")) return;
        try {
            dispatch(showAdminLoading());
            await deleteComment(comment.blogId, comment._id, currentUser.username || currentUser.email, "ADMIN");
            toast.success("Đã xóa bình luận thành công");
            fetchData();
        } catch (error) {
            toast.error("Lỗi khi xóa bình luận");
        } finally {
            dispatch(hideAdminLoading());
        }
    };

    const handleAddKeyword = async (e) => {
        e.preventDefault();
        if (!newKeyword.trim()) return;
        try {
            await addSensitiveKeyword({ 
                keyword: newKeyword.trim(), 
                adminName: currentUser.username || currentUser.email 
            });
            toast.success("Đã thêm từ khóa nhạy cảm");
            setNewKeyword("");
            fetchData();
        } catch (error) {
            toast.error(error.response?.data?.message || "Lỗi khi thêm từ khóa");
        }
    };

    const handleDeleteKeyword = async (id) => {
        try {
            await deleteSensitiveKeyword(id);
            toast.success("Đã xóa từ khóa");
            fetchData();
        } catch (error) {
            toast.error("Lỗi khi xóa từ khóa");
        }
    };

    const filteredComments = comments.filter(c => 
        c.text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.blogTitle.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Stats & Tabs */}
            <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
                <div className="flex gap-2 p-1 bg-slate-100 rounded-[1.5rem] w-fit">
                    <button
                        onClick={() => setActiveTab("comments")}
                        className={`px-8 py-3 rounded-[1.2rem] text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === "comments" 
                                ? "bg-white text-primary shadow-sm" 
                                : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        Tất cả bình luận
                    </button>
                    <button
                        onClick={() => setActiveTab("keywords")}
                        className={`px-8 py-3 rounded-[1.2rem] text-xs font-black uppercase tracking-widest transition-all ${
                            activeTab === "keywords" 
                                ? "bg-white text-primary shadow-sm" 
                                : "text-slate-500 hover:text-slate-700"
                        }`}
                    >
                        Từ khóa nhạy cảm
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
                        <FiMessageSquare className="text-primary" />
                        <span className="text-sm font-bold text-slate-600">
                            {activeTab === "comments" ? `${comments.length} Bình luận` : `${keywords.length} Từ khóa`}
                        </span>
                    </div>
                </div>
            </div>

            {activeTab === "comments" ? (
                <>
                    {/* Search */}
                    <div className="relative max-w-lg w-full">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Tìm bình luận, người dùng hoặc bài viết..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 rounded-[1.5rem] border border-slate-200 bg-white focus:ring-4 focus:ring-primary/5 transition-all outline-none"
                        />
                    </div>

                    {/* Comments Table */}
                    <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden relative">
                        {loading && (
                            <div className="absolute inset-0 z-10 bg-white/40 backdrop-blur-[1px] flex items-center justify-center">
                                <div className="h-10 w-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Người dùng</th>
                                        <th className="px-6 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Nội dung</th>
                                        <th className="px-6 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Bài viết</th>
                                        <th className="px-6 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-center">Thời gian</th>
                                        <th className="px-6 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 text-right">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {filteredComments.map((comment) => (
                                        <tr key={comment._id} className="hover:bg-slate-50/30 transition-colors group">
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs overflow-hidden border border-slate-100">
                                                        {comment.avatar ? (
                                                            <img src={comment.avatar} alt="" className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span>{comment.user.charAt(0).toUpperCase()}</span>
                                                        )}
                                                    </div>
                                                    <span className="font-bold text-slate-700 text-sm">{comment.user}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <p className="text-sm text-slate-600 line-clamp-2 max-w-md">{comment.text}</p>
                                            </td>
                                            <td className="px-6 py-6 text-sm text-slate-500 font-medium italic">
                                                <a href={`/blog/${comment.blogId}`} target="_blank" rel="noreferrer" className="hover:text-primary transition-colors line-clamp-1">
                                                    {comment.blogTitle}
                                                </a>
                                            </td>
                                            <td className="px-6 py-6 text-center text-xs font-bold text-slate-400 whitespace-nowrap">
                                                {formatDate(comment.createdAt)}
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                <button
                                                    onClick={() => handleDeleteComment(comment)}
                                                    className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-red-600 hover:border-red-600 transition-all opacity-0 group-hover:opacity-100"
                                                    title="Xóa bình luận"
                                                >
                                                    <FiTrash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredComments.length === 0 && !loading && (
                            <div className="py-20 text-center text-slate-300">
                                <FiMessageSquare size={48} className="mx-auto mb-4 opacity-20" />
                                <p className="font-black uppercase tracking-widest text-xs">Không có bình luận nào</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Add Keyword Form */}
                    <div className="lg:col-span-1">
                        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl sticky top-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                    <FiShield size={20} />
                                </div>
                                <h3 className="text-lg font-black text-slate-900">Thêm từ khóa</h3>
                            </div>
                            <form onSubmit={handleAddKeyword} className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Từ khóa nhạy cảm</label>
                                    <input
                                        type="text"
                                        value={newKeyword}
                                        onChange={(e) => setNewKeyword(e.target.value)}
                                        placeholder="Ví dụ: badword..."
                                        className="w-full px-5 py-4 rounded-2xl border border-slate-200 focus:border-primary transition-all outline-none text-sm"
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={!newKeyword.trim()}
                                    className="w-full py-4 rounded-2xl bg-primary text-white font-black text-xs uppercase tracking-widest hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                                >
                                    <span className="flex items-center justify-center gap-2">
                                        <FiPlus size={16} /> Thêm vào danh sách
                                    </span>
                                </button>
                            </form>
                            <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-100 italic text-xs text-slate-500 leading-relaxed">
                                <p><strong>Lưu ý:</strong> Khi một từ khóa được thêm vào, bất kỳ bình luận nào mới có chứa từ khóa này sẽ bị hệ thống chặn tự động ngay lập tức.</p>
                            </div>
                        </div>
                    </div>

                    {/* Keywords List */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden min-h-[400px]">
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                                <h3 className="font-black text-slate-900">Danh sách từ khóa bị chặn</h3>
                                <span className="bg-red-50 text-red-600 text-[10px] font-black px-3 py-1 rounded-full uppercase">Sẻ bị chặn tự động</span>
                            </div>
                            <div className="p-8">
                                <div className="flex flex-wrap gap-3">
                                    {keywords.map((kw) => (
                                        <div 
                                            key={kw._id} 
                                            className="group flex items-center gap-2 bg-white border border-slate-200 px-4 py-2.5 rounded-xl hover:border-red-200 hover:bg-red-50 transition-all"
                                        >
                                            <span className="text-sm font-bold text-slate-700 group-hover:text-red-700">{kw.keyword}</span>
                                            <button 
                                                onClick={() => handleDeleteKeyword(kw._id)}
                                                className="text-slate-300 hover:text-red-600 transition-colors"
                                                title="Xóa từ khóa"
                                            >
                                                <FiX size={14} />
                                            </button>
                                        </div>
                                    ))}
                                    {keywords.length === 0 && (
                                        <div className="w-full py-12 text-center text-slate-300">
                                            <FiShield size={32} className="mx-auto mb-3 opacity-20" />
                                            <p className="text-xs font-bold uppercase tracking-widest">Danh sách trống</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
