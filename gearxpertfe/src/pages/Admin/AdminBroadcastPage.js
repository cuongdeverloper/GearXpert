import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import { 
  broadcastNotification, 
  getAdminBroadcastHistory,
  getNotifications
} from "../../service/ApiService/notificationApi";
import { toast } from "react-toastify";
import { 
  FiSend, 
  FiType, 
  FiFileText, 
  FiLink, 
  FiClock, 
  FiInbox, 
  FiCheckCircle, 
  FiUser,
  FiActivity,
  FiRefreshCw
} from "react-icons/fi";
import { HiOutlineSpeakerphone } from "react-icons/hi";
import Pagination from "../../components/common/Pagination";
import { formatDate } from "../../utils/formatters";

export default function AdminBroadcastPage() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("SEND"); // SEND | HISTORY | RECEIVED
  
  // Send Form State
  const [form, setForm] = useState({ title: "", message: "", link: "" });
  const [sending, setSending] = useState(false);
  
  // History State
  const [history, setHistory] = useState([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Received State
  const [received, setReceived] = useState([]);
  const [receivedPage, setReceivedPage] = useState(1);
  const [receivedTotalPages, setReceivedTotalPages] = useState(1);
  const [loadingReceived, setLoadingReceived] = useState(false);

  const fetchHistory = useCallback(async (page = 1) => {
    setLoadingHistory(true);
    try {
      const res = await getAdminBroadcastHistory({ page, limit: 10 });
      if (res?.success) {
        setHistory(res.history);
        setHistoryTotalPages(res.pagination.totalPages);
        setHistoryPage(res.pagination.page);
      }
    } catch (err) {
      console.error("Failed to fetch broadcast history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const fetchReceived = useCallback(async (page = 1) => {
    setLoadingReceived(true);
    try {
      const res = await getNotifications({ page, limit: 10 });
      // Depending on interceptor, res might be { notifications, total, ... }
      const data = res?.notifications || res?.data?.notifications || res || [];
      const totalPages = res?.totalPages || res?.data?.totalPages || 1;
      setReceived(Array.isArray(data) ? data : []);
      setReceivedTotalPages(totalPages);
      setReceivedPage(page);
    } catch (err) {
      console.error("Failed to fetch received notifications:", err);
    } finally {
      setLoadingReceived(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "HISTORY") fetchHistory(1);
    if (activeTab === "RECEIVED") fetchReceived(1);
  }, [activeTab, fetchHistory, fetchReceived]);

  const handleChange = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      toast.error("Vui lòng nhập tiêu đề và nội dung thông báo");
      return;
    }

    setSending(true);
    dispatch(showAdminLoading());
    try {
      const res = await broadcastNotification({
        title: form.title.trim(),
        message: form.message.trim(),
        link: form.link.trim() || undefined,
      });

      if (res?.success) {
        toast.success(`Đã gửi thông báo đến ${res.sent} người dùng`);
        setForm({ title: "", message: "", link: "" });
        if (activeTab === "HISTORY") fetchHistory(1);
      } else {
        toast.error(res?.message || "Gửi thông báo thất bại");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Lỗi khi gửi thông báo");
    } finally {
      setSending(false);
      dispatch(hideAdminLoading());
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center gap-6 border-b border-slate-200 pb-1">
        <TabButton 
          active={activeTab === "SEND"} 
          onClick={() => setActiveTab("SEND")} 
          icon={<FiSend />} 
          label="Gửi thông báo" 
        />
        <TabButton 
          active={activeTab === "HISTORY"} 
          onClick={() => setActiveTab("HISTORY")} 
          icon={<FiClock />} 
          label="Lịch sử gửi" 
        />
        <TabButton 
          active={activeTab === "RECEIVED"} 
          onClick={() => setActiveTab("RECEIVED")} 
          icon={<FiInbox />} 
          label="Thông báo đã nhận" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-8">
          {activeTab === "SEND" && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
              <div className="p-8 border-b border-slate-100 bg-slate-50/50">
                <h3 className="text-xl font-black text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-200">
                    <HiOutlineSpeakerphone size={22} />
                  </div>
                  Phát thông báo hệ thống
                </h3>
                <p className="mt-2 text-sm text-slate-500 font-medium">
                  Nội dung sẽ được gửi đến hộp thư của tất cả người dùng trong hệ thống qua Socket.io và Database.
                </p>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Tiêu đề thông báo</label>
                    <div className="relative group">
                      <FiType className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input
                        type="text"
                        value={form.title}
                        onChange={(e) => handleChange("title", e.target.value)}
                        placeholder="VD: Cập nhật chính sách bảo mật mới"
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-sm font-bold text-slate-700"
                        maxLength={200}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Đường dẫn đính kèm (URL)</label>
                    <div className="relative group">
                      <FiLink className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input
                        type="text"
                        value={form.link}
                        onChange={(e) => handleChange("link", e.target.value)}
                        placeholder="VD: /vouchers hoặc https://..."
                        className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-sm font-bold text-slate-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Nội dung chi tiết</label>
                  <div className="relative group">
                    <FiFileText className="absolute left-4 top-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <textarea
                      value={form.message}
                      onChange={(e) => handleChange("message", e.target.value)}
                      placeholder="Nhập nội dung thông báo tại đây..."
                      rows={6}
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all text-sm font-medium text-slate-600 leading-relaxed"
                      maxLength={1000}
                    />
                    <div className="absolute bottom-4 right-4 px-2 py-1 bg-white/80 backdrop-blur rounded-lg border border-slate-100 text-[10px] font-bold text-slate-400">
                      {form.message.length}/1000
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    onClick={handleSend}
                    disabled={sending || !form.title.trim() || !form.message.trim()}
                    className="flex items-center gap-3 rounded-2xl bg-slate-900 px-10 py-4 text-sm font-black text-white shadow-xl shadow-slate-200 hover:bg-indigo-600 transition-all active:scale-95 disabled:opacity-50 disabled:scale-100"
                  >
                    <FiSend size={18} />
                    {sending ? "Đang xử lý..." : "Gửi thông báo ngay"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "HISTORY" && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Lịch sử phát sóng</h3>
                  <p className="text-xs text-slate-400 font-medium">Danh sách các thông báo đã gửi toàn hệ thống</p>
                </div>
                <button 
                  onClick={() => fetchHistory(1)}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-indigo-500"
                >
                  <FiRefreshCw size={20} className={loadingHistory ? "animate-spin" : ""} />
                </button>
              </div>

              <div className="divide-y divide-slate-50">
                {loadingHistory ? (
                  <div className="p-20 text-center text-slate-400 font-bold">Đang tải dữ liệu...</div>
                ) : history.length > 0 ? (
                  history.map((item, idx) => (
                    <div key={idx} className="p-6 hover:bg-slate-50/50 transition-colors group">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                          <HiOutlineSpeakerphone size={24} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <h4 className="font-bold text-slate-800 truncate">{item.title}</h4>
                            <span className="text-[10px] font-black text-slate-400 whitespace-nowrap bg-slate-100 px-2 py-1 rounded-lg">
                              {formatDate(item.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed mb-3">{item.message}</p>
                          <div className="flex items-center gap-6">
                            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                              <FiCheckCircle size={14} />
                              Đã gửi: {item.sentCount}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                              <FiActivity size={14} />
                              Đã đọc: {item.readCount} ({Math.round((item.readCount/item.sentCount)*100)}%)
                            </div>
                            {item.link && (
                              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                <FiLink size={14} />
                                {item.link}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-20 text-center flex flex-col items-center opacity-20">
                    <HiOutlineSpeakerphone size={64} className="mb-4" />
                    <p className="text-sm font-bold">Chưa có lịch sử thông báo nào</p>
                  </div>
                )}
              </div>
              
              {historyTotalPages > 1 && (
                <div className="p-6 border-t border-slate-50">
                  <Pagination 
                    currentPage={historyPage} 
                    totalPages={historyTotalPages} 
                    onPageChange={fetchHistory} 
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === "RECEIVED" && (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
              <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Thông báo của bạn</h3>
                  <p className="text-xs text-slate-400 font-medium">Các cảnh báo và thông tin từ hệ thống dành cho Admin</p>
                </div>
                <button 
                  onClick={() => fetchReceived(1)}
                  className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-indigo-500"
                >
                  <FiRefreshCw size={20} className={loadingReceived ? "animate-spin" : ""} />
                </button>
              </div>

              <div className="divide-y divide-slate-50">
                {loadingReceived ? (
                  <div className="p-20 text-center text-slate-400 font-bold">Đang tải dữ liệu...</div>
                ) : received.length > 0 ? (
                  received.map((notif) => (
                    <div key={notif._id} className={`p-6 transition-colors group ${notif.isRead ? 'opacity-70' : 'bg-indigo-50/20'}`}>
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${notif.isRead ? 'bg-slate-100 text-slate-400' : 'bg-indigo-100 text-indigo-600'}`}>
                          <FiInbox size={20} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <h4 className={`text-sm font-bold text-slate-800 truncate ${notif.isRead ? 'font-medium' : 'font-black'}`}>{notif.title}</h4>
                            <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                              {formatDate(notif.createdAt)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 leading-relaxed mb-1">{notif.message}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black uppercase tracking-tighter px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{notif.type}</span>
                            {!notif.isRead && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-20 text-center flex flex-col items-center opacity-20">
                    <FiInbox size={64} className="mb-4" />
                    <p className="text-sm font-bold">Hộp thư của bạn đang trống</p>
                  </div>
                )}
              </div>
              
              {receivedTotalPages > 1 && (
                <div className="p-6 border-t border-slate-50">
                  <Pagination 
                    currentPage={receivedPage} 
                    totalPages={receivedTotalPages} 
                    onPageChange={fetchReceived} 
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar / Tips Area */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 text-white shadow-xl shadow-indigo-100">
            <h4 className="text-lg font-black mb-4 flex items-center gap-2">
              <FiActivity />
              Mẹo quản trị
            </h4>
            <ul className="space-y-4 text-xs font-medium text-indigo-100 leading-relaxed">
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">1</div>
                <span>Sử dụng tiêu đề ngắn gọn, súc tích để thu hút sự chú ý của người dùng ngay lập tức.</span>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">2</div>
                <span>Đính kèm đường dẫn (slug) để điều hướng người dùng đến trang khuyến mãi hoặc thông tin chi tiết.</span>
              </li>
              <li className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">3</div>
                <span>Tránh gửi quá nhiều thông báo trong thời gian ngắn để không gây phiền phức (spam) cho người dùng.</span>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 py-4 text-sm font-black border-b-2 transition-all ${
        active 
          ? "text-indigo-600 border-indigo-600" 
          : "text-slate-400 border-transparent hover:text-slate-600"
      }`}
    >
      <span className={active ? "text-indigo-600" : "text-slate-400"}>
        {icon}
      </span>
      {label}
    </button>
  );
}
