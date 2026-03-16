import React from 'react';

export function CategoryFilter({
  categories,
  activeCategory,
  onSelect
}) {
  return (
    <div className="flex overflow-x-auto hide-scrollbar gap-2 py-2 px-4 -mx-4">
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onSelect(category.name)}
          className={`whitespace-nowrap px-4 py-3 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 ${activeCategory === category.name ? 'bg-gray-900 text-white shadow-md scale-105' : 'bg-white text-gray-500 border border-gray-100'}`}
        >
          <span className="text-lg">{category.icon || '🍽️'}</span>
          {category.name}
        </button>
      ))}
    </div>
  );
}
