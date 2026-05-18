import { useState } from 'react';
import { CharacterState } from '../types';
import { formatRelativeTime } from '../utils/todayFlow';

interface Props {
  character: CharacterState;
  onReset?: () => void;
  onSimulateTomorrow?: () => void;
}

const STAT_LABELS: Record<string, string> = {
  intelligence: 'Intelligence',
  health: 'Health',
  strength: 'Strength',
  wealth: 'Finances',
  connection: 'Connection',
  purpose: 'Goals',
  consistency: 'Consistency',
  resolve: 'Resolve',
};

export function CharacterMini({ character, onReset, onSimulateTomorrow }: Props) {
  const [open, setOpen] = useState(false);

  const strongest = STAT_LABELS[character.strongestStat] ?? character.strongestStat;
  const weakest = STAT_LABELS[character.weakestStat] ?? character.weakestStat;

  return (
    <div className="character-mini card" style={{ marginBottom: 16 }}>
      <div
        className="character-mini-header"
        onClick={() => setOpen(o => !o)}
        role="button"
        aria-expanded={open}
      >
        <div className="character-mini-left">
          <div className="rank-badge-mini">R{character.rank}</div>
          <div className="character-mini-info">
            <div className="character-mini-role">{character.role}</div>
            <div className="character-mini-rank">
              {character.rankTitle} · Level {character.level}
            </div>
          </div>
        </div>

        <div className="character-mini-right">
          <div className="xp-mini-bar-track">
            <div
              className="xp-mini-bar-fill"
              style={{ width: `${character.progressPercent}%` }}
            />
          </div>
          <span className="xp-mini-label">{Math.round(character.totalXp)} XP total</span>
        </div>

        <span className={`character-mini-toggle${open ? ' open' : ''}`}>▾</span>
      </div>

      {open && (
        <div className="character-mini-body">
          <div className="character-insight-row">
            <div className="insight-chip">
              <div className="insight-chip-label">Strongest</div>
              <div className="insight-chip-value">{strongest}</div>
            </div>
            <div className="insight-chip">
              <div className="insight-chip-label">Needs Work</div>
              <div className="insight-chip-value">{weakest}</div>
            </div>
            <div className="insight-chip">
              <div className="insight-chip-label">Total XP</div>
              <div className="insight-chip-value">{Math.round(character.totalXp)}</div>
            </div>
          </div>

          {character.xpEvents.length > 0 && (
            <>
              <div className="xp-events-label">Recent XP</div>
              <div className="xp-events-list">
                {character.xpEvents.slice(0, 4).map(e => (
                  <div key={e.id} className="xp-event-row">
                    <span className="xp-event-label">{e.label}</span>
                    <span className="xp-event-amount">+{Math.round(e.generalXp)}</span>
                    <span className="xp-event-time">{formatRelativeTime(e.timestamp)}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {(onReset || onSimulateTomorrow) && (
            <div className="character-mini-reset-row">
              {onSimulateTomorrow && (
                <button className="character-mini-reset-btn" onClick={onSimulateTomorrow} title="Move today's tasks and focus blocks to yesterday to test daily rollover">
                  Next day ↷
                </button>
              )}
              {onReset && (
                <button className="character-mini-reset-btn" onClick={onReset}>
                  Reset prototype
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
