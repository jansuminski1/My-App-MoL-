import { useState } from 'react';
import { HabitFlow, HabitStep } from '../types';
import { makeIdentityShort, makeStepCue, makeTinyVersion } from '../utils/smartDefaults';

interface Props {
  flow: HabitFlow;
  onSave: (updated: HabitFlow) => void;
  onClose: () => void;
}

export function EditFlowModal({ flow, onSave, onClose }: Props) {
  const [title, setTitle] = useState(flow.title);
  const [trigger, setTrigger] = useState(flow.trigger);
  const [identity, setIdentity] = useState(flow.identity);
  const [stepsText, setStepsText] = useState(flow.steps.map(s => s.name).join('\n'));
  const [identityShort, setIdentityShort] = useState(flow.identityShort ?? '');
  const [place, setPlace] = useState(flow.place ?? '');
  const [tinyVersion, setTinyVersion] = useState(flow.tinyVersion ?? '');
  const [obstacle, setObstacle] = useState(flow.obstacle ?? '');
  const [obstaclePlan, setObstaclePlan] = useState(flow.obstaclePlan ?? '');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const newStepNames = stepsText.split('\n').map(s => s.trim()).filter(Boolean);
    const resolvedTrigger = trigger.trim() || 'When I am ready';
    const resolvedIdentity = identity.trim() || 'I am someone who follows through.';
    const resolvedIdentityShort = identityShort.trim() || makeIdentityShort(resolvedIdentity);
    const resolvedPlace = place.trim() || undefined;
    const baseTs = Date.now();

    const steps: HabitStep[] = newStepNames.map((name, i) => {
      const oldStep = flow.steps[i];
      const cue = i === 0
        ? resolvedTrigger
        : makeStepCue(resolvedTrigger, newStepNames[i - 1]);

      if (oldStep) {
        return {
          ...oldStep,
          name,
          cue,
          identity: resolvedIdentity,
          identityShort: resolvedIdentityShort,
          place: resolvedPlace,
          tinyVersion: oldStep.tinyVersion || makeTinyVersion(name),
          tinyMinimum: oldStep.tinyMinimum || makeTinyVersion(name),
        };
      }

      const tv = makeTinyVersion(name);
      return {
        id: `step-${baseTs}-${i}`,
        name,
        identity: resolvedIdentity,
        identityShort: resolvedIdentityShort,
        cue,
        tinyMinimum: tv,
        tinyVersion: tv,
        place: resolvedPlace,
        completionLog: {},
        freq: { type: 'daily' as const },
      };
    });

    onSave({
      ...flow,
      title: title.trim(),
      trigger: resolvedTrigger,
      identity: resolvedIdentity,
      identityShort: resolvedIdentityShort,
      place: resolvedPlace,
      tinyVersion: tinyVersion.trim() || undefined,
      obstacle: obstacle.trim() || undefined,
      obstaclePlan: obstaclePlan.trim() || undefined,
      steps,
    });
  }

  const stepsRows = Math.max(3, stepsText.split('\n').length + 1);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Edit Flow</span>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="modal-label">
            Flow name
            <input
              className="modal-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Morning Flow"
              autoFocus
            />
          </label>

          <label className="modal-label">
            Starts after
            <input
              className="modal-input"
              value={trigger}
              onChange={e => setTrigger(e.target.value)}
              placeholder="After I wake up"
            />
          </label>

          <label className="modal-label">
            Identity vote
            <input
              className="modal-input"
              value={identity}
              onChange={e => setIdentity(e.target.value)}
              placeholder="I am someone who starts the day deliberately."
            />
          </label>

          <label className="modal-label">
            Steps (one per line)
            <textarea
              className="modal-input"
              value={stepsText}
              onChange={e => setStepsText(e.target.value)}
              rows={stepsRows}
              placeholder={'drink water\nmorning movement\nreview the day'}
              style={{ resize: 'vertical' }}
            />
          </label>

          <button
            type="button"
            className="modal-advanced-toggle"
            onClick={() => setAdvancedOpen(o => !o)}
          >
            <span className={`modal-advanced-chevron${advancedOpen ? ' open' : ''}`}>▸</span>
            Refine this flow
          </button>

          {advancedOpen && (
            <div className="modal-advanced-section">
              <label className="modal-label">
                Short identity label
                <input
                  className="modal-input"
                  value={identityShort}
                  onChange={e => setIdentityShort(e.target.value)}
                  placeholder="Auto-generated if empty"
                />
              </label>
              <label className="modal-label">
                Place / context
                <input
                  className="modal-input"
                  value={place}
                  onChange={e => setPlace(e.target.value)}
                  placeholder="kitchen, desk, bedroom…"
                />
              </label>
              <label className="modal-label">
                Tiny version
                <input
                  className="modal-input"
                  value={tinyVersion}
                  onChange={e => setTinyVersion(e.target.value)}
                  placeholder="Bare minimum to count"
                />
              </label>
              <label className="modal-label">
                What might get in the way?
                <input
                  className="modal-input"
                  value={obstacle}
                  onChange={e => setObstacle(e.target.value)}
                  placeholder="I check my phone first"
                />
              </label>
              <label className="modal-label">
                If that happens, I will…
                <input
                  className="modal-input"
                  value={obstaclePlan}
                  onChange={e => setObstaclePlan(e.target.value)}
                  placeholder="Put phone across the room"
                />
              </label>
            </div>
          )}

          <button
            className="modal-submit submit-flow"
            type="submit"
            disabled={!title.trim()}
          >
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
