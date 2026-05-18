import { QuickTask } from '../types';

interface Props {
  task: QuickTask;
  isCurrent: boolean;
  onToggle: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

export function TaskCard({ task, isCurrent, onToggle, onDelete }: Props) {
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
        {task.notes && <div className="task-notes">{task.notes}</div>}
      </div>
      <span className="task-type-label">Task</span>
      {onDelete && (
        <button className="item-more-btn" onClick={handleDelete} aria-label="Delete task">
          ×
        </button>
      )}
    </div>
  );
}
