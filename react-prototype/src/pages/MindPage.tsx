import { useRef, useState } from 'react';
import { FocusSession, FocusSessionLog, FocusTimerProfile, FocusTag, TimerSegment } from '../types';
import { CircularFocusTimer } from '../components/CircularFocusTimer';
import { formatRelativeTime } from '../utils/todayFlow';
import { nowTs } from '../utils/date';

interface ManualLogData {
  title: string;
  tagId?: string;
  tagName?: string;
  minutes: number;
  quality: 'Low' | 'Normal' | 'High';
  reflection?: string;
}

interface Props {
  session: FocusSession | null;
  focusSessionLogs: FocusSessionLog[];
  focusTags: FocusTag[];
  focusTimerProfiles: FocusTimerProfile[];
  selectedProfileId: string;
  onPause: () => void;
  onResume: () => void;
  onAdvancePhase: () => void;
  onExtendSession: (minutes: number) => void;
  onAddInterruption: () => void;
  onSetQuality: (q: 'Low' | 'Normal' | 'High') => void;
  onSetReflection: (text: string) => void;
  onSetTag: (tagId: string | undefined, tagName: string | undefined) => void;
  onAddTag: (name: string) => void;
  onCancelSession: () => void;
  onSelectProfile: (id: string) => void;
  onAddProfile: (data: { name: string; focusMinutes: number; recallMinutes: number; restMinutes: number }) => void;
  onUpdateProfile: (profileId: string, updates: Partial<FocusTimerProfile>) => void;
  onDeleteProfile: (id: string) => void;
  onStartQuickFocus: () => void;
  onLogManual: (data: ManualLogData) => void;
}

const CIRCUMFERENCE = 2 * Math.PI * 80;
const QUALITY_LABEL: Record<string, string> = { Low: 'Low', Normal: 'Good', High: 'Deep' };
const KIND_LABEL: Record<string, string> = { focus: 'Focus', recall: 'Recall', rest: 'Rest' };

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const MAX_DRAG_MINUTES = 120;

function IdleRing({
  focusMinutes,
  onSetFocusMinutes,
}: {
  focusMinutes: number;
  onSetFocusMinutes: (m: number) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const proportion = Math.min(1, Math.max(0.01, focusMinutes / MAX_DRAG_MINUTES));
  const strokeOffset = CIRCUMFERENCE * (1 - proportion);
  const endAngle = -Math.PI / 2 + proportion * 2 * Math.PI;
  const dotX = 100 + 80 * Math.cos(endAngle);
  const dotY = 100 + 80 * Math.sin(endAngle);

  function minutesFromPointer(clientX: number, clientY: number): number {
    if (!svgRef.current) return focusMinutes;
    const rect = svgRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let angle = Math.atan2(clientY - cy, clientX - cx) + Math.PI / 2;
    if (angle < 0) angle += 2 * Math.PI;
    return Math.max(1, Math.min(MAX_DRAG_MINUTES, Math.round((angle / (2 * Math.PI)) * MAX_DRAG_MINUTES)));
  }

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    dragging.current = true;
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      onSetFocusMinutes(minutesFromPointer(ev.clientX, ev.clientY));
    };
    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function handleTouchStart(e: React.TouchEvent) {
    e.preventDefault();
    dragging.current = true;
    const onMove = (ev: TouchEvent) => {
      if (!dragging.current || !ev.touches[0]) return;
      onSetFocusMinutes(minutesFromPointer(ev.touches[0].clientX, ev.touches[0].clientY));
    };
    const onEnd = () => {
      dragging.current = false;
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }

  return (
    <svg ref={svgRef} viewBox="0 0 200 200" className="mind-idle-svg">
      <defs>
        <linearGradient id="idle-grad" gradientUnits="userSpaceOnUse" x1="30" y1="20" x2="170" y2="180">
          <stop offset="0%" stopColor="#7dd3fc" />
          <stop offset="100%" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="94" fill="none" stroke="rgba(186,230,253,0.3)" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(186,230,253,0.45)" strokeWidth="14" />
      <circle
        cx="100" cy="100" r="80"
        fill="none"
        stroke="url(#idle-grad)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={strokeOffset}
        transform="rotate(-90 100 100)"
        style={{ transition: dragging.current ? 'none' : 'stroke-dashoffset 0.25s ease' }}
      />
      <circle cx="100" cy="100" r="66" fill="none" stroke="rgba(186,230,253,0.2)" strokeWidth="1" />
      {/* Drag handle dot */}
      <circle
        cx={dotX}
        cy={dotY}
        r="11"
        fill="#38bdf8"
        stroke="white"
        strokeWidth="2.5"
        className="mind-idle-drag-dot"
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      />
    </svg>
  );
}

export function MindPage({
  session, focusSessionLogs, focusTags, focusTimerProfiles, selectedProfileId,
  onPause, onResume, onAdvancePhase, onExtendSession, onAddInterruption,
  onSetQuality, onSetReflection, onSetTag, onAddTag, onCancelSession,
  onSelectProfile, onUpdateProfile, onStartQuickFocus, onLogManual,
}: Props) {
  const [showManualLog, setShowManualLog] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualTagId, setManualTagId] = useState('');
  const [manualMinutes, setManualMinutes] = useState(25);
  const [manualMinutesDraft, setManualMinutesDraft] = useState<string | null>(null);
  const [manualQuality, setManualQuality] = useState<'Low' | 'Normal' | 'High'>('Normal');
  const [manualReflection, setManualReflection] = useState('');
  const [segmentDrafts, setSegmentDrafts] = useState<Record<string, string>>({});

  const customProfile = focusTimerProfiles.find(p => p.id === 'profile-custom') ?? focusTimerProfiles[0];
  const segments: TimerSegment[] = customProfile?.segments ?? [];

  // Derived idle display values
  const firstFocusSeg = segments.find(s => s.kind === 'focus');
  const idleFocusMinutes = firstFocusSeg?.minutes ?? customProfile?.focusMinutes ?? 25;
  const totalProfileMinutes = segments.length > 0
    ? segments.reduce((s, seg) => s + seg.minutes, 0)
    : (customProfile?.focusMinutes ?? 25) + (customProfile?.restMinutes ?? 5);

  // Subject stats
  const taggedLogs = focusSessionLogs.filter(l => l.tagName);
  const bySubject = taggedLogs.reduce<Record<string, number>>((acc, l) => {
    const key = l.tagName!;
    acc[key] = (acc[key] ?? 0) + l.actualMinutes;
    return acc;
  }, {});
  const subjectStats = Object.entries(bySubject)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalSessions = focusSessionLogs.length;
  const totalMinutes = focusSessionLogs.reduce((s, l) => s + l.actualMinutes, 0);
  const deepMinutes = focusSessionLogs
    .filter(l => l.type === 'Deep Work' || l.type === 'Study')
    .reduce((s, l) => s + l.actualMinutes, 0);
  const avgQualityScore = totalSessions > 0
    ? (focusSessionLogs.reduce((s, l) => s + (l.quality === 'High' ? 3 : l.quality === 'Normal' ? 2 : 1), 0) / totalSessions).toFixed(1)
    : null;

  function setFocusMinutes(minutes: number) {
    if (!customProfile) return;
    const clamped = Math.max(1, Math.min(MAX_DRAG_MINUTES, minutes));
    const newSegs = segments.map(seg =>
      seg === firstFocusSeg ? { ...seg, minutes: clamped } : seg
    );
    onUpdateProfile(customProfile.id, { segments: newSegs, focusMinutes: clamped });
  }

  function adjustFocusMinutes(delta: number) {
    setFocusMinutes(idleFocusMinutes + delta);
  }

  function updateSegmentMinutes(segId: string, minutes: number) {
    if (!customProfile) return;
    const clamped = Math.max(1, Math.min(480, Math.round(minutes)));
    const newSegs = segments.map(s => s.id === segId ? { ...s, minutes: clamped } : s);
    onUpdateProfile(customProfile.id, { segments: newSegs });
  }

  function commitSegmentDraft(segId: string) {
    const draft = segmentDrafts[segId];
    if (draft === undefined) return;
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed)) updateSegmentMinutes(segId, parsed);
    setSegmentDrafts(prev => { const next = { ...prev }; delete next[segId]; return next; });
  }

  function removeSegment(segId: string) {
    if (!customProfile) return;
    const remaining = segments.filter(s => s.id !== segId);
    if (!remaining.some(s => s.kind === 'focus')) return; // must keep at least one focus
    onUpdateProfile(customProfile.id, { segments: remaining });
  }

  function addSegment(kind: 'focus' | 'recall' | 'rest') {
    if (!customProfile) return;
    const id = `seg-${kind}-${nowTs()}`;
    const defaults = { focus: 25, recall: 5, rest: 5 };
    const newSeg: TimerSegment = { id, kind, minutes: defaults[kind] };
    onUpdateProfile(customProfile.id, { segments: [...segments, newSeg] });
  }

  function handleManualSave(e: React.FormEvent) {
    e.preventDefault();
    if (!manualTitle.trim() || manualMinutes < 1) return;
    const tag = focusTags.find(t => t.id === manualTagId);
    onLogManual({
      title: manualTitle.trim(),
      tagId: tag?.id,
      tagName: tag?.name,
      minutes: manualMinutes,
      quality: manualQuality,
      reflection: manualReflection.trim() || undefined,
    });
    setManualTitle('');
    setManualTagId('');
    setManualMinutes(25);
    setManualMinutesDraft(null);
    setManualQuality('Normal');
    setManualReflection('');
    setShowManualLog(false);
  }

  return (
    <div className={`page mind-page${session ? ' has-session' : ''}`}>
      {session ? (
        /* ── Active session: full circular timer ── */
        <CircularFocusTimer
          session={session}
          focusTags={focusTags}
          onPause={onPause}
          onResume={onResume}
          onAdvancePhase={onAdvancePhase}
          onExtendSession={onExtendSession}
          onAddInterruption={onAddInterruption}
          onSetQuality={onSetQuality}
          onSetReflection={onSetReflection}
          onSetTag={onSetTag}
          onAddTag={onAddTag}
          onCancel={onCancelSession}
        />
      ) : (
        /* ── No session: idle circular timer + setup ── */
        <>
          <div className="mind-idle-section">
            <div className="mind-idle-label-top">Ready for Deep Work</div>

            {/* Circular idle timer */}
            <div className="mind-idle-ring-wrap">
              <IdleRing focusMinutes={idleFocusMinutes} onSetFocusMinutes={setFocusMinutes} />
              <div className="mind-idle-center">
                <div className="mind-idle-phase">Focus</div>
                <div className="mind-idle-time">
                  {String(idleFocusMinutes).padStart(2, '0')}:00
                </div>
                <div className="mind-idle-total-hint">
                  {formatMinutes(totalProfileMinutes)} total
                </div>
              </div>
            </div>

            {/* Duration adjust */}
            <div className="mind-idle-adjust-row">
              <button
                type="button"
                className="mind-idle-adj-btn"
                onClick={() => adjustFocusMinutes(-1)}
                disabled={idleFocusMinutes <= 1}
              >−</button>
              <span className="mind-idle-adj-label">{idleFocusMinutes}m focus</span>
              <button
                type="button"
                className="mind-idle-adj-btn"
                onClick={() => adjustFocusMinutes(1)}
              >+</button>
            </div>

            {/* Start button */}
            <button type="button" className="mind-idle-start-btn" onClick={onStartQuickFocus}>
              ▶ Start Focus
            </button>
          </div>

          {/* Segment editor for Custom profile */}
          <div className="page-section-label" style={{ marginTop: 24 }}>Custom Timer</div>
          <div className="mind-segment-editor card">
            {segments.map((seg, i) => (
              <div key={seg.id} className="mind-seg-row">
                <span className={`mind-seg-kind kind-${seg.kind}`}>{KIND_LABEL[seg.kind]}</span>
                <div className="mind-seg-minutes-ctrl">
                  <button
                    type="button"
                    className="mind-seg-adj"
                    onClick={() => updateSegmentMinutes(seg.id, seg.minutes - 1)}
                    disabled={seg.minutes <= 1}
                  >−</button>
                  <input
                    type="number"
                    className="mind-seg-input"
                    value={segmentDrafts[seg.id] ?? String(seg.minutes)}
                    onChange={e => setSegmentDrafts(prev => ({ ...prev, [seg.id]: e.target.value }))}
                    onBlur={() => commitSegmentDraft(seg.id)}
                    onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
                  />
                  <span className="mind-seg-unit">min</span>
                  <button
                    type="button"
                    className="mind-seg-adj"
                    onClick={() => updateSegmentMinutes(seg.id, seg.minutes + 1)}
                  >+</button>
                </div>
                {segments.filter(s => s.kind === 'focus').length > 1 || seg.kind !== 'focus' ? (
                  <button
                    type="button"
                    className="mind-seg-remove"
                    onClick={() => removeSegment(seg.id)}
                    aria-label="Remove segment"
                  >×</button>
                ) : (
                  <span className="mind-seg-remove mind-seg-remove-placeholder" />
                )}
                {i < segments.length - 1 && <div className="mind-seg-connector" />}
              </div>
            ))}
            <div className="mind-seg-add-row">
              <button type="button" className="mind-seg-add-btn focus" onClick={() => addSegment('focus')}>+ Focus</button>
              <button type="button" className="mind-seg-add-btn recall" onClick={() => addSegment('recall')}>+ Recall</button>
              <button type="button" className="mind-seg-add-btn rest" onClick={() => addSegment('rest')}>+ Rest</button>
            </div>
          </div>

          {/* Manual session log */}
          <div className="mind-manual-log-area" style={{ marginTop: 20 }}>
            <button
              type="button"
              className="mind-manual-log-btn"
              onClick={() => setShowManualLog(o => !o)}
            >
              {showManualLog ? '✕ Cancel' : '✎ Log session manually'}
            </button>

            {showManualLog && (
              <form className="mind-manual-form card" onSubmit={handleManualSave}>
                <div className="mind-manual-form-title">Manual Session Log</div>
                <label className="modal-label">
                  Title
                  <input
                    className="modal-input"
                    value={manualTitle}
                    onChange={e => setManualTitle(e.target.value)}
                    placeholder="What did you work on?"
                    autoFocus
                  />
                </label>
                <div className="modal-label">
                  Subject tag
                  <div className="modal-tag-row">
                    <button
                      type="button"
                      className={`modal-tag-btn${manualTagId === '' ? ' selected' : ''}`}
                      onClick={() => setManualTagId('')}
                    >None</button>
                    {focusTags.map(t => (
                      <button
                        key={t.id}
                        type="button"
                        className={`modal-tag-btn${manualTagId === t.id ? ' selected' : ''}`}
                        onClick={() => setManualTagId(prev => prev === t.id ? '' : t.id)}
                      >{t.name}</button>
                    ))}
                  </div>
                </div>
                <label className="modal-label">
                  Minutes
                  <input
                    type="number"
                    className="modal-input"
                    value={manualMinutesDraft ?? String(manualMinutes)}
                    onChange={e => setManualMinutesDraft(e.target.value)}
                    onBlur={() => {
                      if (manualMinutesDraft !== null) {
                        const parsed = parseInt(manualMinutesDraft, 10);
                        if (!isNaN(parsed)) setManualMinutes(Math.max(1, Math.min(480, parsed)));
                        setManualMinutesDraft(null);
                      }
                    }}
                    onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                  />
                </label>
                <div className="modal-label">
                  Quality
                  <div className="mind-manual-quality-row">
                    {(['Low', 'Normal', 'High'] as const).map(q => (
                      <button
                        key={q}
                        type="button"
                        className={`cft-quality-btn${manualQuality === q ? ' selected' : ''}`}
                        onClick={() => setManualQuality(q)}
                      >{q}</button>
                    ))}
                  </div>
                </div>
                <label className="modal-label">
                  Reflection (optional)
                  <textarea
                    className="cft-reflection"
                    value={manualReflection}
                    onChange={e => setManualReflection(e.target.value)}
                    placeholder="What did you accomplish or notice?"
                    rows={2}
                  />
                </label>
                <button
                  type="submit"
                  className="modal-submit"
                  disabled={!manualTitle.trim() || manualMinutes < 1}
                >Save Session</button>
              </form>
            )}
          </div>
        </>
      )}

      {/* Subject stats */}
      {subjectStats.length > 0 && (
        <>
          <div className="page-section-label" style={{ marginTop: 24 }}>Focus by Subject</div>
          <div className="mind-subject-stats card">
            {subjectStats.map(([subject, minutes]) => (
              <div key={subject} className="mind-subject-row">
                <span className="mind-subject-name">{subject}</span>
                <div className="mind-subject-bar-track">
                  <div
                    className="mind-subject-bar-fill"
                    style={{ width: `${Math.min(100, (minutes / (subjectStats[0][1] || 1)) * 100)}%` }}
                  />
                </div>
                <span className="mind-subject-time">{formatMinutes(minutes)}</span>
              </div>
            ))}
          </div>
        </>
      )}
      {taggedLogs.length === 0 && (
        <>
          <div className="page-section-label" style={{ marginTop: 24 }}>Focus by Subject</div>
          <div className="page-empty-card">
            <div className="page-empty-icon">◎</div>
            <div className="page-empty-title">No tagged sessions yet</div>
            <div className="page-empty-sub">Select a subject during your next focus session.</div>
          </div>
        </>
      )}

      {/* Recent sessions */}
      <div className="page-section-label" style={{ marginTop: 24 }}>Recent Sessions</div>
      {focusSessionLogs.length === 0 ? (
        <div className="page-empty-card">
          <div className="page-empty-icon">◎</div>
          <div className="page-empty-title">No sessions yet</div>
          <div className="page-empty-sub">Complete a focus session to see your log here.</div>
        </div>
      ) : (
        <div className="focus-log-cards">
          {focusSessionLogs.slice(0, 8).map(log => (
            <div key={log.id} className="focus-log-card">
              <div className="flc-header">
                <span className="flc-title">{log.title}</span>
                <span className={`flc-quality quality-${log.quality.toLowerCase()}`}>
                  {QUALITY_LABEL[log.quality]}
                </span>
              </div>
              <div className="flc-meta">
                <span>{log.actualMinutes}m · {log.type}{log.tagName ? ` · ${log.tagName}` : ''}</span>
                <span className="flc-xp">+{log.xpAwarded} XP</span>
              </div>
              {(log.interruptions > 0 || log.startedAt) && (
                <div className="flc-meta" style={{ marginTop: 2 }}>
                  {log.interruptions > 0 && <span style={{ color: 'var(--amber)' }}>{log.interruptions} interrupt{log.interruptions !== 1 ? 's' : ''}</span>}
                  <span style={{ color: 'var(--text-mut)' }}>{formatRelativeTime(log.startedAt)}</span>
                </div>
              )}
              {log.reflection && (
                <div className="flc-reflection">"{log.reflection}"</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Focus stats */}
      <div className="page-section-label" style={{ marginTop: 24 }}>Focus Stats</div>
      <div className="stat-cards-grid">
        <div className="stat-card accent">
          <div className="stat-card-value">{totalSessions}</div>
          <div className="stat-card-label">Sessions</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-card-value">{formatMinutes(totalMinutes)}</div>
          <div className="stat-card-label">Total</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{formatMinutes(deepMinutes)}</div>
          <div className="stat-card-label">Deep min</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{avgQualityScore ?? '—'}</div>
          <div className="stat-card-label">Avg quality</div>
        </div>
      </div>
    </div>
  );
}
