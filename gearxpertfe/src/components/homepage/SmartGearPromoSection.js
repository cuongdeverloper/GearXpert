import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SmartGearPromoSection() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");

  const quickIdeas = [
    "Quay vlog du lịch ban đêm",
    "Chụp ảnh sự kiện trong nhà",
    "Set up podcast 2 người",
    "Quay TVC sản phẩm mỹ phẩm",
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
    <section className="px-6 lg:px-10 mb-14">
      <div className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 shadow-2xl">
        <div className="absolute -top-20 -left-16 w-72 h-72 bg-cyan-400/20 blur-3xl rounded-full" />
        <div className="absolute -bottom-24 -right-8 w-80 h-80 bg-indigo-500/25 blur-3xl rounded-full" />

        <div className="relative z-10 grid grid-cols-1 xl:grid-cols-12 gap-8 p-6 md:p-8 lg:p-10">
          <div className="xl:col-span-7 text-white">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/10 mb-4">
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              <span className="text-[11px] font-black uppercase tracking-[0.16em]">SmartGear AI</span>
            </div>

            <h2 className="text-3xl md:text-4xl font-black leading-tight max-w-2xl">
              Tư vấn combo thiết bị bằng AI cho đúng bối cảnh quay chụp của bạn.
            </h2>

            <p className="mt-3 text-slate-200 max-w-2xl text-sm md:text-base">
              Mô tả nhu cầu một lần, SmartGear sẽ đề xuất 3 combo theo mức ngân sách và cho phép thêm thẳng vào giỏ thuê.
            </p>

            <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-2 flex flex-col md:flex-row gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNavigateSmartGear()}
                placeholder="Ví dụ: quay travel vlog 3 ngày, cần setup gọn nhẹ và pin trâu..."
                className="flex-1 bg-transparent rounded-xl border border-white/10 text-white placeholder:text-white/60 px-4 py-3 outline-none focus:border-cyan-300"
              />
              <button
                onClick={handleNavigateSmartGear}
                className="rounded-xl bg-cyan-400 text-slate-950 font-bold px-5 py-3 hover:bg-cyan-300 transition-colors"
              >
                Dùng SmartGear ngay
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
              <p className="text-xs uppercase tracking-[0.16em] font-black text-cyan-300">Lợi ích nổi bật</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-white/15 bg-black/20 p-3">
                  <p className="font-bold">03 gói đề xuất thông minh</p>
                  <p className="text-sm text-slate-200 mt-1">Cơ bản, tiêu chuẩn, cao cấp theo đúng nhu cầu mô tả.</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-black/20 p-3">
                  <p className="font-bold">Có lý do AI cho từng thiết bị</p>
                  <p className="text-sm text-slate-200 mt-1">Hiển thị rõ vì sao AI chọn camera, mic, ánh sáng.</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-black/20 p-3">
                  <p className="font-bold">Thêm combo vào giỏ chỉ 1 chạm</p>
                  <p className="text-sm text-slate-200 mt-1">Không cần chọn từng món, tiết kiệm rất nhiều thời gian.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
