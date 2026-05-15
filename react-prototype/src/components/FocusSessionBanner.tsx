import { useEffect, useState } from 'react';
import { FocusBlock, FocusSession } from '../types';

interface Props {
  session: FocusSession;
  block: FocusBlock;
  onPause: () => void;
  onResume: () => void;
  onComplete: () => void;
  onCancel: () => void;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function FocusSessionBanner({ session, block, onPause, onResume, onComplete, onCancel }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (session.paused) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session.paused, session.startedAt]);

  const elapsed = session.paused
    ? session.accumulatedSeconds
    : session.accumulatedSeconds + Math.floor((now - session.startedAt) / 1000);

  const totalSeconds = block.duration * 60;
  const remaining = Math.max(0, totalSeconds - elapsed);
  const overTime = elapsed >= totalSeconds;
  const progress = Math.min(1, elapsed / totalSeconds);

  return (
    <div className={`focus-session-banner${session.paused ? ' paused' : ''}${overTime ? ' over' : ''}`}>
      <div className="fsb-header">
        <span className="fsb-in-session-pill">In Session</span>
        <span className="fsb-title">{block.title}</span>
        <span className="fsb-planned">{block.duration} min</span>
      </div>

      <div className="fsb-timer-row">
        <span className="fsb-timer">
          {overTime ? '+' : ''}{overTime ? formatTime(elapsed - totalSeconds) : formatTime(remaining)}
        </span>
        <span className="fsb-timer-label">{overTime ? 'over time' : 'remaining'}</span>
      </div>

      <div className="fsb-progress-track">
        <div className="fsb-progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="fsb-actions">
        {session.paused ? (
          <button className="fsb-btn fsb-btn-resume" onClick={onResume}>▶ Resume</button>
        ) : (
          <button className="fsb-btn fsb-btn-pause" onClick={onPause}>⏸ Pause</button>
        )}
        <button className="fsb-btn fsb-btn-complete" onClick={onComplete}>✓ Complete</button>
        <button className="fsb-btn fsb-btn-cancel" onClick={onCancel}>✕ Cancel</button>
      </div>
    </div>
  );
}
