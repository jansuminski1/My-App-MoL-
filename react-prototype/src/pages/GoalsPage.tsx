import { useState } from 'react';
import type { CharacterState, Goal, GoalPeriod } from '../types';
import { currentWeekKey, currentMonthKey } from '../utils/date';
import type { GoalFormData } from '../components/AddGoalModal';

interface Props {
  goals: Goal[];
  character: CharacterState;
  onAddGoal: (data: GoalFormData) => void;
  onCompleteGoal: (goalId: string) => void;
  onUncompleteGoal: (goalId: string) => void;
  onDeleteGoal: (goalId: string) => void;
}

interface GoalSectionProps {
  icon: string;
  title: string;
  subtitle: string;
  period: GoalPeriod;
  goals: Goal[];
  placeholder: string;
  emptyText: string;
  onAddGoal: (data: GoalFormData) => void;
  onCompleteGoal: (goalId: string) => void;
  onUncompleteGoal: (goalId: string) => void;
  onDeleteGoal: (goalId: string) => void;
}

function formatMonthLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
}

function formatWeekLabel(weekKey: string): string {
  const [year, month, day] = weekKey.split('-').map(Number);
  if (!year || !month || !day) return `Week of ${weekKey}`;
  const start = new Date(year, month - 1, day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const sameMonth = start.getMonth() === end.getMonth();
  const startLabel = start.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
  });
  const endLabel = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : 'long',
    day: 'numeric',
    year: 'numeric',
  });
  return `Week of ${startLabel} - ${endLabel}`;
}

function GoalSection({
  icon,
  title,
  subtitle,
  period,
  goals,
  placeholder,
  emptyText,
  onAddGoal,
  onCompleteGoal,
  onUncompleteGoal,
  onDeleteGoal,
}: GoalSectionProps) {
  const [draft, setDraft] = useState('');
  const doneCount = goals.filter(goal => goal.status === 'completed').length;
  const progressPercent = goals.length > 0 ? Math.round((doneCount / goals.length) * 100) : 0;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const titleValue = draft.trim();
    if (!titleValue) return;
    onAddGoal({
      title: titleValue,
      period,
      domain: 'Purpose',
      why: '',
      target: '',
      xpReward: period === 'monthly' ? 150 : 50,
    });
    setDraft('');
  }

  return (
    <section className="goals-period-card">
      <div className="goals-section-header">
        <div className="goals-section-title-row">
          <span className="goals-section-icon" aria-hidden="true">{icon}</span>
          <h2>{title}</h2>
        </div>
        <div className="goals-section-subtitle">{subtitle}</div>
      </div>

      <div className="goals-progress-block">
        <div className="goals-progress-top">
          <span>Progress</span>
          <strong>{progressPercent}%</strong>
        </div>
        <div className="goals-progress-track" aria-hidden="true">
          <div className="goals-progress-fill" style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="goals-progress-counts">
          <span>{doneCount} done</span>
          <span>{goals.length} total</span>
        </div>
      </div>

      {goals.length === 0 ? (
        <p className="goals-section-empty">{emptyText}</p>
      ) : (
        <div className="goals-check-list">
          {goals.map(goal => {
            const done = goal.status === 'completed';
            const detail = goal.target || goal.why || goal.progressNote;
            return (
              <div key={goal.id} className={`goals-check-row${done ? ' is-done' : ''}`}>
                <button
                  type="button"
                  className="goals-check-box"
                  onClick={() => done ? onUncompleteGoal(goal.id) : onCompleteGoal(goal.id)}
                  aria-label={done ? `Mark ${goal.title} incomplete` : `Complete ${goal.title}`}
                  aria-pressed={done}
                >
                  {done ? '✓' : ''}
                </button>
                <div className="goals-check-copy">
                  <div className="goals-check-title">{goal.title}</div>
                  {detail && <div className="goals-check-detail">{detail}</div>}
                </div>
                <button
                  type="button"
                  className="goals-check-delete"
                  onClick={() => onDeleteGoal(goal.id)}
                  aria-label={`Delete ${goal.title}`}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      <form className="goals-inline-add" onSubmit={handleAdd}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
        />
        <button type="submit" disabled={!draft.trim()}>Add</button>
      </form>
    </section>
  );
}

export function GoalsPage({ goals, character: _character, onAddGoal, onCompleteGoal, onUncompleteGoal, onDeleteGoal }: Props) {
  const weekKey = currentWeekKey();
  const monthKey = currentMonthKey();

  const weeklyGoals = goals
    .filter(g => g.period === 'weekly' && g.weekKey === weekKey && g.status !== 'archived')
    .sort((a, b) => a.order - b.order);

  const monthlyGoals = goals
    .filter(g => g.period === 'monthly' && g.monthKey === monthKey && g.status !== 'archived')
    .sort((a, b) => a.order - b.order);

  const completedCount = goals.filter(goal => goal.status === 'completed').length;

  return (
    <div className="page goals-page goals-page-legacy">
      <div className="goals-completed-banner">
        <div className="goals-completed-label">
          <span aria-hidden="true">🏆</span>
          <strong>Completed</strong>
        </div>
        <div className="goals-completed-count">
          {completedCount} {completedCount === 1 ? 'goal' : 'goals'} completed
        </div>
      </div>

      <GoalSection
        icon="📅"
        title="Weekly Direction"
        subtitle={formatWeekLabel(weekKey)}
        period="weekly"
        goals={weeklyGoals}
        placeholder="Add weekly direction..."
        emptyText="No weekly direction yet. Add one below."
        onAddGoal={onAddGoal}
        onCompleteGoal={onCompleteGoal}
        onUncompleteGoal={onUncompleteGoal}
        onDeleteGoal={onDeleteGoal}
      />

      <GoalSection
        icon="🗓️"
        title="Monthly Direction"
        subtitle={formatMonthLabel(monthKey)}
        period="monthly"
        goals={monthlyGoals}
        placeholder="Add monthly direction..."
        emptyText="No monthly direction yet. Add one below."
        onAddGoal={onAddGoal}
        onCompleteGoal={onCompleteGoal}
        onUncompleteGoal={onUncompleteGoal}
        onDeleteGoal={onDeleteGoal}
      />

      <div className="goals-stats-card">
        <div className="goals-section-title-row">
          <span className="goals-section-icon" aria-hidden="true">📈</span>
          <h2>Direction Stats</h2>
        </div>
        <div className="goals-stat-line">
          Weekly: <strong>{weeklyGoals.filter(g => g.status === 'completed').length}/{weeklyGoals.length}</strong>
        </div>
        <div className="goals-stat-line">
          Monthly: <strong>{monthlyGoals.filter(g => g.status === 'completed').length}/{monthlyGoals.length}</strong>
        </div>
        <div className="goals-stat-muted">
          Current cycle totals from your synced Goals data.
        </div>
      </div>
    </div>
  );
}
