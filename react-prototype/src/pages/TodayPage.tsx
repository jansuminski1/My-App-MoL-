import { TodayItem, CharacterState, FocusSession, FocusSessionLog, CurrentFocus, Goal } from '../types';
import { ProgressStrip } from '../components/ProgressStrip';
import { CurrentFocusCard } from '../components/CurrentFocusCard';
import { CharacterMini } from '../components/CharacterMini';
import { TodayFlow } from '../components/TodayFlow';
import { FocusSessionBanner } from '../components/FocusSessionBanner';

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
  onPauseSession: () => void;
  onResumeSession: () => void;
  onAdvancePhase: () => void;
  onAddInterruption: () => void;
  onSetSessionQuality: (q: 'Low' | 'Normal' | 'High') => void;
  onSetSessionReflection: (text: string) => void;
  onCancelSession: () => void;
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
  onPauseSession, onResumeSession, onAdvancePhase, onAddInterruption,
  onSetSessionQuality, onSetSessionReflection, onCancelSession,
  onReorder, onDeleteItem, onAddTask, onAddFocus, onAddFlow,
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
        <FocusSessionBanner
          session={session}
          onPause={onPauseSession}
          onResume={onResumeSession}
          onAdvancePhase={onAdvancePhase}
          onAddInterruption={onAddInterruption}
          onSetQuality={onSetSessionQuality}
          onSetReflection={onSetSessionReflection}
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
        onReorder={onReorder}
        onDeleteItem={onDeleteItem}
      />
    </div>
  );
}
