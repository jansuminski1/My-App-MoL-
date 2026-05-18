import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { TodayItem, CharacterState, FocusSession, HabitStep, HabitFlow, QuickTask, FocusBlock } from './types';
import { mockTodayItems, mockCharacter } from './data/mockToday';
import {
  getCurrentFocus,
  getTodayProgress,
  addXpEventOnce,
  removeXpEventByRewardKey,
  habitStepRewardKey,
  taskRewardKey,
  focusBlockRewardKey,
} from './utils/todayFlow';
import { todayDateKey, nowTs } from './utils/date';
import { loadPrototypeState, savePrototypeState, clearPrototypeState } from './utils/storage';
import { ProgressStrip } from './components/ProgressStrip';
import { CurrentFocusCard } from './components/CurrentFocusCard';
import { CharacterMini } from './components/CharacterMini';
import { TodayFlow } from './components/TodayFlow';
import { FocusSessionBanner } from './components/FocusSessionBanner';
import { AddModal } from './components/AddModal';

type AddMode = 'task' | 'focus' | 'flow';

function App() {
  const [items, setItems] = useState<TodayItem[]>(() => loadPrototypeState().items);
  const [character, setCharacter] = useState<CharacterState>(() => loadPrototypeState().character);
  const [xpFloat, setXpFloat] = useState<string | null>(null);
  const [session, setSession] = useState<FocusSession | null>(null);
  const [addModal, setAddModal] = useState<AddMode | null>(null);
  const xpFloatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentFocus = useMemo(() => getCurrentFocus(items), [items]);
  const progress = useMemo(() => getTodayProgress(items), [items]);

  // Persist on every items/character change
  useEffect(() => {
    savePrototypeState(items, character);
  }, [items, character]);

  useEffect(() => {
    return () => { if (xpFloatTimer.current) clearTimeout(xpFloatTimer.current); };
  }, []);

  function showXpFloat(label: string) {
    if (xpFloatTimer.current) clearTimeout(xpFloatTimer.current);
    setXpFloat(label);
    xpFloatTimer.current = setTimeout(() => setXpFloat(null), 1900);
  }

  function handleReset() {
    if (!window.confirm('Reset prototype? All progress will be cleared and demo data restored.')) return;
    clearPrototypeState();
    setItems(mockTodayItems);
    setCharacter(mockCharacter);
    setSession(null);
    setAddModal(null);
  }

  const toggleHabitStep = useCallback((flowId: string, stepId: string) => {
    const today = todayDateKey();
    const rewardKey = habitStepRewardKey(stepId, today);
    let isCompleting = false;
    let stepName = '';

    setItems(prev => prev.map(item => {
      if (item.kind !== 'habit-flow' || item.id !== flowId) return item;
      return {
        ...item,
        steps: item.steps.map(s => {
          if (s.id !== stepId) return s;
          isCompleting = !s.completionLog[today];
          stepName = s.name;
          return { ...s, completionLog: { ...s.completionLog, [today]: isCompleting } };
        }),
      };
    }));

    if (isCompleting) {
      setCharacter(c => addXpEventOnce(c, 15, stepName, 'habit', rewardKey));
      showXpFloat(`+15 XP — ${stepName}`);
    } else {
      setCharacter(c => removeXpEventByRewardKey(c, rewardKey));
    }
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    const today = todayDateKey();
    const rewardKey = taskRewardKey(taskId, today);
    let isCompleting = false;
    let taskTitle = '';

    setItems(prev => prev.map(item => {
      if (item.kind !== 'quick-task' || item.id !== taskId) return item;
      isCompleting = !item.completed;
      taskTitle = item.title;
      return {
        ...item,
        completed: !item.completed,
        completedAt: !item.completed ? nowTs() : null,
      };
    }));

    if (isCompleting) {
      setCharacter(c => addXpEventOnce(c, 10, taskTitle, 'task', rewardKey));
      showXpFloat(`+10 XP — ${taskTitle}`);
    } else {
      setCharacter(c => removeXpEventByRewardKey(c, rewardKey));
    }
  }, []);

  const toggleFocusBlock = useCallback((blockId: string) => {
    const today = todayDateKey();
    const rewardKey = focusBlockRewardKey(blockId, today);
    let isCompleting = false;
    let blockTitle = '';

    setItems(prev => prev.map(item => {
      if (item.kind !== 'focus-block' || item.id !== blockId) return item;
      isCompleting = !item.completed;
      blockTitle = item.title;
      return {
        ...item,
        completed: !item.completed,
        completedAt: !item.completed ? nowTs() : null,
      };
    }));

    if (isCompleting) {
      setCharacter(c => addXpEventOnce(c, 40, blockTitle, 'focus', rewardKey));
      showXpFloat(`+40 XP — ${blockTitle}`);
    } else {
      setCharacter(c => removeXpEventByRewardKey(c, rewardKey));
    }
  }, []);

  function startFocus(blockId: string) {
    setSession({ blockId, startedAt: Date.now(), accumulatedSeconds: 0, paused: false });
  }

  function pauseSession() {
    setSession(s => {
      if (!s || s.paused) return s;
      const elapsed = s.accumulatedSeconds + Math.floor((Date.now() - s.startedAt) / 1000);
      return { ...s, accumulatedSeconds: elapsed, paused: true };
    });
  }

  function resumeSession() {
    setSession(s => {
      if (!s || !s.paused) return s;
      return { ...s, startedAt: Date.now(), paused: false };
    });
  }

  function completeSession() {
    if (!session) return;
    toggleFocusBlock(session.blockId);
    setSession(null);
  }

  function cancelSession() {
    setSession(null);
  }

  const handleReorder = useCallback((newItems: TodayItem[]) => {
    setItems(newItems);
  }, []);

  function handleDeleteItem(itemId: string) {
    const today = todayDateKey();
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (item.kind === 'quick-task') {
      if (item.completed) {
        setCharacter(c => removeXpEventByRewardKey(c, taskRewardKey(itemId, today)));
      }
    } else if (item.kind === 'focus-block') {
      if (item.completed) {
        setCharacter(c => removeXpEventByRewardKey(c, focusBlockRewardKey(itemId, today)));
      }
      if (session?.blockId === itemId) setSession(null);
    } else if (item.kind === 'habit-flow') {
      const completedSteps = item.steps.filter(s => !!s.completionLog[today]);
      if (completedSteps.length > 0) {
        setCharacter(c => {
          let updated = c;
          for (const step of completedSteps) {
            updated = removeXpEventByRewardKey(updated, habitStepRewardKey(step.id, today));
          }
          return updated;
        });
      }
    }

    setItems(prev => prev.filter(i => i.id !== itemId));
  }

  function handleAdd(data: { title: string; notes: string; duration: number; steps: string[]; trigger: string; identity: string }) {
    const now = nowTs();
    const today = todayDateKey();

    if (addModal === 'task') {
      const newTask: QuickTask = {
        id: `task-${now}`,
        kind: 'quick-task',
        title: data.title,
        notes: data.notes || undefined,
        completed: false,
        completedAt: null,
        dateKey: today,
        createdAt: now,
        order: items.filter(i => i.kind === 'quick-task').length,
      };
      setItems(prev => [...prev, newTask]);
    } else if (addModal === 'focus') {
      const newBlock: FocusBlock = {
        id: `focus-${now}`,
        kind: 'focus-block',
        title: data.title,
        notes: data.notes || undefined,
        duration: data.duration,
        completed: false,
        completedAt: null,
        dateKey: today,
        createdAt: now,
        order: items.filter(i => i.kind === 'focus-block').length,
        type: 'Deep Work',
      };
      setItems(prev => [...prev, newBlock]);
    } else if (addModal === 'flow') {
      const stepList = data.steps.length > 0 ? data.steps : ['Step 1'];
      const flowIdentity = data.identity || 'I am someone who follows through.';
      const flowTrigger = data.trigger || 'When I am ready';
      const steps: HabitStep[] = stepList.map((name, i) => ({
        id: `step-${now}-${i}`,
        name,
        identity: flowIdentity,
        cue: i === 0 ? flowTrigger : `After ${stepList[i - 1]}`,
        tinyMinimum: '',
        completionLog: {},
        freq: { type: 'daily' as const },
      }));
      const newFlow: HabitFlow = {
        id: `flow-${now}`,
        kind: 'habit-flow',
        title: data.title,
        identity: flowIdentity,
        trigger: flowTrigger,
        steps,
      };
      setItems(prev => [...prev, newFlow]);
    }
    setAddModal(null);
  }

  const sessionBlock = session
    ? (items.find(i => i.id === session.blockId && i.kind === 'focus-block') as FocusBlock | undefined)
    : undefined;

  const allDone = progress.completed === progress.total && progress.total > 0;
  const showCurrentFocus = !session && currentFocus;

  return (
    <div className="app">
      <div className="app-inner">
        <header className="app-header">
          <div className="app-brand">
            <div className="brand-mark">ML</div>
            <span className="brand-name">Masters of Life</span>
          </div>
          <span className="prototype-pill">Prototype</span>
        </header>

        <div className="app-date-bar">
          <span className="app-date-label">Today</span>
          <span className="app-date-sub">
            {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </span>
        </div>

        <ProgressStrip
          completed={progress.completed}
          total={progress.total}
          character={character}
        />

        {session && sessionBlock ? (
          <FocusSessionBanner
            session={session}
            block={sessionBlock}
            onPause={pauseSession}
            onResume={resumeSession}
            onComplete={completeSession}
            onCancel={cancelSession}
          />
        ) : showCurrentFocus ? (
          <CurrentFocusCard
            focus={currentFocus}
            onToggleStep={toggleHabitStep}
            onToggleTask={toggleTask}
            onToggleFocusBlock={toggleFocusBlock}
            onStartFocus={startFocus}
          />
        ) : allDone ? (
          <div className="all-done-card">
            <div className="all-done-icon">🎯</div>
            <h2>All done for today</h2>
            <p>Every action was a vote for the person you are becoming.</p>
          </div>
        ) : null}

        <CharacterMini character={character} onReset={handleReset} />

        <TodayFlow
          items={items}
          currentFocusItemId={currentFocus?.item.id}
          currentFocusStepId={currentFocus?.stepId}
          activeSessionBlockId={session?.blockId}
          onToggleStep={toggleHabitStep}
          onToggleTask={toggleTask}
          onToggleFocusBlock={toggleFocusBlock}
          onStartFocus={startFocus}
          onAddTask={() => setAddModal('task')}
          onAddFocus={() => setAddModal('focus')}
          onAddFlow={() => setAddModal('flow')}
          onReorder={handleReorder}
          onDeleteItem={handleDeleteItem}
        />
      </div>

      {xpFloat && <div className="xp-float">{xpFloat}</div>}

      {addModal && (
        <AddModal
          mode={addModal}
          onAdd={handleAdd}
          onClose={() => setAddModal(null)}
        />
      )}
    </div>
  );
}

export default App;
