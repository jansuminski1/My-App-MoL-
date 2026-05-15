import { QuickTask } from '../types';

interface Props {
  task: QuickTask;
  isCurrent: boolean;
  onToggle: (taskId: string) => void;
}

export function TaskCard({ task, isCurrent, onToggle }: Props) {
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
    </div>
  );
}
