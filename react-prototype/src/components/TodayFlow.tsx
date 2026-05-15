import { TodayItem } from '../types';
import { HabitFlowCard } from './HabitFlowCard';
import { TaskCard } from './TaskCard';
import { FocusBlockCard } from './FocusBlockCard';

interface Props {
  items: TodayItem[];
  currentFocusItemId?: string;
  currentFocusStepId?: string;
  activeSessionBlockId?: string;
  onToggleStep: (flowId: string, stepId: string) => void;
  onToggleTask: (taskId: string) => void;
  onToggleFocusBlock: (blockId: string) => void;
  onStartFocus: (blockId: string) => void;
  onAddTask: () => void;
  onAddFocus: () => void;
  onAddFlow: () => void;
}

export function TodayFlow({
  items,
  currentFocusItemId,
  currentFocusStepId,
  activeSessionBlockId,
  onToggleStep,
  onToggleTask,
  onToggleFocusBlock,
  onStartFocus,
  onAddTask,
  onAddFocus,
  onAddFlow,
}: Props) {
  const firstIncompleteFlowId = items.find(
    i => i.kind === 'habit-flow' && !i.steps.every(s => s.completed)
  )?.id;

  return (
    <div className="today-flow">
      <div className="today-flow-header-row">
        <div className="today-flow-section-label">Today's Flow</div>
        <div className="today-flow-add-btns">
          <button className="add-item-btn add-task" onClick={onAddTask}>+ Task</button>
          <button className="add-item-btn add-focus" onClick={onAddFocus}>+ Focus</button>
          <button className="add-item-btn add-flow" onClick={onAddFlow}>+ Flow</button>
        </div>
      </div>

      {items.map(item => {
        const isCurrent = item.id === currentFocusItemId;

        if (item.kind === 'habit-flow') {
          return (
            <HabitFlowCard
              key={item.id}
              flow={item}
              isCurrent={isCurrent}
              currentStepId={isCurrent ? currentFocusStepId : undefined}
              defaultExpanded={item.id === firstIncompleteFlowId}
              onToggleStep={onToggleStep}
            />
          );
        }

        if (item.kind === 'quick-task') {
          return (
            <TaskCard
              key={item.id}
              task={item}
              isCurrent={isCurrent}
              onToggle={onToggleTask}
            />
          );
        }

        if (item.kind === 'focus-block') {
          return (
            <FocusBlockCard
              key={item.id}
              block={item}
              isCurrent={isCurrent}
              isActive={item.id === activeSessionBlockId}
              onToggle={onToggleFocusBlock}
              onStart={onStartFocus}
            />
          );
        }

        return null;
      })}
    </div>
  );
}
