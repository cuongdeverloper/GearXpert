import { useState } from 'react';

export default function HeroSection() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleGenerateKit = () => {
    // TODO: Implement AI kit generation
    console.log('Generate kit for:', searchQuery);
  };

  return (
    <section className="px-6 lg:px-10 py-10">
      <div className="relative w-full rounded-3xl overflow-hidden min-h-[520px] flex items-center justify-center shadow-2xl">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transform scale-105"
          style={{
            backgroundImage: 'url("https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1920&q=80")'
          }}
        />
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/60 via-slate-900/40 to-cyan-900/60"></div>
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-4xl px-6 text-center flex flex-col items-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-panel text-white mb-8 border-white/30">
            <span className="material-symbols-outlined text-accent-cyan text-[18px] fill-current">auto_awesome</span>
            <span className="text-xs font-bold tracking-[0.1em] uppercase">Intelligence Engine V2.0</span>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 leading-[1.1] font-display">
            Your Vision, <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-indigo-300">Perfectly Equipped</span>
          </h1>

          {/* Description */}
          <p className="text-lg md:text-xl text-slate-100 mb-12 max-w-2xl font-light">
            Describe your shoot concept or upload a storyboard. Our AI will curate the industry-standard kit for your creative vision.
          </p>

          {/* Search Bar */}
          <div className="w-full max-w-3xl glass-panel bg-white/10 p-2 rounded-2xl flex items-center shadow-2xl border-white/40 ring-4 ring-black/5 transition-all focus-within:ring-white/20">
            <div className="pl-4 text-white/80">
              <span className="material-symbols-outlined text-3xl">search</span>
            </div>
            <input
              className="flex-1 bg-transparent border-none text-white placeholder-white/60 focus:ring-0 text-lg font-medium px-4 h-14"
              placeholder="Describe your scene (e.g., 'A cinematic noir night in Tokyo with neon reflections')"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleGenerateKit()}
            />
            <div className="flex gap-2">
              <button
                onClick={handleGenerateKit}
                className="bg-white text-indigo-600 hover:bg-slate-100 font-bold px-8 py-3 rounded-xl transition-all shadow-lg flex items-center gap-2 group"
              >
                Generate Kit
                <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">bolt</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
