import { HealthState } from '../types';
import { todayDateKey } from '../utils/date';

const TODAY = todayDateKey();

export const mockHealth: HealthState = {
  meals: [
    {
      id: 'meal-mock-1',
      dateKey: TODAY,
      type: 'Breakfast',
      label: 'Oats with banana',
      quality: 'Balanced',
      completedAt: Date.now() - 14_400_000,
      xpReward: 8,
      rewardKey: 'mock-h1',
    },
  ],
  cardio: [],
  weight: [
    {
      id: 'weight-mock-1',
      dateKey: TODAY,
      weightKg: 78.5,
      loggedAt: Date.now() - 18_000_000,
      rewardKey: 'mock-h2',
      xpReward: 5,
    },
  ],
  recovery: [],
};
