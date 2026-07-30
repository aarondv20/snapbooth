import React from 'react';

interface CountdownOverlayProps {
  countdown: number | null;
}

export const CountdownOverlay: React.FC<CountdownOverlayProps> = ({ countdown }) => {
  if (countdown === null || countdown <= 0) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-2xl z-10">
      <span
        key={countdown}
        className="text-white text-8xl font-bold animate-countdown select-none"
      >
        {countdown}
      </span>
    </div>
  );
};
