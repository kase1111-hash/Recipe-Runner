import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from './Button';
import { getPreferences } from '../../db';
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

// Served from public/ (same origin, so allowed by the CSP's media-src and
// connect-src 'self')
const ALERT_SOUND_SRC = '/timer-alert.wav';

// Ask at most once per page load, and only from a user gesture (starting a
// timer) — Firefox and Safari ignore permission requests made on mount, and
// Chrome auto-blocks sites that re-prompt after dismissals
let notificationPermissionRequested = false;

function ensureNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return Promise.resolve(false);
  if (Notification.permission === 'granted') return Promise.resolve(true);
  if (Notification.permission === 'denied' || notificationPermissionRequested) {
    return Promise.resolve(false);
  }
  notificationPermissionRequested = true;
  try {
    // Called synchronously from the click handler so it counts as a gesture
    return Notification.requestPermission().then(
      (permission) => permission === 'granted',
      () => false
    );
  } catch {
    return Promise.resolve(false);
  }
}

function showNotification(title: string, body: string): void {
  // iOS Safari (outside an installed PWA) has no Notification at all
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: 'recipe-runner-timer',
      requireInteraction: true,
    });
  } catch {
    // Android Chrome only allows notifications from a service worker — the
    // sound/vibration and on-screen state still signal completion
  }
}

function secondsUntil(deadline: number): number {
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
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
  // Permission is only requested from start(); this just reflects a grant
  // from earlier in the session
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    () => 'Notification' in window && Notification.permission === 'granted'
  );
  // Wall-clock deadline (ms) of the running countdown. Remaining time is
  // always derived from it, so throttled ticks in a background tab can't make
  // the timer run slow — they only update the display less often.
  const endAtRef = useRef<number | null>(null);
  // When the countdown reached zero. Overtime is measured from here, and it
  // doubles as the guard that fires completion side effects once per run.
  const completedAtRef = useRef<number | null>(null);
  // Timer alert sound
  const alertSound = useRef<Howl | null>(null);

  useEffect(() => {
    alertSound.current = new Howl({
      src: [ALERT_SOUND_SRC],
      volume: 0.7,
      loop: true,
    });

    return () => {
      alertSound.current?.unload();
      alertSound.current = null;
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
    // Stamp completion at the deadline itself rather than when a (possibly
    // throttled) tick noticed it, so overtime counts from when it was done
    completedAtRef.current = endAtRef.current ?? Date.now();
    endAtRef.current = null;
    setState('complete');
    onStateChange?.('complete');
    onComplete?.();

    // Honor the Timer Alerts preference. "Vibrate" falls back to sound on
    // devices that can't vibrate (desktops), or the timer would end silently.
    const alertType = getPreferences().timer_alert_type;
    const canVibrate = typeof navigator.vibrate === 'function';
    if (alertType !== 'vibrate' || !canVibrate) {
      alertSound.current?.play();
    }
    if (alertType !== 'sound' && canVibrate) {
      navigator.vibrate([200, 100, 200, 100, 200]);
    }

    // Show notification
    showNotification(
      'Timer Complete!',
      label ? `${label} is done` : 'Your timer has finished'
    );
  }, [onComplete, onStateChange, label]);

  // Track latest remaining time in a ref so the running effect can derive a
  // deadline for autoStart without depending on remainingSeconds (which
  // would tear down and recreate the interval every tick)
  const latestRemainingRef = useRef(remainingSeconds);
  useEffect(() => {
    latestRemainingRef.current = remainingSeconds;
  }, [remainingSeconds]);

  // Running: recompute remaining time from the deadline on every tick
  useEffect(() => {
    if (state !== 'running') return;

    // autoStart mounts already running, without start() to set a deadline
    if (endAtRef.current === null) {
      endAtRef.current = Date.now() + latestRemainingRef.current * 1000;
    }
    const endAt = endAtRef.current;
    // Reaching 0 triggers the completion effect below
    const sync = () => setRemainingSeconds(secondsUntil(endAt));

    const intervalId = window.setInterval(sync, 1000);
    // Background tabs throttle repeating timers (Chrome: to about once a
    // minute), but a single timeout aimed at the deadline still fires close
    // to on time, so the alarm isn't late
    const deadlineId = window.setTimeout(sync, endAt - Date.now() + 50);
    // Catch up right away when the tab is shown again
    document.addEventListener('visibilitychange', sync);

    return () => {
      window.clearInterval(intervalId);
      window.clearTimeout(deadlineId);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [state]);

  // Overtime: time since completion, derived the same way
  useEffect(() => {
    if (state !== 'overtime') return;

    const completedAt = completedAtRef.current ?? Date.now();
    const sync = () =>
      setOvertimeSeconds(Math.max(0, Math.floor((Date.now() - completedAt) / 1000)));

    const intervalId = window.setInterval(sync, 1000);
    document.addEventListener('visibilitychange', sync);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', sync);
    };
  }, [state]);

  // Fire completion side effects (sound, vibration, notification) from an
  // effect rather than inside the state updater — updaters must stay pure
  // (StrictMode double-invokes them, which double-fired the alert)
  useEffect(() => {
    // completedAtRef guards against a second run of this effect for the same
    // completion (StrictMode re-runs effects on mount)
    if (state === 'running' && remainingSeconds === 0 && completedAtRef.current === null) {
      // The running→complete transition must happen exactly once per
      // completion; firing it from the interval's updater double-triggered
      // under StrictMode (updaters must stay pure)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleComplete();
    }
  }, [state, remainingSeconds, handleComplete]);

  const start = () => {
    endAtRef.current = Date.now() + remainingSeconds * 1000;
    completedAtRef.current = null;
    setState('running');
    onStateChange?.('running');
    // First start is a user gesture — the right moment to ask
    if (!notificationsEnabled) {
      ensureNotificationPermission().then((granted) => {
        if (granted) setNotificationsEnabled(true);
      });
    }
  };

  const pause = () => {
    // Freeze what's left now; resume() sets a fresh deadline from it
    const left = endAtRef.current === null ? remainingSeconds : secondsUntil(endAtRef.current);
    setRemainingSeconds(left);
    // Already due — let it complete rather than pausing at 00:00
    if (left === 0) return;
    endAtRef.current = null;
    setState('paused');
    onStateChange?.('paused');
    // Keep totalSeconds untouched — overwriting it with remainingSeconds made
    // the progress ring snap back to 0% and mislabeled the total time
  };

  const resume = () => {
    endAtRef.current = Date.now() + remainingSeconds * 1000;
    setState('running');
    onStateChange?.('running');
  };

  const reset = () => {
    alertSound.current?.stop();
    endAtRef.current = null;
    completedAtRef.current = null;
    setTotalSeconds(defaultSeconds);
    setRemainingSeconds(defaultSeconds);
    setOvertimeSeconds(0);
    setState('idle');
    onStateChange?.('idle');
  };

  const continueOvertime = () => {
    alertSound.current?.stop();
    const completedAt = completedAtRef.current ?? Date.now();
    setOvertimeSeconds(Math.max(0, Math.floor((Date.now() - completedAt) / 1000)));
    setState('overtime');
    onStateChange?.('overtime');
  };

  const adjustTime = (delta: number) => {
    const newTotal = Math.max(0, totalSeconds + delta);
    setTotalSeconds(newTotal);
    if (state === 'idle') {
      setRemainingSeconds(newTotal);
    } else if (state === 'paused') {
      // Adjusting a paused timer shifts the countdown too, not just the total
      setRemainingSeconds((prev) => Math.max(0, prev + delta));
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
              {state === 'running' ? '▶' : state === 'paused' ? '⏸' : state === 'complete' ? '🔔' : '⏱'}
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
                color: isOvertime ? 'var(--error-text)' : 'var(--text-primary)',
                fontFamily: 'ui-monospace, monospace',
              }}
            >
              {formatTime(displayTime)}
            </div>
          </div>
        </div>
        {/* A compact timer may be ringing for a step the user has moved past,
            so it needs its own way to silence and reset the alarm */}
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          {state === 'idle' && (
            <Button variant="ghost" size="sm" onClick={start} aria-label="Start timer">▶</Button>
          )}
          {state === 'running' && (
            <Button variant="ghost" size="sm" onClick={pause} aria-label="Pause timer">⏸</Button>
          )}
          {state === 'paused' && (
            <Button variant="ghost" size="sm" onClick={resume} aria-label="Resume timer">▶</Button>
          )}
          {state === 'complete' && (
            <Button variant="danger" size="sm" onClick={continueOvertime} aria-label="Stop alarm">
              Stop
            </Button>
          )}
          {(state === 'paused' || state === 'complete' || state === 'overtime') && (
            <Button variant="ghost" size="sm" onClick={reset} aria-label="Reset timer">↺</Button>
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
