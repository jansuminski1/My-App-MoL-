import { TodayItem, CurrentFocus, CharacterState, XpEvent } from '../types';
import { todayDateKey } from './date';

export function getCurrentFocus(items: TodayItem[]): CurrentFocus | null {
  const today = todayDateKey();
  for (const item of items) {
    if (item.kind === 'habit-flow') {
      const incompleteStep = item.steps.find(s => !s.completionLog[today] && !s.skippedLog?.[today]);
      if (incompleteStep) return { item, stepId: incompleteStep.id };
    } else if (!item.completed) {
      return { item };
    }
  }
  return null;
}

export function getTodayProgress(items: TodayItem[]): { completed: number; total: number } {
  const today = todayDateKey();
  let completed = 0;
  let total = 0;
  for (const item of items) {
    if (item.kind === 'habit-flow') {
      total += item.steps.length;
      completed += item.steps.filter(s => !!s.completionLog[today]).length;
    } else {
      total += 1;
      if (item.completed) completed += 1;
    }
  }
  return { completed, total };
}

export function isItemFullyComplete(item: TodayItem): boolean {
  if (item.kind === 'habit-flow') {
    const today = todayDateKey();
    return item.steps.every(s => !!s.completionLog[today] || !!s.skippedLog?.[today]);
  }
  return item.completed;
}

export function carryOverIncompleteTasks(
  items: TodayItem[],
  today = todayDateKey(),
): { items: TodayItem[]; changed: boolean } {
  let changed = false;
  const carriedItems = items.map(item => {
    if (item.kind !== 'quick-task' || item.completed || !item.dateKey || item.dateKey >= today) {
      return item;
    }
    changed = true;
    const originalDateKey = item.originalDateKey ?? item.dateKey;
    return {
      ...item,
      dateKey: today,
      originalDateKey,
      carriedFromDateKey: item.dateKey,
      carriedCount: (item.carriedCount ?? 0) + 1,
    };
  });
  return { items: carriedItems, changed };
}

// Habit flows persist across days; tasks and focus blocks are date-scoped.
export function filterItemsForToday(items: TodayItem[]): TodayItem[] {
  const today = todayDateKey();
  return items.filter(item => {
    if (item.kind === 'habit-flow') return true;
    if (item.kind === 'quick-task' && !item.completed && item.dateKey < today) return true;
    return item.dateKey === today;
  });
}

// =====================
// Level math (ported from vanilla js/app-xp.js)
// =====================
const XP_BASE = 25;
const XP_EXPONENT = 1.35;
const MAX_LEVEL = 250;
const RANK_SIZE = 5;
const MAX_RANK = 50;

export function xpRequiredForLevel(level: number): number {
  return Math.round(XP_BASE * Math.pow(level, XP_EXPONENT));
}

export function getLevelProgress(totalXp: number): {
  level: number;
  rank: number;
  xpForNextLevel: number;
  progressPercent: number;
  xpIntoCurrentLevel: number;
} {
  let level = 1;
  let accumulated = 0;
  while (level < MAX_LEVEL) {
    const needed = xpRequiredForLevel(level);
    if (accumulated + needed > totalXp) {
      const xpIntoCurrentLevel = totalXp - accumulated;
      const progressPercent = Math.round((xpIntoCurrentLevel / needed) * 100);
      const rank = Math.min(MAX_RANK, Math.ceil(level / RANK_SIZE));
      return { level, rank, xpForNextLevel: needed, progressPercent, xpIntoCurrentLevel };
    }
    accumulated += needed;
    level++;
  }
  const needed = xpRequiredForLevel(MAX_LEVEL);
  return {
    level: MAX_LEVEL,
    rank: MAX_RANK,
    xpForNextLevel: needed,
    progressPercent: 100,
    xpIntoCurrentLevel: needed,
  };
}

// =====================
// Reward key helpers (mirrors vanilla app-xp.js patterns)
// =====================
export function habitStepRewardKey(stepId: string, dateKey: string): string {
  return `habit:${stepId}:${dateKey}`;
}

export function taskRewardKey(taskId: string, dateKey: string): string {
  return `task:${dateKey}:${taskId}`;
}

export function focusBlockRewardKey(blockId: string, dateKey: string): string {
  return `focus:${dateKey}:${blockId}`;
}

// =====================
// XP operations with deduplication
// =====================
export function hasReward(c: CharacterState, rewardKey: string): boolean {
  return !!c.rewarded[rewardKey];
}

export function addXpEventOnce(
  c: CharacterState,
  amount: number,
  label: string,
  type: string,
  rewardKey: string,
): CharacterState {
  if (c.rewarded[rewardKey]) return c;
  const newTotalXp = c.totalXp + amount;
  const lp = getLevelProgress(newTotalXp);
  const ts = Date.now();
  const newEvent: XpEvent = {
    id: `xp-${ts}`,
    label,
    generalXp: amount,
    statXp: {},
    timestamp: ts,
    type,
    rewardKey,
    createdAt: ts,
  };
  return {
    ...c,
    totalXp: newTotalXp,
    level: lp.level,
    rank: lp.rank,
    xpIntoLevel: lp.xpIntoCurrentLevel,
    xpForNextLevel: lp.xpForNextLevel,
    progressPercent: lp.progressPercent,
    rewarded: { ...c.rewarded, [rewardKey]: true },
    xpEvents: [newEvent, ...c.xpEvents.slice(0, 19)],
  };
}

export function removeXpEventByRewardKey(c: CharacterState, rewardKey: string): CharacterState {
  const event = c.xpEvents.find(e => e.rewardKey === rewardKey);
  if (!event) return c;
  const newTotalXp = Math.max(0, c.totalXp - event.generalXp);
  const lp = getLevelProgress(newTotalXp);
  const newRewarded = { ...c.rewarded };
  delete newRewarded[rewardKey];
  return {
    ...c,
    totalXp: newTotalXp,
    level: lp.level,
    rank: lp.rank,
    xpIntoLevel: lp.xpIntoCurrentLevel,
    xpForNextLevel: lp.xpForNextLevel,
    progressPercent: lp.progressPercent,
    rewarded: newRewarded,
    xpEvents: c.xpEvents.filter(e => e.rewardKey !== rewardKey),
  };
}

export function getModeFromProgress(completed: number, total: number): 'on-track' | 'building' | 'recovery' {
  if (total === 0) return 'building';
  const pct = completed / total;
  if (pct >= 0.7) return 'on-track';
  if (pct >= 0.3) return 'building';
  return 'recovery';
}

export function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  return `${Math.floor(diffH / 24)}d ago`;
}
