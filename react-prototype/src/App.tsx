import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { TodayItem, CharacterState, FocusSession, HabitStep, HabitFlow, QuickTask, FocusBlock } from './types';
import { mockTodayItems, mockCharacter } from './data/mockToday';
import {
  getCurrentFocus,
  getTodayProgress,
  awardXp,
} from './utils/todayFlow';
import { ProgressStrip } from './components/ProgressStrip';
import { CurrentFocusCard } from './components/CurrentFocusCard';
import { CharacterMini } from './components/CharacterMini';
import { TodayFlow } from './components/TodayFlow';
import { FocusSessionBanner } from './components/FocusSessionBanner';
import { AddModal } from './components/AddModal';

type AddMode = 'task' | 'focus' | 'flow';

function App() {
  const [items, setItems] = useState<TodayItem[]>(mockTodayItems);
  const [character, setCharacter] = useState<CharacterState>(mockCharacter);
  const [xpFloat, setXpFloat] = useState<string | null>(null);
  const [session, setSession] = useState<FocusSession | null>(null);
  const [addModal, setAddModal] = useState<AddMode | null>(null);
  const xpFloatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentFocus = useMemo(() => getCurrentFocus(items), [items]);
  const progress = useMemo(() => getTodayProgress(items), [items]);

  function showXpFloat(label: string) {
    if (xpFloatTimer.current) clearTimeout(xpFloatTimer.current);
    setXpFloat(label);
    xpFloatTimer.current = setTimeout(() => setXpFloat(null), 1900);
  }

  useEffect(() => {
    return () => { if (xpFloatTimer.current) clearTimeout(xpFloatTimer.current); };
  }, []);

  const toggleHabitStep = useCallback((flowId: string, stepId: string) => {
    let completing = false;
    let stepName = '';

    setItems(prev => prev.map(item => {
      if (item.kind !== 'habit-flow' || item.id !== flowId) return item;
      return {
        ...item,
        steps: item.steps.map(s => {
          if (s.id !== stepId) return s;
          if (!s.completed) { completing = true; stepName = s.name; }
          return { ...s, completed: !s.completed };
        }),
      };
    }));

    if (completing) {
      setCharacter(c => awardXp(c, 15, stepName, 'habit'));
      showXpFloat(`+15 XP — ${stepName}`);
    }
  }, []);

  const toggleTask = useCallback((taskId: string) => {
    let completing = false;
    let taskTitle = '';

    setItems(prev => prev.map(item => {
      if (item.kind !== 'quick-task' || item.id !== taskId) return item;
      if (!item.completed) { completing = true; taskTitle = item.title; }
      return { ...item, completed: !item.completed };
    }));

    if (completing) {
      setCharacter(c => awardXp(c, 10, taskTitle, 'task'));
      showXpFloat(`+10 XP — ${taskTitle}`);
    }
  }, []);

  const toggleFocusBlock = useCallback((blockId: string) => {
    let completing = false;
    let blockTitle = '';

    setItems(prev => prev.map(item => {
      if (item.kind !== 'focus-block' || item.id !== blockId) return item;
      if (!item.completed) { completing = true; blockTitle = item.title; }
      return { ...item, completed: !item.completed };
    }));

    if (completing) {
      setCharacter(c => awardXp(c, 40, blockTitle, 'focus'));
      showXpFloat(`+40 XP — ${blockTitle}`);
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

  function handleAdd(data: { title: string; notes: string; duration: number; steps: string[] }) {
    if (addModal === 'task') {
      const newTask: QuickTask = {
        id: `task-${Date.now()}`,
        kind: 'quick-task',
        title: data.title,
        notes: data.notes || undefined,
        completed: false,
      };
      setItems(prev => [...prev, newTask]);
    } else if (addModal === 'focus') {
      const newBlock: FocusBlock = {
        id: `focus-${Date.now()}`,
        kind: 'focus-block',
        title: data.title,
        notes: data.notes || undefined,
        duration: data.duration,
        completed: false,
      };
      setItems(prev => [...prev, newBlock]);
    } else if (addModal === 'flow') {
      const stepList = data.steps.length > 0 ? data.steps : ['Step 1'];
      const steps: HabitStep[] = stepList.map((name, i) => ({
        id: `step-${Date.now()}-${i}`,
        name,
        identity: `I am someone who ${name.toLowerCase()}.`,
        cue: `I will ${name.toLowerCase()}.`,
        tinyMinimum: 'Start small',
        completed: false,
      }));
      const newFlow: HabitFlow = {
        id: `flow-${Date.now()}`,
        kind: 'habit-flow',
        title: data.title,
        identity: 'I am someone who follows through.',
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

        <CharacterMini character={character} />

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
