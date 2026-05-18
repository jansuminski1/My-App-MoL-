import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TodayItem } from '../types';
import { HabitFlowCard } from './HabitFlowCard';
import { TaskCard } from './TaskCard';
import { FocusBlockCard } from './FocusBlockCard';

interface Props {
  item: TodayItem;
  isCurrent: boolean;
  currentFocusStepId?: string;
  activeSessionBlockId?: string;
  firstIncompleteFlowId?: string;
  onToggleStep: (flowId: string, stepId: string) => void;
  onToggleTask: (taskId: string) => void;
  onToggleFocusBlock: (blockId: string) => void;
  onStartFocus: (blockId: string) => void;
  onDeleteItem: (itemId: string) => void;
}

export function SortableTodayItem({
  item,
  isCurrent,
  currentFocusStepId,
  activeSessionBlockId,
  firstIncompleteFlowId,
  onToggleStep,
  onToggleTask,
  onToggleFocusBlock,
  onStartFocus,
  onDeleteItem,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`sortable-item${isDragging ? ' is-dragging' : ''}`}
      {...attributes}
    >
      {/* Drag handle — left edge only. touch-action:none scoped here so the
          rest of the card keeps touch-action:pan-y for natural scrolling. */}
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        className="sortable-drag-handle"
        aria-label="Hold to reorder"
      />
      {item.kind === 'habit-flow' && (
        <HabitFlowCard
          flow={item}
          isCurrent={isCurrent}
          currentStepId={isCurrent ? currentFocusStepId : undefined}
          defaultExpanded={item.id === firstIncompleteFlowId}
          onToggleStep={onToggleStep}
          onDelete={onDeleteItem}
        />
      )}
      {item.kind === 'quick-task' && (
        <TaskCard
          task={item}
          isCurrent={isCurrent}
          onToggle={onToggleTask}
          onDelete={onDeleteItem}
        />
      )}
      {item.kind === 'focus-block' && (
        <FocusBlockCard
          block={item}
          isCurrent={isCurrent}
          isActive={item.id === activeSessionBlockId}
          onToggle={onToggleFocusBlock}
          onStart={onStartFocus}
          onDelete={onDeleteItem}
        />
      )}
    </div>
  );
}
