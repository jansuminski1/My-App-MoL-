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
    {
      id: 'meal-mock-2',
      dateKey: TODAY,
      type: 'Lunch',
      label: 'Chicken rice bowl',
      quality: 'Balanced',
      completedAt: Date.now() - 7_200_000,
      xpReward: 8,
      rewardKey: 'mock-h3',
    },
  ],
  cardio: [
    {
      id: 'cardio-mock-1',
      dateKey: TODAY,
      type: 'Walk',
      minutes: 25,
      intensity: 'Moderate',
      completedAt: Date.now() - 10_800_000,
      xpReward: 25,
      rewardKey: 'mock-h4',
    },
  ],
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
  recovery: [
    {
      id: `recovery-${TODAY}`,
      dateKey: TODAY,
      sleepQuality: 'Good',
      energy: 4,
      mood: 4,
      loggedAt: Date.now() - 21_600_000,
      rewardKey: 'mock-h5',
      xpReward: 8,
    },
  ],
};
