import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function SmartGearPromoSection() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");

  const quickIdeas = [
    t('smartgear.idea_1', { defaultValue: "Quay vlog du lịch ban đêm" }),
    t('smartgear.idea_2', { defaultValue: "Chụp ảnh sự kiện trong nhà" }),
    t('smartgear.idea_3', { defaultValue: "Set up podcast 2 người" }),
    t('smartgear.idea_4', { defaultValue: "Quay TVC sản phẩm mỹ phẩm" }),
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
              {t('smartgear.title_part1', { defaultValue: "Tư vấn combo thiết bị bằng" })} <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">AI</span> {t('smartgear.title_part2', { defaultValue: "thông minh." })}
            </h2>

            <p className="mt-3 text-slate-200 max-w-2xl text-sm md:text-base">
              {t('smartgear.subtitle')}
            </p>

            <div className="mt-6 rounded-2xl border border-white/15 bg-white/10 p-2 flex flex-col md:flex-row gap-2">
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleNavigateSmartGear()}
                placeholder={t('smartgear.placeholder')}
                className="flex-1 bg-transparent rounded-xl border border-white/10 text-white placeholder:text-white/60 px-4 py-3 outline-none focus:border-cyan-300"
              />
              <button
                onClick={handleNavigateSmartGear}
                className="rounded-xl bg-cyan-400 text-slate-950 font-bold px-5 py-3 hover:bg-cyan-300 transition-colors"
              >
                {t('smartgear.button')}
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
              <p className="text-xs uppercase tracking-[0.16em] font-black text-cyan-300">{t('smartgear.benefits_title')}</p>
              <div className="mt-4 space-y-3">
                <div className="rounded-xl border border-white/15 bg-black/20 p-3">
                  <p className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">{t('smartgear.benefit_1_title')}</p>
                  <p className="text-sm text-slate-200 mt-1">{t('smartgear.benefit_1_desc')}</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-black/20 p-3">
                  <p className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">{t('smartgear.benefit_2_title')}</p>
                  <p className="text-sm text-slate-200 mt-1">{t('smartgear.benefit_2_desc')}</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-black/20 p-3">
                  <p className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">{t('smartgear.benefit_3_title')}</p>
                  <p className="text-sm text-slate-200 mt-1">{t('smartgear.benefit_3_desc')}</p>
                </div>
                <div className="rounded-xl border border-white/15 bg-black/20 p-3">
                  <p className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">{t('smartgear.benefit_3_title')}</p>
                  <p className="text-sm text-slate-200 mt-1">{t('smartgear.benefit_4_desc')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}