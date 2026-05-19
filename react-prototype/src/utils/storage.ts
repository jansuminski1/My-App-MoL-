import { TodayItem, CharacterState, FocusSessionLog, Goal, FocusTimerProfile, FocusTag, HealthState } from '../types';
import { mockTodayItems, mockCharacter } from '../data/mockToday';
import { mockGoals } from '../data/mockGoals';
import { DEFAULT_TIMER_PROFILES, DEFAULT_FOCUS_TAGS } from '../data/focusDefaults';
import { todayDateKey } from './date';

export const STORAGE_KEY = 'masters-of-life-react-prototype-v1';

export interface PrototypeState {
  version: 1;
  savedAt: number;
  savedAtDateKey: string;
  items: TodayItem[];
  character: CharacterState;
  focusSessionLogs?: FocusSessionLog[];
  goals?: Goal[];
  focusTimerProfiles?: FocusTimerProfile[];
  selectedFocusTimerProfileId?: string;
  focusTags?: FocusTag[];
  health?: HealthState;
}

const EMPTY_HEALTH: HealthState = { meals: [], cardio: [], weight: [], recovery: [] };

export function loadPrototypeState(): {
  items: TodayItem[];
  character: CharacterState;
  focusSessionLogs: FocusSessionLog[];
  goals: Goal[];
  focusTimerProfiles: FocusTimerProfile[];
  selectedFocusTimerProfileId: string;
  focusTags: FocusTag[];
  health: HealthState;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {
      items: mockTodayItems,
      character: mockCharacter,
      focusSessionLogs: [],
      goals: mockGoals,
      focusTimerProfiles: DEFAULT_TIMER_PROFILES,
      selectedFocusTimerProfileId: DEFAULT_TIMER_PROFILES[0].id,
      focusTags: DEFAULT_FOCUS_TAGS,
      health: EMPTY_HEALTH,
    };
    const parsed = JSON.parse(raw) as PrototypeState;
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.items) ||
      !parsed.character ||
      typeof parsed.character !== 'object'
    ) {
      return {
        items: mockTodayItems,
        character: mockCharacter,
        focusSessionLogs: [],
        goals: mockGoals,
        focusTimerProfiles: DEFAULT_TIMER_PROFILES,
        selectedFocusTimerProfileId: DEFAULT_TIMER_PROFILES[0].id,
        focusTags: DEFAULT_FOCUS_TAGS,
        health: EMPTY_HEALTH,
      };
    }
    return {
      items: parsed.items,
      character: parsed.character,
      focusSessionLogs: parsed.focusSessionLogs ?? [],
      goals: parsed.goals ?? [],
      focusTimerProfiles: parsed.focusTimerProfiles ?? DEFAULT_TIMER_PROFILES,
      selectedFocusTimerProfileId: parsed.selectedFocusTimerProfileId ?? DEFAULT_TIMER_PROFILES[0].id,
      focusTags: parsed.focusTags ?? DEFAULT_FOCUS_TAGS,
      health: parsed.health ?? EMPTY_HEALTH,
    };
  } catch {
    return {
      items: mockTodayItems,
      character: mockCharacter,
      focusSessionLogs: [],
      goals: mockGoals,
      focusTimerProfiles: DEFAULT_TIMER_PROFILES,
      selectedFocusTimerProfileId: DEFAULT_TIMER_PROFILES[0].id,
      focusTags: DEFAULT_FOCUS_TAGS,
      health: EMPTY_HEALTH,
    };
  }
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
): void {
  try {
    const state: PrototypeState = {
      version: 1,
      savedAt: Date.now(),
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // localStorage unavailable or quota exceeded — silently ignore
  }
}

export function clearPrototypeState(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
