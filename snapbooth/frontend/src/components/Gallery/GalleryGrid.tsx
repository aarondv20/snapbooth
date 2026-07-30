import React from 'react';
import type { CapturedImage } from '../../types';

interface GalleryGridProps {
  images: CapturedImage[];
  onImageClick: (id: string) => void;
  onToggleFavourite: (id: string) => void;
  onDelete: (id: string) => void;
}

function downloadImage(img: CapturedImage) {
  const a = document.createElement('a');
  a.href = img.image_url;
  const ext = img.image_url.split('.').pop() || 'jpg';
  a.download = `snapbooth_${img.id.slice(0, 8)}.${ext}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export const GalleryGrid: React.FC<GalleryGridProps> = ({
  images,
  onImageClick,
  onToggleFavourite,
  onDelete,
}) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
    {images.map((img) => (
      <div
        key={img.id}
        className="group relative aspect-[1386/1266] rounded-xl overflow-hidden bg-gray-100 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200"
        onClick={() => onImageClick(img.id)}
      >
        <img
          src={img.thumbnail_url}
          alt={`Photo ${img.id.slice(0, 8)}`}
          className="w-full h-full object-contain"
          loading="lazy"
        />

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-200" />

        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavourite(img.id); }}
            className={`p-1.5 rounded-lg transition-colors ${
              img.is_favourite
                ? 'bg-red-500 text-white'
                : 'bg-white/80 text-gray-600 hover:bg-white'
            }`}
          >
            <svg className="w-4 h-4" fill={img.is_favourite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); downloadImage(img); }}
            className="p-1.5 rounded-lg bg-white/80 text-blue-500 hover:bg-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(img.id); }}
            className="p-1.5 rounded-lg bg-white/80 text-red-500 hover:bg-white transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-white text-xs font-medium capitalize">{img.filter_applied}</span>
        </div>
      </div>
    ))}
  </div>
);
