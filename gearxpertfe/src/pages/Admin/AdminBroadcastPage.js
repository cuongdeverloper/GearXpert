import { useState } from "react";
import { useDispatch } from "react-redux";
import { showAdminLoading, hideAdminLoading } from "../../redux/action/appAction";
import { broadcastNotification } from "../../service/ApiService/notificationApi";
import { toast } from "react-toastify";
import { FiSend, FiType, FiFileText, FiLink } from "react-icons/fi";
import { HiOutlineSpeakerphone } from "react-icons/hi";

export default function AdminBroadcastPage() {
  const dispatch = useDispatch();
  const [form, setForm] = useState({ title: "", message: "", link: "" });
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState([]);

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
        setHistory((prev) => [
          { ...form, sent: res.sent, time: new Date().toLocaleString("vi-VN") },
          ...prev,
        ]);
        setForm({ title: "", message: "", link: "" });
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
    <div className="max-w-3xl space-y-6">
      {/* Form */}
      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900">
          <HiOutlineSpeakerphone className="text-primary" size={22} />
          Gửi thông báo toàn hệ thống
        </h3>
        <p className="mb-5 text-sm text-slate-500">
          Thông báo sẽ được gửi đến tất cả người dùng đã đăng ký trong hệ thống.
        </p>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <FiType size={14} /> Tiêu đề <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="VD: Bảo trì hệ thống, Khuyến mãi đặc biệt..."
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              maxLength={200}
            />
          </div>

          {/* Message */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <FiFileText size={14} /> Nội dung <span className="text-red-500">*</span>
            </label>
            <textarea
              value={form.message}
              onChange={(e) => handleChange("message", e.target.value)}
              placeholder="Nhập nội dung thông báo chi tiết..."
              rows={5}
              className="w-full resize-none rounded-lg border border-slate-200 px-4 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              maxLength={1000}
            />
            <div className="mt-1 text-right text-xs text-slate-400">
              {form.message.length}/1000
            </div>
          </div>

          {/* Link (optional) */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <FiLink size={14} /> Đường dẫn
              <span className="text-xs text-slate-400">(tuỳ chọn)</span>
            </label>
            <input
              type="text"
              value={form.link}
              onChange={(e) => handleChange("link", e.target.value)}
              placeholder="VD: /vouchers, /products..."
              className="w-full rounded-lg border border-slate-200 px-4 py-2.5 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Send button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSend}
            disabled={sending || !form.title.trim() || !form.message.trim()}
            className="flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FiSend size={16} />
            {sending ? "Đang gửi..." : "Gửi thông báo"}
          </button>
        </div>
      </div>

      {/* History (session only) */}
      {history.length > 0 && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="mb-4 text-lg font-semibold text-slate-900">Lịch sử gửi (phiên này)</h3>
          <div className="space-y-3">
            {history.map((item, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3"
              >
                <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <HiOutlineSpeakerphone size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">{item.title}</p>
                  <p className="text-sm text-slate-500 line-clamp-2">{item.message}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                    <span>{item.time}</span>
                    <span>• Đã gửi đến {item.sent} người dùng</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
