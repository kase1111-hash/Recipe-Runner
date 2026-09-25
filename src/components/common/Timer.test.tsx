import { StrictMode } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Timer } from './Timer';

const sound = vi.hoisted(() => ({
  play: vi.fn(),
  stop: vi.fn(),
  unload: vi.fn(),
}));

vi.mock('howler', () => ({
  Howl: vi.fn(() => sound),
}));

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

// Move the wall clock without firing any timers — what a throttled
// background tab looks like to the page
function jumpClock(ms: number) {
  vi.setSystemTime(Date.now() + ms);
}

function becomeVisible() {
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
}

function setAlertType(type: 'sound' | 'vibrate' | 'both') {
  vi.mocked(window.localStorage.getItem).mockReturnValue(
    JSON.stringify({ timer_alert_type: type })
  );
}

describe('Timer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    // jsdom has no vibrate; remove any stub a test added
    delete (navigator as { vibrate?: unknown }).vibrate;
  });

  describe('deadline-based countdown', () => {
    it('counts down once per second', () => {
      render(<Timer defaultSeconds={10} />);
      expect(screen.getByText('00:10')).toBeInTheDocument();

      fireEvent.click(screen.getByText('▶ Start'));
      advance(3000);

      expect(screen.getByText('00:07')).toBeInTheDocument();
    });

    it('catches up to wall-clock time when the tab becomes visible', () => {
      render(<Timer defaultSeconds={60} />);
      fireEvent.click(screen.getByText('▶ Start'));

      // 45s pass with no ticks at all (throttled background tab)
      jumpClock(45_000);
      becomeVisible();

      expect(screen.getByText('00:15')).toBeInTheDocument();
    });

    it('a single late tick shows the true remaining time, not one second less', () => {
      render(<Timer defaultSeconds={60} />);
      fireEvent.click(screen.getByText('▶ Start'));

      jumpClock(45_000);
      advance(1000); // the one tick a throttled tab gets

      // Decrement-per-tick would show 00:59 here
      expect(screen.getByText('00:14')).toBeInTheDocument();
    });

    it('rings on time even if the interval barely ran', () => {
      render(<Timer defaultSeconds={60} />);
      fireEvent.click(screen.getByText('▶ Start'));

      jumpClock(61_000);
      advance(1000);

      expect(sound.play).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Continue Tracking')).toBeInTheDocument();
    });

    it('completes when the tab becomes visible after the deadline', () => {
      render(<Timer defaultSeconds={30} />);
      fireEvent.click(screen.getByText('▶ Start'));

      jumpClock(120_000);
      becomeVisible();

      expect(sound.play).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Continue Tracking')).toBeInTheDocument();
    });

    it('fires at the deadline via the one-shot timeout', () => {
      const onComplete = vi.fn();
      render(<Timer defaultSeconds={10} onComplete={onComplete} />);
      fireEvent.click(screen.getByText('▶ Start'));

      advance(9_000);
      expect(onComplete).not.toHaveBeenCalled();
      advance(1_100);
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  describe('pause and resume', () => {
    it('pause freezes the remaining time and resume sets a new deadline', () => {
      render(<Timer defaultSeconds={10} />);
      fireEvent.click(screen.getByText('▶ Start'));
      advance(3000);

      fireEvent.click(screen.getByText('⏸ Pause'));
      expect(screen.getByText('00:07')).toBeInTheDocument();

      // Time passes while paused — nothing changes
      jumpClock(60_000);
      advance(5000);
      becomeVisible();
      expect(screen.getByText('00:07')).toBeInTheDocument();

      fireEvent.click(screen.getByText('▶ Resume'));
      advance(6000);
      expect(screen.getByText('00:01')).toBeInTheDocument();
      expect(sound.play).not.toHaveBeenCalled();

      advance(1000);
      expect(sound.play).toHaveBeenCalledTimes(1);
    });

    it('+/- buttons are disabled while running and work while idle or paused', () => {
      render(<Timer defaultSeconds={60} />);

      // Idle: adjusts total and remaining
      fireEvent.click(screen.getByText('+1m'));
      expect(screen.getByText('02:00')).toBeInTheDocument();

      fireEvent.click(screen.getByText('▶ Start'));
      expect(screen.getByText('+1m')).toBeDisabled();
      expect(screen.getByText('−10s')).toBeDisabled();

      advance(10_000);
      fireEvent.click(screen.getByText('⏸ Pause'));
      expect(screen.getByText('01:50')).toBeInTheDocument();
      expect(screen.getByText('+10s')).not.toBeDisabled();

      // Paused: shifts the countdown, and resume counts from the new value
      fireEvent.click(screen.getByText('+10s'));
      expect(screen.getByText('02:00')).toBeInTheDocument();
      fireEvent.click(screen.getByText('▶ Resume'));
      advance(5000);
      expect(screen.getByText('01:55')).toBeInTheDocument();
    });
  });

  describe('completion', () => {
    it('fires completion side effects exactly once under StrictMode', () => {
      const onComplete = vi.fn();
      const onStateChange = vi.fn();
      render(
        <StrictMode>
          <Timer defaultSeconds={5} onComplete={onComplete} onStateChange={onStateChange} />
        </StrictMode>
      );

      fireEvent.click(screen.getByText('▶ Start'));
      advance(5000);
      advance(10_000);

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(sound.play).toHaveBeenCalledTimes(1);
      expect(onStateChange.mock.calls.filter(([s]) => s === 'complete')).toHaveLength(1);
    });

    it('fires once for an auto-started timer that is already due (StrictMode mount)', () => {
      const onComplete = vi.fn();
      render(
        <StrictMode>
          <Timer defaultSeconds={0} autoStart onComplete={onComplete} />
        </StrictMode>
      );
      advance(2000);

      expect(onComplete).toHaveBeenCalledTimes(1);
      expect(sound.play).toHaveBeenCalledTimes(1);
    });

    it('measures overtime from the moment the timer finished', () => {
      render(<Timer defaultSeconds={10} />);
      fireEvent.click(screen.getByText('▶ Start'));
      advance(10_000);

      // The alarm rings for 30s before the user responds
      advance(30_000);
      fireEvent.click(screen.getByText('Continue Tracking'));
      expect(sound.stop).toHaveBeenCalled();
      expect(screen.getByText('+00:30')).toBeInTheDocument();

      // Throttled background time is counted too
      jumpClock(60_000);
      becomeVisible();
      expect(screen.getByText('+01:30')).toBeInTheDocument();
    });

    it('reset returns to idle and stops the alarm', () => {
      const onStateChange = vi.fn();
      render(<Timer defaultSeconds={5} onStateChange={onStateChange} />);
      fireEvent.click(screen.getByText('▶ Start'));
      advance(5000);

      fireEvent.click(screen.getByText('↺ Reset'));
      expect(sound.stop).toHaveBeenCalled();
      expect(onStateChange).toHaveBeenLastCalledWith('idle');
      expect(screen.getByText('00:05')).toBeInTheDocument();
      expect(screen.getByText('▶ Start')).toBeInTheDocument();
    });
  });

  describe('compact view', () => {
    it('can silence and reset a completed timer', () => {
      const onStateChange = vi.fn();
      render(<Timer defaultSeconds={5} compact label="Step 1 · Preheat Oven" onStateChange={onStateChange} />);
      expect(screen.getByText('Step 1 · Preheat Oven')).toBeInTheDocument();

      fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));
      advance(5000);
      expect(sound.play).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('button', { name: 'Stop alarm' }));
      expect(sound.stop).toHaveBeenCalledTimes(1);
      expect(onStateChange).toHaveBeenLastCalledWith('overtime');

      fireEvent.click(screen.getByRole('button', { name: 'Reset timer' }));
      expect(onStateChange).toHaveBeenLastCalledWith('idle');
      expect(screen.getByRole('button', { name: 'Start timer' })).toBeInTheDocument();
    });

    it('can reset a paused timer', () => {
      const onStateChange = vi.fn();
      render(<Timer defaultSeconds={60} compact onStateChange={onStateChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));
      fireEvent.click(screen.getByRole('button', { name: 'Pause timer' }));
      fireEvent.click(screen.getByRole('button', { name: 'Reset timer' }));

      expect(onStateChange).toHaveBeenLastCalledWith('idle');
    });
  });

  describe('notifications', () => {
    it('asks for permission on the first start, not on mount', async () => {
      const requestPermission = vi.fn().mockResolvedValue('granted');
      vi.stubGlobal(
        'Notification',
        Object.assign(vi.fn(), { permission: 'default', requestPermission })
      );

      const { unmount } = render(<Timer defaultSeconds={60} />);
      expect(requestPermission).not.toHaveBeenCalled();

      fireEvent.click(screen.getByText('▶ Start'));
      expect(requestPermission).toHaveBeenCalledTimes(1);
      await act(async () => {});
      expect(screen.getByText('Notifications on')).toBeInTheDocument();

      // Not again for later starts, or for other timers
      fireEvent.click(screen.getByText('⏸ Pause'));
      fireEvent.click(screen.getByText('▶ Resume'));
      unmount();
      render(<Timer defaultSeconds={30} />);
      fireEvent.click(screen.getByText('▶ Start'));
      expect(requestPermission).toHaveBeenCalledTimes(1);
    });

    it('shows a notification when permission is granted', () => {
      const NotificationMock = Object.assign(vi.fn(), {
        permission: 'granted',
        requestPermission: vi.fn(),
      });
      vi.stubGlobal('Notification', NotificationMock);

      render(<Timer defaultSeconds={5} label="Step 1 · Preheat Oven" />);
      fireEvent.click(screen.getByText('▶ Start'));
      advance(5000);

      expect(NotificationMock).toHaveBeenCalledWith(
        'Timer Complete!',
        expect.objectContaining({ body: 'Step 1 · Preheat Oven is done' })
      );
    });

    it('still completes where constructing a Notification throws (Android Chrome)', () => {
      vi.stubGlobal(
        'Notification',
        Object.assign(
          vi.fn(() => {
            throw new TypeError('Illegal constructor');
          }),
          { permission: 'granted', requestPermission: vi.fn() }
        )
      );

      render(<Timer defaultSeconds={5} />);
      fireEvent.click(screen.getByText('▶ Start'));
      advance(5000);

      expect(sound.play).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Continue Tracking')).toBeInTheDocument();
    });
  });

  describe('timer alert preference', () => {
    function runToCompletion() {
      render(<Timer defaultSeconds={3} />);
      fireEvent.click(screen.getByText('▶ Start'));
      advance(3000);
    }

    it('"sound" plays the alarm without vibrating', () => {
      const vibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true, writable: true });
      setAlertType('sound');

      runToCompletion();

      expect(sound.play).toHaveBeenCalledTimes(1);
      expect(vibrate).not.toHaveBeenCalled();
    });

    it('"vibrate" vibrates without the alarm', () => {
      const vibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true, writable: true });
      setAlertType('vibrate');

      runToCompletion();

      expect(vibrate).toHaveBeenCalledTimes(1);
      expect(sound.play).not.toHaveBeenCalled();
    });

    it('"vibrate" falls back to sound where vibration is unsupported', () => {
      setAlertType('vibrate');

      runToCompletion();

      expect(sound.play).toHaveBeenCalledTimes(1);
    });

    it('"both" (the default) does both', () => {
      const vibrate = vi.fn();
      Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true, writable: true });

      runToCompletion();

      expect(sound.play).toHaveBeenCalledTimes(1);
      expect(vibrate).toHaveBeenCalledTimes(1);
    });
  });

  it('loads the bundled alert sound', async () => {
    const { Howl } = await import('howler');
    render(<Timer defaultSeconds={5} />);
    expect(Howl).toHaveBeenCalledWith(
      expect.objectContaining({ src: ['/timer-alert.wav'], loop: true })
    );
  });
});
