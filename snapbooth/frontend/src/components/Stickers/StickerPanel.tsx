import React from 'react';
import type { Sticker, StickerPreset } from '../../types';

const BUILTIN_STICKERS: StickerPreset[] = [
  { id: 'star', emoji: '⭐', label: 'Star' },
  { id: 'heart', emoji: '❤️', label: 'Heart' },
  { id: 'fire', emoji: '🔥', label: 'Fire' },
  { id: 'clown', emoji: '🤡', label: 'Clown' },
  { id: 'party', emoji: '🎉', label: 'Party' },
  { id: 'sunglasses', emoji: '😎', label: 'Cool' },
  { id: 'crown', emoji: '👑', label: 'Crown' },
  { id: 'unicorn', emoji: '🦄', label: 'Unicorn' },
  { id: 'rainbow', emoji: '🌈', label: 'Rainbow' },
  { id: 'thumbsup', emoji: '👍', label: 'Thumbs Up' },
];

interface StickerPanelProps {
  stickers: Sticker[];
  onAdd: (sticker: Sticker) => void;
  onRemove: (index: number) => void;
  onUpdate: (index: number, sticker: Sticker) => void;
  active: boolean;
}

export const StickerPanel: React.FC<StickerPanelProps> = ({
  stickers,
  onAdd,
  onRemove,
  onUpdate,
  active,
}) => {
  if (!active) return null;

  const handleAdd = (preset: StickerPreset) => {
    onAdd({
      id: preset.id,
      emoji: preset.emoji,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
    });
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Stickers</h3>
      <div className="flex flex-wrap gap-2 mb-4">
        {BUILTIN_STICKERS.map((s) => (
          <button
            key={s.id}
            onClick={() => handleAdd(s)}
            className="w-10 h-10 flex items-center justify-center text-xl rounded-lg hover:bg-gray-100 transition-colors border border-gray-100"
            title={s.label}
          >
            {s.emoji}
          </button>
        ))}
      </div>

      {stickers.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider">Placed Stickers</h4>
          {stickers.map((s, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              <span className="text-lg">{s.emoji}</span>
              <div className="flex-1 flex items-center gap-2">
                <label className="text-xs text-gray-500">S:</label>
                <input
                  type="range"
                  min="0.5"
                  max="3"
                  step="0.1"
                  value={s.scale}
                  onChange={(e) => onUpdate(i, { ...s, scale: parseFloat(e.target.value) })}
                  className="w-16 h-1"
                />
                <label className="text-xs text-gray-500">R:</label>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={s.rotation}
                  onChange={(e) => onUpdate(i, { ...s, rotation: parseInt(e.target.value) })}
                  className="w-16 h-1"
                />
              </div>
              <button
                onClick={() => onRemove(i)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
