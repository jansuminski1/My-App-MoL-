import { useState } from 'react';

type AddMode = 'task' | 'focus' | 'flow';

interface AddData {
  title: string;
  notes: string;
  duration: number;
  steps: string[];
  trigger: string;
  identity: string;
  identityShort: string;
  place: string;
  tinyVersion: string;
  obstacle: string;
  obstaclePlan: string;
}

interface Props {
  mode: AddMode;
  onAdd: (data: AddData) => void;
  onClose: () => void;
}

const DURATIONS = [25, 45, 60, 90];

const CONFIG = {
  task:  { label: 'Quick Task',  submitClass: 'submit-task',  placeholder: 'e.g. Call dentist' },
  focus: { label: 'Focus Block', submitClass: '',             placeholder: 'e.g. Deep Work: Report' },
  flow:  { label: 'Habit Flow',  submitClass: 'submit-flow',  placeholder: 'e.g. Evening Reset' },
};

export function AddModal({ mode, onAdd, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [duration, setDuration] = useState(25);
  const [steps, setSteps] = useState('');
  const [trigger, setTrigger] = useState('');
  const [identity, setIdentity] = useState('');
  const [identityShort, setIdentityShort] = useState('');
  const [place, setPlace] = useState('');
  const [tinyVersion, setTinyVersion] = useState('');
  const [obstacle, setObstacle] = useState('');
  const [obstaclePlan, setObstaclePlan] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const cfg = CONFIG[mode];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      title: title.trim(),
      notes: notes.trim(),
      duration,
      steps: steps.split(',').map(s => s.trim()).filter(Boolean),
      trigger: trigger.trim(),
      identity: identity.trim(),
      identityShort: identityShort.trim(),
      place: place.trim(),
      tinyVersion: tinyVersion.trim(),
      obstacle: obstacle.trim(),
      obstaclePlan: obstaclePlan.trim(),
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">Add {cfg.label}</span>
          <button className="modal-close" onClick={onClose} type="button">✕</button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="modal-label">
            {mode === 'flow' ? 'Flow name' : 'Title'}
            <input
              className="modal-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder={cfg.placeholder}
              autoFocus
            />
          </label>

          {mode !== 'flow' && (
            <label className="modal-label">
              Note (optional)
              <input
                className="modal-input"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Optional details"
              />
            </label>
          )}

          {mode === 'focus' && (
            <div className="modal-label">
              Duration
              <div className="modal-duration-row">
                {DURATIONS.map(d => (
                  <button
                    key={d}
                    type="button"
                    className={`modal-duration-btn${duration === d ? ' selected' : ''}`}
                    onClick={() => setDuration(d)}
                  >
                    {d} min
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'flow' && (
            <>
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
                Identity
                <input
                  className="modal-input"
                  value={identity}
                  onChange={e => setIdentity(e.target.value)}
                  placeholder="I am someone who starts the day deliberately."
                />
              </label>
              <label className="modal-label">
                Steps (comma-separated)
                <input
                  className="modal-input"
                  value={steps}
                  onChange={e => setSteps(e.target.value)}
                  placeholder="e.g. drink water, stretch, review tasks"
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
                      placeholder="calm mornings"
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
                      placeholder="Do only the first step"
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
            </>
          )}

          <button
            className={`modal-submit${cfg.submitClass ? ` ${cfg.submitClass}` : ''}`}
            type="submit"
            disabled={!title.trim()}
          >
            Add {cfg.label}
          </button>
        </form>
      </div>
    </div>
  );
}
