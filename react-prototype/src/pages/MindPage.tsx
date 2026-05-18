import { FocusSessionLog } from '../types';
import { formatRelativeTime } from '../utils/todayFlow';

interface Props {
  focusSessionLogs: FocusSessionLog[];
}

const QUALITY_LABEL: Record<string, string> = { Low: 'Low', Normal: 'Good', High: 'Deep' };

export function MindPage({ focusSessionLogs }: Props) {
  const totalSessions = focusSessionLogs.length;
  const totalMinutes = focusSessionLogs.reduce((s, l) => s + l.actualMinutes, 0);
  const deepMinutes = focusSessionLogs
    .filter(l => l.type === 'Deep Work' || l.type === 'Study')
    .reduce((s, l) => s + l.actualMinutes, 0);
  const avgQualityScore = totalSessions > 0
    ? (focusSessionLogs.reduce((s, l) => s + (l.quality === 'High' ? 3 : l.quality === 'Normal' ? 2 : 1), 0) / totalSessions).toFixed(1)
    : null;

  return (
    <div className="page mind-page">
      <div className="page-section-label">Recent Focus Sessions</div>

      {focusSessionLogs.length === 0 ? (
        <div className="page-empty-card">
          <div className="page-empty-icon">◎</div>
          <div className="page-empty-title">No sessions yet</div>
          <div className="page-empty-sub">
            Complete a focus session on Today to see your log here.
          </div>
        </div>
      ) : (
        <div className="focus-log-cards">
          {focusSessionLogs.slice(0, 10).map(log => (
            <div key={log.id} className="focus-log-card">
              <div className="flc-header">
                <span className="flc-title">{log.title}</span>
                <span className={`flc-quality quality-${log.quality.toLowerCase()}`}>
                  {QUALITY_LABEL[log.quality]}
                </span>
              </div>
              <div className="flc-meta">
                <span>{log.actualMinutes}m · {log.type}</span>
                <span className="flc-xp">+{log.xpAwarded} XP</span>
              </div>
              {log.interruptions > 0 && (
                <div className="flc-meta" style={{ marginTop: 2 }}>
                  <span style={{ color: 'var(--amber)' }}>{log.interruptions} interrupt{log.interruptions !== 1 ? 's' : ''}</span>
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

      <div className="page-section-label" style={{ marginTop: 24 }}>Focus Stats</div>
      <div className="stat-cards-grid">
        <div className="stat-card accent">
          <div className="stat-card-value">{totalSessions}</div>
          <div className="stat-card-label">Sessions</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-card-value">{totalMinutes}</div>
          <div className="stat-card-label">Total min</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{deepMinutes}</div>
          <div className="stat-card-label">Deep min</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{avgQualityScore ?? '—'}</div>
          <div className="stat-card-label">Avg quality</div>
        </div>
      </div>

      <div className="page-section-label" style={{ marginTop: 24 }}>Manual Log</div>
      <div className="placeholder-card">
        <div className="placeholder-card-header">
          <span className="placeholder-card-icon">✎</span>
          <span className="placeholder-card-title">Manual session logging</span>
          <span className="coming-soon-chip">Soon</span>
        </div>
        <div className="placeholder-card-sub">
          Log a session you did offline or forgot to track in the app.
        </div>
      </div>
    </div>
  );
}
