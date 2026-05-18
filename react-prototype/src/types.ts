export type HabitFreq = {
  type: 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
  days?: number[];
};

export interface HabitStep {
  id: string;
  name: string;
  identity: string;
  cue: string;
  tinyMinimum: string;
  completionLog: Record<string, boolean>;
  freq: HabitFreq;
  tinyVersion?: string;
  place?: string;
  obstacle?: string;
  obstaclePlan?: string;
  identityShort?: string;
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
  identityShort?: string;
  place?: string;
  obstacle?: string;
  obstaclePlan?: string;
  tinyVersion?: string;
  automaticityScore?: number;
}

export type FocusType = 'Deep Work' | 'Study' | 'Admin' | 'Health' | 'Recovery' | 'Other';

export interface QuickTask {
  id: string;
  kind: 'quick-task';
  title: string;
  notes?: string;
  completed: boolean;
  completedAt: number | null;
  dateKey: string;
  createdAt: number;
  order: number;
}

export interface FocusBlock {
  id: string;
  kind: 'focus-block';
  title: string;
  notes?: string;
  duration: number;
  completed: boolean;
  completedAt: number | null;
  dateKey: string;
  createdAt: number;
  order: number;
  type: FocusType;
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
  rewardKey: string;
  createdAt: number;
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
  rewarded: Record<string, boolean>;
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
