import { useEffect, useRef, useState } from 'react';
import { FocusSession } from '../types';

interface Props {
  session: FocusSession;
  onPause: () => void;
  onResume: () => void;
  onAdvancePhase: () => void;
  onAddInterruption: () => void;
  onSetQuality: (q: 'Low' | 'Normal' | 'High') => void;
  onSetReflection: (text: string) => void;
  onCancel: () => void;
}

function formatTime(secs: number): string {
  const abs = Math.abs(secs);
  const m = Math.floor(abs / 60).toString().padStart(2, '0');
  const s = (abs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const PHASE_LABELS: Record<string, string> = {
  work: 'Work', recall: 'Recall', rest: 'Rest', complete: 'Done',
};

export function FocusSessionBanner({
  session, onPause, onResume, onAdvancePhase, onAddInterruption, onSetQuality, onSetReflection, onCancel,
}: Props) {
  const [now, setNow] = useState(Date.now());
  const autoAdvancedRef = useRef(false);
  const onAdvancePhaseRef = useRef(onAdvancePhase);
  onAdvancePhaseRef.current = onAdvancePhase;

  useEffect(() => {
    autoAdvancedRef.current = false;
  }, [session.phase]);

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
  const overTime = session.phase === 'work' && phaseElapsed > phaseTotalSeconds;
  const progress = phaseTotalSeconds > 0 ? Math.min(1, phaseElapsed / phaseTotalSeconds) : 1;
  const isPaused = session.status === 'paused';

  useEffect(() => {
    if (phaseRemaining <= 0 && session.status === 'running' && !autoAdvancedRef.current) {
      autoAdvancedRef.current = true;
      onAdvancePhaseRef.current();
    }
  }, [phaseRemaining, session.status]);

  return (
    <div className={`focus-session-banner${isPaused ? ' paused' : ''}${overTime ? ' over' : ''}`}>
      <div className="fsb-header">
        <span className="fsb-in-session-pill">In Session</span>
        <span className={`fsb-phase-pill phase-${session.phase}`}>{PHASE_LABELS[session.phase]}</span>
        <span className="fsb-title">{session.title}</span>
        <span className="fsb-planned">{session.plannedMinutes} min</span>
      </div>

      {session.phase === 'work' && session.entryStep && (
        <div className="fsb-entry-step">Start with: {session.entryStep}</div>
      )}

      <div className="fsb-timer-row">
        <span className="fsb-timer">
          {overTime ? '+' : ''}{formatTime(overTime ? phaseElapsed - phaseTotalSeconds : phaseRemaining)}
        </span>
        <span className="fsb-timer-label">{overTime ? 'over time' : 'remaining'}</span>
      </div>

      <div className="fsb-progress-track">
        <div className="fsb-progress-fill" style={{ width: `${progress * 100}%` }} />
      </div>

      {session.phase === 'recall' && (
        <div className="fsb-recall-section">
          <div className="fsb-recall-label">What did you work on? What came up?</div>
          <textarea
            className="fsb-reflection"
            value={session.reflection}
            onChange={e => onSetReflection(e.target.value)}
            placeholder="Quick capture..."
            rows={3}
          />
        </div>
      )}

      {session.phase === 'rest' && (
        <div className="fsb-rest-section">
          <div className="fsb-quality-label">Session quality</div>
          <div className="fsb-quality-row">
            {(['Low', 'Normal', 'High'] as const).map(q => (
              <button
                key={q}
                className={`fsb-quality-btn${session.quality === q ? ' selected' : ''}`}
                onClick={() => onSetQuality(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="fsb-actions">
        {session.phase === 'work' && (
          <>
            {isPaused ? (
              <button className="fsb-btn fsb-btn-resume" onClick={onResume}>▶ Resume</button>
            ) : (
              <button className="fsb-btn fsb-btn-pause" onClick={onPause}>⏸ Pause</button>
            )}
            <button className="fsb-btn fsb-btn-interrupt" onClick={onAddInterruption}>
              + Interrupt{session.interruptions > 0 ? ` (${session.interruptions})` : ''}
            </button>
            <button className="fsb-btn fsb-btn-advance" onClick={onAdvancePhase}>End Work →</button>
          </>
        )}
        {session.phase === 'recall' && (
          <button className="fsb-btn fsb-btn-advance" onClick={onAdvancePhase}>Done Recall →</button>
        )}
        {session.phase === 'rest' && (
          <button className="fsb-btn fsb-btn-complete" onClick={onAdvancePhase}>✓ Complete Session</button>
        )}
        <button className="fsb-btn fsb-btn-cancel" onClick={onCancel}>✕ Cancel</button>
      </div>
    </div>
  );
}
