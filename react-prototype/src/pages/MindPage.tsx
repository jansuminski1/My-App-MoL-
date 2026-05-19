import { useState } from 'react';
import { FocusSession, FocusSessionLog, FocusTimerProfile, FocusTag } from '../types';
import { CircularFocusTimer } from '../components/CircularFocusTimer';
import { AddTimerProfileModal } from '../components/AddTimerProfileModal';
import { formatRelativeTime } from '../utils/todayFlow';

interface Props {
  session: FocusSession | null;
  focusSessionLogs: FocusSessionLog[];
  focusTags: FocusTag[];
  focusTimerProfiles: FocusTimerProfile[];
  selectedProfileId: string;
  onPause: () => void;
  onResume: () => void;
  onAdvancePhase: () => void;
  onAddInterruption: () => void;
  onSetQuality: (q: 'Low' | 'Normal' | 'High') => void;
  onSetReflection: (text: string) => void;
  onSetTag: (tagId: string | undefined, tagName: string | undefined) => void;
  onAddTag: (name: string) => void;
  onCancelSession: () => void;
  onSelectProfile: (id: string) => void;
  onAddProfile: (data: { name: string; focusMinutes: number; recallMinutes: number; restMinutes: number }) => void;
  onDeleteProfile: (id: string) => void;
  onStartQuickFocus: () => void;
}

const QUALITY_LABEL: Record<string, string> = { Low: 'Low', Normal: 'Good', High: 'Deep' };

function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function MindPage({
  session, focusSessionLogs, focusTags, focusTimerProfiles, selectedProfileId,
  onPause, onResume, onAdvancePhase, onAddInterruption,
  onSetQuality, onSetReflection, onSetTag, onAddTag, onCancelSession,
  onSelectProfile, onAddProfile, onDeleteProfile, onStartQuickFocus,
}: Props) {
  const [showAddProfile, setShowAddProfile] = useState(false);

  const selectedProfile = focusTimerProfiles.find(p => p.id === selectedProfileId) ?? focusTimerProfiles[0];

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
          onAddInterruption={onAddInterruption}
          onSetQuality={onSetQuality}
          onSetReflection={onSetReflection}
          onSetTag={onSetTag}
          onAddTag={onAddTag}
          onCancel={onCancelSession}
        />
      ) : (
        /* ── No session: profiles + ready card ── */
        <>
          <div className="mind-ready-card">
            <div className="mind-ready-icon">◎</div>
            <div className="mind-ready-title">Ready for Deep Work</div>
            {selectedProfile && (
              <div className="mind-ready-sub">
                {selectedProfile.name} · {selectedProfile.focusMinutes}m focus{selectedProfile.recallMinutes > 0 ? ` · ${selectedProfile.recallMinutes}m recall` : ''}{selectedProfile.restMinutes > 0 ? ` · ${selectedProfile.restMinutes}m rest` : ''}
              </div>
            )}
            <button type="button" className="mind-start-btn" onClick={onStartQuickFocus}>
              ▶ Start Focus
            </button>
          </div>

          <div className="page-section-label" style={{ marginTop: 20 }}>Timer Profiles</div>
          <div className="mind-profiles-row">
            {focusTimerProfiles.map(p => (
              <button
                key={p.id}
                type="button"
                className={`mind-profile-chip${p.id === selectedProfileId ? ' selected' : ''}`}
                onClick={() => onSelectProfile(p.id)}
              >
                <span className="mpc-name">{p.name}</span>
                <span className="mpc-times">{p.focusMinutes}/{p.recallMinutes}/{p.restMinutes}</span>
              </button>
            ))}
            <button
              type="button"
              className="mind-profile-chip mind-profile-add"
              onClick={() => setShowAddProfile(true)}
            >+ Profile</button>
          </div>

          {/* Delete custom profiles */}
          {focusTimerProfiles.some(p => !p.isDefault) && (
            <div className="mind-profile-manage">
              {focusTimerProfiles.filter(p => !p.isDefault).map(p => (
                <span key={p.id} className="mind-profile-custom-row">
                  <span>{p.name}</span>
                  <button
                    type="button"
                    className="mind-profile-delete-btn"
                    onClick={() => onDeleteProfile(p.id)}
                  >✕</button>
                </span>
              ))}
            </div>
          )}
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

      {showAddProfile && (
        <AddTimerProfileModal
          onAdd={(data) => { onAddProfile(data); setShowAddProfile(false); }}
          onClose={() => setShowAddProfile(false)}
        />
      )}
    </div>
  );
}
