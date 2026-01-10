import React from 'react';

/**
 * CategoryPills Component
 * 
 * A reusable horizontal scrollable list of category pills.
 * 
 * @param {Array} categories - Array of category objects { id, name, ... }
 * @param {string|number} activeCategory - The ID of the currently selected category
 * @param {function} onSelect - Callback when a category is selected (returns category ID)
 * @param {string} className - Optional custom classes for the container
 */
const CategoryPills = ({ categories = [], activeCategory, onSelect, className = '' }) => {
    if (!categories || categories.length === 0) return null;

    return (
        <div className={`overflow-x-auto pb-2 hide-scroll ${className}`}>
            <div className="flex gap-3">
                {categories.map((category) => {
                    const isSelected = activeCategory === category.id || activeCategory === category.category;
                    return (
                        <button
                            key={category.id || category.category || category.name}
                            onClick={() => onSelect?.(category.id || category.category)}
                            className={`px-6 py-3 rounded-full border text-sm font-bold shadow-sm transition-all whitespace-nowrap ${isSelected
                                    ? 'bg-primary text-white border-primary'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-primary hover:text-primary'
                                }`}
                        >
                            {category.name}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default CategoryPills;
