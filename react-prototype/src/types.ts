export interface HabitStep {
  id: string;
  name: string;
  identity: string;
  cue: string;
  tinyMinimum: string;
  completed: boolean;
}

export interface HabitFlow {
  id: string;
  kind: 'habit-flow';
  title: string;
  identity: string;
  trigger: string;
  startTime?: string;
  domain?: 'Intelligence' | 'Health' | 'Strength' | 'Wealth' | 'Connection' | 'Purpose' | 'Consistency' | 'Resolve';
  steps: HabitStep[];
}

export interface QuickTask {
  id: string;
  kind: 'quick-task';
  title: string;
  notes?: string;
  completed: boolean;
}

export interface FocusBlock {
  id: string;
  kind: 'focus-block';
  title: string;
  notes?: string;
  duration: number;
  completed: boolean;
}

export type TodayItem = HabitFlow | QuickTask | FocusBlock;

export interface LifeStats {
  intelligence: number;
  health: number;
  strength: number;
  wealth: number;
  connection: number;
  purpose: number;
  consistency: number;
  resolve: number;
}

export interface XpEvent {
  id: string;
  label: string;
  generalXp: number;
  statXp: Partial<LifeStats>;
  timestamp: number;
  type: string;
}

export interface CharacterState {
  level: number;
  rank: number;
  rankTitle: string;
  totalXp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
  stats: LifeStats;
  xpEvents: XpEvent[];
  role: string;
  strongestStat: keyof LifeStats;
  weakestStat: keyof LifeStats;
}

export interface CurrentFocus {
  item: TodayItem;
  stepId?: string;
}

export interface FocusSession {
  blockId: string;
  startedAt: number;
  accumulatedSeconds: number;
  paused: boolean;
}
