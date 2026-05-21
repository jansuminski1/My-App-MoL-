import { useState } from 'react';
import { HabitFlow } from '../types';
import { todayDateKey } from '../utils/date';
import { EditFlowModal } from './EditFlowModal';

interface Props {
  flow: HabitFlow;
  isCurrent: boolean;
  currentStepId?: string;
  defaultExpanded: boolean;
  onToggleStep: (flowId: string, stepId: string) => void;
  onSkipStep?: (flowId: string, stepId: string) => void;
  onDelete?: (flowId: string) => void;
  onUpdateFlow?: (flow: HabitFlow) => void;
}

export function HabitFlowCard({ flow, isCurrent, defaultExpanded, onToggleStep, onSkipStep, onDelete, onUpdateFlow }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [hoveredStep, setHoveredStep] = useState<string | null>(null);
  const [showEdit, setShowEdit] = useState(false);

  const today = todayDateKey();
  const doneCount = flow.steps.filter(s => !!s.completionLog[today]).length;
  const skippedCount = flow.steps.filter(s => !!s.skippedLog?.[today]).length;
  const total = flow.steps.length;
  const allDone = flow.steps.every(s => !!s.completionLog[today] || !!s.skippedLog?.[today]);
  const firstIncompleteIdx = flow.steps.findIndex(s => !s.completionLog[today] && !s.skippedLog?.[today]);
  const activeStep = firstIncompleteIdx >= 0 ? flow.steps[firstIncompleteIdx] : null;

  const hasDetails = !!(flow.place || flow.obstacle || flow.obstaclePlan || flow.tinyVersion || flow.automaticityScore !== undefined);

  function nodeState(idx: number, completed: boolean): 'done' | 'current' | 'upcoming' {
    if (completed) return 'done';
    if (idx === firstIncompleteIdx) return 'current';
    return 'upcoming';
  }

  function handleNodeClick(e: React.MouseEvent, flowId: string, stepId: string) {
    e.stopPropagation();
    onToggleStep(flowId, stepId);
  }

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (window.confirm(`Remove "${flow.title}" from Today?`)) onDelete?.(flow.id);
  }

  function handleEdit(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setShowEdit(true);
  }

  return (
    <div className={`habit-flow-card${isCurrent ? ' is-current' : ''}${allDone ? ' is-complete' : ''}`}>
      <div
        className="habit-flow-header"
        onClick={() => setExpanded(e => !e)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={e => e.key === 'Enter' && setExpanded(x => !x)}
      >
        <div className="habit-flow-icon-wrap" aria-hidden="true">
          <span>🌿</span>
        </div>

        <div className="habit-flow-header-content">
          <div className="habit-flow-title-row">
            <div className="habit-flow-title-main">
              <span className="habit-flow-title">{flow.title}</span>
              {flow.startTime && (
                <span className="habit-flow-time-badge">🕐 {flow.startTime}</span>
              )}
            </div>
            <span className="habit-flow-status">
              {allDone ? '✓ Done' : `${doneCount}/${total}`}
            </span>
          </div>

          <div className="habit-nodes" onClick={e => e.stopPropagation()}>
            {flow.steps.map((step, idx) => {
              const stepDone = !!step.completionLog[today];
              const state = nodeState(idx, stepDone);
              return (
                <div key={step.id} className="habit-node-wrap">
                  <button
                    className={`habit-node ${state}`}
                    onClick={e => handleNodeClick(e, flow.id, step.id)}
                    onMouseEnter={() => setHoveredStep(step.id)}
                    onMouseLeave={() => setHoveredStep(null)}
                    aria-label={`${step.name} - ${state}`}
                  >
                    {state === 'done' ? '✓' : state === 'current' ? '·' : ''}
                  </button>
                  {idx < flow.steps.length - 1 && (
                    <div className={`habit-node-connector${stepDone ? ' done' : ''}`} />
                  )}
                </div>
              );
            })}
          </div>

          {hoveredStep && (
            <div className="habit-step-tooltip">
              {flow.steps.find(s => s.id === hoveredStep)?.name}
            </div>
          )}

          <div className="habit-flow-trigger-line">
            <span className="habit-flow-trigger-label">Starts after:</span> {flow.trigger}
          </div>
        </div>

        <div className="habit-flow-header-rail" onClick={e => e.stopPropagation()}>
          {onUpdateFlow && (
            <button
              type="button"
              className="habit-flow-edit-btn"
              onClick={handleEdit}
              onPointerDown={e => e.stopPropagation()}
            >
              Edit
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              className="item-more-btn"
              onClick={handleDelete}
              onPointerDown={e => e.stopPropagation()}
              aria-label="Delete flow"
            >
              ×
            </button>
          )}
          <span
            className={`habit-flow-chevron${expanded ? ' open' : ''}`}
            onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
          >
            ▾
          </span>
        </div>
      </div>

      {expanded && !allDone && activeStep && (
        <div className="habit-step-panel">
          <div className="habit-step-panel-label">Current Step</div>
          <div className="habit-step-panel-name">{activeStep.name}</div>
          {activeStep.cue && (
            <div className="habit-step-panel-row">
              <span className="habit-step-panel-field-label">Cue</span>
              <span>{activeStep.cue}</span>
            </div>
          )}
          {activeStep.identity && (
            <div className="habit-step-panel-row">
              <span className="habit-step-panel-field-label">Identity vote</span>
              <span>{activeStep.identity}</span>
            </div>
          )}
          {(activeStep.tinyVersion || activeStep.tinyMinimum) && (
            <div className="habit-step-panel-row tiny">
              <span className="habit-step-panel-field-label">Tiny version</span>
              <span>{activeStep.tinyVersion || activeStep.tinyMinimum}</span>
            </div>
          )}
          <div className="habit-step-panel-actions">
            <button
              className="habit-step-complete-btn"
              onClick={() => onToggleStep(flow.id, activeStep.id)}
            >
              ✓ Complete Step
            </button>
            {onSkipStep && (
              <button
                className="habit-step-skip-btn"
                onClick={() => onSkipStep(flow.id, activeStep.id)}
              >
                Skip today
              </button>
            )}
          </div>
        </div>
      )}

      {expanded && allDone && (
        <div className="habit-step-panel done">
          <span>{doneCount === total ? `✓ All ${total} steps complete` : `${skippedCount} skipped, ${doneCount} complete today`}</span>
        </div>
      )}

      {expanded && hasDetails && (
        <details className="habit-flow-details">
          <summary className="habit-flow-details-summary">Behavior design</summary>
          <div className="habit-flow-details-body">
            {flow.place && (
              <div className="habit-detail-row">
                <span className="habit-detail-label">Place</span>
                <span className="habit-detail-value">{flow.place}</span>
              </div>
            )}
            {flow.tinyVersion && (
              <div className="habit-detail-row">
                <span className="habit-detail-label">Tiny version</span>
                <span className="habit-detail-value">{flow.tinyVersion}</span>
              </div>
            )}
            {flow.obstacle && (
              <div className="habit-detail-row">
                <span className="habit-detail-label">Obstacle</span>
                <span className="habit-detail-value">{flow.obstacle}</span>
              </div>
            )}
            {flow.obstaclePlan && (
              <div className="habit-detail-row">
                <span className="habit-detail-label">Plan</span>
                <span className="habit-detail-value">{flow.obstaclePlan}</span>
              </div>
            )}
            {flow.automaticityScore !== undefined && (
              <div className="habit-detail-row">
                <span className="habit-detail-label">Automaticity</span>
                <span className="habit-detail-value">{flow.automaticityScore}/100</span>
              </div>
            )}
          </div>
        </details>
      )}

      {showEdit && (
        <EditFlowModal
          flow={flow}
          onSave={updated => { onUpdateFlow?.(updated); setShowEdit(false); }}
          onClose={() => setShowEdit(false)}
        />
      )}
    </div>
  );
}
