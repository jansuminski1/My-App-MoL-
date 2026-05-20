import { FocusTimerProfile, FocusTag } from '../types';

export const DEFAULT_TIMER_PROFILES: FocusTimerProfile[] = [
  {
    id: 'profile-custom',
    name: 'Custom',
    focusMinutes: 25,
    recallMinutes: 5,
    restMinutes: 5,
    segments: [
      { id: 'seg-custom-focus', kind: 'focus', minutes: 25 },
      { id: 'seg-custom-recall', kind: 'recall', minutes: 5 },
      { id: 'seg-custom-rest', kind: 'rest', minutes: 5 },
    ],
    isDefault: true,
    createdAt: 0,
  },
];

export const DEFAULT_FOCUS_TAGS: FocusTag[] = [
  { id: 'tag-philosophy', name: 'Philosophy', createdAt: 0 },
  { id: 'tag-psychoanalysis', name: 'Psychoanalysis', createdAt: 0 },
  { id: 'tag-writing', name: 'Writing', createdAt: 0 },
  { id: 'tag-appdev', name: 'App Development', createdAt: 0 },
  { id: 'tag-marxism', name: 'Marxism', createdAt: 0 },
  { id: 'tag-history', name: 'History', createdAt: 0 },
];
