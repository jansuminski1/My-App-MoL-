import { useEffect, useRef, useState } from 'react';
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
  onDeleteTag: (id: string) => void;
  onUpdateTag: (id: string, updates: Partial<FocusTag>) => void;
  onCancelSession: () => void;
  onSelectProfile: (id: string) => void;
  onAddProfile: (data: { name: string; focusMinutes: number; recallMinutes: number; restMinutes: number }) => void;
  onUpdateProfile: (profileId: string, updates: Partial<FocusTimerProfile>) => void;
  onDeleteProfile: (id: string) => void;
  onSaveProfile: (name: string, segments: TimerSegment[]) => void;
  onStartQuickFocus: () => void;
  onLogManual: (data: ManualLogData) => void;
}

const CIRCUMFERENCE = 2 * Math.PI * 80;
const MAX_DRAG_MINUTES = 120;
const QUALITY_LABEL: Record<string, string> = { Low: 'Low', Normal: 'Good', High: 'Deep' };
const KIND_LABEL: Record<string, string> = { focus: 'Focus', recall: 'Recall', rest: 'Rest' };
const SEGMENT_DEFAULT_MINUTES: Record<TimerSegment['kind'], number> = { focus: 25, recall: 5, rest: 5 };

const TAG_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
];

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

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
      <circle
        cx={dotX} cy={dotY} r="11"
        fill="#38bdf8" stroke="white" strokeWidth="2.5"
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
  onSetQuality, onSetReflection, onSetTag, onAddTag, onDeleteTag, onUpdateTag,
  onCancelSession, onSelectProfile, onUpdateProfile, onDeleteProfile,
  onSaveProfile, onStartQuickFocus, onLogManual,
}: Props) {
  const [showManualLog, setShowManualLog] = useState(false);
  const [manualTitle, setManualTitle] = useState('');
  const [manualTagId, setManualTagId] = useState('');
  const [manualMinutes, setManualMinutes] = useState(25);
  const [manualMinutesDraft, setManualMinutesDraft] = useState<string | null>(null);
  const [manualQuality, setManualQuality] = useState<'Low' | 'Normal' | 'High'>('Normal');
  const [manualReflection, setManualReflection] = useState('');
  const [segmentDrafts, setSegmentDrafts] = useState<Record<string, string>>({});
  const [selectedSegmentId, setSelectedSegmentId] = useState<string | null>(null);

  // Profile save state
  const [showSaveProfile, setShowSaveProfile] = useState(false);
  const [saveProfileName, setSaveProfileName] = useState('');

  // Tag management state
  const [newTagName, setNewTagName] = useState('');
  const [expandedTagColor, setExpandedTagColor] = useState<string | null>(null);
  const [selectedManagedTagId, setSelectedManagedTagId] = useState<string>('');

  const activeProfile = focusTimerProfiles.find(p => p.id === selectedProfileId) ?? focusTimerProfiles[0];
  const segments: TimerSegment[] = activeProfile?.segments ?? [];
  const selectedSegment = segments.find(s => s.id === selectedSegmentId) ?? segments[0];
  const selectedSegmentIndex = selectedSegment ? segments.findIndex(s => s.id === selectedSegment.id) : -1;
  const focusSegmentCount = segments.filter(s => s.kind === 'focus').length;
  const selectedManagedTag = focusTags.find(tag => tag.id === selectedManagedTagId) ?? focusTags[0];

  useEffect(() => {
    if (segments.length === 0) {
      if (selectedSegmentId !== null) setSelectedSegmentId(null);
      return;
    }
    if (!selectedSegmentId || !segments.some(seg => seg.id === selectedSegmentId)) {
      setSelectedSegmentId(segments[0].id);
    }
  }, [segments, selectedSegmentId]);

  useEffect(() => {
    if (focusTags.length === 0) {
      if (selectedManagedTagId) setSelectedManagedTagId('');
      return;
    }
    if (!selectedManagedTagId || !focusTags.some(tag => tag.id === selectedManagedTagId)) {
      setSelectedManagedTagId(focusTags[0].id);
    }
  }, [focusTags, selectedManagedTagId]);

  // Derived idle display values
  const firstFocusSeg = segments.find(s => s.kind === 'focus');
  const idleFocusMinutes = firstFocusSeg?.minutes ?? activeProfile?.focusMinutes ?? 25;
  const totalProfileMinutes = segments.length > 0
    ? segments.reduce((s, seg) => s + seg.minutes, 0)
    : (activeProfile?.focusMinutes ?? 25) + (activeProfile?.restMinutes ?? 5);

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
    if (!activeProfile) return;
    const clamped = Math.max(1, Math.min(MAX_DRAG_MINUTES, minutes));
    const newSegs = segments.map(seg =>
      seg === firstFocusSeg ? { ...seg, minutes: clamped } : seg
    );
    onUpdateProfile(activeProfile.id, { segments: newSegs, focusMinutes: clamped });
  }

  function adjustFocusMinutes(delta: number) {
    setFocusMinutes(idleFocusMinutes + delta);
  }

  function updateSegmentMinutes(segId: string, minutes: number) {
    if (!activeProfile) return;
    const clamped = Math.max(1, Math.min(480, Math.round(minutes)));
    const newSegs = segments.map(s => s.id === segId ? { ...s, minutes: clamped } : s);
    onUpdateProfile(activeProfile.id, { segments: newSegs });
  }

  function commitSegmentDraft(segId: string) {
    const draft = segmentDrafts[segId];
    if (draft === undefined) return;
    const parsed = parseInt(draft, 10);
    if (!isNaN(parsed)) updateSegmentMinutes(segId, parsed);
    setSegmentDrafts(prev => { const next = { ...prev }; delete next[segId]; return next; });
  }

  function updateSegmentKind(segId: string, kind: TimerSegment['kind']) {
    if (!activeProfile) return;
    const current = segments.find(s => s.id === segId);
    if (!current) return;
    if (current.kind === 'focus' && kind !== 'focus' && focusSegmentCount <= 1) return;
    const newSegs = segments.map(s => s.id === segId ? { ...s, kind } : s);
    onUpdateProfile(activeProfile.id, { segments: newSegs });
  }

  function moveSegment(segId: string, direction: -1 | 1) {
    if (!activeProfile) return;
    const index = segments.findIndex(s => s.id === segId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= segments.length) return;
    const newSegs = [...segments];
    const [moved] = newSegs.splice(index, 1);
    newSegs.splice(nextIndex, 0, moved);
    onUpdateProfile(activeProfile.id, { segments: newSegs });
  }

  function removeSegment(segId: string) {
    if (!activeProfile) return;
    const index = segments.findIndex(s => s.id === segId);
    const remaining = segments.filter(s => s.id !== segId);
    if (!remaining.some(s => s.kind === 'focus')) return;
    const nextSelected = remaining[Math.min(index, remaining.length - 1)] ?? remaining[0];
    setSelectedSegmentId(nextSelected?.id ?? null);
    onUpdateProfile(activeProfile.id, { segments: remaining });
  }

  function addSegment(kind: 'focus' | 'recall' | 'rest') {
    if (!activeProfile) return;
    const id = `seg-${kind}-${nowTs()}`;
    const newSeg: TimerSegment = { id, kind, minutes: SEGMENT_DEFAULT_MINUTES[kind] };
    setSelectedSegmentId(id);
    onUpdateProfile(activeProfile.id, { segments: [...segments, newSeg] });
  }

  function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!saveProfileName.trim()) return;
    onSaveProfile(saveProfileName.trim(), segments);
    setSaveProfileName('');
    setShowSaveProfile(false);
  }

  function handleAddTag() {
    const name = newTagName.trim();
    if (!name) return;
    onAddTag(name);
    setNewTagName('');
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
        <>
          {/* ── Idle ring ── */}
          <div className="mind-idle-section">
            <div className="mind-idle-label-top">Ready for Deep Work</div>
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
            <div className="mind-idle-adjust-row">
              <button type="button" className="mind-idle-adj-btn" onClick={() => adjustFocusMinutes(-1)} disabled={idleFocusMinutes <= 1}>−</button>
              <span className="mind-idle-adj-label">{idleFocusMinutes}m focus</span>
              <button type="button" className="mind-idle-adj-btn" onClick={() => adjustFocusMinutes(1)}>+</button>
            </div>
            <button type="button" className="mind-idle-start-btn" onClick={onStartQuickFocus}>
              ▶ Start Focus
            </button>
          </div>

          {/* ── Timer Profiles ── */}
          <div className="mind-profile-select-card card" style={{ marginTop: 24 }}>
            <label className="mind-profile-select-label" htmlFor="mind-timer-profile">
              Timer profile
            </label>
            <div className="mind-profile-select-row">
              <select
                id="mind-timer-profile"
                className="mind-profile-select"
                value={selectedProfileId}
                onChange={e => onSelectProfile(e.target.value)}
              >
                {focusTimerProfiles.map(p => {
                  const profileMinutes = (p.segments ?? []).reduce((s, seg) => s + seg.minutes, 0);
                  return (
                    <option key={p.id} value={p.id}>
                      {p.name} - {profileMinutes}m
                    </option>
                  );
                })}
              </select>
              {activeProfile && !activeProfile.isDefault && (
                <button
                  type="button"
                  className="mind-profile-delete-current"
                  onClick={() => onDeleteProfile(activeProfile.id)}
                >
                  Delete
                </button>
              )}
            </div>
          </div>

          {/* ── Segment editor ── */}
          <div className="mind-segment-editor card" style={{ marginTop: 10 }}>
            <div className="mind-seg-editor-header">
              <span className="mind-seg-editor-title">{activeProfile?.name}</span>
              {!showSaveProfile && (
                <button type="button" className="mind-seg-save-btn" onClick={() => setShowSaveProfile(true)}>
                  Save as…
                </button>
              )}
            </div>

            {showSaveProfile && (
              <form className="mind-save-profile-form" onSubmit={handleSaveProfile}>
                <input
                  className="mind-save-profile-input"
                  value={saveProfileName}
                  onChange={e => setSaveProfileName(e.target.value)}
                  placeholder="Profile name…"
                  autoFocus
                />
                <button type="submit" className="mind-save-profile-confirm" disabled={!saveProfileName.trim()}>Save</button>
                <button type="button" className="mind-save-profile-cancel" onClick={() => { setShowSaveProfile(false); setSaveProfileName(''); }}>✕</button>
              </form>
            )}

            <div className="mind-seq-strip" aria-label="Session sequence">
              {segments.map((seg, i) => (
                <div key={seg.id} className="mind-seq-chip-wrap">
                  <button
                    type="button"
                    className={`mind-seq-chip kind-${seg.kind}${selectedSegment?.id === seg.id ? ' selected' : ''}`}
                    onClick={() => setSelectedSegmentId(seg.id)}
                    aria-pressed={selectedSegment?.id === seg.id}
                  >
                    <span>{KIND_LABEL[seg.kind]}</span>
                    <strong>{seg.minutes}m</strong>
                  </button>
                  {i < segments.length - 1 && <span className="mind-seq-arrow" aria-hidden="true">›</span>}
                </div>
              ))}
            </div>

            {selectedSegment && (
              <div className={`mind-selected-seg-panel kind-${selectedSegment.kind}`}>
                <div className="mind-selected-seg-head">
                  <div>
                    <span className="mind-selected-seg-kicker">Selected segment</span>
                    <strong>{KIND_LABEL[selectedSegment.kind]}</strong>
                  </div>
                  <span className="mind-selected-seg-index">
                    {selectedSegmentIndex + 1} / {segments.length}
                  </span>
                </div>

                <div className="mind-seg-type-row" aria-label="Segment type">
                  {(['focus', 'rest', 'recall'] as TimerSegment['kind'][]).map(kind => (
                    <button
                      key={kind}
                      type="button"
                      className={`mind-seg-type-btn kind-${kind}${selectedSegment.kind === kind ? ' active' : ''}`}
                      onClick={() => updateSegmentKind(selectedSegment.id, kind)}
                      disabled={selectedSegment.kind === 'focus' && kind !== 'focus' && focusSegmentCount <= 1}
                    >
                      {KIND_LABEL[kind]}
                    </button>
                  ))}
                </div>

                <div className="mind-selected-seg-controls">
                  <button
                    type="button"
                    className="mind-seg-adj large"
                    onClick={() => updateSegmentMinutes(selectedSegment.id, selectedSegment.minutes - 5)}
                    disabled={selectedSegment.minutes <= 1}
                    aria-label="Decrease duration"
                  >
                    −
                  </button>
                  <label className="mind-selected-seg-duration">
                    <input
                      type="number"
                      className="mind-seg-input large"
                      value={segmentDrafts[selectedSegment.id] ?? String(selectedSegment.minutes)}
                      onChange={e => setSegmentDrafts(prev => ({ ...prev, [selectedSegment.id]: e.target.value }))}
                      onBlur={() => commitSegmentDraft(selectedSegment.id)}
                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    />
                    <span>min</span>
                  </label>
                  <button
                    type="button"
                    className="mind-seg-adj large"
                    onClick={() => updateSegmentMinutes(selectedSegment.id, selectedSegment.minutes + 5)}
                    aria-label="Increase duration"
                  >
                    +
                  </button>
                </div>

                <div className="mind-selected-seg-actions">
                  <button
                    type="button"
                    className="mind-seg-move-btn"
                    onClick={() => moveSegment(selectedSegment.id, -1)}
                    disabled={selectedSegmentIndex <= 0}
                  >
                    Move left
                  </button>
                  <button
                    type="button"
                    className="mind-seg-move-btn"
                    onClick={() => moveSegment(selectedSegment.id, 1)}
                    disabled={selectedSegmentIndex === -1 || selectedSegmentIndex >= segments.length - 1}
                  >
                    Move right
                  </button>
                  <button
                    type="button"
                    className="mind-seg-delete-btn"
                    onClick={() => removeSegment(selectedSegment.id)}
                    disabled={selectedSegment.kind === 'focus' && focusSegmentCount <= 1}
                  >
                    Delete segment
                  </button>
                </div>
              </div>
            )}
            <div className="mind-seg-add-row">
              <button type="button" className="mind-seg-add-btn focus" onClick={() => addSegment('focus')}>+ Focus</button>
              <button type="button" className="mind-seg-add-btn recall" onClick={() => addSegment('recall')}>+ Recall</button>
              <button type="button" className="mind-seg-add-btn rest" onClick={() => addSegment('rest')}>+ Rest</button>
            </div>
          </div>

          {/* ── Tags ── */}
          <div className="page-section-label" style={{ marginTop: 24 }}>Tags</div>
          <div className="mind-tags-editor card">
            {focusTags.length > 0 && (
              <div className="mind-tag-select-block">
                <label className="mind-tag-select-label" htmlFor="mind-tag-select">Choose tag</label>
                <select
                  id="mind-tag-select"
                  className="mind-tag-select"
                  value={selectedManagedTag?.id ?? ''}
                  onChange={e => { setSelectedManagedTagId(e.target.value); setExpandedTagColor(null); }}
                >
                  {focusTags.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </div>
            )}
            {selectedManagedTag && (
              <div className="mind-tag-selected-row">
                <button
                  type="button"
                  className="mind-tag-color-btn"
                  style={{ background: selectedManagedTag.color ?? '#6b7280' }}
                  onClick={() => setExpandedTagColor(expandedTagColor === selectedManagedTag.id ? null : selectedManagedTag.id)}
                  aria-label="Change color"
                />
                <span className="mind-tag-name">{selectedManagedTag.name}</span>
                <button type="button" className="mind-tag-del-btn" onClick={() => onDeleteTag(selectedManagedTag.id)} aria-label={`Delete ${selectedManagedTag.name}`}>×</button>
                {expandedTagColor === selectedManagedTag.id && (
                  <div className="mind-tag-palette">
                    {TAG_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        className={`mind-tag-swatch${selectedManagedTag.color === c ? ' selected' : ''}`}
                        style={{ background: c }}
                        onClick={() => { onUpdateTag(selectedManagedTag.id, { color: c }); setExpandedTagColor(null); }}
                        aria-label={c}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="mind-tag-add-row">
              <input
                className="mind-tag-add-input"
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddTag(); }}
                placeholder="New tag…"
              />
              <button type="button" className="mind-tag-add-btn" onClick={handleAddTag} disabled={!newTagName.trim()}>+ Add</button>
            </div>
          </div>

          {/* ── Manual session log ── */}
          <div className="mind-manual-log-area" style={{ marginTop: 20 }}>
            <button type="button" className="mind-manual-log-btn" onClick={() => setShowManualLog(o => !o)}>
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
                  Tag
                  <select
                    className="modal-input modal-select"
                    value={manualTagId}
                    onChange={e => setManualTagId(e.target.value)}
                  >
                    <option value="">None</option>
                    {focusTags.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
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
                      <button key={q} type="button" className={`cft-quality-btn${manualQuality === q ? ' selected' : ''}`} onClick={() => setManualQuality(q)}>{q}</button>
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
                <button type="submit" className="modal-submit" disabled={!manualTitle.trim() || manualMinutes < 1}>Save Session</button>
              </form>
            )}
          </div>
        </>
      )}

      {/* ── Focus by tag ── */}
      {subjectStats.length > 0 && (
        <>
          <div className="page-section-label" style={{ marginTop: 24 }}>Focus by Tag</div>
          <div className="mind-subject-stats card">
            {subjectStats.map(([subject, minutes]) => {
              const tag = focusTags.find(t => t.name === subject);
              return (
                <div key={subject} className="mind-subject-row">
                  {tag?.color && <span className="mind-subject-dot" style={{ background: tag.color }} />}
                  <span className="mind-subject-name">{subject}</span>
                  <div className="mind-subject-bar-track">
                    <div
                      className="mind-subject-bar-fill"
                      style={{
                        width: `${Math.min(100, (minutes / (subjectStats[0][1] || 1)) * 100)}%`,
                        background: tag?.color ?? undefined,
                      }}
                    />
                  </div>
                  <span className="mind-subject-time">{formatMinutes(minutes)}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
      {taggedLogs.length === 0 && (
        <>
          <div className="page-section-label" style={{ marginTop: 24 }}>Focus by Tag</div>
          <div className="page-empty-card">
            <div className="page-empty-icon">◎</div>
            <div className="page-empty-title">No tagged sessions yet</div>
            <div className="page-empty-sub">Select a tag during your next focus session.</div>
          </div>
        </>
      )}

      {/* ── Recent sessions ── */}
      <div className="page-section-label" style={{ marginTop: 24 }}>Recent Sessions</div>
      {focusSessionLogs.length === 0 ? (
        <div className="page-empty-card">
          <div className="page-empty-icon">◎</div>
          <div className="page-empty-title">No sessions yet</div>
          <div className="page-empty-sub">Complete a focus session to see your log here.</div>
        </div>
      ) : (
        <div className="focus-log-cards">
          {focusSessionLogs.slice(0, 8).map(log => {
            const tag = focusTags.find(t => t.name === log.tagName);
            return (
              <div key={log.id} className="focus-log-card">
                <div className="flc-header">
                  <span className="flc-title">{log.title}</span>
                  <span className={`flc-quality quality-${log.quality.toLowerCase()}`}>
                    {QUALITY_LABEL[log.quality]}
                  </span>
                </div>
                <div className="flc-meta">
                  <span>
                    {log.actualMinutes}m · {log.type}
                    {log.tagName && (
                      <>
                        {' · '}
                        {tag?.color && <span className="flc-tag-dot" style={{ background: tag.color }} />}
                        {log.tagName}
                      </>
                    )}
                  </span>
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
            );
          })}
        </div>
      )}

      {/* ── Focus stats ── */}
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
