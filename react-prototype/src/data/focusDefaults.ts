import { FocusTimerProfile, FocusTag } from '../types';

export const DEFAULT_TIMER_PROFILES: FocusTimerProfile[] = [
  { id: 'profile-deepwork', name: 'Deep Work', focusMinutes: 60, recallMinutes: 5, restMinutes: 10, isDefault: true, createdAt: 0 },
  { id: 'profile-pomodoro', name: 'Pomodoro', focusMinutes: 25, recallMinutes: 0, restMinutes: 5, isDefault: true, createdAt: 0 },
  { id: 'profile-study', name: 'Study', focusMinutes: 45, recallMinutes: 5, restMinutes: 10, isDefault: true, createdAt: 0 },
  { id: 'profile-sprint', name: 'Quick Sprint', focusMinutes: 15, recallMinutes: 2, restMinutes: 3, isDefault: true, createdAt: 0 },
];

export const DEFAULT_FOCUS_TAGS: FocusTag[] = [
  { id: 'tag-philosophy', name: 'Philosophy', createdAt: 0 },
  { id: 'tag-psychoanalysis', name: 'Psychoanalysis', createdAt: 0 },
  { id: 'tag-writing', name: 'Writing', createdAt: 0 },
  { id: 'tag-appdev', name: 'App Development', createdAt: 0 },
  { id: 'tag-marxism', name: 'Marxism', createdAt: 0 },
  { id: 'tag-history', name: 'History', createdAt: 0 },
];
