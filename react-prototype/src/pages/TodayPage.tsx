import { TodayItem, CharacterState, FocusSession, FocusSessionLog, CurrentFocus, Goal, HabitFlow } from '../types';
import { ProgressStrip } from '../components/ProgressStrip';
import { CurrentFocusCard } from '../components/CurrentFocusCard';
import { CharacterMini } from '../components/CharacterMini';
import { TodayFlow } from '../components/TodayFlow';
import { CompactSessionBanner } from '../components/CompactSessionBanner';

interface Props {
  visibleItems: TodayItem[];
  currentFocus: CurrentFocus | null;
  progress: { completed: number; total: number };
  character: CharacterState;
  focusSessionLogs: FocusSessionLog[];
  goals: Goal[];
  session: FocusSession | null;
  onToggleStep: (flowId: string, stepId: string) => void;
  onToggleTask: (taskId: string) => void;
  onToggleFocusBlock: (blockId: string) => void;
  onStartFocus: (blockId: string) => void;
  onOpenMind: () => void;
  onCancelSession: () => void;
  onUpdateFlow: (flow: HabitFlow) => void;
  onReorder: (items: TodayItem[]) => void;
  onDeleteItem: (id: string) => void;
  onAddTask: () => void;
  onAddFocus: () => void;
  onAddFlow: () => void;
  onReset: () => void;
  onSimulateTomorrow: () => void;
}

export function TodayPage({
  visibleItems, currentFocus, progress, character, focusSessionLogs, goals, session,
  onToggleStep, onToggleTask, onToggleFocusBlock, onStartFocus,
  onOpenMind, onCancelSession,
  onUpdateFlow, onReorder, onDeleteItem, onAddTask, onAddFocus, onAddFlow,
  onReset, onSimulateTomorrow,
}: Props) {
  const allDone = progress.completed === progress.total && progress.total > 0;
  const showCurrentFocus = !session && currentFocus;

  return (
    <div className="today-page">
      <ProgressStrip
        completed={progress.completed}
        total={progress.total}
        character={character}
      />

      {session ? (
        <CompactSessionBanner
          session={session}
          onOpenMind={onOpenMind}
          onCancel={onCancelSession}
        />
      ) : showCurrentFocus ? (
        <CurrentFocusCard
          focus={currentFocus}
          onToggleStep={onToggleStep}
          onToggleTask={onToggleTask}
          onToggleFocusBlock={onToggleFocusBlock}
          onStartFocus={onStartFocus}
        />
      ) : allDone ? (
        <div className="all-done-card">
          <div className="all-done-icon">🎯</div>
          <h2>All done for today</h2>
          <p>Every action was a vote for the person you are becoming.</p>
        </div>
      ) : null}

      <CharacterMini
        character={character}
        focusSessionLogs={focusSessionLogs}
        goals={goals}
        onReset={onReset}
        onSimulateTomorrow={onSimulateTomorrow}
      />

      <TodayFlow
        items={visibleItems}
        currentFocusItemId={currentFocus?.item.id}
        currentFocusStepId={currentFocus?.stepId}
        activeSessionBlockId={session?.focusBlockId}
        onToggleStep={onToggleStep}
        onToggleTask={onToggleTask}
        onToggleFocusBlock={onToggleFocusBlock}
        onStartFocus={onStartFocus}
        onAddTask={onAddTask}
        onAddFocus={onAddFocus}
        onAddFlow={onAddFlow}
        onUpdateFlow={onUpdateFlow}
        onReorder={onReorder}
        onDeleteItem={onDeleteItem}
      />
    </div>
  );
}
