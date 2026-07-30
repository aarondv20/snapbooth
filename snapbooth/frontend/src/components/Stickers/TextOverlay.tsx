import React from 'react';

interface TextOverlayProps {
  text: string;
  onChange: (text: string) => void;
  active: boolean;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({ text, onChange, active }) => {
  if (!active) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Text Overlay</h3>
      <input
        type="text"
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Add a caption..."
        maxLength={100}
        className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
      />
      <p className="text-xs text-gray-400 mt-1">{text.length}/100 characters</p>
    </div>
  );
};
