import { useNavigate } from 'react-router-dom';
import ImageWithFallback from '../common/ImageWithFallback';
import { useTranslation } from 'react-i18next';

export default function TrendingNowSection({ device = null }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const trendingDevice = device;
  if (!trendingDevice) return null;

  return (
    <div className="w-full">
      <h3 className="text-2xl font-bold text-slate-900 mb-6 font-display">{t('homepage.trending_now')}</h3>
      <div className="relative rounded-3xl overflow-hidden h-[450px] shadow-xl group">
        <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110">
          <ImageWithFallback
            src={trendingDevice.image || trendingDevice.images?.[0]}
            alt={trendingDevice.name}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10"></div>
        <div className="absolute bottom-0 left-0 p-6 md:p-8 z-20">
          <span className="bg-accent-cyan text-slate-900 text-[10px] font-black px-3 py-1 rounded-md uppercase tracking-widest mb-3 md:mb-4 inline-block">
            {t('homepage.popular_product', { defaultValue: "Sản phẩm phổ biến" })}
          </span>
          <h4 className="text-2xl md:text-4xl font-bold text-white mb-2 md:mb-3 font-display leading-tight">{trendingDevice.name}</h4>
          <p className="text-slate-300 mb-6 md:mb-8 max-w-sm text-xs md:text-base font-medium line-clamp-2 md:line-clamp-none">{trendingDevice.description}</p>
          <button
            onClick={() => trendingDevice.slug && navigate(`/device/${trendingDevice.slug}`)}
            className="bg-white text-slate-900 font-bold px-6 md:px-8 py-2.5 md:py-3.5 rounded-xl md:rounded-2xl hover:bg-slate-100 transition-all flex items-center gap-2 text-sm md:text-base"
          >
            {t('common.view_more')}
            <span className="material-symbols-outlined text-sm md:text-base">schedule</span>
          </button>
        </div>
      </div>
    </div>
  );
}
