import { CharacterState, FocusSessionLog, LifeStats, Goal } from '../types';
import { formatRelativeTime } from '../utils/todayFlow';
import { currentWeekKey, currentMonthKey } from '../utils/date';

interface Props {
  character: CharacterState;
  focusSessionLogs: FocusSessionLog[];
  goals: Goal[];
  syncUser: { email: string | null; displayName: string | null } | null;
  syncStatus: 'local' | 'signed-in' | 'loading' | 'syncing' | 'synced' | 'error';
  syncMessage: string;
  onSignIn: () => void;
  onSignOut: () => void;
}

const STAT_LABELS: Record<string, string> = {
  intelligence: 'Intelligence',
  health:        'Health',
  strength:      'Strength',
  wealth:        'Finances',
  connection:    'Connection',
  purpose:       'Goals',
  consistency:   'Consistency',
  resolve:       'Resolve',
};

const STAT_COLORS: Record<string, string> = {
  intelligence: 'var(--accent)',
  health:        'var(--green)',
  strength:      'var(--amber)',
  wealth:        '#10b981',
  connection:    '#8b5cf6',
  purpose:       '#f59e0b',
  consistency:   '#22c55e',
  resolve:       '#ef4444',
};

export function CharacterPage({
  character,
  focusSessionLogs,
  goals,
  syncUser,
  syncStatus,
  syncMessage,
  onSignIn,
  onSignOut,
}: Props) {
  const wk = currentWeekKey();
  const mk = currentMonthKey();
  const weeklyGoals = goals.filter(g => g.period === 'weekly' && g.weekKey === wk && g.status !== 'archived');
  const monthlyGoals = goals.filter(g => g.period === 'monthly' && g.monthKey === mk && g.status !== 'archived');
  const weeklyDone = weeklyGoals.filter(g => g.status === 'completed').length;
  const monthlyDone = monthlyGoals.filter(g => g.status === 'completed').length;
  const weeklyActive = weeklyGoals.filter(g => g.status === 'active').length;
  const monthlyActive = monthlyGoals.filter(g => g.status === 'active').length;

  return (
    <div className="page character-page">
      {/* Hero card */}
      <div className="char-hero-card card">
        <div className="char-hero-top">
          <div className="char-rank-badge">R{character.rank}</div>
          <div className="char-hero-info">
            <div className="char-role">{character.role}</div>
            <div className="char-rank-title">{character.rankTitle}</div>
          </div>
          <div className="char-level-badge">Level {character.level}</div>
        </div>
        <div className="char-xp-bar-track">
          <div className="char-xp-bar-fill" style={{ width: `${character.progressPercent}%` }} />
        </div>
        <div className="char-xp-numbers">
          <span>{character.xpIntoLevel} XP into level</span>
          <span className="char-xp-total">{Math.round(character.totalXp)} total</span>
          <span>next: {character.xpForNextLevel}</span>
        </div>
      </div>

      <div className="page-section-label">Sync</div>
      <div className="sync-card card">
        <div>
          <div className="sync-card-title">{syncUser ? 'Cloud sync active' : 'Local only'}</div>
          <div className="sync-card-meta">
            {syncUser ? (syncUser.email ?? syncUser.displayName ?? 'Signed in') : 'Sign in to share this prototype across laptop, phone, and Netlify.'}
          </div>
          <div className={`sync-card-status sync-${syncStatus}`}>{syncMessage}</div>
        </div>
        <button type="button" className="sync-card-button" onClick={syncUser ? onSignOut : onSignIn}>
          {syncUser ? 'Sign out' : 'Sign in with Google'}
        </button>
      </div>

      {/* Insights */}
      <div className="page-section-label">Insights</div>
      <div className="char-insight-cards">
        <div className="char-insight-card">
          <div className="char-insight-label">Strongest</div>
          <div className="char-insight-value">
            {STAT_LABELS[character.strongestStat] ?? character.strongestStat}
          </div>
        </div>
        <div className="char-insight-card">
          <div className="char-insight-label">Needs Work</div>
          <div className="char-insight-value">
            {STAT_LABELS[character.weakestStat] ?? character.weakestStat}
          </div>
        </div>
      </div>

      {/* Goals summary */}
      {(weeklyGoals.length > 0 || monthlyGoals.length > 0) && (
        <>
          <div className="page-section-label">Goals</div>
          <div className="char-goals-row">
            <div className="char-goals-chip">
              <div className="char-goals-chip-num">{weeklyDone}/{weeklyGoals.length}</div>
              <div className="char-goals-chip-label">Weekly done</div>
            </div>
            <div className="char-goals-chip">
              <div className="char-goals-chip-num">{weeklyActive}</div>
              <div className="char-goals-chip-label">Weekly active</div>
            </div>
            <div className="char-goals-chip">
              <div className="char-goals-chip-num">{monthlyDone}/{monthlyGoals.length}</div>
              <div className="char-goals-chip-label">Monthly done</div>
            </div>
            <div className="char-goals-chip">
              <div className="char-goals-chip-num">{monthlyActive}</div>
              <div className="char-goals-chip-label">Monthly active</div>
            </div>
          </div>
        </>
      )}

      {/* Stats */}
      <div className="page-section-label">Life Stats</div>
      <div className="char-stats-list card">
        {(Object.entries(character.stats) as [keyof LifeStats, number][]).map(([key, val]) => (
          <div key={key} className="char-stat-row">
            <span className="char-stat-label">{STAT_LABELS[key] ?? key}</span>
            <div className="char-stat-bar-track">
              <div
                className="char-stat-bar-fill"
                style={{ width: `${val}%`, background: STAT_COLORS[key] ?? 'var(--accent)' }}
              />
            </div>
            <span className="char-stat-value">{val}</span>
          </div>
        ))}
      </div>

      {/* Recent XP events */}
      {character.xpEvents.length > 0 && (
        <>
          <div className="page-section-label">Recent XP</div>
          <div className="char-xp-events card">
            {character.xpEvents.slice(0, 8).map(e => (
              <div key={e.id} className="xp-event-row">
                <span className="xp-event-label">{e.label}</span>
                <span className="xp-event-amount">+{Math.round(e.generalXp)}</span>
                <span className="xp-event-time">{formatRelativeTime(e.timestamp)}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Recent focus sessions */}
      {focusSessionLogs.length > 0 && (
        <>
          <div className="page-section-label" style={{ marginTop: 20 }}>Recent Focus</div>
          <div className="char-focus-logs card">
            {focusSessionLogs.slice(0, 5).map(log => (
              <div key={log.id} className="focus-log-row">
                <span className="focus-log-title">{log.title}</span>
                <span className="focus-log-meta">
                  {log.actualMinutes}m · {log.quality} · +{log.xpAwarded} XP
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
