import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './Button';
import type { TimerState } from '../../types';
import { Howl } from 'howler';

interface TimerProps {
  defaultSeconds: number;
  onComplete?: () => void;
  onStateChange?: (state: TimerState) => void;
}

export function Timer({ defaultSeconds, onComplete, onStateChange }: TimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(defaultSeconds);
  const [state, setState] = useState<TimerState>('idle');
  const [overtimeSeconds, setOvertimeSeconds] = useState(0);
  const intervalRef = useRef<number | null>(null);

  // Timer alert sound
  const alertSound = useRef<Howl | null>(null);

  useEffect(() => {
    alertSound.current = new Howl({
      src: ['/timer-alert.mp3'],
      volume: 0.7,
      loop: true,
    });

    return () => {
      if (alertSound.current) {
        alertSound.current.unload();
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const prefix = seconds < 0 ? '+' : '';
    return `${prefix}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleComplete = useCallback(() => {
    setState('complete');
    onStateChange?.('complete');
    onComplete?.();

    // Play alert
    alertSound.current?.play();

    // Vibrate if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }
  }, [onComplete, onStateChange]);

  useEffect(() => {
    if (state === 'running') {
      intervalRef.current = window.setInterval(() => {
        setRemainingSeconds((prev) => {
          if (prev <= 1) {
            handleComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    if (state === 'overtime') {
      intervalRef.current = window.setInterval(() => {
        setOvertimeSeconds((prev) => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state, handleComplete]);

  const start = () => {
    setState('running');
    onStateChange?.('running');
  };

  const pause = () => {
    setState('paused');
    onStateChange?.('paused');
  };

  const resume = () => {
    setState('running');
    onStateChange?.('running');
  };

  const reset = () => {
    alertSound.current?.stop();
    setRemainingSeconds(totalSeconds);
    setOvertimeSeconds(0);
    setState('idle');
    onStateChange?.('idle');
  };

  const continueOvertime = () => {
    alertSound.current?.stop();
    setState('overtime');
    onStateChange?.('overtime');
  };

  const adjustTime = (delta: number) => {
    const newTotal = Math.max(0, totalSeconds + delta);
    setTotalSeconds(newTotal);
    if (state === 'idle') {
      setRemainingSeconds(newTotal);
    }
  };

  const displayTime =
    state === 'overtime' ? -overtimeSeconds : remainingSeconds;

  const isOvertime = state === 'overtime' || state === 'complete';

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '1rem',
        padding: '1.5rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#6b7280',
          marginBottom: '0.5rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}
      >
        Timer
      </div>

      {/* Time Display */}
      <div
        style={{
          fontSize: '3rem',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: isOvertime ? '#dc2626' : '#111827',
          marginBottom: '1rem',
          fontFamily: 'ui-monospace, monospace',
        }}
      >
        {formatTime(displayTime)}
      </div>

      {/* Adjustment Buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '0.5rem',
          marginBottom: '1rem',
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => adjustTime(-60)}
          disabled={state !== 'idle' && state !== 'paused'}
        >
          −1m
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => adjustTime(-10)}
          disabled={state !== 'idle' && state !== 'paused'}
        >
          −10s
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => adjustTime(10)}
          disabled={state !== 'idle' && state !== 'paused'}
        >
          +10s
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => adjustTime(60)}
          disabled={state !== 'idle' && state !== 'paused'}
        >
          +1m
        </Button>
      </div>

      {/* Control Buttons */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
        {state === 'idle' && (
          <Button onClick={start}>▶ Start</Button>
        )}

        {state === 'running' && (
          <Button variant="secondary" onClick={pause}>
            ⏸ Pause
          </Button>
        )}

        {state === 'paused' && (
          <>
            <Button onClick={resume}>▶ Resume</Button>
            <Button variant="ghost" onClick={reset}>
              ↺ Reset
            </Button>
          </>
        )}

        {state === 'complete' && (
          <>
            <Button variant="danger" onClick={continueOvertime}>
              Continue Tracking
            </Button>
            <Button variant="ghost" onClick={reset}>
              ↺ Reset
            </Button>
          </>
        )}

        {state === 'overtime' && (
          <Button variant="ghost" onClick={reset}>
            ↺ Reset
          </Button>
        )}
      </div>
    </div>
  );
}
