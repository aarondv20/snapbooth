import React from 'react';
import { Button } from '../common/Button';
import type { CountdownDuration } from '../../types';

interface CameraControlsProps {
  onCapture: () => void;
  onStartCamera: () => void;
  onStopCamera: () => void;
  isStreaming: boolean;
  countdownDuration: CountdownDuration;
  onCountdownChange: (d: CountdownDuration) => void;
  isCountingDown: boolean;
  disabled?: boolean;
}

const countdownOptions: { value: CountdownDuration; label: string }[] = [
  { value: 0, label: 'None' },
  { value: 3, label: '3s' },
  { value: 5, label: '5s' },
  { value: 10, label: '10s' },
];

export const CameraControls: React.FC<CameraControlsProps> = ({
  onCapture,
  onStartCamera,
  onStopCamera,
  isStreaming,
  countdownDuration,
  onCountdownChange,
  isCountingDown,
  disabled,
}) => (
  <div className="flex flex-wrap items-center justify-center gap-3">
    {!isStreaming ? (
      <Button onClick={onStartCamera} icon={
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      }>
        Start Camera
      </Button>
    ) : (
      <>
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-2 py-1 shadow-sm">
          {countdownOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onCountdownChange(opt.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                countdownDuration === opt.value
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <Button
          onClick={onCapture}
          disabled={disabled || isCountingDown}
          loading={isCountingDown}
          size="lg"
          className="!rounded-full !p-4"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="9" strokeWidth="2" />
              <circle cx="12" cy="12" r="3" fill="currentColor" />
            </svg>
          }
        >
          Capture
        </Button>

        <Button variant="ghost" onClick={onStopCamera} size="sm">
          Stop
        </Button>
      </>
    )}
  </div>
);
