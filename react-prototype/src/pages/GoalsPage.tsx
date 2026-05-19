import { useState } from 'react';
import { Goal, GoalPeriod, LifeDomain, CharacterState } from '../types';
import { currentWeekKey, currentMonthKey } from '../utils/date';
import { AddGoalModal, GoalFormData } from '../components/AddGoalModal';

interface Props {
  goals: Goal[];
  character: CharacterState;
  onAddGoal: (data: GoalFormData) => void;
  onCompleteGoal: (goalId: string) => void;
  onUncompleteGoal: (goalId: string) => void;
  onDeleteGoal: (goalId: string) => void;
}

const DOMAIN_COLORS: Record<string, string> = {
  Intelligence: '#0ea5e9',
  Health:       '#16a34a',
  Strength:     '#d97706',
  Wealth:       '#10b981',
  Connection:   '#8b5cf6',
  Purpose:      '#f59e0b',
  Consistency:  '#22c55e',
  Resolve:      '#ef4444',
};

interface GoalCardProps {
  goal: Goal;
  onComplete: () => void;
  onUncomplete: () => void;
  onDelete: () => void;
}

function GoalCard({ goal, onComplete, onUncomplete, onDelete }: GoalCardProps) {
  const done = goal.status === 'completed';
  const color = DOMAIN_COLORS[goal.domain] ?? '#0ea5e9';

  return (
    <div className={`goal-card${done ? ' goal-done' : ''}`}>
      <div className="goal-card-top">
        <span className="goal-domain-dot" style={{ background: color }} />
        <span className="goal-card-title">{goal.title}</span>
        <button className="goal-delete-btn" onClick={onDelete} title="Delete goal" type="button">✕</button>
      </div>

      <div className="goal-card-badges">
        <span
          className="goal-domain-badge"
          style={{ color, borderColor: `${color}33`, background: `${color}11` }}
        >
          {goal.domain}
        </span>
        <span className="goal-xp-badge">+{goal.xpReward} XP</span>
      </div>

      {goal.why && (
        <div className="goal-why">
          <span className="goal-field-label">Why it matters: </span>{goal.why}
        </div>
      )}

      {goal.target && (
        <div className="goal-target">{goal.target}</div>
      )}

      {goal.progressNote && (
        <div className="goal-progress-note">{goal.progressNote}</div>
      )}

      <div className="goal-actions">
        {done ? (
          <>
            <span className="goal-completed-badge">✓ Complete</span>
            <button className="goal-uncomplete-btn" onClick={onUncomplete} type="button">Undo</button>
          </>
        ) : (
          <button className="goal-complete-btn" onClick={onComplete} type="button">
            Complete goal
          </button>
        )}
      </div>
    </div>
  );
}

export function GoalsPage({ goals, character: _character, onAddGoal, onCompleteGoal, onUncompleteGoal, onDeleteGoal }: Props) {
  const [showModal, setShowModal] = useState(false);

  const weekKey = currentWeekKey();
  const monthKey = currentMonthKey();

  const weeklyGoals = goals
    .filter(g => g.period === 'weekly' && g.weekKey === weekKey && g.status !== 'archived')
    .sort((a, b) => a.order - b.order);

  const monthlyGoals = goals
    .filter(g => g.period === 'monthly' && g.monthKey === monthKey && g.status !== 'archived')
    .sort((a, b) => a.order - b.order);

  const weeklyDone = weeklyGoals.filter(g => g.status === 'completed').length;
  const monthlyDone = monthlyGoals.filter(g => g.status === 'completed').length;

  function handleAdd(data: GoalFormData) {
    onAddGoal(data);
    setShowModal(false);
  }

  return (
    <div className="page goals-page">
      <div className="goals-page-header">
        <div className="goals-page-title">Goals</div>
        <div className="goals-page-sub">Direction for the week and month.</div>
        {(weeklyGoals.length > 0 || monthlyGoals.length > 0) && (
          <div className="goals-summary-row">
            <span className="goals-summary-chip">{weeklyDone}/{weeklyGoals.length} weekly done</span>
            <span className="goals-summary-chip">{monthlyDone}/{monthlyGoals.length} monthly done</span>
          </div>
        )}
      </div>

      <div className="page-section-label">This Week</div>
      {weeklyGoals.length === 0 ? (
        <div className="goals-empty-state">
          <div className="goals-empty-icon">◇</div>
          <div className="goals-empty-title">No weekly goals yet</div>
          <div className="goals-empty-sub">Set your 1–3 most important goals for this week.</div>
        </div>
      ) : (
        <div className="goals-list">
          {weeklyGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onComplete={() => onCompleteGoal(goal.id)}
              onUncomplete={() => onUncompleteGoal(goal.id)}
              onDelete={() => onDeleteGoal(goal.id)}
            />
          ))}
        </div>
      )}

      <div className="page-section-label" style={{ marginTop: 24 }}>This Month</div>
      {monthlyGoals.length === 0 ? (
        <div className="goals-empty-state">
          <div className="goals-empty-icon">◇</div>
          <div className="goals-empty-title">No monthly goals yet</div>
          <div className="goals-empty-sub">What matters most this month?</div>
        </div>
      ) : (
        <div className="goals-list">
          {monthlyGoals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onComplete={() => onCompleteGoal(goal.id)}
              onUncomplete={() => onUncompleteGoal(goal.id)}
              onDelete={() => onDeleteGoal(goal.id)}
            />
          ))}
        </div>
      )}

      <button className="page-add-btn" onClick={() => setShowModal(true)}>+ Goal</button>

      {showModal && (
        <AddGoalModal
          onAdd={handleAdd}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
