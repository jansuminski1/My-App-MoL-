import { TodayItem, CurrentFocus, CharacterState, XpEvent } from '../types';

export function getCurrentFocus(items: TodayItem[]): CurrentFocus | null {
  for (const item of items) {
    if (item.kind === 'habit-flow') {
      const incompleteStep = item.steps.find(s => !s.completed);
      if (incompleteStep) return { item, stepId: incompleteStep.id };
    } else if (!item.completed) {
      return { item };
    }
  }
  return null;
}

export function getTodayProgress(items: TodayItem[]): { completed: number; total: number } {
  let completed = 0;
  let total = 0;
  for (const item of items) {
    if (item.kind === 'habit-flow') {
      total += item.steps.length;
      completed += item.steps.filter(s => s.completed).length;
    } else {
      total += 1;
      if (item.completed) completed += 1;
    }
  }
  return { completed, total };
}

export function isItemFullyComplete(item: TodayItem): boolean {
  if (item.kind === 'habit-flow') return item.steps.every(s => s.completed);
  return item.completed;
}

export function awardXp(
  c: CharacterState,
  amount: number,
  label: string,
  type: string,
): CharacterState {
  const newXpIntoLevel = Math.min(c.xpForNextLevel, c.xpIntoLevel + amount);
  const newProgress = Math.round((newXpIntoLevel / c.xpForNextLevel) * 100);
  const newEvent: XpEvent = {
    id: `xp-${Date.now()}`,
    label,
    generalXp: amount,
    statXp: {},
    timestamp: Date.now(),
    type,
  };
  return {
    ...c,
    totalXp: c.totalXp + amount,
    xpIntoLevel: newXpIntoLevel,
    progressPercent: newProgress,
    xpEvents: [newEvent, ...c.xpEvents.slice(0, 9)],
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
