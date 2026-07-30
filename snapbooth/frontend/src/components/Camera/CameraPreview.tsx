import React from 'react';
import { CSS_FILTERS } from '../../utils/filters';

interface CameraPreviewProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  mirrored: boolean;
  isStreaming: boolean;
  className?: string;
  filter?: string;
}

export const CameraPreview: React.FC<CameraPreviewProps> = ({
  videoRef,
  mirrored,
  isStreaming,
  className = '',
  filter = 'normal',
}) => (
  <div className={`relative overflow-hidden rounded-2xl bg-gray-900 ${className}`}>
    {!isStreaming && (
      <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
        Camera not active
      </div>
    )}
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted
      className={`w-full h-full object-cover ${mirrored ? '-scale-x-100' : ''} ${isStreaming ? 'opacity-100' : 'opacity-0'}`}
      style={{ filter: CSS_FILTERS[filter] || 'none' }}
    />
  </div>
);
