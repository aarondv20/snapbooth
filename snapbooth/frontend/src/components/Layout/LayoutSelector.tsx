import React from 'react';
import type { LayoutType } from '../../types';

interface LayoutSelectorProps {
  selected: LayoutType;
  onChange: (layout: LayoutType) => void;
}

const layouts: { value: LayoutType; label: string; icon: string }[] = [
  { value: 'single', label: 'Single', icon: '▭' },
  { value: 'strip', label: 'Strip', icon: '▤' },
  { value: '2x2', label: '2×2', icon: '▦' },
  { value: '2x1_side', label: '2:1', icon: '▬' },
];

export const LayoutSelector: React.FC<LayoutSelectorProps> = ({ selected, onChange }) => (
  <div className="flex items-center gap-1.5 flex-wrap">
    <span className="text-sm font-medium text-gray-500 mr-1">Layout</span>
    {layouts.map((l) => (
      <button
        key={l.value}
        onClick={() => onChange(l.value)}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
          selected === l.value
            ? 'bg-gray-900 text-white border-gray-900'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
        }`}
      >
        {l.label}
      </button>
    ))}
  </div>
);
