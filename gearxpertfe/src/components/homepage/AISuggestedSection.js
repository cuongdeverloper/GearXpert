import ProductCard from '../common/ProductCard';

export default function AISuggestedSection({ devices = [] }) {
  const suggestedDevices = devices.slice(0, 3);
  if (suggestedDevices.length === 0) return null;

  return (
    <section className="px-6 lg:px-10 mb-16">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 font-display">Đề xuất cho bạn</h2>
          <p className="text-slate-500 mt-2 font-medium">Các lựa chọn hàng đầu dựa trên hoạt động gần đây và sở thích của bạn.</p>
        </div>
        <button className="text-primary font-bold flex items-center gap-2 hover:underline">
          Xem đề xuất <span className="material-symbols-outlined">chevron_right</span>
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
              buttonText="Thuê thiết bị"
            />
          );
        })}
      </div>
    </section>
  );
}
