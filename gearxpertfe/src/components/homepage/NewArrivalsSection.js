import { useState } from 'react';
import ProductCard from '../common/ProductCard';

export default function NewArrivalsSection({ devices = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Mock data if no devices provided
  const newArrivals = devices.length > 0 ? devices : [
    {
      _id: '1',
      name: 'DJI Mavic 3 Cine',
      price: 120,
      category: 'Drone',
      image: 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80'
    },
    {
      _id: '2',
      name: 'Rode Wireless GO II',
      price: 25,
      category: 'Audio',
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'
    },
    {
      _id: '3',
      name: 'BMPCC 6K Pro',
      price: 110,
      category: 'Cinema',
      image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80'
    }
  ];

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : newArrivals.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < newArrivals.length - 1 ? prev + 1 : 0));
  };

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-slate-900 font-display">New Arrivals</h3>
        <div className="flex gap-2">
          <button onClick={handlePrev} className="...">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button onClick={handleNext} className="...">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      <div className="flex justify-center transition-all duration-500">
        <ProductCard
          key={newArrivals[currentIndex]._id}
          device={newArrivals[currentIndex]}
          variant="simple"
        />
      </div>
    </div>
  );
}
