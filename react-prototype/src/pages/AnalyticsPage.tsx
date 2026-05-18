import { CharacterState, FocusSessionLog } from '../types';

interface Props {
  focusSessionLogs: FocusSessionLog[];
  character: CharacterState;
}

export function AnalyticsPage({ focusSessionLogs, character }: Props) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekLogs = focusSessionLogs.filter(l => l.startedAt > weekAgo);
  const weekMinutes = weekLogs.reduce((s, l) => s + l.actualMinutes, 0);
  const weekXp = weekLogs.reduce((s, l) => s + l.xpAwarded, 0);

  return (
    <div className="page analytics-page">
      <div className="page-section-label">This Week</div>
      <div className="stat-cards-grid">
        <div className="stat-card accent">
          <div className="stat-card-value">{weekLogs.length}</div>
          <div className="stat-card-label">Sessions</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-card-value">{weekMinutes}</div>
          <div className="stat-card-label">Focus min</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{weekXp}</div>
          <div className="stat-card-label">XP earned</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{character.level}</div>
          <div className="stat-card-label">Level</div>
        </div>
      </div>

      <div className="page-section-label" style={{ marginTop: 24 }}>All Time</div>
      <div className="stat-cards-grid">
        <div className="stat-card">
          <div className="stat-card-value">{focusSessionLogs.length}</div>
          <div className="stat-card-label">Total sessions</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">
            {Math.round(character.totalXp)}
          </div>
          <div className="stat-card-label">Total XP</div>
        </div>
      </div>

      <div className="page-section-label" style={{ marginTop: 24 }}>Streaks & Trends</div>
      <div className="placeholder-card">
        <div className="placeholder-card-header">
          <span className="placeholder-card-icon">≡</span>
          <span className="placeholder-card-title">Consistency charts</span>
          <span className="coming-soon-chip">Soon</span>
        </div>
        <div className="placeholder-card-sub">
          Habit streaks, completion rates, and weekly trend charts coming soon.
        </div>
      </div>
    </div>
  );
}
