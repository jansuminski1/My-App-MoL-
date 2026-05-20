import { CurrentFocus, HabitFlow } from '../types';
import { formatShortDate, todayDateKey } from '../utils/date';

interface Props {
  focus: CurrentFocus;
  onToggleStep: (flowId: string, stepId: string) => void;
  onToggleTask: (taskId: string) => void;
  onToggleFocusBlock: (blockId: string) => void;
  onStartFocus: (blockId: string) => void;
  onSkipStep: (flowId: string, stepId: string) => void;
}

export function CurrentFocusCard({ focus, onToggleStep, onToggleTask, onToggleFocusBlock, onStartFocus, onSkipStep }: Props) {
  const { item } = focus;

  if (item.kind === 'habit-flow') {
    const flow = item as HabitFlow;
    const step = flow.steps.find(s => s.id === focus.stepId);
    if (!step) return null;
    const today = todayDateKey();
    const stepDone = !!step.completionLog[today];
    const stepIdx = flow.steps.findIndex(s => s.id === focus.stepId);
    const isLastStep = stepIdx === flow.steps.length - 1;
    const stepPosition = isLastStep && !stepDone
      ? `${flow.title} · final step`
      : `${flow.title} · step ${stepIdx + 1} of ${flow.steps.length}`;

    return (
      <div className={`current-focus-card type-habit${stepDone ? ' done' : ''}`}>
        <div className="current-focus-inner">
          <div className="cfc-hero-label">Current Focus</div>
          <div className="current-focus-kicker">
            <span className="current-focus-type-badge habit">Habit Step</span>
            <span className="current-focus-chain">{stepPosition}</span>
          </div>
          <h2 className="current-focus-title">{step.name}</h2>
          {step.cue && (
            <p className="current-focus-cue">
              <span className="current-focus-field-label">Cue:</span> {step.cue}
            </p>
          )}
          {step.identity && (
            <p className="current-focus-identity">
              <span className="current-focus-field-label">Vote:</span> {step.identity}
            </p>
          )}
          {(step.tinyVersion || step.tinyMinimum) && (
            <p className="current-focus-tiny">
              <span className="current-focus-field-label">Tiny version:</span> {step.tinyVersion || step.tinyMinimum}
            </p>
          )}
          <div className="current-focus-actions">
            {stepDone ? (
              <>
                <button className="btn-complete done-btn" onClick={() => onToggleStep(flow.id, step.id)}>
                  <span>✓</span> Completed
                </button>
                <button className="btn-uncomplete" onClick={() => onToggleStep(flow.id, step.id)}>Undo</button>
              </>
            ) : (
              <>
                <button className="btn-complete" onClick={() => onToggleStep(flow.id, step.id)}>
                  ✓ Complete Step
                </button>
                <button className="btn-skip-step" onClick={() => onSkipStep(flow.id, step.id)}>
                  Skip for today
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (item.kind === 'quick-task') {
    const today = todayDateKey();
    const carriedDateKey = item.originalDateKey && item.originalDateKey !== today
      ? item.originalDateKey
      : item.carriedFromDateKey ?? (item.dateKey < today ? item.dateKey : undefined);

    return (
      <div className={`current-focus-card type-task${item.completed ? ' done' : ''}`}>
        <div className="current-focus-inner">
          <div className="cfc-hero-label">Current Focus</div>
          <div className="current-focus-kicker">
            <span className="current-focus-type-badge task">Quick Task</span>
            {item.time && (
              <span className="cfc-time-badge">{item.time}</span>
            )}
          </div>
          <h2 className="current-focus-title">{item.title}</h2>
          {carriedDateKey && (
            <p className="current-focus-carried">From {formatShortDate(carriedDateKey)}</p>
          )}
          {item.firstAction && (
            <p className="current-focus-first-action">
              <span className="current-focus-field-label task-label">First action:</span> {item.firstAction}
            </p>
          )}
          {item.tinyVersion && (
            <p className="current-focus-tiny">
              <span className="current-focus-field-label task-label">Tiny version:</span> {item.tinyVersion}
            </p>
          )}
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
          <div className="cfc-hero-label">Current Focus</div>
          <div className="current-focus-kicker">
            <span className="current-focus-type-badge focus">Focus Block</span>
          </div>
          <h2 className="current-focus-title">{item.title}</h2>
          <div className="current-focus-meta">
            <span className="focus-duration-badge">⏱ {item.duration} min</span>
            <span className="focus-xp-badge">+40 XP · {item.type}</span>
          </div>
          {item.entryStep && (
            <p className="current-focus-entry-step">
              <span className="current-focus-field-label">Start with:</span> {item.entryStep}
            </p>
          )}
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
