import { useState } from 'react';
import { GoalPeriod, LifeDomain } from '../types';

export interface GoalFormData {
  title: string;
  period: GoalPeriod;
  domain: LifeDomain;
  why: string;
  target: string;
  xpReward: number;
}

interface Props {
  onAdd: (data: GoalFormData) => void;
  onClose: () => void;
}

const DOMAINS: LifeDomain[] = [
  'Intelligence', 'Health', 'Strength', 'Wealth',
  'Connection', 'Purpose', 'Consistency', 'Resolve',
];

export function AddGoalModal({ onAdd, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [period, setPeriod] = useState<GoalPeriod>('weekly');
  const [domain, setDomain] = useState<LifeDomain>('Intelligence');
  const [why, setWhy] = useState('');
  const [target, setTarget] = useState('');

  const xpReward = period === 'monthly' ? 150 : 50;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({ title: title.trim(), period, domain, why: why.trim(), target: target.trim(), xpReward });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add Goal</span>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="modal-label">
            Goal
            <input
              className="modal-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Complete 4 deep work sessions"
              autoFocus
            />
          </label>

          <div className="modal-label">
            Period
            <div className="modal-duration-row">
              {(['weekly', 'monthly'] as GoalPeriod[]).map(p => (
                <button
                  key={p}
                  type="button"
                  className={`modal-duration-btn${period === p ? ' selected' : ''}`}
                  onClick={() => setPeriod(p)}
                >
                  {p === 'weekly' ? 'This week' : 'This month'}
                </button>
              ))}
            </div>
          </div>

          <label className="modal-label">
            Domain
            <select
              className="modal-input modal-select"
              value={domain}
              onChange={e => setDomain(e.target.value as LifeDomain)}
            >
              {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </label>

          <label className="modal-label">
            Why it matters
            <input
              className="modal-input"
              value={why}
              onChange={e => setWhy(e.target.value)}
              placeholder="What makes this goal meaningful?"
            />
          </label>

          <label className="modal-label">
            Target or outcome (optional)
            <input
              className="modal-input"
              value={target}
              onChange={e => setTarget(e.target.value)}
              placeholder="Specific outcome or measurement"
            />
          </label>

          <div className="modal-xp-preview">
            Completing this goal awards <strong>+{xpReward} XP</strong>.
          </div>

          <button className="modal-submit" type="submit" disabled={!title.trim()}>
            Add Goal
          </button>
        </form>
      </div>
    </div>
  );
}
