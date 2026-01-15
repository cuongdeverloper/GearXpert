export default function CategoryFilters({ categories = [], selectedCategory, onCategorySelect }) {
  const defaultCategories = [
    { name: 'Cinematography', id: 'cinematography' },
    { name: 'Lighting Kits', id: 'lighting' },
    { name: 'Audio Gear', id: 'audio' },
    { name: 'Gimbal & Grip', id: 'gimbal' },
    { name: 'Aerial / Drones', id: 'drones' },
  ];

  const categoriesToShow = categories.length > 0 ? categories : defaultCategories;

  return (
    <section className="px-6 lg:px-10 mb-12">
      <div className="flex gap-3 overflow-x-auto pb-4 hide-scroll">
        {categoriesToShow.map((category) => {
          const isSelected = selectedCategory === category.id || selectedCategory === category.category;
          return (
            <button
              key={category.id || category.category}
              onClick={() => onCategorySelect?.(category.id || category.category)}
              className={`px-6 py-3 rounded-full border text-sm font-bold shadow-sm transition-all whitespace-nowrap ${
                isSelected
                  ? 'bg-primary text-white border-primary'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:text-primary'
              }`}
            >
              {category.name}
            </button>
          );
        })}
      </div>
    </section>
  );
}
