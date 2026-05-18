import { CharacterState, FocusSessionLog, LifeStats } from '../types';
import { formatRelativeTime } from '../utils/todayFlow';

interface Props {
  character: CharacterState;
  focusSessionLogs: FocusSessionLog[];
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

export function CharacterPage({ character, focusSessionLogs }: Props) {
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
