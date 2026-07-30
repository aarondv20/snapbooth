import React from 'react';
import type { FilterInfo } from '../../types';

interface FilterSelectorProps {
  filters: FilterInfo[];
  selected: string;
  onSelect: (id: string) => void;
}

export const FilterSelector: React.FC<FilterSelectorProps> = ({ filters, selected, onSelect }) => (
  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
    {filters.map((f) => (
      <button
        key={f.id}
        onClick={() => onSelect(f.id)}
        className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
          selected === f.id
            ? 'bg-gray-900 text-white border-gray-900 shadow-sm'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:shadow-sm'
        }`}
      >
        {f.name}
      </button>
    ))}
  </div>
);
