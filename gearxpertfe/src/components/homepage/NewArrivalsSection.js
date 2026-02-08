import { useState } from 'react';
import ProductCard from '../common/ProductCard';

export default function NewArrivalsSection({ devices = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerPage = 3;

  // Use provided devices or fallback to mock data
  const items = devices.length > 0 ? devices : [
    { _id: '1', name: 'DJI Mavic 3 Cine', price: 120, category: 'Drone', image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80' },
    { _id: '2', name: 'Rode Wireless GO II', price: 25, category: 'Audio', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80' },
    { _id: '3', name: 'BMPCC 6K Pro', price: 110, category: 'Cinema', image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80' },
    { _id: '4', name: 'Sony A7S III', price: 80, category: 'Cinema', image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80' },
    { _id: '5', name: 'Aputure 600d', price: 95, category: 'Lighting', image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80' },
    { _id: '6', name: 'DJI Ronin RS3', price: 45, category: 'Accessory', image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80' }
  ];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - itemsPerPage : Math.max(0, items.length - itemsPerPage)));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + itemsPerPage < items.length ? prev + itemsPerPage : 0));
  };

  const visibleItems = items.slice(currentIndex, currentIndex + itemsPerPage);

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-black text-slate-900 font-display uppercase tracking-tight">New Arrivals</h3>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handlePrev}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_left</span>
          </button>
          <button
            onClick={handleNext}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-600 hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="flex-1">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
