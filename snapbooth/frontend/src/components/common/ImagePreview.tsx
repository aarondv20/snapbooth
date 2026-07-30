import React from 'react';

interface ImagePreviewProps {
  src: string;
  alt?: string;
  maxHeight?: string;
}

export const ImagePreview: React.FC<ImagePreviewProps> = ({
  src,
  alt = 'Preview',
  maxHeight = '55vh',
}) => (
  <div className="rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
    <img
      src={src}
      alt={alt}
      className="max-w-full w-auto h-auto object-contain"
      style={{ maxHeight }}
    />
  </div>
);
