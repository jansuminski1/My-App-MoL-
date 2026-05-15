import { CurrentFocus, HabitFlow } from '../types';

interface Props {
  focus: CurrentFocus;
  onToggleStep: (flowId: string, stepId: string) => void;
  onToggleTask: (taskId: string) => void;
  onToggleFocusBlock: (blockId: string) => void;
  onStartFocus: (blockId: string) => void;
}

export function CurrentFocusCard({ focus, onToggleStep, onToggleTask, onToggleFocusBlock, onStartFocus }: Props) {
  const { item } = focus;

  if (item.kind === 'habit-flow') {
    const flow = item as HabitFlow;
    const step = flow.steps.find(s => s.id === focus.stepId);
    if (!step) return null;
    const stepIdx = flow.steps.findIndex(s => s.id === focus.stepId);
    const isLastStep = stepIdx === flow.steps.length - 1;

    return (
      <div className={`current-focus-card type-habit${step.completed ? ' done' : ''}`}>
        <div className="current-focus-inner">
          <div className="current-focus-kicker">
            <span className="current-focus-type-badge habit">Habit Step</span>
            <span className="current-focus-chain">
              {flow.title}{isLastStep && !step.completed && ' · final'}
            </span>
          </div>
          <h2 className="current-focus-title">{step.name}</h2>
          <p className="current-focus-identity">{step.identity}</p>
          <p className="current-focus-cue">{step.cue}</p>
          <div className="current-focus-actions">
            {step.completed ? (
              <>
                <button className="btn-complete done-btn" onClick={() => onToggleStep(flow.id, step.id)}>
                  <span>✓</span> Completed
                </button>
                <button className="btn-uncomplete" onClick={() => onToggleStep(flow.id, step.id)}>Undo</button>
              </>
            ) : (
              <button className="btn-complete" onClick={() => onToggleStep(flow.id, step.id)}>
                ✓ Complete Step
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (item.kind === 'quick-task') {
    return (
      <div className={`current-focus-card type-task${item.completed ? ' done' : ''}`}>
        <div className="current-focus-inner">
          <div className="current-focus-kicker">
            <span className="current-focus-type-badge task">Quick Task</span>
          </div>
          <h2 className="current-focus-title">{item.title}</h2>
          {item.notes && <p className="current-focus-notes">{item.notes}</p>}
          <div className="current-focus-actions">
            {item.completed ? (
              <>
                <button className="btn-complete done-btn" onClick={() => onToggleTask(item.id)}>
                  <span>✓</span> Done
                </button>
                <button className="btn-uncomplete" onClick={() => onToggleTask(item.id)}>Undo</button>
              </>
            ) : (
              <button className="btn-complete task-btn" onClick={() => onToggleTask(item.id)}>
                ✓ Mark Done
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (item.kind === 'focus-block') {
    return (
      <div className={`current-focus-card type-focus${item.completed ? ' done' : ''}`}>
        <div className="current-focus-inner">
          <div className="current-focus-kicker">
            <span className="current-focus-type-badge focus">Focus Block</span>
          </div>
          <h2 className="current-focus-title">{item.title}</h2>
          <div className="current-focus-meta">
            <span className="focus-duration-badge">⏱ {item.duration} min</span>
            <span className="focus-xp-badge">+40 XP · Deep Work</span>
          </div>
          {item.notes && <p className="current-focus-notes">{item.notes}</p>}
          <div className="current-focus-actions">
            {item.completed ? (
              <>
                <button className="btn-complete done-btn" onClick={() => onToggleFocusBlock(item.id)}>
                  <span>✓</span> Completed
                </button>
                <button className="btn-uncomplete" onClick={() => onToggleFocusBlock(item.id)}>Undo</button>
              </>
            ) : (
              <div className="cfc-focus-actions">
                <button className="cfc-start-session-btn" onClick={() => onStartFocus(item.id)}>
                  ▶ Start Session
                </button>
                <button className="cfc-mark-done-btn" onClick={() => onToggleFocusBlock(item.id)}>
                  Mark as Done
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
