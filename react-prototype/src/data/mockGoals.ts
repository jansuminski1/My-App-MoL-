import { Goal } from '../types';
import { currentWeekKey, currentMonthKey } from '../utils/date';

const WK = currentWeekKey();
const MK = currentMonthKey();

export const mockGoals: Goal[] = [
  {
    id: 'goal-w1',
    title: 'Complete 4 deep work sessions',
    period: 'weekly',
    domain: 'Intelligence',
    why: 'Build serious research momentum.',
    status: 'active',
    createdAt: Date.now() - 2 * 86_400_000,
    completedAt: null,
    weekKey: WK,
    order: 0,
    xpReward: 50,
    rewardKey: `goal:weekly:${WK}:goal-w1`,
  },
  {
    id: 'goal-w2',
    title: 'Keep morning flow 5 days',
    period: 'weekly',
    domain: 'Consistency',
    why: 'Make deliberate mornings automatic.',
    status: 'active',
    createdAt: Date.now() - 2 * 86_400_000,
    completedAt: null,
    weekKey: WK,
    order: 1,
    xpReward: 50,
    rewardKey: `goal:weekly:${WK}:goal-w2`,
  },
  {
    id: 'goal-m1',
    title: 'Advance Ontology of Sexuality draft',
    period: 'monthly',
    domain: 'Purpose',
    why: 'Move the central scholarly project forward.',
    status: 'active',
    createdAt: Date.now() - 7 * 86_400_000,
    completedAt: null,
    monthKey: MK,
    order: 0,
    xpReward: 150,
    rewardKey: `goal:monthly:${MK}:goal-m1`,
  },
  {
    id: 'goal-m2',
    title: 'Build a sustainable health rhythm',
    period: 'monthly',
    domain: 'Health',
    why: 'Support energy for clinical work and research.',
    status: 'active',
    createdAt: Date.now() - 7 * 86_400_000,
    completedAt: null,
    monthKey: MK,
    order: 1,
    xpReward: 150,
    rewardKey: `goal:monthly:${MK}:goal-m2`,
  },
];
