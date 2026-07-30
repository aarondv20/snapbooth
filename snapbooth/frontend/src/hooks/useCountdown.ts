import { useState, useCallback, useRef } from 'react';

interface UseCountdownReturn {
  countdown: number | null;
  isRunning: boolean;
  start: (duration: number) => Promise<void>;
  stop: () => void;
}

export function useCountdown(): UseCountdownReturn {
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const resolveRef = useRef<(() => void) | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCountdown(null);
    setIsRunning(false);
    if (resolveRef.current) {
      resolveRef.current();
      resolveRef.current = null;
    }
  }, []);

  const start = useCallback(
    (duration: number): Promise<void> => {
      return new Promise((resolve) => {
        stop();
        setIsRunning(true);
        setCountdown(duration);
        resolveRef.current = resolve;

        let remaining = duration;
        intervalRef.current = setInterval(() => {
          remaining -= 1;
          if (remaining <= 0) {
            stop();
            resolve();
          } else {
            setCountdown(remaining);
          }
        }, 1000);
      });
    },
    [stop]
  );

  return { countdown, isRunning, start, stop };
}
