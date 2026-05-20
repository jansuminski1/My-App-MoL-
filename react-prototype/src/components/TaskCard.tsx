import { QuickTask } from '../types';
import { formatShortDate, todayDateKey } from '../utils/date';

interface Props {
  task: QuickTask;
  isCurrent: boolean;
  onToggle: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

function formatTime12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export function TaskCard({ task, isCurrent, onToggle, onDelete }: Props) {
  const today = todayDateKey();
  const carriedDateKey = task.originalDateKey && task.originalDateKey !== today
    ? task.originalDateKey
    : task.carriedFromDateKey ?? (task.dateKey < today ? task.dateKey : undefined);

  function handleDelete() {
    if (window.confirm(`Delete "${task.title}"?`)) onDelete?.(task.id);
  }

  return (
    <div className={`task-card${isCurrent ? ' is-current' : ''}${task.completed ? ' done' : ''}`}>
      <button
        className={`task-checkbox${task.completed ? ' done' : ''}`}
        onClick={() => onToggle(task.id)}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
      >
        {task.completed ? '✓' : ''}
      </button>
      <div className="task-content">
        <div className="task-title">{task.title}</div>
        {carriedDateKey && (
          <div className="task-carry-label">From {formatShortDate(carriedDateKey)}</div>
        )}
        {task.notes && <div className="task-notes">{task.notes}</div>}
      </div>
      {task.time && (
        <span className="task-time-badge">{formatTime12(task.time)}</span>
      )}
      <span className="task-type-label">Task</span>
      {onDelete && (
        <button className="item-more-btn" onClick={handleDelete} aria-label="Delete task">
          ×
        </button>
      )}
    </div>
  );
}
