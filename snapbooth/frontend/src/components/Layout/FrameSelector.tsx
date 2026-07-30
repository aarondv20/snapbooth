import React from 'react';
import type { FrameType } from '../../types';

interface FrameSelectorProps {
  selected: FrameType;
  onChange: (frame: FrameType) => void;
}

const frames: { value: FrameType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'simple', label: 'Border' },
  { value: 'instax', label: 'Instax' },
  { value: 'polaroid', label: 'Polaroid' },
  { value: 'film', label: 'Film' },
];

export const FrameSelector: React.FC<FrameSelectorProps> = ({ selected, onChange }) => (
  <div className="flex items-center gap-1.5 flex-wrap">
    <span className="text-sm font-medium text-gray-500 mr-1">Frame</span>
    {frames.map((f) => (
      <button
        key={f.value}
        onClick={() => onChange(f.value)}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
          selected === f.value
            ? 'bg-gray-900 text-white border-gray-900'
            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
        }`}
      >
        {f.label}
      </button>
    ))}
  </div>
);
