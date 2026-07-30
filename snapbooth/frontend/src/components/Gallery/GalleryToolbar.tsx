import React from 'react';
import type { SortOption } from '../../types';

interface GalleryToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  sort: SortOption;
  onSortChange: (v: SortOption) => void;
  favouritesOnly: boolean;
  onFavouritesToggle: (v: boolean) => void;
  total: number;
}

export const GalleryToolbar: React.FC<GalleryToolbarProps> = ({
  search,
  onSearchChange,
  sort,
  onSortChange,
  favouritesOnly,
  onFavouritesToggle,
  total,
}) => (
  <div className="flex flex-wrap items-center gap-3 mb-6">
    <div className="relative flex-1 min-w-[200px]">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        type="text"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search photos..."
        className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
      />
    </div>

    <select
      value={sort}
      onChange={(e) => onSortChange(e.target.value as SortOption)}
      className="px-3 py-2 rounded-xl border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-gray-900"
    >
      <option value="newest">Newest</option>
      <option value="oldest">Oldest</option>
      <option value="size">Size</option>
    </select>

    <button
      onClick={() => onFavouritesToggle(!favouritesOnly)}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
        favouritesOnly
          ? 'bg-red-50 border-red-200 text-red-600'
          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
      }`}
    >
      <span className="flex items-center gap-1.5">
        <svg className="w-4 h-4" fill={favouritesOnly ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        Favourites
      </span>
    </button>

    <span className="text-sm text-gray-400">{total} photos</span>
  </div>
);
