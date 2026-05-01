import { useState, useEffect } from 'react';
import ProductCard from '../common/ProductCard';
import { useTranslation } from 'react-i18next';

export default function NewArrivalsSection({ devices = [] }) {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(3);

  const items = devices;

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setItemsPerPage(2);
      } else if (window.innerWidth < 1024) {
        setItemsPerPage(2);
      } else {
        setItemsPerPage(3);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (items.length === 0) return null;

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - itemsPerPage : Math.max(0, items.length - itemsPerPage)));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + itemsPerPage < items.length ? prev + itemsPerPage : 0));
  };

  const visibleItems = items.slice(currentIndex, currentIndex + itemsPerPage);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-6 md:mb-8">
        <div>
          <h3 className="text-xl md:text-2xl font-black text-slate-900 font-display uppercase tracking-tight">{t('homepage.new_arrivals')}</h3>
        </div>
        <div className="flex gap-2 md:gap-3">
          <button
            onClick={handlePrev}
            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px] md:text-[20px]">chevron_left</span>
          </button>
          <button
            onClick={handleNext}
            className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px] md:text-[20px]">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="flex-1">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {visibleItems.map((item) => (
            <div key={item._id} className="animate-in fade-in slide-in-from-right-4 duration-500">
              <ProductCard
                device={item}
                variant="simple"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="flex justify-center gap-1.5 mt-8">
        {Array.from({ length: Math.ceil(items.length / itemsPerPage) }).map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-300 ${Math.floor(currentIndex / itemsPerPage) === i ? 'w-8 bg-slate-900' : 'w-2 bg-slate-200'
              }`}
          />
        ))}
      </div>
    </div>
  );
}
