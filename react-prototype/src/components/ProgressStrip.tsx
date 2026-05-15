import { CharacterState } from '../types';
import { getModeFromProgress } from '../utils/todayFlow';
import { ModeBadge } from './ModeBadge';

interface Props {
  completed: number;
  total: number;
  character: CharacterState;
}

export function ProgressStrip({ completed, total, character }: Props) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  const allDone = completed === total && total > 0;
  const mode = getModeFromProgress(completed, total);

  return (
    <div className="progress-strip">
      <div className="progress-strip-left">
        <div className="progress-strip-counts">
          <span className="progress-count-big">{completed}</span>
          <span className="progress-count-label">/ {total} done</span>
          <span style={{ marginLeft: 4 }}>
            <ModeBadge mode={mode} />
          </span>
        </div>
        <div className="progress-bar-track">
          <div
            className={`progress-bar-fill${allDone ? ' all-done' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <div className="progress-strip-right">
        <span className="level-badge">Lvl {character.level} · R{character.rank}</span>
        <div className="xp-strip-bar">
          <div
            className="xp-strip-fill"
            style={{ width: `${character.progressPercent}%` }}
          />
        </div>
        <span className="xp-strip-label">
          {character.xpIntoLevel} / {character.xpForNextLevel} XP
        </span>
      </div>
    </div>
  );
}
