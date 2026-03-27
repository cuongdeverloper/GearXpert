import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../../i18n/I18nContext";

export default function SmartGearPromoSection() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const { text } = useI18n();

  const quickIdeas = [
    text("Quay vlog du lịch ban đêm", "Night travel vlog"),
    text("Chụp ảnh sự kiện trong nhà", "Indoor event photography"),
    text("Set up podcast 2 người", "Two-person podcast setup"),
    text("Quay TVC sản phẩm mỹ phẩm", "Beauty product commercial shoot"),
  ];

  const handleNavigateSmartGear = () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) {
      navigate("/smartgear");
      return;
    }
    navigate(`/smartgear?prompt=${encodeURIComponent(trimmedPrompt)}`);
  };

  return (
    <section className="px-6 lg:px-10 mt-10 mb-14">
      <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-slate-950 shadow-2xl">
        {/* Background Image with Overlay */}
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920&q=80")'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-cyan-950/80" />
        
        <div className="absolute -top-20 -left-16 w-72 h-72 bg-cyan-400/20 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -right-8 w-80 h-80 bg-indigo-500/25 blur-3xl rounded-full" />

        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-8 p-6 md:p-12 lg:p-16">
          <div className="xl:col-span-7 text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/10 mb-6">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              <span className="text-[11px] font-black uppercase tracking-[0.16em]">SmartGear AI</span>
            </div>

            <h2 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight max-w-2xl">
              {text("Tư vấn combo thiết bị bằng", "Get gear bundles with")}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">AI</span>{" "}
              {text("thông minh.", "smart recommendations.")}
            </h2>

            <p className="mt-3 text-slate-200 max-w-2xl text-sm md:text-base">
              {text(
                "Mô tả nhu cầu một lần, SmartGear sẽ đề xuất 3 combo theo mức ngân sách và cho phép thêm thẳng vào giỏ thuê.",
                "Describe your needs once. SmartGear suggests 3 bundles by budget and lets you add them straight to your rental cart."
              )}
            </p>

            <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-2 flex flex-col md:flex-row gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNavigateSmartGear()}
                placeholder={text(
                  "Ví dụ: quay travel vlog 3 ngày, cần setup gọn nhẹ và pin trâu...",
                  "Example: a 3-day travel vlog, need a compact setup with long battery life..."
                )}
                className="flex-1 bg-transparent rounded-xl border border-white/10 text-white placeholder:text-white/60 px-4 py-3 outline-none focus:border-cyan-300"
              />
              <button
                onClick={handleNavigateSmartGear}
                className="rounded-xl bg-cyan-400 text-slate-950 font-bold px-5 py-3 hover:bg-cyan-300 transition-colors"
              >
                {text("Dùng SmartGear ngay", "Try SmartGear now")}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {quickIdeas.map((idea) => (
                <button
                  key={idea}
                  onClick={() => setPrompt(idea)}
                  className="text-xs md:text-sm px-3 py-1.5 rounded-full border border-white/20 bg-white/10 hover:bg-white/20 transition text-slate-100"
                >
                  {idea}
                </button>
              ))}
            </div>
          </div>

          <div className="xl:col-span-5">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-5 text-white h-full">
              <p className="text-xs uppercase tracking-[0.16em] font-black text-cyan-300">
                {text("Lợi ích nổi bật", "Key benefits")}
              </p>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-white/15 bg-black/20 p-3">
                  <p className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                    {text("03 gói đề xuất thông minh", "3 smart bundle options")}
                  </p>
                  <p className="text-sm text-slate-200 mt-1">
                    {text(
                      "Cơ bản, tiêu chuẩn, cao cấp theo đúng nhu cầu mô tả.",
                      "Basic, standard, and premium—matched to your needs."
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-white/15 bg-black/20 p-3">
                  <p className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                    {text("Có lý do AI cho từng thiết bị", "AI rationale for each item")}
                  </p>
                  <p className="text-sm text-slate-200 mt-1">
                    {text(
                      "Hiển thị rõ vì sao AI chọn camera, mic, ánh sáng.",
                      "See why AI picked the camera, mic, and lighting."
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-white/15 bg-black/20 p-3">
                  <p className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">
                    {text("Thêm combo vào giỏ chỉ 1 chạm", "Add a bundle in one tap")}
                  </p>
                  <p className="text-sm text-slate-200 mt-1">
                    {text(
                      "Không cần chọn từng món, tiết kiệm rất nhiều thời gian.",
                      "No need to pick items one by one—save tons of time."
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
