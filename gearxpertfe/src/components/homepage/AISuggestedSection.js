import ProductCard from '../common/ProductCard';
import { useI18n } from '../../i18n/I18nContext';

export default function AISuggestedSection({ devices = [] }) {
  const { text } = useI18n();
  // Mock data if no devices provided
  const suggestedDevices = devices.length > 0 ? devices.slice(0, 3) : [
    {
      _id: '1',
      name: 'Sony FX6 Cinema Line',
      category: 'Cinema Camera',
      description: 'The ultimate full-frame camera for cinematic run-and-gun shooting.',
      price: 150,
      match: 98,
      image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80'
    },
    {
      _id: '2',
      name: 'Aputure LS 600d Pro',
      category: 'Lighting',
      description: 'Powerful point-source COB LED light for high-output daylight scenes.',
      price: 85,
      match: 94,
      image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'
    },
    {
      _id: '3',
      name: 'Sigma 24-70mm f/2.8 Art',
      category: 'Lenses',
      description: 'Versatile standard zoom with constant f/2.8 aperture and superb resolution.',
      price: 40,
      match: 92,
      image: 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80'
    }
  ];

  return (
    <section className="px-6 lg:px-10 mb-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 font-display">
            {text("Đề xuất cho bạn", "Recommended for you")}
          </h2>
          <p className="text-slate-500 mt-2 font-medium">
            {text(
              "Các lựa chọn hàng đầu dựa trên hoạt động gần đây và sở thích của bạn.",
              "Top picks based on your recent activity and preferences."
            )}
          </p>
        </div>
        <button className="text-primary font-bold flex items-center gap-2 hover:underline">
          {text("Xem đề xuất", "View recommendations")}{" "}
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {suggestedDevices.map((device, index) => {
          const match = device.match || device.ratingAvg || 90;
          
          return (
            <ProductCard
              key={device._id || index}
              device={device}
              variant="detailed"
              match={match}
              buttonText={text("Thuê thiết bị", "Rent gear")}
            />
          );
        })}
      </div>
    </section>
  );
}
