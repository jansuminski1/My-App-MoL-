import { TodayItem, CharacterState, FocusSessionLog, Goal, FocusTimerProfile, FocusTag, HealthState } from '../types';
import { mockTodayItems, mockCharacter } from '../data/mockToday';
import { mockGoals } from '../data/mockGoals';
import { mockHealth } from '../data/mockHealth';
import { DEFAULT_TIMER_PROFILES, DEFAULT_FOCUS_TAGS } from '../data/focusDefaults';
import { todayDateKey } from './date';

export const STORAGE_KEY = 'masters-of-life-react-prototype-v1';

export interface PrototypeState {
  version: 1;
  savedAt: number;
  savedAtDateKey: string;
  items: TodayItem[];
  character: CharacterState;
  focusSessionLogs: FocusSessionLog[];
  goals: Goal[];
  focusTimerProfiles: FocusTimerProfile[];
  selectedFocusTimerProfileId: string;
  focusTags: FocusTag[];
  health: HealthState;
}

const EMPTY_HEALTH: HealthState = { meals: [], cardio: [], weight: [], recovery: [] };

function cloneDefault<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizeProfiles(
  profilesInput: FocusTimerProfile[] | undefined,
  selectedInput: string | undefined,
): { profiles: FocusTimerProfile[]; selectedId: string } {
  const oldPresetIds = new Set(['profile-deepwork', 'profile-pomodoro', 'profile-study', 'profile-sprint']);
  let profiles = (Array.isArray(profilesInput) ? profilesInput : DEFAULT_TIMER_PROFILES).filter(
    p => p && !oldPresetIds.has(p.id),
  );
  if (!profiles.some(p => p.id === 'profile-custom')) {
    profiles = [DEFAULT_TIMER_PROFILES[0], ...profiles];
  }
  let selectedId = selectedInput ?? 'profile-custom';
  if (oldPresetIds.has(selectedId)) selectedId = 'profile-custom';
  if (!profiles.some(p => p.id === selectedId)) selectedId = profiles[0]?.id ?? 'profile-custom';
  return { profiles, selectedId };
}

export function getDefaultPrototypeState(): PrototypeState {
  return {
    version: 1,
    savedAt: 0,
    savedAtDateKey: todayDateKey(),
    items: cloneDefault(mockTodayItems),
    character: cloneDefault(mockCharacter),
    focusSessionLogs: [],
    goals: cloneDefault(mockGoals),
    focusTimerProfiles: cloneDefault(DEFAULT_TIMER_PROFILES),
    selectedFocusTimerProfileId: DEFAULT_TIMER_PROFILES[0].id,
    focusTags: cloneDefault(DEFAULT_FOCUS_TAGS),
    health: cloneDefault(mockHealth ?? EMPTY_HEALTH),
  };
}

export function normalizePrototypeState(raw: unknown): PrototypeState {
  const defaults = getDefaultPrototypeState();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return defaults;
  const parsed = raw as Partial<PrototypeState>;
  if (!Array.isArray(parsed.items) || !parsed.character || typeof parsed.character !== 'object') {
    return defaults;
  }
  const { profiles, selectedId } = normalizeProfiles(
    parsed.focusTimerProfiles,
    parsed.selectedFocusTimerProfileId,
  );
  const rawHealth = parsed.health;
  const health = rawHealth && typeof rawHealth === 'object'
    ? {
        meals: Array.isArray(rawHealth.meals) ? rawHealth.meals : [],
        cardio: Array.isArray(rawHealth.cardio) ? rawHealth.cardio : [],
        weight: Array.isArray(rawHealth.weight) ? rawHealth.weight : [],
        recovery: Array.isArray(rawHealth.recovery) ? rawHealth.recovery : [],
      }
    : cloneDefault(EMPTY_HEALTH);
  return {
    version: 1,
    savedAt: Number(parsed.savedAt) || 0,
    savedAtDateKey: parsed.savedAtDateKey || todayDateKey(),
    items: parsed.items,
    character: parsed.character,
    focusSessionLogs: Array.isArray(parsed.focusSessionLogs) ? parsed.focusSessionLogs : [],
    goals: Array.isArray(parsed.goals) ? parsed.goals : [],
    focusTimerProfiles: profiles,
    selectedFocusTimerProfileId: selectedId,
    focusTags: Array.isArray(parsed.focusTags) ? parsed.focusTags : cloneDefault(DEFAULT_FOCUS_TAGS),
    health,
  };
}

export function loadPrototypeState(): PrototypeState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPrototypeState();
    return normalizePrototypeState(JSON.parse(raw));
  } catch {
    return getDefaultPrototypeState();
  }
}

export function makePrototypeState(
  items: TodayItem[],
  character: CharacterState,
  focusSessionLogs: FocusSessionLog[],
  goals: Goal[],
  focusTimerProfiles: FocusTimerProfile[],
  selectedFocusTimerProfileId: string,
  focusTags: FocusTag[],
  health: HealthState,
  savedAt = Date.now(),
): PrototypeState {
  return {
    version: 1,
    savedAt,
    savedAtDateKey: todayDateKey(),
    items,
    character,
    focusSessionLogs,
    goals,
    focusTimerProfiles,
    selectedFocusTimerProfileId,
    focusTags,
    health,
  };
}

export function savePrototypeStateObject(state: PrototypeState): PrototypeState {
  const normalized = normalizePrototypeState(state);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  } catch {
    // localStorage unavailable or quota exceeded; keep the in-memory app working.
  }
  return normalized;
}

export function savePrototypeState(
  items: TodayItem[],
  character: CharacterState,
  focusSessionLogs: FocusSessionLog[],
  goals: Goal[],
  focusTimerProfiles: FocusTimerProfile[],
  selectedFocusTimerProfileId: string,
  focusTags: FocusTag[],
  health: HealthState,
): PrototypeState {
  return savePrototypeStateObject(makePrototypeState(
    items,
    character,
    focusSessionLogs,
    goals,
    focusTimerProfiles,
    selectedFocusTimerProfileId,
    focusTags,
    health,
  ));
}

export function clearPrototypeState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
