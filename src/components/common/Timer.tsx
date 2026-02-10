import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './Button';
import type { TimerState } from '../../types';
import { Howl } from 'howler';

interface TimerProps {
  id?: string;
  label?: string;
  defaultSeconds: number;
  onComplete?: () => void;
  onStateChange?: (state: TimerState) => void;
  compact?: boolean;
  autoStart?: boolean;
}

// Request notification permission on load
async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

function showNotification(title: string, body: string): void {
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'recipe-runner-timer',
      requireInteraction: true,
    });
  }
}

export function Timer({
  label,
  defaultSeconds,
  onComplete,
  onStateChange,
  compact = false,
  autoStart = false,
}: TimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(defaultSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(defaultSeconds);
  const [state, setState] = useState<TimerState>(autoStart ? 'running' : 'idle');
  const [overtimeSeconds, setOvertimeSeconds] = useState(0);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  // Timer alert sound
  const alertSound = useRef<Howl | null>(null);

  useEffect(() => {
    alertSound.current = new Howl({
      src: ['/timer-alert.mp3'],
      volume: 0.7,
      loop: true,
    });

    // Check/request notification permission
    requestNotificationPermission().then(setNotificationsEnabled);

    return () => {
      if (alertSound.current) {
        alertSound.current.unload();
      }
    };
  }, []);

  // Sync defaultSeconds prop to state when timer is idle
  useEffect(() => {
    if (state === 'idle') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTotalSeconds(defaultSeconds);
      setRemainingSeconds(defaultSeconds);
    }
  }, [defaultSeconds, state]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(Math.abs(seconds) / 60);
    const secs = Math.abs(seconds) % 60;
    const prefix = seconds < 0 ? '+' : '';
    return `${prefix}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTimeShort = (seconds: number): string => {
    if (seconds >= 3600) {
      const hrs = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hrs}h ${mins}m`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    if (secs === 0) return `${mins}m`;
    return `${mins}m ${secs}s`;
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

    // Show notification
    showNotification(
      'Timer Complete!',
      label ? `${label} is done` : 'Your timer has finished'
    );
  }, [onComplete, onStateChange, label]);

  useEffect(() => {
    if (state === 'running') {
      startTimeRef.current = Date.now();
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

  // Handle page visibility for background timing
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && state === 'running' && startTimeRef.current) {
        // Recalculate remaining time based on actual elapsed time
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const newRemaining = Math.max(0, totalSeconds - elapsed);
        setRemainingSeconds(newRemaining);

        if (newRemaining === 0) {
          handleComplete();
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [state, totalSeconds, handleComplete]);

  const start = () => {
    startTimeRef.current = Date.now();
    setState('running');
    onStateChange?.('running');
  };

  const pause = () => {
    setState('paused');
    onStateChange?.('paused');
    // Update total to remaining for accurate resume
    setTotalSeconds(remainingSeconds);
  };

  const resume = () => {
    startTimeRef.current = Date.now();
    setState('running');
    onStateChange?.('running');
  };

  const reset = () => {
    alertSound.current?.stop();
    setTotalSeconds(defaultSeconds);
    setRemainingSeconds(defaultSeconds);
    setOvertimeSeconds(0);
    setState('idle');
    onStateChange?.('idle');
    startTimeRef.current = null;
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

  const displayTime = state === 'overtime' ? -overtimeSeconds : remainingSeconds;
  const isOvertime = state === 'overtime' || state === 'complete';
  const progress = totalSeconds > 0 ? ((totalSeconds - remainingSeconds) / totalSeconds) * 100 : 0;

  // Compact version for multi-timer display
  if (compact) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          background: isOvertime ? 'var(--error-bg)' : 'var(--card-bg)',
          borderRadius: '0.5rem',
          border: `1px solid ${isOvertime ? 'var(--error-border)' : 'var(--border-primary)'}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '2.5rem',
              height: '2.5rem',
              borderRadius: '50%',
              background: `conic-gradient(${isOvertime ? 'var(--error)' : 'var(--accent-primary)'} ${progress}%, var(--progress-track) ${progress}%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '50%',
                background: 'var(--card-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 600,
              }}
            >
              {state === 'running' ? '▶' : state === 'paused' ? '⏸' : '⏱'}
            </div>
          </div>
          <div>
            {label && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{label}</div>
            )}
            <div
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                color: isOvertime ? 'var(--error)' : 'var(--text-primary)',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {formatTime(displayTime)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {state === 'idle' && (
            <Button variant="ghost" size="sm" onClick={start}>▶</Button>
          )}
          {state === 'running' && (
            <Button variant="ghost" size="sm" onClick={pause}>⏸</Button>
          )}
          {state === 'paused' && (
            <Button variant="ghost" size="sm" onClick={resume}>▶</Button>
          )}
          {(state === 'complete' || state === 'overtime') && (
            <Button variant="ghost" size="sm" onClick={reset}>↺</Button>
          )}
        </div>
      </div>
    );
  }

  // Full version
  return (
    <div
      style={{
        background: 'var(--card-bg)',
        borderRadius: '1rem',
        padding: '1.5rem',
        boxShadow: 'var(--card-shadow)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}
      >
        <div
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          {label || 'Timer'}
        </div>
        {notificationsEnabled && (
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--success)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            <span style={{ width: '0.5rem', height: '0.5rem', borderRadius: '50%', background: 'var(--success)' }} />
            Notifications on
          </div>
        )}
      </div>

      {/* Progress Ring */}
      <div
        style={{
          position: 'relative',
          width: '160px',
          height: '160px',
          margin: '0 auto 1rem',
        }}
      >
        <svg width="160" height="160" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="var(--progress-track)"
            strokeWidth="8"
          />
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke={isOvertime ? 'var(--error)' : 'var(--accent-primary)'}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 70}`}
            strokeDashoffset={`${2 * Math.PI * 70 * (1 - progress / 100)}`}
            style={{ transition: 'stroke-dashoffset 0.5s' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontSize: '2.5rem',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
              color: isOvertime ? 'var(--error)' : 'var(--text-primary)',
              fontFamily: 'ui-monospace, monospace',
            }}
          >
            {formatTime(displayTime)}
          </div>
          {state !== 'idle' && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              {formatTimeShort(totalSeconds)} total
            </div>
          )}
        </div>
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
