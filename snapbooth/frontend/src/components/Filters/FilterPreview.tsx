import React from 'react';
import type { FilterInfo } from '../../types';

interface FilterPreviewProps {
  filters: FilterInfo[];
  selectedFilter: string;
  onSelect: (id: string) => void;
  previews: Record<string, string>;
  loading: boolean;
}

export const FilterPreview: React.FC<FilterPreviewProps> = ({
  filters,
  selectedFilter,
  onSelect,
  previews,
  loading,
}) => (
  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
    {filters.map((f) => (
      <button
        key={f.id}
        onClick={() => onSelect(f.id)}
        className={`flex-shrink-0 flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all duration-200 ${
          selectedFilter === f.id
            ? 'bg-gray-100 ring-2 ring-gray-900'
            : 'hover:bg-gray-50'
        }`}
      >
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
          {previews[f.id] && !loading ? (
            <img src={previews[f.id]} alt={f.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
              {loading ? '...' : f.name[0]}
            </div>
          )}
        </div>
        <span className={`text-xs font-medium ${selectedFilter === f.id ? 'text-gray-900' : 'text-gray-500'}`}>
          {f.name}
        </span>
      </button>
    ))}
  </div>
);
