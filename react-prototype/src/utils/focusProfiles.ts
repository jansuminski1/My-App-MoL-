import { FocusType } from '../types';

interface FocusProfile {
  recallMinutes: number;
  restMinutes: number;
}

const PROFILES: Record<FocusType, FocusProfile> = {
  'Deep Work':  { recallMinutes: 3, restMinutes: 5 },
  'Study':      { recallMinutes: 5, restMinutes: 5 },
  'Admin':      { recallMinutes: 0, restMinutes: 3 },
  'Health':     { recallMinutes: 0, restMinutes: 5 },
  'Recovery':   { recallMinutes: 0, restMinutes: 5 },
  'Other':      { recallMinutes: 2, restMinutes: 5 },
};

export function getFocusProfile(type: FocusType): FocusProfile {
  return PROFILES[type] ?? { recallMinutes: 2, restMinutes: 5 };
}

export function calculateFocusXp(params: {
  actualMinutes: number;
  plannedMinutes: number;
  type: FocusType;
  quality: 'Low' | 'Normal' | 'High';
}): number {
  const TYPE_MULT: Record<FocusType, number> = {
    'Deep Work': 1.5,
    'Study':     1.25,
    'Admin':     1.0,
    'Health':    1.0,
    'Recovery':  1.0,
    'Other':     1.0,
  };
  const QUALITY_MULT = { Low: 0.8, Normal: 1.0, High: 1.2 };
  const base = Math.max(1, params.actualMinutes);
  const raw = Math.round(base * (TYPE_MULT[params.type] ?? 1.0) * QUALITY_MULT[params.quality]);
  return Math.min(raw, params.plannedMinutes * 2);
}
