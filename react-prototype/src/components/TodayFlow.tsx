import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { TodayItem } from '../types';
import { SortableTodayItem } from './SortableTodayItem';
import { HabitFlowCard } from './HabitFlowCard';
import { TaskCard } from './TaskCard';
import { FocusBlockCard } from './FocusBlockCard';

// Returns true if the touch/pointer event originated inside a native interactive element.
// Drag is suppressed for those — only non-button card body areas initiate drag.
function isInteractive(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest('button, a, input, textarea, select') !== null;
}

// Custom sensors: skip drag activation when the event starts on a button/link/input
class SmartPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent: event }: React.PointerEvent) => {
        if (!event.isPrimary || event.button !== 0) return false;
        return !isInteractive(event.target);
      },
    },
  ];
}

class SmartTouchSensor extends TouchSensor {
  static activators = [
    {
      eventName: 'onTouchStart' as const,
      handler: ({ nativeEvent: event }: React.TouchEvent) => {
        return !isInteractive(event.target);
      },
    },
  ];
}

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
  onReorder: (newItems: TodayItem[]) => void;
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
  onReorder,
}: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const firstIncompleteFlowId = items.find(
    i => i.kind === 'habit-flow' && !i.steps.every(s => s.completed)
  )?.id;

  const sensors = useSensors(
    useSensor(SmartPointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(SmartTouchSensor, { activationConstraint: { delay: 300, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex(i => i.id === active.id);
    const newIndex = items.findIndex(i => i.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(items, oldIndex, newIndex));
    }
  }

  function handleDragCancel() {
    setActiveId(null);
  }

  const activeItem = activeId ? (items.find(i => i.id === activeId) ?? null) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="today-flow">
        <div className="today-flow-header-row">
          <div className="today-flow-label-group">
            <div className="today-flow-section-label">Today's Flow</div>
            <span className="today-flow-reorder-hint">hold to reorder</span>
          </div>
          <div className="today-flow-add-btns">
            <button className="add-item-btn add-task" onClick={onAddTask}>+ Task</button>
            <button className="add-item-btn add-focus" onClick={onAddFocus}>+ Focus</button>
            <button className="add-item-btn add-flow" onClick={onAddFlow}>+ Flow</button>
          </div>
        </div>

        <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
          {items.map(item => (
            <SortableTodayItem
              key={item.id}
              item={item}
              isCurrent={item.id === currentFocusItemId}
              currentFocusStepId={currentFocusStepId}
              activeSessionBlockId={activeSessionBlockId}
              firstIncompleteFlowId={firstIncompleteFlowId}
              onToggleStep={onToggleStep}
              onToggleTask={onToggleTask}
              onToggleFocusBlock={onToggleFocusBlock}
              onStartFocus={onStartFocus}
            />
          ))}
        </SortableContext>
      </div>

      <DragOverlay
        dropAnimation={{
          duration: 200,
          easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
        }}
      >
        {activeItem ? (
          <div className="drag-overlay-wrapper">
            {activeItem.kind === 'habit-flow' && (
              <HabitFlowCard
                flow={activeItem}
                isCurrent={activeItem.id === currentFocusItemId}
                currentStepId={activeItem.id === currentFocusItemId ? currentFocusStepId : undefined}
                defaultExpanded={false}
                onToggleStep={onToggleStep}
              />
            )}
            {activeItem.kind === 'quick-task' && (
              <TaskCard
                task={activeItem}
                isCurrent={activeItem.id === currentFocusItemId}
                onToggle={onToggleTask}
              />
            )}
            {activeItem.kind === 'focus-block' && (
              <FocusBlockCard
                block={activeItem}
                isCurrent={activeItem.id === currentFocusItemId}
                isActive={activeItem.id === activeSessionBlockId}
                onToggle={onToggleFocusBlock}
                onStart={onStartFocus}
              />
            )}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
