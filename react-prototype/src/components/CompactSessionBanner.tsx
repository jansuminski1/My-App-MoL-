import { useEffect, useState } from 'react';
import { FocusSession } from '../types';

interface Props {
  session: FocusSession;
  onOpenMind: () => void;
  onCancel: () => void;
}

const PHASE_LABELS: Record<string, string> = { work: 'Work', recall: 'Recall', rest: 'Rest' };

function formatTime(secs: number): string {
  const m = Math.floor(Math.abs(secs) / 60).toString().padStart(2, '0');
  const s = (Math.abs(secs) % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function CompactSessionBanner({ session, onOpenMind, onCancel }: Props) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (session.status !== 'running') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session.status, session.phaseStartedAt]);

  const phaseElapsed = session.status === 'running'
    ? session.phaseElapsedSeconds + Math.floor((now - session.phaseStartedAt) / 1000)
    : session.phaseElapsedSeconds;
  const phaseTotalSeconds = (
    session.phase === 'work' ? session.workMinutes
    : session.phase === 'recall' ? session.recallMinutes
    : session.phase === 'rest' ? session.restMinutes
    : 0
  ) * 60;
  const phaseRemaining = Math.max(0, phaseTotalSeconds - phaseElapsed);
  const isPaused = session.status === 'paused';

  return (
    <div className={`compact-session-banner${isPaused ? ' paused' : ''}`}>
      <div className="csb-left">
        <span className="csb-pill">● In Session</span>
        <div className="csb-title">{session.title}</div>
        <div className="csb-meta">
          <span className="csb-phase">{PHASE_LABELS[session.phase] ?? session.phase}</span>
          <span className="csb-sep">·</span>
          <span className="csb-time">{formatTime(phaseRemaining)}{isPaused ? ' (paused)' : ''}</span>
        </div>
      </div>
      <div className="csb-right">
        <button className="csb-open-btn" onClick={onOpenMind}>Open Mind →</button>
        <button className="csb-cancel-btn" onClick={onCancel} title="Cancel session">✕</button>
      </div>
    </div>
  );
}
