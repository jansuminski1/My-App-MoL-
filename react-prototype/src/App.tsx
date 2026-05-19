import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  TodayItem, CharacterState, FocusSession, FocusSessionLog,
  HabitFlow, QuickTask, FocusBlock, FocusType, LifeDomain, TabId,
  Goal, GoalPeriod, FocusTimerProfile, FocusTag,
} from './types';
import { makeIdentityShort, makeStepCue, makeTinyVersion, makeFocusEntryStep } from './utils/smartDefaults';
import { mockTodayItems, mockCharacter } from './data/mockToday';
import { mockGoals } from './data/mockGoals';
import { DEFAULT_TIMER_PROFILES, DEFAULT_FOCUS_TAGS } from './data/focusDefaults';
import {
  getCurrentFocus, getTodayProgress, filterItemsForToday,
  addXpEventOnce, removeXpEventByRewardKey,
  habitStepRewardKey, taskRewardKey, focusBlockRewardKey,
} from './utils/todayFlow';
import { todayDateKey, nowTs, currentWeekKey, currentMonthKey } from './utils/date';
import { loadPrototypeState, savePrototypeState, clearPrototypeState } from './utils/storage';
import { calculateFocusXp } from './utils/focusProfiles';
import { BottomNav } from './components/BottomNav';
import { AddModal } from './components/AddModal';
import { TodayPage } from './pages/TodayPage';
import { MindPage } from './pages/MindPage';
import { GoalsPage } from './pages/GoalsPage';
import { GoalFormData } from './components/AddGoalModal';
import { HealthPage } from './pages/HealthPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CharacterPage } from './pages/CharacterPage';

type AddMode = 'task' | 'focus' | 'flow';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [items, setItems] = useState<TodayItem[]>(() => loadPrototypeState().items);
  const [character, setCharacter] = useState<CharacterState>(() => loadPrototypeState().character);
  const [focusSessionLogs, setFocusSessionLogs] = useState<FocusSessionLog[]>(() => loadPrototypeState().focusSessionLogs);
  const [goals, setGoals] = useState<Goal[]>(() => loadPrototypeState().goals);
  const [focusTimerProfiles, setFocusTimerProfiles] = useState<FocusTimerProfile[]>(() => loadPrototypeState().focusTimerProfiles);
  const [selectedFocusTimerProfileId, setSelectedFocusTimerProfileId] = useState<string>(() => loadPrototypeState().selectedFocusTimerProfileId);
  const [focusTags, setFocusTags] = useState<FocusTag[]>(() => loadPrototypeState().focusTags);
  const [xpFloat, setXpFloat] = useState<string | null>(null);
  const [session, setSession] = useState<FocusSession | null>(null);
  const [addModal, setAddModal] = useState<AddMode | null>(null);
  const xpFloatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCompletionRef = useRef<FocusSession | null>(null);

  const visibleItems = useMemo(() => filterItemsForToday(items), [items]);
  const currentFocus = useMemo(() => getCurrentFocus(visibleItems), [visibleItems]);
  const progress = useMemo(() => getTodayProgress(visibleItems), [visibleItems]);

  useEffect(() => {
    savePrototypeState(items, character, focusSessionLogs, goals, focusTimerProfiles, selectedFocusTimerProfileId, focusTags);
  }, [items, character, focusSessionLogs, goals, focusTimerProfiles, selectedFocusTimerProfileId, focusTags]);

  useEffect(() => {
    return () => { if (xpFloatTimer.current) clearTimeout(xpFloatTimer.current); };
  }, []);

  // Bare effect: process session completion queued from within setSession updater
  useEffect(() => {
    if (!pendingCompletionRef.current) return;
    const completed = pendingCompletionRef.current;
    pendingCompletionRef.current = null;
    doFinishSession(completed);
  });

  function showXpFloat(label: string) {
    if (xpFloatTimer.current) clearTimeout(xpFloatTimer.current);
    setXpFloat(label);
    xpFloatTimer.current = setTimeout(() => setXpFloat(null), 1900);
  }

  function doFinishSession(s: FocusSession) {
    const today = todayDateKey();
    const rewardKey = focusBlockRewardKey(s.focusBlockId, today);
    const actualMinutes = Math.max(1, Math.round(s.workDoneSeconds / 60));
    const xpAwarded = calculateFocusXp({
      actualMinutes,
      plannedMinutes: s.plannedMinutes,
      type: s.type,
      quality: s.quality,
    });
    const log: FocusSessionLog = {
      id: s.id,
      focusBlockId: s.focusBlockId,
      title: s.title,
      type: s.type,
      domain: s.domain,
      plannedMinutes: s.plannedMinutes,
      actualMinutes,
      startedAt: s.startedAt,
      completedAt: Date.now(),
      quality: s.quality,
      reflection: s.reflection || undefined,
      interruptions: s.interruptions,
      xpAwarded,
      rewardKey,
      tagId: s.tagId,
      tagName: s.tagName,
    };
    setFocusSessionLogs(prev => {
      if (prev.some(l => l.id === log.id)) return prev;
      return [log, ...prev.slice(0, 49)];
    });
    setCharacter(c => addXpEventOnce(c, xpAwarded, s.title, 'focus', rewardKey));
    showXpFloat(`+${xpAwarded} XP — ${s.title}`);
    setItems(prev => prev.map(item => {
      if (item.kind !== 'focus-block' || item.id !== s.focusBlockId) return item;
      return { ...item, completed: true, completedAt: Date.now() };
    }));
  }

  function handleReset() {
    if (!window.confirm('Reset prototype? All progress will be cleared and demo data restored.')) return;
    clearPrototypeState();
    setItems(mockTodayItems);
    setCharacter(mockCharacter);
    setFocusSessionLogs([]);
    setGoals(mockGoals);
    setSession(null);
    setAddModal(null);
    setFocusTimerProfiles(DEFAULT_TIMER_PROFILES);
    setSelectedFocusTimerProfileId(DEFAULT_TIMER_PROFILES[0].id);
    setFocusTags(DEFAULT_FOCUS_TAGS);
  }

  function handleSimulateTomorrow() {
    const today = todayDateKey();
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const yesterday = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    setItems(prev => prev.map(item => {
      if (item.kind === 'habit-flow') return item;
      if (item.dateKey === today) return { ...item, dateKey: yesterday };
      return item;
    }));
    setSession(null);
  }

  function addGoal(data: GoalFormData) {
    const now = nowTs();
    const wk = currentWeekKey();
    const mk = currentMonthKey();
    const id = `goal-${now}`;
    const periodKey = data.period === 'weekly' ? wk : mk;
    const newGoal: Goal = {
      id,
      title: data.title,
      period: data.period as GoalPeriod,
      domain: data.domain,
      why: data.why || undefined,
      target: data.target || undefined,
      status: 'active',
      createdAt: now,
      completedAt: null,
      weekKey: data.period === 'weekly' ? wk : undefined,
      monthKey: data.period === 'monthly' ? mk : undefined,
      order: goals.filter(g => g.period === data.period).length,
      xpReward: data.xpReward,
      rewardKey: `goal:${data.period}:${periodKey}:${id}`,
    };
    setGoals(prev => [...prev, newGoal]);
  }

  function completeGoal(goalId: string) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal || goal.status === 'completed') return;
    setGoals(prev => prev.map(g =>
      g.id === goalId ? { ...g, status: 'completed' as const, completedAt: Date.now() } : g
    ));
    setCharacter(c => addXpEventOnce(c, goal.xpReward, goal.title, 'goal', goal.rewardKey));
    showXpFloat(`+${goal.xpReward} XP — ${goal.title}`);
  }

  function uncompleteGoal(goalId: string) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal || goal.status !== 'completed') return;
    setGoals(prev => prev.map(g =>
      g.id === goalId ? { ...g, status: 'active' as const, completedAt: null } : g
    ));
    setCharacter(c => removeXpEventByRewardKey(c, goal.rewardKey));
  }

  function deleteGoal(goalId: string) {
    const goal = goals.find(g => g.id === goalId);
    if (!goal) return;
    if (goal.status === 'completed') {
      setCharacter(c => removeXpEventByRewardKey(c, goal.rewardKey));
    }
    setGoals(prev => prev.filter(g => g.id !== goalId));
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
      return { ...item, completed: !item.completed, completedAt: !item.completed ? nowTs() : null };
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
      return { ...item, completed: !item.completed, completedAt: !item.completed ? nowTs() : null };
    }));
    if (isCompleting) {
      setCharacter(c => addXpEventOnce(c, 40, blockTitle, 'focus', rewardKey));
      showXpFloat(`+40 XP — ${blockTitle}`);
    } else {
      setCharacter(c => removeXpEventByRewardKey(c, rewardKey));
    }
  }, []);

  function startFocus(blockId: string) {
    const block = items.find(i => i.id === blockId && i.kind === 'focus-block') as FocusBlock | undefined;
    if (!block) return;
    const selectedProfile = focusTimerProfiles.find(p => p.id === selectedFocusTimerProfileId) ?? focusTimerProfiles[0];
    const recallMinutes = selectedProfile?.recallMinutes ?? 3;
    const restMinutes = selectedProfile?.restMinutes ?? 5;
    const now = Date.now();
    setSession({
      id: `session-${now}`,
      focusBlockId: blockId,
      title: block.title,
      type: block.type,
      domain: block.domain,
      plannedMinutes: block.duration,
      workMinutes: block.duration,
      recallMinutes,
      restMinutes,
      phase: 'work',
      status: 'running',
      startedAt: now,
      phaseStartedAt: now,
      phaseElapsedSeconds: 0,
      workDoneSeconds: 0,
      interruptions: 0,
      quality: 'Normal',
      reflection: '',
      entryStep: block.entryStep,
      tagId: block.tagId,
      tagName: block.tagName,
    });
    setActiveTab('mind');
  }

  function pauseSession() {
    setSession(s => {
      if (!s || s.status !== 'running') return s;
      const elapsed = s.phaseElapsedSeconds + Math.floor((Date.now() - s.phaseStartedAt) / 1000);
      return { ...s, status: 'paused', phaseElapsedSeconds: elapsed };
    });
  }

  function resumeSession() {
    setSession(s => {
      if (!s || s.status !== 'paused') return s;
      return { ...s, status: 'running', phaseStartedAt: Date.now() };
    });
  }

  function advancePhase() {
    setSession(s => {
      if (!s) return s;
      const phaseElapsed = s.status === 'running'
        ? s.phaseElapsedSeconds + Math.floor((Date.now() - s.phaseStartedAt) / 1000)
        : s.phaseElapsedSeconds;
      const workDoneSeconds = s.phase === 'work' ? phaseElapsed : s.workDoneSeconds;

      let nextPhase: 'recall' | 'rest' | 'complete';
      if (s.phase === 'work') {
        nextPhase = s.recallMinutes > 0 ? 'recall' : (s.restMinutes > 0 ? 'rest' : 'complete');
      } else if (s.phase === 'recall') {
        nextPhase = s.restMinutes > 0 ? 'rest' : 'complete';
      } else {
        nextPhase = 'complete';
      }

      if (nextPhase === 'complete') {
        pendingCompletionRef.current = { ...s, phase: 'complete', workDoneSeconds };
        return null;
      }

      return {
        ...s,
        phase: nextPhase,
        status: 'running',
        phaseStartedAt: Date.now(),
        phaseElapsedSeconds: 0,
        workDoneSeconds,
      };
    });
  }

  function addInterruption() {
    setSession(s => s ? { ...s, interruptions: s.interruptions + 1 } : s);
  }

  function setSessionQuality(q: 'Low' | 'Normal' | 'High') {
    setSession(s => s ? { ...s, quality: q } : s);
  }

  function setSessionReflection(text: string) {
    setSession(s => s ? { ...s, reflection: text } : s);
  }

  function setSessionTag(tagId: string | undefined, tagName: string | undefined) {
    setSession(s => s ? { ...s, tagId, tagName } : s);
  }

  function addFocusTag(name: string) {
    const now = nowTs();
    const id = `tag-${now}`;
    setFocusTags(prev => {
      if (prev.some(t => t.name.toLowerCase() === name.toLowerCase())) return prev;
      return [...prev, { id, name, createdAt: now }];
    });
    // Also select this tag on the active session
    setSession(s => s ? { ...s, tagId: id, tagName: name } : s);
  }

  function addTimerProfile(data: { name: string; focusMinutes: number; recallMinutes: number; restMinutes: number }) {
    const now = nowTs();
    const id = `profile-${now}`;
    const profile: FocusTimerProfile = {
      id,
      name: data.name,
      focusMinutes: data.focusMinutes,
      recallMinutes: data.recallMinutes,
      restMinutes: data.restMinutes,
      isDefault: false,
      createdAt: now,
    };
    setFocusTimerProfiles(prev => [...prev, profile]);
    setSelectedFocusTimerProfileId(id);
  }

  function deleteTimerProfile(profileId: string) {
    const profile = focusTimerProfiles.find(p => p.id === profileId);
    if (!profile || profile.isDefault) return;
    setFocusTimerProfiles(prev => prev.filter(p => p.id !== profileId));
    if (selectedFocusTimerProfileId === profileId) {
      setSelectedFocusTimerProfileId(DEFAULT_TIMER_PROFILES[0].id);
    }
  }

  function cancelSession() {
    setSession(null);
  }

  const handleReorder = useCallback((newVisibleItems: TodayItem[]) => {
    setItems(prev => {
      const today = todayDateKey();
      const historical = prev.filter(item => item.kind !== 'habit-flow' && item.dateKey !== today);
      return [...newVisibleItems, ...historical];
    });
  }, []);

  function handleDeleteItem(itemId: string) {
    const today = todayDateKey();
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    if (item.kind === 'quick-task') {
      if (item.completed) setCharacter(c => removeXpEventByRewardKey(c, taskRewardKey(itemId, today)));
    } else if (item.kind === 'focus-block') {
      if (item.completed) setCharacter(c => removeXpEventByRewardKey(c, focusBlockRewardKey(itemId, today)));
      if (session?.focusBlockId === itemId) setSession(null);
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

  function handleAdd(data: {
    title: string; notes: string; duration: number; focusType: string;
    steps: string[]; trigger: string; identity: string; identityShort: string;
    place: string; tinyVersion: string; obstacle: string; obstaclePlan: string;
    firstAction: string; entryStep: string; difficulty: string; domain: string;
    tagId: string;
  }) {
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
        firstAction: data.firstAction || undefined,
        tinyVersion: data.tinyVersion || undefined,
        domain: data.domain ? (data.domain as LifeDomain) : undefined,
      };
      setItems(prev => [...prev, newTask]);
    } else if (addModal === 'focus') {
      const focusType = (data.focusType as FocusType) || 'Deep Work';
      const tagEntry = data.tagId ? focusTags.find(t => t.id === data.tagId) : undefined;
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
        type: focusType,
        entryStep: data.entryStep || makeFocusEntryStep(data.title, focusType),
        difficulty: data.difficulty ? (data.difficulty as FocusBlock['difficulty']) : undefined,
        domain: data.domain ? (data.domain as LifeDomain) : undefined,
        tagId: tagEntry?.id,
        tagName: tagEntry?.name,
      };
      setItems(prev => [...prev, newBlock]);
    } else if (addModal === 'flow') {
      const stepList = data.steps.length > 0 ? data.steps : ['Step 1'];
      const flowIdentity = data.identity || 'I am someone who follows through.';
      const flowTrigger = data.trigger || 'When I am ready';
      const flowIdentityShort = data.identityShort || makeIdentityShort(flowIdentity);
      const steps = stepList.map((name, i) => ({
        id: `step-${now}-${i}`,
        name,
        identity: flowIdentity,
        identityShort: flowIdentityShort,
        cue: makeStepCue(flowTrigger, i > 0 ? stepList[i - 1] : undefined),
        tinyMinimum: '',
        tinyVersion: makeTinyVersion(name),
        place: data.place || undefined,
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
        identityShort: flowIdentityShort,
        place: data.place || undefined,
        tinyVersion: data.tinyVersion || undefined,
        obstacle: data.obstacle || undefined,
        obstaclePlan: data.obstaclePlan || undefined,
      };
      setItems(prev => [...prev, newFlow]);
    }
    setAddModal(null);
  }

  const dateLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });

  return (
    <div className="app-shell">
      <header className="app-shell-header">
        <div className="ash-left">
          <div className="brand-mark">ML</div>
          <div className="ash-brand-text">
            <span className="ash-brand-name">Masters of Life</span>
            <span className="ash-brand-date">{dateLabel}</span>
          </div>
        </div>
        <div className="ash-right">
          {session && <span className="ash-session-pill">● Active</span>}
          <span className="prototype-pill">Prototype</span>
        </div>
      </header>

      <main className="app-shell-content">
        {activeTab === 'today' && (
          <TodayPage
            visibleItems={visibleItems}
            currentFocus={currentFocus}
            progress={progress}
            character={character}
            focusSessionLogs={focusSessionLogs}
            goals={goals}
            session={session}
            onToggleStep={toggleHabitStep}
            onToggleTask={toggleTask}
            onToggleFocusBlock={toggleFocusBlock}
            onStartFocus={startFocus}
            onOpenMind={() => setActiveTab('mind')}
            onCancelSession={cancelSession}
            onReorder={handleReorder}
            onDeleteItem={handleDeleteItem}
            onAddTask={() => setAddModal('task')}
            onAddFocus={() => setAddModal('focus')}
            onAddFlow={() => setAddModal('flow')}
            onReset={handleReset}
            onSimulateTomorrow={handleSimulateTomorrow}
          />
        )}
        {activeTab === 'mind' && (
          <MindPage
            session={session}
            focusSessionLogs={focusSessionLogs}
            focusTags={focusTags}
            focusTimerProfiles={focusTimerProfiles}
            selectedProfileId={selectedFocusTimerProfileId}
            onPause={pauseSession}
            onResume={resumeSession}
            onAdvancePhase={advancePhase}
            onAddInterruption={addInterruption}
            onSetQuality={setSessionQuality}
            onSetReflection={setSessionReflection}
            onSetTag={setSessionTag}
            onAddTag={addFocusTag}
            onCancelSession={cancelSession}
            onSelectProfile={setSelectedFocusTimerProfileId}
            onAddProfile={addTimerProfile}
            onDeleteProfile={deleteTimerProfile}
          />
        )}
        {activeTab === 'goals' && (
          <GoalsPage
            goals={goals}
            character={character}
            onAddGoal={addGoal}
            onCompleteGoal={completeGoal}
            onUncompleteGoal={uncompleteGoal}
            onDeleteGoal={deleteGoal}
          />
        )}
        {activeTab === 'health' && <HealthPage />}
        {activeTab === 'analytics' && (
          <AnalyticsPage focusSessionLogs={focusSessionLogs} character={character} />
        )}
        {activeTab === 'character' && (
          <CharacterPage character={character} focusSessionLogs={focusSessionLogs} goals={goals} />
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        hasActiveSession={!!session}
      />

      {xpFloat && <div className="xp-float">{xpFloat}</div>}

      {addModal && (
        <AddModal
          mode={addModal}
          focusTags={focusTags}
          onAdd={handleAdd}
          onClose={() => setAddModal(null)}
        />
      )}
    </div>
  );
}

export default App;
