import { FocusBlock } from '../types';

interface Props {
  block: FocusBlock;
  isCurrent: boolean;
  isActive: boolean;
  onToggle: (blockId: string) => void;
  onStart: (blockId: string) => void;
}

export function FocusBlockCard({ block, isCurrent, isActive, onToggle, onStart }: Props) {
  return (
    <div className={`focus-block-card${isCurrent ? ' is-current' : ''}${block.completed ? ' done' : ''}${isActive ? ' is-active-session' : ''}`}>
      <div className="focus-block-icon">🎯</div>
      <div className="focus-block-content">
        <div className="focus-block-title">{block.title}</div>
        <div className="focus-block-meta">
          <span className="focus-block-duration">{block.duration} min</span>
          {block.notes && <span className="focus-block-notes">{block.notes}</span>}
        </div>
      </div>
      <div className="focus-block-actions">
        {isActive ? (
          <span className="focus-block-active-pill">In Session</span>
        ) : !block.completed ? (
          <button
            className="focus-block-start-btn"
            onClick={() => onStart(block.id)}
            aria-label="Start focus session"
          >
            ▶ Start
          </button>
        ) : null}
        <button
          className={`focus-block-check${block.completed ? ' done' : ''}`}
          onClick={() => onToggle(block.id)}
          aria-label={block.completed ? 'Mark incomplete' : 'Mark complete'}
        >
          {block.completed ? '✓' : ''}
        </button>
      </div>
    </div>
  );
}
