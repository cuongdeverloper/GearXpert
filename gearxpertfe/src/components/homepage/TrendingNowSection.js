import { useNavigate } from 'react-router-dom';
import ImageWithFallback from '../common/ImageWithFallback';

export default function TrendingNowSection({ device = null }) {
  const navigate = useNavigate();

  // Mock data if no device provided
  const trendingDevice = device || {
    _id: 'trending-1',
    name: 'RED Komodo 6K',
    description: 'Capture RAW brilliance in a compact form factor. Most requested this week.',
    image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=1200&q=80'
  };

  return (
    <div className="w-full">
      <h3 className="text-2xl font-bold text-slate-900 mb-6 font-display">Trending Now</h3>
      <div className="relative rounded-3xl overflow-hidden h-[450px] shadow-xl group">
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110">
          <ImageWithFallback
            src={trendingDevice.image || trendingDevice.images?.[0]}
            alt={trendingDevice.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
        <div className="absolute bottom-0 left-0 p-8">
          <span className="bg-accent-cyan text-slate-900 text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-widest mb-4 inline-block">
            Popular Production
          </span>
          <h4 className="text-4xl font-bold text-white mb-3 font-display leading-tight">{trendingDevice.name}</h4>
          <p className="text-slate-300 mb-8 max-w-sm font-medium">{trendingDevice.description}</p>
          <button
            onClick={() => trendingDevice._id && navigate(`/device/${trendingDevice._id}`)}
            className="bg-white text-slate-900 font-bold px-8 py-3.5 rounded-2xl hover:bg-slate-100 transition-all flex items-center gap-2"
          >
            Reserve Camera
            <span className="material-symbols-outlined">schedule</span>
          </button>
        </div>
      </div>
    </div>
  );
}
