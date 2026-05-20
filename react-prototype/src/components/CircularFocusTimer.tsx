import { useEffect, useRef, useState } from 'react';
import { FocusSession, FocusTag } from '../types';

interface Props {
  session: FocusSession;
  focusTags: FocusTag[];
  onPause: () => void;
  onResume: () => void;
  onAdvancePhase: () => void;
  onExtendSession: (minutes: number) => void;
  onAddInterruption: () => void;
  onSetQuality: (q: 'Low' | 'Normal' | 'High') => void;
  onSetReflection: (text: string) => void;
  onSetTag: (tagId: string | undefined, tagName: string | undefined) => void;
  onAddTag: (name: string) => void;
  onCancel: () => void;
}

const CIRCUMFERENCE = 2 * Math.PI * 80;

function formatTime(secs: number): string {
  const m = Math.floor(Math.abs(secs) / 60).toString().padStart(2, '0');
  const s = (Math.abs(secs) % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const PHASE_LABELS: Record<string, string> = { work: 'Work', recall: 'Recall', rest: 'Rest', complete: 'Done' };

const PHASE_HINTS: Record<string, string> = {
  work: 'Deep Focus',
  recall: 'Reflect',
  rest: 'Restore',
  complete: 'Complete',
};

function getPhaseMinutes(session: FocusSession): number {
  if (session.segments && session.segments.length > 0) {
    return session.segments[session.currentSegmentIndex]?.minutes ?? 0;
  }
  if (session.phase === 'work') return session.workMinutes;
  if (session.phase === 'recall') return session.recallMinutes;
  if (session.phase === 'rest') return session.restMinutes;
  return 0;
}

export function CircularFocusTimer({
  session, focusTags,
  onPause, onResume, onAdvancePhase, onExtendSession, onAddInterruption,
  onSetQuality, onSetReflection, onSetTag, onAddTag, onCancel,
}: Props) {
  const [now, setNow] = useState(Date.now());
  const [newTagInput, setNewTagInput] = useState('');
  const autoAdvancedRef = useRef(false);
  const onAdvancePhaseRef = useRef(onAdvancePhase);
  onAdvancePhaseRef.current = onAdvancePhase;

  useEffect(() => { autoAdvancedRef.current = false; }, [session.phase, session.currentSegmentIndex]);

  useEffect(() => {
    if (session.status !== 'running') return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session.status, session.phaseStartedAt]);

  const phaseElapsed = session.status === 'running'
    ? session.phaseElapsedSeconds + Math.floor((now - session.phaseStartedAt) / 1000)
    : session.phaseElapsedSeconds;
  const phaseTotalSeconds = getPhaseMinutes(session) * 60;
  const phaseRemaining = Math.max(0, phaseTotalSeconds - phaseElapsed);
  const overTime = session.phase === 'work' && phaseElapsed > phaseTotalSeconds;
  const progress = phaseTotalSeconds > 0 ? Math.min(1, phaseElapsed / phaseTotalSeconds) : 1;
  const isPaused = session.status === 'paused';
  const strokeOffset = CIRCUMFERENCE * (1 - progress);

  // Segment progress info
  const totalSegments = session.segments?.length ?? 0;
  const currentSegIdx = session.currentSegmentIndex;

  useEffect(() => {
    if (phaseRemaining <= 0 && session.status === 'running' && !autoAdvancedRef.current) {
      autoAdvancedRef.current = true;
      onAdvancePhaseRef.current();
    }
  }, [phaseRemaining, session.status]);

  function handleTagChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (!val) { onSetTag(undefined, undefined); return; }
    const tag = focusTags.find(t => t.id === val);
    onSetTag(tag?.id, tag?.name);
  }

  function handleAddTag() {
    const name = newTagInput.trim();
    if (!name) return;
    onAddTag(name);
    setNewTagInput('');
  }

  const wrapperClass = [
    'cft-ring-wrapper',
    isPaused ? 'is-paused' : 'is-running',
    `phase-${session.phase}`,
  ].join(' ');

  return (
    <div className="cft-container">
      {/* Ring */}
      <div className={wrapperClass}>
        <svg viewBox="0 0 200 200" className="cft-ring" aria-hidden="true">
          <defs>
            <linearGradient id="cft-grad-work" gradientUnits="userSpaceOnUse" x1="30" y1="20" x2="170" y2="180">
              <stop offset="0%" stopColor="#7dd3fc" />
              <stop offset="100%" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="cft-grad-recall" gradientUnits="userSpaceOnUse" x1="30" y1="20" x2="170" y2="180">
              <stop offset="0%" stopColor="#c4b5fd" />
              <stop offset="100%" stopColor="#6d28d9" />
            </linearGradient>
            <linearGradient id="cft-grad-rest" gradientUnits="userSpaceOnUse" x1="30" y1="20" x2="170" y2="180">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>
          </defs>

          <circle cx="100" cy="100" r="94" className="cft-ring-outer-deco" />
          <circle cx="100" cy="100" r="80" className="cft-ring-bg" fill="none" />

          <circle
            cx="100" cy="100" r="80"
            className={`cft-ring-glow phase-${session.phase}`}
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeOffset}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />

          <circle
            cx="100" cy="100" r="80"
            className="cft-ring-progress"
            stroke={
              session.phase === 'recall' ? 'url(#cft-grad-recall)'
              : session.phase === 'rest' || session.phase === 'complete' ? 'url(#cft-grad-rest)'
              : 'url(#cft-grad-work)'
            }
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeOffset}
            transform="rotate(-90 100 100)"
          />

          <circle cx="100" cy="100" r="66" className="cft-ring-inner-deco" />
        </svg>

        <div className="cft-center-overlay">
          <div className="cft-phase-label">{PHASE_LABELS[session.phase]}</div>
          <div className={`cft-time${overTime ? ' over' : ''}`}>
            {overTime ? '+' : ''}{formatTime(overTime ? phaseElapsed - phaseTotalSeconds : phaseRemaining)}
          </div>
          {!isPaused && session.phase !== 'complete' && (
            <div className="cft-center-tag">{session.tagName ?? PHASE_HINTS[session.phase]}</div>
          )}
          {isPaused && <div className="cft-paused-label">Paused</div>}
          {session.interruptions > 0 && (
            <div className="cft-interruptions">{session.interruptions}× interrupted</div>
          )}
        </div>
      </div>

      {/* Segment progress dots */}
      {totalSegments > 1 && (
        <div className="cft-segment-dots">
          {session.segments!.map((seg, i) => (
            <span
              key={seg.id}
              className={`cft-seg-dot${i < currentSegIdx ? ' done' : ''}${i === currentSegIdx ? ' active' : ''} kind-${seg.kind}`}
              title={`${seg.kind} ${seg.minutes}m`}
            />
          ))}
        </div>
      )}

      {/* Title + meta */}
      <div className="cft-title">{session.title}</div>
      <div className="cft-meta">
        <span className="cft-badge">{session.type}</span>
        {session.domain && <span className="cft-badge">{session.domain}</span>}
        <span className="cft-badge">{session.plannedMinutes}m planned</span>
      </div>

      {/* Subject/tag selector */}
      <div className="cft-subject-row">
        <span className="cft-subject-label">Subject</span>
        <select
          className="cft-subject-select"
          value={session.tagId ?? ''}
          onChange={handleTagChange}
        >
          <option value="">— none —</option>
          {focusTags.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Add new tag inline */}
      <div className="cft-add-tag-row">
        <input
          className="cft-add-tag-input"
          value={newTagInput}
          onChange={e => setNewTagInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleAddTag(); }}
          placeholder="New subject..."
        />
        <button
          className="cft-add-tag-btn"
          onClick={handleAddTag}
          disabled={!newTagInput.trim()}
          type="button"
        >+ Add</button>
      </div>

      {/* Entry step hint */}
      {session.phase === 'work' && session.entryStep && (
        <div className="cft-entry-step">
          <span className="cft-entry-step-label">Start with:</span> {session.entryStep}
        </div>
      )}

      {/* Recall reflection */}
      {session.phase === 'recall' && (
        <div className="cft-recall-section">
          <div className="cft-section-label">What did you work on? What came up?</div>
          <textarea
            className="cft-reflection"
            value={session.reflection}
            onChange={e => onSetReflection(e.target.value)}
            placeholder="Quick capture..."
            rows={3}
          />
        </div>
      )}

      {/* Rest quality selector */}
      {session.phase === 'rest' && (
        <div className="cft-quality-section">
          <div className="cft-section-label">Session quality</div>
          <div className="cft-quality-row">
            {(['Low', 'Normal', 'High'] as const).map(q => (
              <button
                key={q}
                type="button"
                className={`cft-quality-btn${session.quality === q ? ' selected' : ''}`}
                onClick={() => onSetQuality(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="cft-controls">
        {session.phase === 'work' && (
          <>
            {isPaused ? (
              <button className="cft-btn cft-btn-primary" onClick={onResume} type="button">▶ Resume</button>
            ) : (
              <button className="cft-btn" onClick={onPause} type="button">⏸ Pause</button>
            )}
            <button className="cft-btn cft-btn-extend" onClick={() => onExtendSession(5)} type="button">
              +5 min
            </button>
            <button className="cft-btn cft-btn-interrupt" onClick={onAddInterruption} type="button">
              I got distracted{session.interruptions > 0 ? ` (${session.interruptions})` : ''}
            </button>
            <button className="cft-btn cft-btn-primary" onClick={onAdvancePhase} type="button">End Work →</button>
          </>
        )}
        {session.phase === 'recall' && (
          <button className="cft-btn cft-btn-primary" onClick={onAdvancePhase} type="button">Done Recall →</button>
        )}
        {session.phase === 'rest' && (
          <button className="cft-btn cft-btn-complete" onClick={onAdvancePhase} type="button">✓ Complete Session</button>
        )}
        <button className="cft-btn cft-btn-cancel" onClick={onCancel} type="button">✕ Cancel</button>
      </div>
    </div>
  );
}
