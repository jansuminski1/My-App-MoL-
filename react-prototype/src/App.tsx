import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  TodayItem, CharacterState, FocusSession, FocusSessionLog,
  HabitFlow, QuickTask, FocusBlock, FocusType, LifeDomain, TabId,
  Goal, GoalPeriod, FocusTimerProfile, FocusTag, TimerSegment,
  HealthState, MealLog, CardioLog, WeightLog, RecoveryLog,
} from './types';
import { makeIdentityShort, makeStepCue, makeTinyVersion, makeFocusEntryStep } from './utils/smartDefaults';
import { mockTodayItems, mockCharacter } from './data/mockToday';
import { mockGoals } from './data/mockGoals';
import { mockHealth } from './data/mockHealth';
import { DEFAULT_TIMER_PROFILES, DEFAULT_FOCUS_TAGS } from './data/focusDefaults';
import {
  getCurrentFocus, getTodayProgress, filterItemsForToday,
  addXpEventOnce, removeXpEventByRewardKey,
  habitStepRewardKey, taskRewardKey, focusBlockRewardKey,
} from './utils/todayFlow';
import { todayDateKey, nowTs, currentWeekKey, currentMonthKey } from './utils/date';
import {
  loadPrototypeState,
  savePrototypeState,
  savePrototypeStateObject,
  clearPrototypeState,
  type PrototypeState,
} from './utils/storage';
import {
  loadCloudState,
  onAuthChanged,
  saveCloudState,
  signInWithGoogle,
  signOutUser,
  type SyncUser,
} from './utils/firebaseSync';
import { calculateFocusXp } from './utils/focusProfiles';
import { BottomNav } from './components/BottomNav';
import { AddModal } from './components/AddModal';
import { TodayPage } from './pages/TodayPage';
import { MindPage } from './pages/MindPage';
import { GoalsPage } from './pages/GoalsPage';
import { GoalFormData } from './components/AddGoalModal';
import { HealthPage, MealFormData, CardioFormData, WeightFormData, RecoveryFormData } from './pages/HealthPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { CharacterPage } from './pages/CharacterPage';

type AddMode = 'task' | 'focus' | 'flow';
type SyncStatus = 'local' | 'signed-in' | 'loading' | 'syncing' | 'synced' | 'error';

function buildSessionSegments(profile: FocusTimerProfile, overrideFocusMinutes?: number): TimerSegment[] {
  if (profile.segments && profile.segments.length > 0) {
    if (overrideFocusMinutes === undefined) return profile.segments;
    let firstFocusReplaced = false;
    return profile.segments.map(seg => {
      if (!firstFocusReplaced && seg.kind === 'focus') {
        firstFocusReplaced = true;
        return { ...seg, minutes: overrideFocusMinutes };
      }
      return seg;
    });
  }
  // Legacy: build from flat fields
  const segs: TimerSegment[] = [];
  const focusMin = overrideFocusMinutes ?? profile.focusMinutes;
  segs.push({ id: 'seg-focus', kind: 'focus', minutes: focusMin });
  if (profile.recallMinutes > 0) segs.push({ id: 'seg-recall', kind: 'recall', minutes: profile.recallMinutes });
  if (profile.restMinutes > 0) segs.push({ id: 'seg-rest', kind: 'rest', minutes: profile.restMinutes });
  return segs;
}

function segmentPhase(seg: TimerSegment): FocusSession['phase'] {
  if (seg.kind === 'focus') return 'work';
  if (seg.kind === 'recall') return 'recall';
  return 'rest';
}

function App() {
  const initialPrototypeStateRef = useRef<PrototypeState | null>(null);
  if (!initialPrototypeStateRef.current) {
    initialPrototypeStateRef.current = loadPrototypeState();
  }
  const initialPrototypeState = initialPrototypeStateRef.current;
  const [activeTab, setActiveTab] = useState<TabId>('today');
  const [items, setItems] = useState<TodayItem[]>(() => initialPrototypeState.items);
  const [character, setCharacter] = useState<CharacterState>(() => initialPrototypeState.character);
  const [focusSessionLogs, setFocusSessionLogs] = useState<FocusSessionLog[]>(() => initialPrototypeState.focusSessionLogs);
  const [goals, setGoals] = useState<Goal[]>(() => initialPrototypeState.goals);
  const [focusTimerProfiles, setFocusTimerProfiles] = useState<FocusTimerProfile[]>(() => initialPrototypeState.focusTimerProfiles);
  const [selectedFocusTimerProfileId, setSelectedFocusTimerProfileId] = useState<string>(() => initialPrototypeState.selectedFocusTimerProfileId);
  const [focusTags, setFocusTags] = useState<FocusTag[]>(() => initialPrototypeState.focusTags);
  const [health, setHealth] = useState<HealthState>(() => initialPrototypeState.health);
  const [xpFloat, setXpFloat] = useState<string | null>(null);
  const [session, setSession] = useState<FocusSession | null>(null);
  const [addModal, setAddModal] = useState<AddMode | null>(null);
  const [syncUser, setSyncUser] = useState<SyncUser | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [syncMessage, setSyncMessage] = useState('Local only');
  const xpFloatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingCompletionRef = useRef<FocusSession | null>(null);
  const currentPrototypeStateRef = useRef<PrototypeState>(initialPrototypeState);
  const syncUserRef = useRef<SyncUser | null>(null);
  const cloudReadyRef = useRef(false);
  const isApplyingRemoteRef = useRef(false);
  const didSkipInitialSaveRef = useRef(false);
  const cloudSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleItems = useMemo(() => filterItemsForToday(items), [items]);
  const currentFocus = useMemo(() => getCurrentFocus(visibleItems), [visibleItems]);
  const progress = useMemo(() => getTodayProgress(visibleItems), [visibleItems]);

  const applyPrototypeState = useCallback((state: PrototypeState) => {
    isApplyingRemoteRef.current = true;
    setItems(state.items);
    setCharacter(state.character);
    setFocusSessionLogs(state.focusSessionLogs);
    setGoals(state.goals);
    setFocusTimerProfiles(state.focusTimerProfiles);
    setSelectedFocusTimerProfileId(state.selectedFocusTimerProfileId);
    setFocusTags(state.focusTags);
    setHealth(state.health);
    currentPrototypeStateRef.current = savePrototypeStateObject(state);
  }, []);

  useEffect(() => {
    if (!didSkipInitialSaveRef.current) {
      didSkipInitialSaveRef.current = true;
      currentPrototypeStateRef.current = initialPrototypeState;
      return;
    }
    if (isApplyingRemoteRef.current) {
      savePrototypeStateObject(currentPrototypeStateRef.current);
      isApplyingRemoteRef.current = false;
      return;
    }
    const localState = savePrototypeState(
      items,
      character,
      focusSessionLogs,
      goals,
      focusTimerProfiles,
      selectedFocusTimerProfileId,
      focusTags,
      health,
    );
    currentPrototypeStateRef.current = localState;
    const user = syncUserRef.current;
    if (!user || !cloudReadyRef.current) {
      setSyncStatus(user ? 'signed-in' : 'local');
      setSyncMessage(user ? 'Signed in' : 'Local only');
      return;
    }
    if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current);
    setSyncStatus('syncing');
    setSyncMessage('Syncing');
    cloudSaveTimerRef.current = setTimeout(() => {
      saveCloudState(user.uid, currentPrototypeStateRef.current)
        .then(() => {
          setSyncStatus('synced');
          setSyncMessage('Synced');
        })
        .catch(() => {
          setSyncStatus('error');
          setSyncMessage('Saved locally, sync error');
        });
    }, 900);
  }, [items, character, focusSessionLogs, goals, focusTimerProfiles, selectedFocusTimerProfileId, focusTags, health, initialPrototypeState]);

  useEffect(() => {
    return () => { if (xpFloatTimer.current) clearTimeout(xpFloatTimer.current); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const unsubscribe = onAuthChanged(async user => {
      if (cancelled) return;
      setSyncUser(user);
      syncUserRef.current = user;
      cloudReadyRef.current = false;
      if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current);
      if (!user) {
        setSyncStatus('local');
        setSyncMessage('Local only');
        return;
      }
      setSyncStatus('loading');
      setSyncMessage('Loading cloud');
      try {
        const localState = currentPrototypeStateRef.current;
        const cloudState = await loadCloudState(user.uid);
        if (cancelled) return;
        if (cloudState && cloudState.savedAt > localState.savedAt) {
          applyPrototypeState(cloudState);
          setSyncStatus('synced');
          setSyncMessage('Cloud loaded');
        } else {
          await saveCloudState(user.uid, localState);
          if (cancelled) return;
          setSyncStatus('synced');
          setSyncMessage(cloudState ? 'Local was newer' : 'Cloud initialized');
        }
        cloudReadyRef.current = true;
      } catch {
        if (cancelled) return;
        setSyncStatus('error');
        setSyncMessage('Local saved, sync error');
      }
    });
    return () => {
      cancelled = true;
      unsubscribe();
      if (cloudSaveTimerRef.current) clearTimeout(cloudSaveTimerRef.current);
    };
  }, [applyPrototypeState]);

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

  async function handleSignIn() {
    setSyncStatus('loading');
    setSyncMessage('Opening Google sign-in');
    try {
      await signInWithGoogle();
    } catch {
      setSyncStatus('error');
      setSyncMessage('Sign-in cancelled or failed');
    }
  }

  async function handleSignOut() {
    try {
      await signOutUser();
    } catch {
      setSyncStatus('error');
      setSyncMessage('Sign-out failed');
    }
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
    setHealth(mockHealth);
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
    const segments = buildSessionSegments(selectedProfile, block.duration);
    const firstSeg = segments[0];
    const now = Date.now();
    setSession({
      id: `session-${now}`,
      focusBlockId: blockId,
      title: block.title,
      type: block.type,
      domain: block.domain,
      plannedMinutes: block.duration,
      workMinutes: block.duration,
      recallMinutes: segments.find(s => s.kind === 'recall')?.minutes ?? selectedProfile.recallMinutes,
      restMinutes: segments.find(s => s.kind === 'rest')?.minutes ?? selectedProfile.restMinutes,
      segments,
      currentSegmentIndex: 0,
      phase: firstSeg ? segmentPhase(firstSeg) : 'work',
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
      const workDoneSeconds = s.phase === 'work'
        ? s.workDoneSeconds + phaseElapsed
        : s.workDoneSeconds;

      // Segment-based advance
      if (s.segments && s.segments.length > 0) {
        const nextIdx = s.currentSegmentIndex + 1;
        if (nextIdx >= s.segments.length) {
          pendingCompletionRef.current = { ...s, phase: 'complete', workDoneSeconds };
          return null;
        }
        const nextSeg = s.segments[nextIdx];
        return {
          ...s,
          phase: segmentPhase(nextSeg),
          currentSegmentIndex: nextIdx,
          status: 'running',
          phaseStartedAt: Date.now(),
          phaseElapsedSeconds: 0,
          workDoneSeconds,
        };
      }

      // Legacy fallback (no segments)
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

  function extendSession(additionalMinutes: number) {
    setSession(s => {
      if (!s || s.phase !== 'work') return s;
      if (s.segments && s.segments.length > 0) {
        const idx = s.currentSegmentIndex;
        const updatedSegments = s.segments.map((seg, i) =>
          i === idx ? { ...seg, minutes: seg.minutes + additionalMinutes } : seg
        );
        return { ...s, segments: updatedSegments, workMinutes: s.workMinutes + additionalMinutes };
      }
      return { ...s, workMinutes: s.workMinutes + additionalMinutes };
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
    setSession(s => s ? { ...s, tagId: id, tagName: name } : s);
  }

  function deleteFocusTag(id: string) {
    setFocusTags(prev => prev.filter(t => t.id !== id));
    setSession(s => s?.tagId === id ? { ...s, tagId: undefined, tagName: undefined } : s);
  }

  function updateFocusTag(id: string, updates: Partial<FocusTag>) {
    setFocusTags(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }

  function saveProfileFromSegments(name: string, segments: TimerSegment[]) {
    const now = nowTs();
    const id = `profile-${now}`;
    const focusSeg = segments.find(s => s.kind === 'focus');
    const recallSeg = segments.find(s => s.kind === 'recall');
    const restSeg = segments.find(s => s.kind === 'rest');
    const profile: FocusTimerProfile = {
      id,
      name: name.trim(),
      focusMinutes: focusSeg?.minutes ?? 25,
      recallMinutes: recallSeg?.minutes ?? 5,
      restMinutes: restSeg?.minutes ?? 5,
      segments,
      isDefault: false,
      createdAt: now,
    };
    setFocusTimerProfiles(prev => [...prev, profile]);
    setSelectedFocusTimerProfileId(id);
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
      segments: [
        { id: `${id}-focus`, kind: 'focus', minutes: data.focusMinutes },
        ...(data.recallMinutes > 0 ? [{ id: `${id}-recall`, kind: 'recall' as const, minutes: data.recallMinutes }] : []),
        ...(data.restMinutes > 0 ? [{ id: `${id}-rest`, kind: 'rest' as const, minutes: data.restMinutes }] : []),
      ],
      isDefault: false,
      createdAt: now,
    };
    setFocusTimerProfiles(prev => [...prev, profile]);
    setSelectedFocusTimerProfileId(id);
  }

  function updateTimerProfile(profileId: string, updates: Partial<FocusTimerProfile>) {
    setFocusTimerProfiles(prev => prev.map(p =>
      p.id === profileId ? { ...p, ...updates } : p
    ));
  }

  function deleteTimerProfile(profileId: string) {
    const profile = focusTimerProfiles.find(p => p.id === profileId);
    if (!profile || profile.isDefault) return;
    setFocusTimerProfiles(prev => prev.filter(p => p.id !== profileId));
    if (selectedFocusTimerProfileId === profileId) {
      setSelectedFocusTimerProfileId(DEFAULT_TIMER_PROFILES[0].id);
    }
  }

  function startQuickFocus() {
    const selectedProfile = focusTimerProfiles.find(p => p.id === selectedFocusTimerProfileId) ?? focusTimerProfiles[0];
    const segments = buildSessionSegments(selectedProfile);
    const firstSeg = segments[0];
    const now = Date.now();
    setSession({
      id: `session-${now}`,
      focusBlockId: `quick-${now}`,
      title: selectedProfile?.name ?? 'Quick Focus',
      type: 'Deep Work',
      domain: undefined,
      plannedMinutes: segments.find(s => s.kind === 'focus')?.minutes ?? selectedProfile?.focusMinutes ?? 25,
      workMinutes: segments.find(s => s.kind === 'focus')?.minutes ?? selectedProfile?.focusMinutes ?? 25,
      recallMinutes: segments.find(s => s.kind === 'recall')?.minutes ?? selectedProfile?.recallMinutes ?? 0,
      restMinutes: segments.find(s => s.kind === 'rest')?.minutes ?? selectedProfile?.restMinutes ?? 5,
      segments,
      currentSegmentIndex: 0,
      phase: firstSeg ? segmentPhase(firstSeg) : 'work',
      status: 'running',
      startedAt: now,
      phaseStartedAt: now,
      phaseElapsedSeconds: 0,
      workDoneSeconds: 0,
      interruptions: 0,
      quality: 'Normal',
      reflection: '',
      entryStep: undefined,
      tagId: undefined,
      tagName: undefined,
    });
  }

  function logManualSession(data: {
    title: string;
    tagId?: string;
    tagName?: string;
    minutes: number;
    quality: 'Low' | 'Normal' | 'High';
    reflection?: string;
  }) {
    const now = nowTs();
    const today = todayDateKey();
    const id = `manual-${now}`;
    const rewardKey = `manual-focus:${today}:${id}`;
    const xpAwarded = calculateFocusXp({
      actualMinutes: data.minutes,
      plannedMinutes: data.minutes,
      type: 'Deep Work',
      quality: data.quality,
    });
    const log: FocusSessionLog = {
      id,
      focusBlockId: `manual-${now}`,
      title: data.title,
      type: 'Deep Work',
      domain: undefined,
      plannedMinutes: data.minutes,
      actualMinutes: data.minutes,
      startedAt: now,
      completedAt: now,
      quality: data.quality,
      reflection: data.reflection || undefined,
      interruptions: 0,
      xpAwarded,
      rewardKey,
      tagId: data.tagId,
      tagName: data.tagName,
    };
    setFocusSessionLogs(prev => {
      if (prev.some(l => l.id === log.id)) return prev;
      return [log, ...prev.slice(0, 49)];
    });
    setCharacter(c => addXpEventOnce(c, xpAwarded, data.title, 'focus', rewardKey));
    showXpFloat(`+${xpAwarded} XP — ${data.title}`);
  }

  function cancelSession() {
    setSession(null);
  }

  function handleUpdateFlow(updatedFlow: HabitFlow) {
    const today = todayDateKey();
    const existing = items.find(i => i.id === updatedFlow.id && i.kind === 'habit-flow') as HabitFlow | undefined;
    if (existing) {
      const newStepIds = new Set(updatedFlow.steps.map(s => s.id));
      const removedCompleted = existing.steps.filter(
        s => !newStepIds.has(s.id) && !!s.completionLog[today]
      );
      if (removedCompleted.length > 0) {
        setCharacter(c => {
          let updated = c;
          for (const step of removedCompleted) {
            updated = removeXpEventByRewardKey(updated, habitStepRewardKey(step.id, today));
          }
          return updated;
        });
      }
    }
    setItems(prev => prev.map(i => i.id === updatedFlow.id ? updatedFlow : i));
  }

  function addMealLog(data: MealFormData) {
    const now = nowTs();
    const today = todayDateKey();
    const id = `meal-${now}`;
    const rewardKey = `meal:${today}:${id}`;
    const xp = 8;
    const entry: MealLog = {
      id, dateKey: today, type: data.type,
      label: data.label, quality: data.quality,
      completedAt: now, xpReward: xp, rewardKey,
    };
    setHealth(prev => ({ ...prev, meals: [entry, ...prev.meals] }));
    setCharacter(c => addXpEventOnce(c, xp, `Meal: ${data.type}${data.label ? ' — ' + data.label : ''}`, 'meal', rewardKey));
    showXpFloat(`+${xp} XP — ${data.type}`);
  }

  function deleteMealLog(id: string) {
    const entry = health.meals.find(m => m.id === id);
    if (!entry) return;
    setHealth(prev => ({ ...prev, meals: prev.meals.filter(m => m.id !== id) }));
    setCharacter(c => removeXpEventByRewardKey(c, entry.rewardKey));
  }

  function addCardioLog(data: CardioFormData) {
    const now = nowTs();
    const today = todayDateKey();
    const id = `cardio-${now}`;
    const rewardKey = `cardio:${today}:${id}`;
    const mult = data.intensity === 'Easy' ? 0.8 : data.intensity === 'Hard' ? 1.2 : 1.0;
    const xp = Math.min(80, Math.round(data.minutes * mult));
    const entry: CardioLog = {
      id, dateKey: today, type: data.type,
      minutes: data.minutes, intensity: data.intensity,
      distanceKm: data.distanceKm,
      completedAt: now, xpReward: xp, rewardKey,
    };
    setHealth(prev => ({ ...prev, cardio: [entry, ...prev.cardio] }));
    setCharacter(c => addXpEventOnce(c, xp, `Cardio: ${data.type} ${data.minutes}min`, 'cardio', rewardKey));
    showXpFloat(`+${xp} XP — ${data.type}`);
  }

  function deleteCardioLog(id: string) {
    const entry = health.cardio.find(c => c.id === id);
    if (!entry) return;
    setHealth(prev => ({ ...prev, cardio: prev.cardio.filter(c => c.id !== id) }));
    setCharacter(c => removeXpEventByRewardKey(c, entry.rewardKey));
  }

  function addWeightLog(data: WeightFormData) {
    const now = nowTs();
    const today = todayDateKey();
    const id = `weight-${now}`;
    const rewardKey = `weight:${today}:${id}`;
    const xp = 5;
    const entry: WeightLog = {
      id, dateKey: today, weightKg: data.weightKg,
      loggedAt: now, rewardKey, xpReward: xp,
    };
    setHealth(prev => ({ ...prev, weight: [entry, ...prev.weight] }));
    setCharacter(c => addXpEventOnce(c, xp, `Weight logged: ${data.weightKg} kg`, 'weight', rewardKey));
    showXpFloat(`+${xp} XP — Weight logged`);
  }

  function deleteWeightLog(id: string) {
    const entry = health.weight.find(w => w.id === id);
    if (!entry) return;
    setHealth(prev => ({ ...prev, weight: prev.weight.filter(w => w.id !== id) }));
    if (entry.rewardKey) {
      setCharacter(c => removeXpEventByRewardKey(c, entry.rewardKey!));
    }
  }

  function deleteRecoveryLog() {
    const today = todayDateKey();
    const entry = health.recovery.find(r => r.dateKey === today);
    if (!entry) return;
    setHealth(prev => ({ ...prev, recovery: prev.recovery.filter(r => r.dateKey !== today) }));
    if (entry.rewardKey) setCharacter(c => removeXpEventByRewardKey(c, entry.rewardKey!));
  }

  function saveRecoveryLog(data: RecoveryFormData) {
    const now = nowTs();
    const today = todayDateKey();
    const id = `recovery-${today}`;
    const rewardKey = `recovery:${today}`;
    const xp = 8;
    const entry: RecoveryLog = {
      id, dateKey: today,
      sleepQuality: data.sleepQuality,
      energy: data.energy,
      mood: data.mood,
      note: data.note,
      loggedAt: now, rewardKey, xpReward: xp,
    };
    setHealth(prev => ({
      ...prev,
      recovery: [entry, ...prev.recovery.filter(r => r.dateKey !== today)],
    }));
    setCharacter(c => addXpEventOnce(c, xp, 'Recovery logged', 'recovery', rewardKey));
    showXpFloat(`+${xp} XP — Recovery logged`);
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
    firstAction: string; entryStep: string; difficulty: string;
    taskTime?: string; tagId?: string; tagName?: string;
  }) {
    const now = nowTs();
    const today = todayDateKey();

    if (addModal === 'task') {
      const newTask: QuickTask = {
        id: `task-${now}`,
        kind: 'quick-task',
        title: data.title,
        notes: data.notes || undefined,
        time: data.taskTime || undefined,
        completed: false,
        completedAt: null,
        dateKey: today,
        createdAt: now,
        order: items.filter(i => i.kind === 'quick-task').length,
        firstAction: data.firstAction || undefined,
        tinyVersion: data.tinyVersion || undefined,
      };
      setItems(prev => [...prev, newTask]);
    } else if (addModal === 'focus') {
      const focusType = (data.focusType as FocusType) || 'Deep Work';
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
        tagId: data.tagId || undefined,
        tagName: data.tagName || undefined,
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
          <button
            type="button"
            className={`sync-pill sync-${syncStatus}`}
            onClick={syncUser ? handleSignOut : handleSignIn}
            title={syncUser ? `Signed in as ${syncUser.email ?? syncUser.displayName ?? 'Google user'}` : 'Sign in to sync across devices'}
          >
            {syncUser ? syncMessage : 'Sign in'}
          </button>
          <span className="lvl-pill">Lvl {character.level}</span>
        </div>
      </header>

      <main className="app-shell-content">
        {activeTab === 'today' && (
          <TodayPage
            visibleItems={visibleItems}
            currentFocus={currentFocus}
            progress={progress}
            character={character}
            session={session}
            onToggleStep={toggleHabitStep}
            onToggleTask={toggleTask}
            onToggleFocusBlock={toggleFocusBlock}
            onStartFocus={startFocus}
            onOpenMind={() => setActiveTab('mind')}
            onCancelSession={cancelSession}
            onUpdateFlow={handleUpdateFlow}
            onReorder={handleReorder}
            onDeleteItem={handleDeleteItem}
            onAddTask={() => setAddModal('task')}
            onAddFocus={() => setAddModal('focus')}
            onAddFlow={() => setAddModal('flow')}
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
            onExtendSession={extendSession}
            onAddInterruption={addInterruption}
            onSetQuality={setSessionQuality}
            onSetReflection={setSessionReflection}
            onSetTag={setSessionTag}
            onAddTag={addFocusTag}
            onDeleteTag={deleteFocusTag}
            onUpdateTag={updateFocusTag}
            onCancelSession={cancelSession}
            onSelectProfile={setSelectedFocusTimerProfileId}
            onAddProfile={addTimerProfile}
            onUpdateProfile={updateTimerProfile}
            onDeleteProfile={deleteTimerProfile}
            onSaveProfile={saveProfileFromSegments}
            onStartQuickFocus={startQuickFocus}
            onLogManual={logManualSession}
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
        {activeTab === 'health' && (
          <HealthPage
            health={health}
            onAddMeal={addMealLog}
            onDeleteMeal={deleteMealLog}
            onAddCardio={addCardioLog}
            onDeleteCardio={deleteCardioLog}
            onAddWeight={addWeightLog}
            onDeleteWeight={deleteWeightLog}
            onSaveRecovery={saveRecoveryLog}
            onDeleteRecovery={deleteRecoveryLog}
          />
        )}
        {activeTab === 'analytics' && (
          <AnalyticsPage focusSessionLogs={focusSessionLogs} character={character} />
        )}
        {activeTab === 'character' && (
          <CharacterPage
            character={character}
            focusSessionLogs={focusSessionLogs}
            goals={goals}
            syncUser={syncUser}
            syncStatus={syncStatus}
            syncMessage={syncMessage}
            onSignIn={handleSignIn}
            onSignOut={handleSignOut}
          />
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
          onCustomDuration={() => { setAddModal(null); setActiveTab('mind'); }}
        />
      )}
    </div>
  );
}

export default App;
