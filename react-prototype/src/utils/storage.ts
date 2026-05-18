import { TodayItem, CharacterState, FocusSessionLog } from '../types';
import { mockTodayItems, mockCharacter } from '../data/mockToday';
import { todayDateKey } from './date';

export const STORAGE_KEY = 'masters-of-life-react-prototype-v1';

export interface PrototypeState {
  version: 1;
  savedAt: number;
  savedAtDateKey: string;
  items: TodayItem[];
  character: CharacterState;
  focusSessionLogs?: FocusSessionLog[];
}

export function loadPrototypeState(): { items: TodayItem[]; character: CharacterState; focusSessionLogs: FocusSessionLog[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: mockTodayItems, character: mockCharacter, focusSessionLogs: [] };
    const parsed = JSON.parse(raw) as PrototypeState;
    if (
      parsed.version !== 1 ||
      !Array.isArray(parsed.items) ||
      !parsed.character ||
      typeof parsed.character !== 'object'
    ) {
      return { items: mockTodayItems, character: mockCharacter, focusSessionLogs: [] };
    }
    return {
      items: parsed.items,
      character: parsed.character,
      focusSessionLogs: parsed.focusSessionLogs ?? [],
    };
  } catch {
    return { items: mockTodayItems, character: mockCharacter, focusSessionLogs: [] };
  }
}

export function savePrototypeState(items: TodayItem[], character: CharacterState, focusSessionLogs: FocusSessionLog[]): void {
  try {
    const state: PrototypeState = {
      version: 1,
      savedAt: Date.now(),
      savedAtDateKey: todayDateKey(),
      items,
      character,
      focusSessionLogs,
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
