export type TabId = 'today' | 'mind' | 'goals' | 'health' | 'analytics' | 'character';

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
  skippedLog?: Record<string, boolean>;
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
  domain?: LifeDomain;
  steps: HabitStep[];
  identityShort?: string;
  place?: string;
  obstacle?: string;
  obstaclePlan?: string;
  tinyVersion?: string;
  automaticityScore?: number;
}

export type FocusType = 'Deep Work' | 'Study' | 'Admin' | 'Health' | 'Recovery' | 'Other';

export type LifeDomain = 'Intelligence' | 'Health' | 'Strength' | 'Wealth' | 'Connection' | 'Purpose' | 'Consistency' | 'Resolve';

export interface QuickTask {
  id: string;
  kind: 'quick-task';
  title: string;
  notes?: string;
  time?: string;
  completed: boolean;
  completedAt: number | null;
  dateKey: string;
  createdAt: number;
  order: number;
  firstAction?: string;
  tinyVersion?: string;
  domain?: LifeDomain;
  linkedGoalId?: string;
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
  entryStep?: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  domain?: LifeDomain;
  linkedGoalId?: string;
  tagId?: string;
  tagName?: string;
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

export type FocusPhase = 'work' | 'recall' | 'rest' | 'complete';
export type FocusSessionStatus = 'running' | 'paused' | 'completed' | 'cancelled';

export interface FocusSession {
  id: string;
  focusBlockId: string;
  title: string;
  type: FocusType;
  domain?: LifeDomain;
  plannedMinutes: number;
  workMinutes: number;
  recallMinutes: number;
  restMinutes: number;
  segments: TimerSegment[];
  currentSegmentIndex: number;
  phase: FocusPhase;
  status: FocusSessionStatus;
  startedAt: number;
  phaseStartedAt: number;
  phaseElapsedSeconds: number;
  workDoneSeconds: number;
  interruptions: number;
  quality: 'Low' | 'Normal' | 'High';
  reflection: string;
  entryStep?: string;
  tagId?: string;
  tagName?: string;
}

export type GoalPeriod = 'weekly' | 'monthly';
export type GoalStatus = 'active' | 'completed' | 'archived';

export interface Goal {
  id: string;
  title: string;
  period: GoalPeriod;
  domain: LifeDomain;
  why?: string;
  target?: string;
  progressNote?: string;
  status: GoalStatus;
  createdAt: number;
  completedAt?: number | null;
  weekKey?: string;
  monthKey?: string;
  order: number;
  linkedItemIds?: string[];
  xpReward: number;
  rewardKey: string;
}

export interface FocusSessionLog {
  id: string;
  focusBlockId: string;
  title: string;
  type: FocusType;
  domain?: LifeDomain;
  plannedMinutes: number;
  actualMinutes: number;
  startedAt: number;
  completedAt: number;
  quality: 'Low' | 'Normal' | 'High';
  reflection?: string;
  interruptions: number;
  xpAwarded: number;
  rewardKey: string;
  tagId?: string;
  tagName?: string;
}

export interface TimerSegment {
  id: string;
  kind: 'focus' | 'recall' | 'rest';
  minutes: number;
  label?: string;
}

export interface FocusTimerProfile {
  id: string;
  name: string;
  focusMinutes: number;
  recallMinutes: number;
  restMinutes: number;
  segments?: TimerSegment[];
  isDefault?: boolean;
  createdAt: number;
}

export interface FocusTag {
  id: string;
  name: string;
  color?: string;
  createdAt: number;
}

export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
export type MealQuality = 'Light' | 'Balanced' | 'Heavy';

export interface MealLog {
  id: string;
  dateKey: string;
  type: MealType;
  label?: string;
  time?: string;
  quality?: MealQuality;
  note?: string;
  completedAt: number;
  xpReward?: number;
  rewardKey: string;
}

export type CardioType = 'Walk' | 'Run' | 'Bike' | 'Gym Cardio' | 'Other';
export type CardioIntensity = 'Easy' | 'Moderate' | 'Hard';

export interface CardioLog {
  id: string;
  dateKey: string;
  type: CardioType;
  minutes: number;
  intensity?: CardioIntensity;
  distanceKm?: number;
  note?: string;
  completedAt: number;
  xpReward?: number;
  rewardKey: string;
}

export interface WeightLog {
  id: string;
  dateKey: string;
  weightKg: number;
  note?: string;
  loggedAt: number;
  rewardKey?: string;
  xpReward?: number;
}

export interface RecoveryLog {
  id: string;
  dateKey: string;
  sleepQuality?: 'Poor' | 'Okay' | 'Good';
  energy?: 1 | 2 | 3 | 4 | 5;
  mood?: 1 | 2 | 3 | 4 | 5;
  note?: string;
  loggedAt: number;
  rewardKey?: string;
  xpReward?: number;
}

export interface HealthState {
  meals: MealLog[];
  cardio: CardioLog[];
  weight: WeightLog[];
  recovery: RecoveryLog[];
}
